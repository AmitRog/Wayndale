# Shorts factory

Animated vertical Shorts (1080x1920 @ 60 fps) for a hidden-engineering channel, produced by Claude
sessions with the `make-short` skill and approved by the owner before publishing.

```
shorts/
  channel/        BIBLE.md (channel rules) · topics.md (backlog + log) · ledger.csv (costs)
  src/engine/     the reusable engine: camera, math, mascot rig, fx, blueprint mode, captions, sound
  src/episodes/   one folder per episode (script.txt, words.json, Episode.tsx, props.tsx, meta.json)
  public/sfx/     synthesized SFX library (tools/sfx_synth.py)
  public/episodes/<ID>/  voice + any AI-generated cut-outs per episode
  scripts/render.mjs     bundle + render video / stills
  tools/          est_words, tts_elevenlabs, cutout, contact_sheet, qa, sfx_synth
```

Quick start:
```bash
npm ci
npx remotion studio src/index.ts            # interactive preview (ModelSheet shows every mascot pose)
node scripts/render.mjs E000-manhole-demo --preview
python3 -I tools/qa.py out/E000-manhole-demo-preview.mp4
```

Costs per Short (target): Higgsfield 0–8 credits (code-drawn props are free), ElevenLabs ≈ 300–400
characters, render ≈ 1 min.
