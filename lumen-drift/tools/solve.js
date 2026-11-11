#!/usr/bin/env node
/* Dev tool: proves each level can be finished and estimates a fast time.
   Usage: node tools/solve.js [levelIndex] [--full] [--write-par] [--path]
   --full allows braking (slower search), --write-par stores the fast times in js/levels.js as medal pars */
const SIM = require('../js/sim.js');
const { LEVELS } = require('../js/levels.js');
const C = SIM.C;
const CHUNK = 12;          // physics steps per decision (0.1 s)
const BEAM = 4000;

function solve(L, full) {
  let seed = 12345;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;   // deterministic

  const actions = [];
  for (const steer of [0, -1, 1]) for (const jump of [false, true]) for (const throttle of full ? [1, -1] : [1])
    actions.push({ steer, jump, throttle });
  let beam = [{ s: SIM.newState(L, false), path: null }];
  const seen = new Set();
  let far = 0, farState = null;
  for (let layer = 0; layer < 1500 && beam.length; layer++) {
    const next = [];
    for (const node of beam) {
      for (const a of actions) {
        if (a.jump && !node.s.grounded) continue;
        const s = Object.assign({}, node.s);
        for (let i = 0; i < CHUNK && s.status === 0; i++) SIM.step(L, s, a, null);
        if (s.status === 2) continue;
        if (s.status === 1) return { ok: true, time: s.t, energy: s.energy, path: { a, prev: node.path } };
        const key = Math.floor(s.z / 1.0) + ',' + Math.round(s.x / 0.5) + ',' + Math.round(s.y / 0.25) + ',' +
          Math.round(s.vy / 3) + ',' + Math.round(s.v / 4) + ',' + Math.round(s.vx / 8);
        if (seen.has(key)) continue;
        seen.add(key);
        if (s.z > far) { far = s.z; farState = s; }
        next.push({ s, path: { a, prev: node.path } });
      }
    }
    next.sort((p, q) => q.s.z - p.s.z);
    if (next.length > BEAM) {
      const keep = next.slice(0, BEAM * 0.8 | 0), rest = next.slice(keep.length);
      for (let i = 0; i < BEAM * 0.2 && rest.length; i++) keep.push(rest.splice(rnd() * rest.length | 0, 1)[0]);
      beam = keep;
    } else beam = next;
  }
  return { ok: false, far, row: Math.floor(far / C.TILE_L), farState };
}

const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), full = args.includes('--full'), writePar = args.includes('--write-par'), dump = args.includes('--path');
const pars = {};
const only = args.find(a => /^\d+$/.test(a));
let bad = 0;
LEVELS.forEach((def, i) => {
  if (only !== undefined && +only !== i) return;
  const L = SIM.parseLevel(def), t0 = Date.now();
  let r = solve(L, full);
  if (!r.ok && !full) r = solve(L, true);
  if (r.ok) {
    pars[def.name] = r.time;
    if (dump) { const acts = []; for (let n = r.path; n; n = n.prev) acts.unshift(n.a); console.log('PATH ' + JSON.stringify(acts.map(a => [a.steer, a.jump ? 1 : 0, a.throttle]))); }
  }
  if (r.ok) console.log(`${i + 1}. ${def.name.padEnd(16)} rows ${String(L.n).padStart(3)}  shards ${String(L.shards.length).padStart(2)}  fast ${r.time.toFixed(2)}s  charge left ${(r.energy * 100).toFixed(0)}%  (${Date.now() - t0} ms)`);
  else { bad++; if (process.env.DEBUG) console.log(r.farState); console.log(`${i + 1}. ${def.name.padEnd(16)} rows ${L.n}  STUCK at row ${r.row}: "${L.cells[r.row]}" next "${L.cells[r.row + 1]}"`); }
});
if (writePar && !bad) {
  const file = path.join(__dirname, '../js/levels.js');
  let src = fs.readFileSync(file, 'utf8');
  for (const name in pars) src = src.replace(new RegExp("(name: '" + name + "'[^\\n]*par: )[\\d.]+"), '$1' + pars[name].toFixed(1));
  fs.writeFileSync(file, src);
  console.log('par times written');
}
process.exit(bad ? 1 : 0);
