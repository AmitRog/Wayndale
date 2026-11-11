/* Lumen Drift — simulation core (no DOM, runs in the browser and in Node). */
(function (root) {
  'use strict';

  const C = {
    LANES: 7, TILE_W: 1, TILE_L: 3, SLAB: 0.25,
    VMAX: 26, VBOOST: 36, ACCEL: 14, BRAKE: 24,
    LAT: 7.5, LAT_ACC: 60, AIR_CTRL: 0.6,
    JUMP_V: 7, PAD_MULT: 1.5, G: 19,
    HW: 0.27, HL: 0.42, H: 0.3,      // body half-width, half-length, height
    FW: 0.13, FL: 0.26,              // footprint used for ground support
    STEP: 0.12, CRASH_V: 9, DT: 1 / 120,
  };

  // Solid boxes [bottom, top] per cell type.
  const FLOOR = [[-C.SLAB, 0]];
  const BOXES = {
    '#': FLOOR, 'B': FLOOR, 'S': FLOOR, 'R': FLOOR, 'X': FLOOR, 'J': FLOOR,
    '1': [[-C.SLAB, 1]], '2': [[-C.SLAB, 2]],
    'T': [[-C.SLAB, 0], [1.1, 1.5]],
  };
  // Map characters that also carry a shard: [cell type, shard height]
  const SHARD_CELLS = { '*': ['#', 0.55], 'o': ['.', 0.95], '+': ['1', 1.55], '^': ['T', 2.05] };

  function parseLevel(def) {
    const cells = [], shards = [];
    for (const raw of def.map.split('\n')) {
      const line = raw.split(';')[0].trim();
      if (!line) continue;
      const m = /^(\S{7})(?:\s*x(\d+))?$/.exec(line);
      if (!m) throw new Error(def.name + ': bad map line "' + raw + '"');
      for (let k = 0, n = m[2] ? +m[2] : 1; k < n; k++) {
        let row = '';
        for (let l = 0; l < C.LANES; l++) {
          let ch = m[1][l];
          const sc = SHARD_CELLS[ch];
          if (sc) {
            shards.push({ x: l - 3, y: sc[1], z: (cells.length + 0.5) * C.TILE_L, row: cells.length });
            ch = sc[0];
          }
          if (ch !== '.' && !BOXES[ch]) throw new Error(def.name + ': unknown cell "' + ch + '"');
          row += ch;
        }
        cells.push(row);
      }
    }
    const shardRows = cells.map(() => []);
    shards.forEach((s, i) => shardRows[s.row].push(i));
    return Object.assign({}, def, {
      cells, shards, shardRows, n: cells.length,
      finishZ: (cells.length - 3) * C.TILE_L,
    });
  }

  function cellAt(L, lane, row) {
    if (lane < 0 || lane >= C.LANES || row < 0 || row >= L.n) return '.';
    return L.cells[row][lane];
  }

  // Does the AABB intersect any solid box whose top is above minTop?
  function overlap(L, x0, x1, y0, y1, z0, z1, minTop) {
    const la = Math.max(0, Math.floor(x0 + 3.5 + 1e-6)), lb = Math.min(C.LANES - 1, Math.floor(x1 + 3.5 - 1e-6));
    const ra = Math.max(0, Math.floor(z0 / C.TILE_L + 1e-6)), rb = Math.min(L.n - 1, Math.floor(z1 / C.TILE_L - 1e-6));
    for (let r = ra; r <= rb; r++) {
      const row = L.cells[r];
      for (let l = la; l <= lb; l++) {
        const bs = BOXES[row[l]];
        if (!bs) continue;
        for (let i = 0; i < bs.length; i++) {
          const b = bs[i];
          if (b[1] > minTop && b[0] < y1 && b[1] > y0) return true;
        }
      }
    }
    return false;
  }

  // Highest box top under the footprint with lo < top <= hi, or null.
  function topUnder(L, x, z, hi, lo) {
    const la = Math.max(0, Math.floor(x - C.FW + 3.5)), lb = Math.min(C.LANES - 1, Math.floor(x + C.FW + 3.5));
    const ra = Math.max(0, Math.floor((z - C.FL) / C.TILE_L)), rb = Math.min(L.n - 1, Math.floor((z + C.FL) / C.TILE_L));
    let best = null;
    for (let r = ra; r <= rb; r++) {
      const row = L.cells[r];
      for (let l = la; l <= lb; l++) {
        const bs = BOXES[row[l]];
        if (!bs) continue;
        for (let i = 0; i < bs.length; i++) {
          const t = bs[i][1];
          if (t <= hi && t > lo && (best === null || t > best)) best = t;
        }
      }
    }
    return best;
  }

  // Lowest box underside under the footprint with lo <= bottom < hi, or null.
  function ceilingOver(L, x, z, lo, hi) {
    const la = Math.max(0, Math.floor(x - C.FW + 3.5)), lb = Math.min(C.LANES - 1, Math.floor(x + C.FW + 3.5));
    const ra = Math.max(0, Math.floor((z - C.FL) / C.TILE_L)), rb = Math.min(L.n - 1, Math.floor((z + C.FL) / C.TILE_L));
    let best = null;
    for (let r = ra; r <= rb; r++) {
      const row = L.cells[r];
      for (let l = la; l <= lb; l++) {
        const bs = BOXES[row[l]];
        if (!bs) continue;
        for (let i = 0; i < bs.length; i++) {
          const b = bs[i][0];
          if (b >= lo && b < hi && (best === null || b < best)) best = b;
        }
      }
    }
    return best;
  }

  function newState(L, withShards) {
    return {
      x: 0, y: 0, z: 1.5 * C.TILE_L, vx: 0, vy: 0, v: 0,
      grounded: true, surface: '#', coyote: 0, air: 0,
      energy: 1, t: 0, status: 0, cause: '',   // status: 0 running, 1 finished, 2 destroyed
      got: withShards ? new Uint8Array(L.shards.length) : null, shardCount: 0,
    };
  }

  function die(s, cause, ev) { s.status = 2; s.cause = cause; if (ev) ev.push(cause === 'fall' ? 'fall' : 'crash'); }

  // Advance one fixed step. inp = {steer:-1..1, throttle:-1..1, jump:bool}. ev collects event names.
  function step(L, s, inp, ev) {
    if (s.status !== 0) return;
    const dt = C.DT, g = C.G * L.gravity, jv = C.JUMP_V * Math.sqrt(L.gravity);
    s.t += dt;

    s.energy -= dt / L.energyTime;
    if (s.energy < 0) s.energy = 0;
    const thr = s.energy > 0 ? inp.throttle : -0.5;
    const surf = s.grounded ? s.surface : '';

    if (thr > 0) { if (s.v < C.VMAX) s.v = Math.min(C.VMAX, s.v + C.ACCEL * thr * dt); }
    else if (thr < 0) s.v = Math.max(0, s.v + C.BRAKE * thr * dt);
    if (surf === 'B') {
      if (ev && s.v <= C.VMAX + 0.5) ev.push('boost');
      s.v = Math.min(C.VBOOST, s.v + 60 * dt);
    } else if (surf === 'S') {
      const cap = C.VMAX * 0.42;
      if (s.v > cap) s.v = Math.max(cap, s.v - 45 * dt);
    }
    if (s.v > C.VMAX && surf !== 'B') s.v = Math.max(C.VMAX, s.v - 4 * dt);
    if (s.energy <= 0 && s.v <= 0 && s.grounded) { die(s, 'charge', ev); return; }

    const ctrl = s.grounded ? 1 : C.AIR_CTRL;
    const tvx = inp.steer * C.LAT * (0.45 + 0.55 * Math.min(1, s.v / C.VMAX));
    const dv = C.LAT_ACC * ctrl * dt;
    s.vx += Math.max(-dv, Math.min(dv, tvx - s.vx));

    if (s.grounded) s.coyote = 0.07; else s.coyote -= dt;
    if (surf === 'J') { s.vy = jv * C.PAD_MULT; s.coyote = 0; if (ev) ev.push('pad'); }
    else if (inp.jump && s.coyote > 0 && s.vy <= 0.01) { s.vy = jv; s.coyote = 0; if (ev) ev.push('jump'); }
    s.vy -= g * dt;

    // X
    const nx = s.x + s.vx * dt, mt = s.y + C.STEP;
    if (overlap(L, nx - C.HW, nx + C.HW, s.y, s.y + C.H, s.z - C.HL, s.z + C.HL, mt) &&
        !overlap(L, s.x - C.HW, s.x + C.HW, s.y, s.y + C.H, s.z - C.HL, s.z + C.HL, mt)) {
      if (ev && Math.abs(s.vx) > 2) ev.push('scrape');
      s.vx = 0;
    } else s.x = nx;

    // Z
    const nz = s.z + s.v * dt;
    if (overlap(L, s.x - C.HW, s.x + C.HW, s.y, s.y + C.H, nz - C.HL, nz + C.HL, mt) &&
        !overlap(L, s.x - C.HW, s.x + C.HW, s.y, s.y + C.H, s.z - C.HL, s.z + C.HL, mt)) {
      if (s.v > C.CRASH_V) { die(s, 'crash', ev); return; }
      if (ev && s.v > 1) ev.push('bump');
      s.v = 0;
    } else s.z = nz;

    // Y
    let ny = s.y + s.vy * dt;
    const wasGrounded = s.grounded;
    s.grounded = false;
    if (s.vy <= 0) {
      const top = topUnder(L, s.x, s.z, s.y + C.STEP + 1e-4, ny);
      if (top !== null) {
        if (ev && !wasGrounded && s.air > 0.12) ev.push('land');
        ny = top; s.vy = 0; s.grounded = true;
        const ch = cellAt(L, Math.floor(s.x + 3.5), Math.floor(s.z / C.TILE_L));
        s.surface = (top === 0 && BOXES[ch] === FLOOR) ? ch : '#';
      }
    } else {
      const c = ceilingOver(L, s.x, s.z, s.y + C.H - 1e-4, ny + C.H);
      if (c !== null) { ny = c - C.H; s.vy = 0; if (ev) ev.push('bonk'); }
    }
    s.y = ny;
    s.air = s.grounded ? 0 : s.air + dt;

    if (s.grounded) {
      if (s.surface === 'X') { die(s, 'burn', ev); return; }
      if (s.surface === 'R') { if (ev && s.energy < 0.97) ev.push('recharge'); s.energy = 1; }
    }
    if (s.y < -9) { die(s, 'fall', ev); return; }

    if (s.got) {
      const r0 = Math.floor(s.z / C.TILE_L);
      for (let r = Math.max(0, r0 - 1); r <= r0 + 1 && r < L.n; r++) {
        const list = L.shardRows[r];
        for (let i = 0; i < list.length; i++) {
          const k = list[i];
          if (s.got[k]) continue;
          const sh = L.shards[k];
          if (Math.abs(sh.x - s.x) < 0.55 && Math.abs(sh.z - s.z) < 1.0 && Math.abs(sh.y - (s.y + 0.15)) < 0.7) {
            s.got[k] = 1; s.shardCount++; if (ev) ev.push('shard:' + k);
          }
        }
      }
    }
    if (s.z >= L.finishZ) { s.status = 1; if (ev) ev.push('finish'); }
  }

  const SIM = { C, BOXES, parseLevel, cellAt, topUnder, newState, step };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM; else root.SIM = SIM;
})(typeof self !== 'undefined' ? self : this);
