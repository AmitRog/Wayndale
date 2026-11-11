/* Lumen Drift — game loop, input, HUD and menus. */
(function () {
  'use strict';
  const C = SIM.C, SECTORS = LEVEL_DATA.SECTORS;
  const LV = LEVEL_DATA.LEVELS.map(SIM.parseLevel);
  const $ = id => document.getElementById(id);
  const show = (id, on) => $(id).classList.toggle('hidden', !on);

  let gfx = null;
  try { gfx = GFX.create($('c')); } catch (e) { console.error(e); }
  if (!gfx) { show('title', false); show('nogl', true); return; }

  /* ---------- save data ---------- */
  const KEY = 'lumen-drift-v1';
  let save = { best: {}, muted: false };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
  const goldTime = L => L.par * 1.06 + 0.3, silverTime = L => L.par * 1.25 + 0.3;
  const medalFor = (L, t) => t <= goldTime(L) ? 3 : t <= silverTime(L) ? 2 : 1;
  const MEDALS = ['', 'Bronze', 'Silver', 'Gold'], MEDAL_COL = ['', '#d99a6c', '#dfe9f5', '#ffd76a'];
  const unlocked = i => { let hi = -1; LV.forEach((l, k) => { if (save.best[l.name]) hi = k; }); return i <= hi + 2; };
  const fmt = t => t.toFixed(2);

  /* ---------- state ---------- */
  let mode = 'title', cur = 0, L = LV[0], s = SIM.newState(L, true);
  const prev = { x: 0, y: 0, z: 0 };
  let acc = 0, clock = 0, last = performance.now(), deadT = 0, wonT = 0, shake = 0, flash = 0, fade = 0;
  let flashCol = [1, 1, 1], shipVisible = true, lastBoost = -9, lastScrape = -9, touchMode = false, resultShown = false;
  const keys = {}, input = { steer: 0, throttle: 0, jump: false };
  let pilot = null, steps = 0;   // optional scripted run (see tools/solve.js --path), used for automated checks

  function setAccent(sec) { document.documentElement.style.setProperty('--accent', SECTORS[sec].accent === '#ffffff' ? '#bfeaff' : SECTORS[sec].accent); }
  function preview(i) {
    if (LV[i] === L) return;
    L = LV[i]; gfx.setLevel(L, SECTORS[L.sector]); setAccent(L.sector); fade = 0.25;
  }

  function setMode(m) {
    mode = m;
    const playing = m === 'ready' || m === 'play' || m === 'dead' || m === 'won' || m === 'pause';
    show('title', m === 'title'); show('select', m === 'select'); show('pause', m === 'pause');
    show('result', m === 'won' && resultShown); show('hud', playing);
    document.body.classList.toggle('playing', playing);
    show('bPause', m === 'ready' || m === 'play'); show('touch', touchMode && (m === 'ready' || m === 'play'));
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (m === 'title') $('bStart').focus();
    if (m === 'pause') $('bResume').focus();
    SFX.music(m !== 'title', L.sector);
  }

  function reset() {
    s = SIM.newState(L, true);
    prev.x = s.x; prev.y = s.y; prev.z = s.z;
    acc = 0; steps = 0; deadT = 0; wonT = 0; shake = 0; flash = 0; fade = 0; shipVisible = true; resultShown = false;
    gfx.clearParticles();
    $('banner').classList.remove('on');
    $('hint').style.opacity = 1;
    $('hint').innerHTML = touchMode ? 'Tap any control to launch' : 'Hold <kbd>&uarr;</kbd> to launch &nbsp;&middot;&nbsp; <kbd>Space</kbd> to jump';
    setMode('ready');
  }

  function startLevel(i) {
    cur = i; L = LV[i];
    gfx.setLevel(L, SECTORS[L.sector]); setAccent(L.sector);
    $('lvlname').textContent = String(i + 1).padStart(2, '0') + ' · ' + L.name;
    const b = save.best[L.name];
    $('best').textContent = b ? 'Best ' + fmt(b.time) : 'Gold ' + fmt(goldTime(L));
    $('grav').textContent = 'Gravity ' + L.gravity.toFixed(2) + ' g';
    reset();
  }

  /* ---------- level select ---------- */
  let cards = [];
  function buildSelect() {
    const host = $('sectors'); host.innerHTML = ''; cards = [];
    SECTORS.forEach((sec, si) => {
      const wrap = document.createElement('div'); wrap.className = 'sector';
      const col = sec.accent === '#ffffff' ? '#bfeaff' : sec.accent;
      wrap.style.setProperty('--sc', col);
      wrap.innerHTML = '<h3>' + sec.name + '<small>' + sec.tag + '</small></h3>';
      const grid = document.createElement('div'); grid.className = 'cards';
      LV.forEach((lv, i) => {
        if (lv.sector !== si) return;
        const b = save.best[lv.name], c = document.createElement('button');
        c.className = 'card'; c.disabled = !unlocked(i);
        const pips = [1, 2, 3].map(k => '<i class="' + (b && b.medal >= k ? 'on' : '') + '"></i>').join('');
        c.innerHTML = '<div class="no">' + String(i + 1).padStart(2, '0') + '</div><div class="nm">' + lv.name + '</div>' +
          '<div class="meta"><span>' + (c.disabled ? 'Locked' : b ? fmt(b.time) + ' s' : 'Not flown') + '</span>' +
          '<span class="pips" style="--mc:' + (b ? MEDAL_COL[b.medal] : '#fff') + '">' + pips + '</span>' +
          '<span>◆ ' + (b ? b.shards : 0) + '/' + lv.shards.length + '</span></div>';
        c.addEventListener('click', () => { SFX.init(); SFX.play('ui'); startLevel(i); });
        c.addEventListener('focus', () => preview(i)); c.addEventListener('pointerenter', () => { if (!c.disabled) preview(i); });
        grid.appendChild(c); cards[i] = c;
      });
      wrap.appendChild(grid); host.appendChild(wrap);
    });
  }
  function openSelect() {
    buildSelect(); setMode('select');
    let target = cur;
    if (!unlocked(target)) target = 0;
    cards[target].focus();
  }

  /* ---------- outcomes ---------- */
  const CAUSE = { crash: ['Shattered', '#ff5a4a'], burn: ['Vaporized', '#ff2d3f'], fall: ['Lost to the void', '#7a8cff'], charge: ['Charge depleted', '#ffc24a'] };
  function onDeath() {
    setMode('dead'); deadT = 0;
    const [msg, col] = CAUSE[s.cause] || CAUSE.crash;
    if (s.cause === 'crash' || s.cause === 'burn') {
      gfx.burst('crash', s.x, s.y, s.z, s.v); shipVisible = false; shake = 0.7; flash = 0.5;
      flashCol = s.cause === 'burn' ? [1, 0.35, 0.3] : [1, 0.9, 0.8];
    }
    SFX.play(s.cause === 'fall' ? 'fall' : s.cause === 'charge' ? 'bump' : 'crash');
    const bn = $('banner'); bn.style.setProperty('--bc', col);
    bn.querySelector('b').textContent = msg.toUpperCase();
    bn.querySelector('span').innerHTML = touchMode ? 'Tap to retry' : 'Space to retry';
    bn.classList.add('on');
  }
  function onWin() {
    setMode('won'); wonT = 0;
    SFX.play('finish'); gfx.burst('finish', 0, 0, L.finishZ, s.v); flash = 0.35; flashCol = [1, 1, 1];
    const t = s.t, medal = medalFor(L, t), old = save.best[L.name];
    const isBest = !old || t < old.time;
    save.best[L.name] = { time: isBest ? t : old.time, medal: Math.max(medal, old ? old.medal : 0), shards: Math.max(s.shardCount, old ? old.shards : 0) };
    persist();
    $('rName').textContent = L.name;
    $('rTime').textContent = fmt(t);
    $('rPips').style.setProperty('--mc', MEDAL_COL[medal]);
    [...$('rPips').children].forEach((el, k) => el.classList.toggle('on', k < medal));
    $('rMedal').textContent = MEDALS[medal]; $('rMedal').style.color = MEDAL_COL[medal];
    $('rBest').textContent = fmt(save.best[L.name].time);
    $('rShards').textContent = s.shardCount + ' / ' + L.shards.length;
    $('rGold').textContent = fmt(goldTime(L));
    $('rNote').textContent = isBest && old ? 'New personal best — ' + fmt(old.time - t) + ' s faster.' : cur === LV.length - 1 ? 'Final route cleared. The void is yours.' : '';
    show('bNext', cur < LV.length - 1);
  }

  function handle(ev) {
    for (const e of ev) {
      if (e === 'boost') { if (clock - lastBoost > 0.6) SFX.play('boost'); lastBoost = clock; }
      else if (e === 'scrape') { if (clock - lastScrape > 0.2) SFX.play('scrape'); lastScrape = clock; }
      else if (e === 'land') { SFX.play('land'); gfx.burst('land', s.x, s.y, s.z, s.v); }
      else if (e.startsWith('shard:')) { const q = L.shards[+e.slice(6)]; SFX.play('shard'); gfx.burst('shard', q.x, q.y, q.z, s.v); }
      else if (e === 'recharge') { SFX.play('recharge'); flash = 0.12; flashCol = [0.3, 0.8, 1]; }
      else if (e === 'pad') { SFX.play('pad'); gfx.burst('land', s.x, s.y, s.z, s.v); }
      else if (e === 'jump' || e === 'bump' || e === 'bonk') SFX.play(e);
    }
  }

  /* ---------- input ---------- */
  function readInput() {
    const l = keys.ArrowLeft || keys.KeyA || keys.TL, r = keys.ArrowRight || keys.KeyD || keys.TR;
    const u = keys.ArrowUp || keys.KeyW, d = keys.ArrowDown || keys.KeyS || keys.TB;
    input.steer = (r ? 1 : 0) - (l ? 1 : 0);
    input.throttle = d ? -1 : (u || touchMode) ? 1 : 0;
    input.jump = !!(keys.Space || keys.TJ);
  }
  function launch() { if (mode === 'ready') { setMode('play'); $('hint').style.opacity = 0; } }
  const pause = () => { if (mode === 'play' || mode === 'ready') { setMode('pause'); SFX.engine(0, false); } };
  const resume = () => { if (mode === 'pause') { last = performance.now(); setMode(s.t > 0 ? 'play' : 'ready'); } };
  function toggleMute() { save.muted = !save.muted; SFX.setMuted(save.muted); $('bMute').style.opacity = save.muted ? 0.4 : 1; persist(); }

  addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true; SFX.init();
    const k = e.code, go = k === 'Enter' || k === 'Space', onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
    if (k === 'KeyM') toggleMute();
    if (go) {           // activate menu buttons ourselves so one key press never triggers two screens
      e.preventDefault();
      if (onButton && mode !== 'play' && mode !== 'ready' && mode !== 'dead') { document.activeElement.click(); return; }
    }
    if (mode === 'title') { if (go) openSelect(); }
    else if (mode === 'select') {
      if (k === 'Escape') setMode('title');
      const i = cards.indexOf(document.activeElement);
      const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[k];
      if (d) { const j = i < 0 ? 0 : i + d; if (cards[j] && !cards[j].disabled) cards[j].focus(); }
    } else if (mode === 'ready' || mode === 'play') {
      if (k === 'Escape' || k === 'KeyP') pause(); else if (k === 'KeyR') reset();
    } else if (mode === 'pause') {
      if (k === 'Escape' || k === 'KeyP') resume(); else if (k === 'KeyR') reset(); else if (k === 'KeyQ') openSelect();
      else if (go && !onButton) resume();
    } else if (mode === 'dead') { if ((go || k === 'KeyR') && deadT > 0.25) reset(); else if (k === 'Escape') openSelect(); }
    else if (mode === 'won') {
      if (k === 'KeyR') reset(); else if (k === 'Escape') openSelect();
      else if (go && resultShown && !onButton) (cur < LV.length - 1 ? $('bNext') : $('bRoutes')).click();
    }
  });
  addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space' || e.code === 'Enter') e.preventDefault(); });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  const click = (id, fn) => $(id).addEventListener('click', () => { SFX.init(); SFX.play('ui'); fn(); });
  click('bStart', openSelect); click('bBack', () => setMode('title'));
  click('bResume', resume); click('bRestart', reset); click('bQuit', openSelect);
  click('bRetry', reset); click('bRoutes', openSelect);
  click('bNext', () => { if (cur < LV.length - 1) startLevel(cur + 1); });
  click('bPause', pause);
  $('bMute').addEventListener('click', () => { SFX.init(); toggleMute(); $('bMute').blur(); });

  for (const [id, key] of [['tL', 'TL'], ['tR', 'TR'], ['tJ', 'TJ'], ['tB', 'TB']]) {
    const el = $(id);
    const set = on => e => { e.preventDefault(); keys[key] = on; el.classList.toggle('down', on); if (on) launch(); };
    el.addEventListener('pointerdown', set(true));
    for (const t of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(t, set(false));
  }
  addEventListener('pointerdown', e => {
    SFX.init();
    if (e.pointerType === 'touch' && !touchMode) { touchMode = true; document.body.classList.add('touch'); setMode(mode); }
    if (mode === 'dead' && deadT > 0.25) reset();
  });
  addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- main loop ---------- */
  const view = { time: 0, dt: 0, ship: { x: 0, y: 0, z: 0, vx: 0, vy: 0, v: 0, visible: true, grounded: true }, groundY: 0, got: null, shake: 0, flash: 0, flashCol, fade: 1, attract: false };

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now; clock += dt;
    readInput();
    if (input.throttle > 0 && !touchMode || input.jump || input.steer || pilot) launch();
    if (mode === 'play') {
      acc += dt; const ev = [];
      while (acc >= C.DT && s.status === 0) {
        if (pilot) { const p = pilot[Math.floor(steps / 12)] || [0, 0, 1]; input.steer = p[0]; input.jump = !!p[1]; input.throttle = p[2]; }
        prev.x = s.x; prev.y = s.y; prev.z = s.z; SIM.step(L, s, input, ev); acc -= C.DT; steps++;
      }
      handle(ev);
      if (s.status === 2) onDeath(); else if (s.status === 1) onWin();
    } else if (mode === 'dead') {
      deadT += dt;
      if (s.cause === 'fall') { s.vy -= C.G * L.gravity * dt; s.y += s.vy * dt; s.z += s.v * dt * 0.4; }
      prev.x = s.x; prev.y = s.y; prev.z = s.z; acc = 0;
      if (deadT > 1.5) reset();
    } else if (mode === 'won') {
      wonT += dt;
      s.v = Math.min(C.VBOOST, s.v + 10 * dt); s.z += s.v * dt; s.vy += (5 - s.vy) * Math.min(1, dt * 1.5); s.y += s.vy * dt; s.vx *= Math.exp(-dt * 4); s.x += s.vx * dt;
      s.grounded = false; prev.x = s.x; prev.y = s.y; prev.z = s.z; acc = 0;
      if (wonT > 1.0 && !resultShown) { resultShown = true; show('result', true); (cur < LV.length - 1 ? $('bNext') : $('bRoutes')).focus(); }
    }
    shake *= Math.exp(-dt * 5); flash *= Math.exp(-dt * 6); fade = Math.min(1, fade + dt * 2.5);

    const sh = view.ship, attract = mode === 'title' || mode === 'select';
    if (attract) {
      const span = Math.max(30, L.finishZ - 170);
      sh.x = 0; sh.y = 0; sh.z = 12 + (clock * 13) % span; sh.vx = 0; sh.vy = 0; sh.v = 13; sh.visible = false; sh.grounded = true;
      view.groundY = null; view.got = null;
    } else {
      const a = mode === 'play' ? Math.min(1, acc / C.DT) : 1;
      sh.x = prev.x + (s.x - prev.x) * a; sh.y = prev.y + (s.y - prev.y) * a; sh.z = prev.z + (s.z - prev.z) * a;
      sh.vx = s.vx; sh.vy = s.grounded ? 0 : s.vy; sh.v = s.v; sh.visible = shipVisible; sh.grounded = s.grounded;
      view.groundY = mode === 'won' ? null : SIM.topUnder(L, s.x, s.z, s.y + 0.05, -Infinity);
      view.got = s.got;
    }
    view.time = clock; view.dt = mode === 'pause' ? 0 : dt; view.shake = shake; view.flash = flash; view.flashCol = flashCol; view.fade = fade; view.attract = attract;
    gfx.render(view);

    if (!attract) {
      $('time').textContent = fmt(s.t);
      $('prog').style.width = Math.max(0, Math.min(100, (s.z - 4.5) / (L.finishZ - 4.5) * 100)).toFixed(1) + '%';
      $('shards').textContent = s.shardCount + ' / ' + L.shards.length;
      $('spd').style.width = (s.v / C.VBOOST * 100).toFixed(1) + '%'; $('spdv').textContent = Math.round(s.v * 12);
      $('spdbar').classList.toggle('hot', s.v > C.VMAX + 0.5);
      $('chg').style.width = (s.energy * 100).toFixed(1) + '%'; $('chgv').textContent = Math.round(s.energy * 100) + '%';
      $('chgbar').classList.toggle('low', s.energy < 0.25);
    }
    SFX.engine(s.v / C.VMAX, mode === 'play' || mode === 'ready' || mode === 'won', s.v > C.VMAX + 0.5);
  }

  SFX.setMuted(save.muted); $('bMute').style.opacity = save.muted ? 0.4 : 1;
  gfx.setLevel(L, SECTORS[L.sector]); setAccent(L.sector);
  setMode('title');
  requestAnimationFrame(frame);

  window.__lumen = { get state() { return s; }, get mode() { return mode; }, startLevel, setPilot(p) { pilot = p; } };
})();
