# Lumen Drift

A void-road racer for the browser: pilot a hover-ship down floating roads in space, jump the gaps,
and reach the gate before your charge runs out. An original game in the spirit of the classic
"space road" jumpers of the early '90s, with a modern look — WebGL2, HDR bloom, glass tiles,
a procedural sky and a synthesized soundtrack.

**Play:** open `index.html` in any modern browser. No build step, no dependencies, no assets.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Throttle / brake | `↑` / `↓` (or `W` / `S`) | auto-throttle, `BRAKE` button |
| Steer | `←` / `→` (or `A` / `D`) | `◀` `▶` buttons |
| Jump (hold to keep hopping) | `Space` | `JUMP` button |
| Restart | `R` | tap after a crash |
| Pause | `Esc` or `P` | pause button |
| Mute | `M` | ♫ button |

## How it plays

- Nine routes across three sectors, each sector with its own gravity: standard, heavy and low.
- Speed is yours to manage. Jump distance depends on how fast you are going, so sometimes the
  right move is to lift off early or ease off the throttle.
- Hitting a wall at speed, touching plasma, or dropping into the void destroys the ship.
- Your charge drains over time; recharge pads refill it.
- Shards are optional pickups. Finish times earn bronze, silver or gold; best runs are saved locally.

| Tile | Effect |
| --- | --- |
| Green chevrons | Boost strip — pushes you past top speed |
| Yellow squares | Launch pad — throws you into a long jump |
| Blue rings | Recharge pad |
| Violet dots | Drag field — slows you down |
| Red plasma | Lethal |
| Raised blocks | Walls to dodge, or platforms if you jump onto them |
| Glass roofs | Cap your jump from below; can be driven on from above |

## Project layout

```
index.html        markup, styles, HUD and menus
js/sim.js         deterministic fixed-step physics (also runs in Node)
js/levels.js      sector palettes and the level maps (plain-text rows, 7 lanes wide)
js/gfx.js         WebGL2 renderer
js/sfx.js         Web Audio synth: engine, effects, music
js/game.js        game loop, input, HUD, menus, save data
tools/solve.js    dev tool: proves every level can be finished and sets medal par times
```

### Editing levels

Maps in `js/levels.js` are rows of seven characters, first row at the start line, with an optional
`xN` repeat. The legend is at the top of that file. After changing a map, run

```
node tools/solve.js --write-par
```

It searches the real physics for a way through every level, fails loudly if one is impossible, and
stores the fast time used for the medal thresholds.
