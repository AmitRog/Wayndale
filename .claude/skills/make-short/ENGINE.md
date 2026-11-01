# Engine reference (`shorts/src/engine`, import from `'../../engine'`)

Coordinates: author everything on the Z = 1000 plane in plain 1080x1920 screen pixels (camera at
(540, 960, 0) shows them 1:1). Times in seconds (`const t = useTime()`). y grows downward.

## Time & words
- `useTime()` → seconds. `offsetWords(words, 0.1)` (voice starts at 0.1 s).
- `wordClock(words)` → `W(word, nth = 1, edge = 's' | 'e')` start/end time; throws if missing.

## Math (`math.ts`)
- `clamp, lerp, invLerp, remap`; `EASE[name]`: linear in out inOut inOutSine outQuint outBack inBack outElastic hold.
- `prog(t, t0, dur, ease)` eased 0..1 · `pulse(t, t0, dur)` 0→1→0 · `kf(t, [{t, v, e}])` keyframes.
- `track(t, base, [{t, p: Partial, d, e}])` – pose/parameter track; overlapping keys never pop.
- `springOffset(t, t0, amp, freq = 3, zeta = .32)` · `squash(t, [{t, amt}])` → `{sx, sy}` volume-preserving.
- `arc(t, t0, dur, from, to, apex = .5)` ballistic path · `fall(t, t0, y0, g = 4200, vy0)` · `rng(seed)`.
- `shake(t, [{t, amp, decay}])` → `{x, y, r}` – add to the camera.

## Camera (`camera.tsx`)
- `camAt(t, [{t, x, y, z, e}])` – zoom interpolated in log space. `zoomZ(1.25)` → z for 1.25x.
- `<Scene cam={cam}> <Layer z={1000}>…</Layer> </Scene>`; far layers: z 2600 (city), 4200 (clouds);
  near foreground z ≈ 650. `blur` prop for depth of field on close-ups (2.5–3.6 px).
- `toScreen(cam, x, y, z = 1000)` → screen point (for wipes/overlays that track the world).
- `spanAt(z)` world width visible at depth z.

## Placement (`place.tsx`)
- `<At x y rot sx sy opacity>` positions children; children draw around their own (0, 0).
- `<Svg>` overflow-visible SVG at (0, 0) of its parent.
- `<Sprite src="episodes/<ID>/thing.png" x y w h ax ay rot sx sy>` image cut-out (anchor default bottom-centre).
- `<Shadow x y rx ry opacity>` contact shadow.

## World (`world.tsx`)
- `<Sky top bottom>` screen-space gradient · `<Ground y>` asphalt band with outline ·
  `<Skyline y x0 x1 seed>` procedural city · `<Clouds t items=[{x, y, s}]>` drifting outlined clouds.

## Mascot Hardy (`mascot/`)
- `<Mascot pose facing={1|-1} scale hold={{at: 'f'|'b'|'mid', dx, dy, rot, node: <svg content/>}} />`
  Origin = between the feet. Height ≈ 430 px × scale (1.0–1.2 for wide shots).
- `BASE_POSE` + `EXPR.{neutral happy joy curious thinking surprised shocked scared worried smug proud angry wince deadpan}`
  + `ARMS.{down hips shrug cheer wave point pointUp scratch chin hold holdHigh holdOut windup release oops run}`.
- Pose fields (all numbers): sx sy lean bob · turn lookX lookY blink eyeOpen squint arcEyes · browY
  browTilt browAsym · mouthOpen smile mouthW tongue blush · fx fy fb / bx by bb (hand offsets from
  shoulders, +x outward, +y down; b* = bend) · fOpen bOpen · walk walkAmp stance · hatLift hatTilt.
- `alive(t, pose, {seed})` adds breathing, blinks and walk bob – always apply last.
- `walkPhase(t, t0, stepsPerSec)` for `walk`; move the `At` x yourself.
- `handWorld(pose, 'f'|'b'|'mid', {x, y}, facing, scale)` world point of a hand (for releases/throws).
- Hat gag: `hatLift` (pop the hat up) + `hatTilt`.

## Effects (`fx/`)
- `<Puffs t t0 x y count every life r=[min,max] spread vx vy fill seed>` smoke/steam/dust (merged outline).
- `<Burst t t0 x y size life fill>` impact star · `<Mark t t0 dur x y text size color rot>` ? ! ✓ pop-ups.
- `<SweatDrop t t0 x y dur scale>` · `<SpeedLines x y dir len opacity>`.

## Blueprint mode (`blueprint.tsx`, screen space)
- `<CircleWipe t t0 dur x y reverse>children</CircleWipe>` + `<WipeRing … reverse>` lens edge.
- `<BlueprintBG t>` grid · `<DrawLine a b u color width dash>` · `<Dim a b u label offset size>` dimension
  line · `<BpText x y text size u color>` labels. Draw diagrams in an `<svg width={1080} height={1920}>`.
- Morph shapes by interpolating parameters (see `superellipse` in E000 props).

## Captions & sound
- `<Captions words t y={470} size={96} hide>` – 1–3 word chunks, current word yellow.
- `<Sound voice="episodes/<ID>/vo.mp3" voiceAt={0.1} cues={[{src: 'sfx/pop.wav', at, db, dur, rate}]} />`.

## Frame
- Wrap the episode in `<Frame>` (waits for fonts; `guides` prop overlays the Shorts UI danger zones).

## AI props (Higgsfield) – only when code can't draw it well
1. `generate_image` / `generate_image_batch` with `model: "gpt_image_2_5"`, `resolution: "2k"`,
   `quality: "medium"` (≈1 credit; preflight with `get_cost: true`), `background: "transparent"`,
   aspect 1:1 props / 3:2 wide set pieces / 2:3 tall. Prompt = what it is + framing + this STYLE block:
   "Flat 2D cartoon prop in a clean vector style: thick smooth dark-navy (#1F2A44) outlines of even
   weight, flat colours with one simple soft shade on one side, no texture, no gradients, no text, no
   logos, no border, no characters. Isolated on a fully transparent background: no sky, no ground, no shadow."
   For a second picture that must match the first, pass the first job id in `medias` (role `image_references`).
2. `jobs_wait` → result URL → `curl -sSL -o episodes-src/<ID>/raw/<name>.png <url>`. If the proxy blocks the
   host, tell the owner which domain to allow and fall back to a code-drawn prop.
3. `python3 -I tools/cutout.py trim episodes-src/<ID>/raw/<name>.png public/episodes/<ID>/<name>.png`
   (prints size for `<Sprite w h>`), then `python3 -I tools/cutout.py sheet public/episodes/<ID> out/<ID>-cutouts.jpg`
   and look at it: no half-transparent fills, no halo. Glitch → regenerate with `background: "opaque"` on a
   flat #9BCFFD background and `tools/cutout.py key in.png out.png`.
