---
name: make-short
description: Produce one finished YouTube Short for the hidden-engineering channel end to end – pick and fact-check a topic, write the script, generate the ElevenLabs voice with word timings, animate it with the Remotion engine and the code-rigged mascot Hardy, add SFX, QA, render 1080x1920@60, and hand it to the owner for approval. Use when asked to make/produce/create the next Short or episode, or when the daily scheduled run fires.
---

# Make a Short (hidden-engineering channel)

Everything lives in `shorts/` (Remotion project). Read `shorts/channel/BIBLE.md` first – it defines the
channel, the mascot, script rules and the quality bar. Engine API: `ENGINE.md` (next to this file).
The reference episode is `shorts/src/episodes/E000-manhole-demo/` – copy its structure.

Work in this order; each step says what "done" means. Don't skip QA. Don't ask the owner questions
mid-run – choose sensible defaults and report them at the end.

## 0. Preflight (2 min)
```bash
cd shorts && (test -d node_modules || npm ci) && npx tsc --noEmit
test -n "$ELEVENLABS_API_KEY" && echo "voice key ok" || echo "NO VOICE KEY"
curl -s -o /dev/null -w "%{http_code}\n" https://api.elevenlabs.io/v1/models   # 401 = reachable, 000/403 = blocked
```
- No key or host blocked → produce the episode anyway with estimated timings (`tools/est_words.py`), mark it
  **DRAFT – no voice** in the handoff, and tell the owner exactly what is missing. Never invent a voice file.
- If the episode needs AI props: check Higgsfield credits with the `balance` tool (budget ≤ 8 credits/episode).
- Done = typecheck passes; you know whether voice and image generation are available.

## 1. Topic (5 min)
- **First check the queue**: the oldest file in `shorts/channel/queue/` with `status: approved` is your episode
  (script, visual concept, sources and description are already written and fact-checked). Claim it at once:
  set `status: in-production`, commit, `git pull --rebase`, push – so a parallel run can't take the same one.
  Re-read the sources quickly; then skip to step 3 (keep the queued script unless something is wrong).
- Queue empty → open `shorts/channel/topics.md`, take the first `idea` whose category differs from the last
  produced one, set it to `in-progress`, commit + push to claim it.
- Research it on the web: confirm the central claim in **2+ reliable sources** (university, standards body,
  manufacturer, government, museum, established encyclopedia/science outlet). If it is a myth or too
  shaky, mark `rejected` with a one-line reason and take the next one.
- It must be visual with code-drawn props + one blueprint diagram, and explainable in ≤ 30 s.
- Done = topic chosen, 2–3 source URLs noted, one-sentence verified explanation.

## 2. Script (5 min)
- 45–75 words, follow the BIBLE script rules. First line = the question, naming what frame 0 shows.
- Structure: question → Hardy tries the obvious → what goes wrong → the real reason (blueprint) → payoff
  line that lands on the last word.
- Write it to `src/episodes/<ID>/script.txt` where `<ID>` = `E` + 3-digit number + `-` + short slug
  (next number after the highest in `src/episodes/`), e.g. `E001-train-wheels`.
- Re-read it aloud in your head: no hype words, no "!", no "did you know", every sentence adds info.
- Done = script.txt + word count.

## 3. Voice + word timings (2 min)
```bash
python3 -I tools/tts_elevenlabs.py --text-file src/episodes/<ID>/script.txt \
  --voice "$(python3 -I -c 'import json;print(json.load(open("channel/voice.json"))["voice"])' 2>/dev/null || echo Chris)" \
  --out public/episodes/<ID>/vo.mp3 --words src/episodes/<ID>/words.json
```
- First episode ever: run `--list-voices`, pick a natural conversational male voice (not deep, not a
  narrator), write `channel/voice.json` = `{"voice": "<name>", "voice_id": "<id>", "model": "<model>"}`.
- Listen-check by reading words.json: the timings must cover the whole script; total ≈ 15–30 s.
- Done = vo.mp3 + words.json; composition duration = last word end + 0.1 (voice offset) + ~0.8 s.

## 4. Beat sheet (5 min) – write it as the comment block at the top of Episode.tsx
| time anchor | words | on screen | gag | camera | sfx |
- One visual beat per line, landing on the exact word: `const T = {drop: W('slips') - 0.08, ...}`.
  Anchor EVERY beat to a word with `wordClock` – never hard-code seconds.
- Frame 0 states the premise like a thumbnail. One gag per beat a kid would laugh at (things come alive,
  open eyes, sweat, squash, bonk). Blueprint section for the "why". Payoff on the last word.
- Few hard cuts: continuous camera moves; a cut/wipe only for a new idea (blueprint in/out).

## 5. Props and set
- Reuse first: `src/library/` holds props/sets from earlier episodes. Generic things you draw (car, door,
  tree, table, building…) go into `src/library/` so the next episode can reuse them.
- Default: draw props in code (`src/episodes/<ID>/props.tsx`) in the house style: `C.ink` outlines
  (10 px main, 4–7 px details), flat fills from `C`, one soft shade, centred on (0, 0). Look at E000's
  `SquareCover` / `RoundCover` for the level of detail.
