# Wayndale – animated Shorts factory

`shorts/` holds a YouTube Shorts factory for a "hidden engineering" channel: a Remotion 4 engine with a
code-rigged mascot (Hardy), blueprint-mode explainers, word-synced captions and SFX.

- Make an episode: follow the `make-short` skill (`.claude/skills/make-short/SKILL.md`, API in `ENGINE.md`).
- Channel rules: `shorts/channel/BIBLE.md` · topics & log: `shorts/channel/topics.md` · costs: `shorts/channel/ledger.csv`.
- Commands (in `shorts/`): `npm ci` · `npx tsc --noEmit` · `node scripts/render.mjs <CompId> [--preview | --stills t1,t2 --stills-only]`
  · `python3 -I tools/contact_sheet.py out/stills/<CompId> out/<CompId>-sheet.jpg` · `python3 -I tools/qa.py out/<file>.mp4`.
- Rendering uses the pre-installed headless Chromium (`REMOTION_BROWSER` overrides the path); ~40 s per 20 s Short at 1080p60 on 4 CPUs.
- Voice: `tools/tts_elevenlabs.py` reads `ELEVENLABS_API_KEY` from the environment – never ask for keys in chat, never commit them.
- Never commit `out/`, `build/`, `node_modules/`. Nothing is uploaded or published without the owner's explicit approval.