- Use Higgsfield only for complex set pieces you can't draw well in code (a ship, a helicopter, a
  skyscraper). Recipe in ENGINE.md → "AI props". Keep prompts + job ids in
  `episodes-src/<ID>/prompts.md`; final trimmed PNGs in `public/episodes/<ID>/`.
- Backgrounds: `Sky`, `Clouds`, `Skyline`, `Ground` from the engine, or a simple code-drawn interior.
- Done = every prop renders (check on the contact sheet), matching outline weight and palette.

## 6. Animate (the bulk)
Copy `E000-manhole-demo/Episode.tsx` as the template and adapt. Rules:
- Hardy: `pose = alive(t, track(t, base, keys), {seed})`; expressions from `EXPR`, arms from `ARMS`,
  mix freely (`{...EXPR.curious, ...ARMS.scratch}`); custom arm offsets are fine. Blend d = 0.12–0.35 s.
  Squash/stretch on actions (`squash()`), hops with `pulse()`, walk with `walkPhase()` + `walkAmp: 1`.
- Hardy holds props via `hold={{at: 'f' | 'b' | 'mid', dx, dy, rot, node}}` (node = SVG, rig units).
  On release, compute the world position with `handWorld()` at the release time and continue the prop
  in world space (`fall`, `arc`, `springOffset`) – no visible jump.
- Camera: `camAt(t, keys)` with `zoomZ(zoom)`; ease every move, glides ≥ 1 s, holds perfectly still;
  shake only on impacts (`shake()`). Keep Hardy + the object in frame; keep the top ~120 px and bottom
  380 px free of anything important.
- Blueprint mode: `CircleWipe` + `WipeRing` from the object's screen position (`toScreen`), then
  `BlueprintBG` + white line drawings, `Dim` lines, `BpText` labels, and `DrawLine`. ≤ 3 words per label.
- Effects: `Puffs` (smoke/steam/dust, shrink away – never fade outlined puffs), `Burst` on impacts,
  `Mark` for ?/!/✓, `SweatDrop`, `SpeedLines`.
- Never cross-fade two drawings, no random per-frame jitter, no motion blur. One focal action at a time.
- Captions: `<Captions words={words} t={t} y={470} />` – move y if the action is in the top third.
- Register the episode in `src/episodes/index.ts`.

## 7. Sound
- `<Sound voice="episodes/<ID>/vo.mp3" voiceAt={0.1} cues={[...]} />`. Library in `public/sfx/`:
  whoosh swish pop boing thud clang clang_far ding fall_whistle rise_whistle click scrape roll sparkle
  squeak step rumble (regenerate with `tools/sfx_synth.py`).
- Levels under the voice: whoosh/swish -22…-28 dB, impacts -12…-18, small pops/clicks -18…-26,
  beds -28…-32; a big impact can go to -8…-10 only inside a pause between words.
- Special sounds (engine, water, crowd…) may come from Higgsfield `generate_audio` (sound-effect models);
  otherwise skip rather than use something wrong.

## 8. QA (never skip)
```bash
npx tsc --noEmit
node scripts/render.mjs <ID> --stills-only --stills <every beat time, comma-separated>
python3 -I tools/contact_sheet.py out/stills/<ID> out/<ID>-sheet.jpg
```
- **Look at the sheet** (Read the jpg). Check: frame 0 premise reads instantly; Hardy and the object are
  in frame and not covered by captions; props match the style; blueprint labels readable; last frame OK.
  Fix and repeat until clean.
```bash
node scripts/render.mjs <ID> --preview && python3 -I tools/qa.py out/<ID>-preview.mp4
```
- Every pop-scan event must be an intended wipe/cut/impact shake; investigate anything else
  (extract frames with ffmpeg around the time and look).
- Final: `node scripts/render.mjs <ID>` then `python3 -I tools/qa.py out/<ID>.mp4` → must report
  1080x1920, 60 fps, audio present, no unexplained events, motion at the end.

## 9. Package and hand off for approval
- Write `src/episodes/<ID>/meta.json`:
  `{"id", "title", "description", "tags": [], "sources": [], "voice", "duration", "credits": {"higgsfield": n, "elevenlabs_chars": n}}`
  following the BIBLE title/description rules.
- Update `channel/topics.md` (status `review`, date, title), set the queue file to `status: produced`,
  and append to `channel/ledger.csv`.
- Always `git pull --rebase` before pushing (other runs may have pushed); resolve conflicts in the
  append-only files (topics.md, ledger.csv, episodes/index.ts) by keeping both sides.
- Commit source files (never `out/`, `build/`, `node_modules/`, API keys) and push to the working branch.
- Send the MP4 to the owner with `SendUserFile` (display: render) and, in the reply, the title,
  description, sources and anything you were unsure about. Ask: approve / change something / reject.
- Do NOT upload or publish anything without the owner's explicit approval in this conversation.

## 10. After approval
- Publishing is done through the owner's Make.com YouTube scenario (see `shorts/PUBLISHING.md`).
  If it isn't set up yet, give the owner the title/description to paste and the file to upload.
- Then set the topic to `published` with the link.
