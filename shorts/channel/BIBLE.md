# Channel bible

The single source of truth for what this channel is. Every episode follows it.

## Concept
**Hidden engineering** — the clever reason behind things people see every day but never question.
"Why is it built like that?" answered in 15–30 seconds with a cartoon gag and a blueprint reveal.

Categories (rotate, never two in a row from the same one):
streets & cities · home & kitchen · transport (cars, trains, planes, ships) · buildings & bridges ·
everyday objects · safety features · ancient engineering · accidental inventions · tools & materials.

Audience: curious adults and teens, US/UK first, no prior knowledge needed.

## Channel name
**Built This Way** (chosen by the owner, 2026-11-01). Mascot: Hardy.

## Cadence & distribution
- 2 Shorts per day (morning + evening US time); revisit after two weeks of data (3/day if quality holds).
- Every approved Short goes to **YouTube Shorts**, **TikTok** and **Instagram Reels** (same file, same
  title; hashtags adapted per platform).
- Weekly writers' room (`plan-week`) fills `channel/queue/`; production runs (`make-short`) animate the
  oldest approved script. The owner approves scripts weekly and videos before publishing.

## The mascot: Hardy
- Teal bean with a yellow hard hat (drawn in code: `src/engine/mascot/`). Never redraw or restyle him.
- Personality: curious, a little over-confident, tries the "obvious" idea first, gets surprised by the
  real reason, ends delighted. Slapstick happens TO him, never mean, never gross.
- Hardy does not speak. A narrator voice tells the story; Hardy acts it out.

## Episode formula (15–30 s, 45–75 spoken words)
1. **Frame 0 = the premise**, readable like a thumbnail: Hardy + the object + the setting. The first spoken
   line is the question and names what is on screen. No intro, no greeting, no "did you know".
2. **Hardy tries the obvious idea** → it goes wrong (the gag) or the object reacts.
3. **Blueprint mode** (circle "lens" wipe into blueprint blue) shows the real mechanism with white
   line diagrams, dimension lines and 1–3 word labels.
4. **Payoff**: back in the cartoon world, the real design works; a satisfying final gag on the last word.
5. Last frame flows back into the first when possible (loop).

## Script rules
- Plain conversational English, short connected sentences that sound good aloud ("so", "basically", "right?").
- Every sentence adds information. Build curiosity, then a clear satisfying answer near the end.
- No hype words (incredible, insane, shocking, mind-blowing), no "!" lines, no narrator clichés
  ("here's the thing", "but here's the part"), no calls to action, no AI-sounding phrases.
- **Facts must be true.** Verify the central claim in 2+ reliable sources (universities, museums, standards
  bodies, government agencies, manufacturers, established encyclopedias/science outlets). Keep real
  uncertainty ("one big reason is…" when there are several). Cartoon exaggeration is fine in the
  animation, never in the narration. No medical or health advice topics.
- Original wording; never copy another creator's script or idea list verbatim.

## Visual identity (enforced by the engine)
- Flat colours, one soft shade, thick dark-navy outlines (`C.ink`), never pure black.
- Palette in `src/engine/palette.ts`; captions in Fredoka 700, white with navy outline, current word yellow.
- Blueprint mode = `C.bp` blue, white lines, yellow (`C.bpAccent`) dimensions/highlights.
- Captions sit at y≈450–560 (top third) unless the action is there; nothing important in the bottom
  380 px or the right 150 px (Shorts UI).
- Props: code-drawn SVG in the same style first. AI images (Higgsfield) only for complex set pieces,
  prompted to match this style.

## Sound
- Narrator: one consistent natural, conversational male voice (not a deep "narrator" voice).
  Chosen voice is recorded in `channel/voice.json` after the first episode.
- SFX on every action (whoosh on throws, pop on appear, clang/thud on impacts), quiet under the voice;
  big sounds go into pauses. No music for now.

## Titles, descriptions, tags (per platform – stored in meta.json)
- YouTube: title ≤ 55 chars (the question or the surprising answer); description = 2–3 sentence answer,
  `Sources:` with 2–3 named links, the channel line, then 3–5 hashtags starting with #shorts;
  15–20 tags (total < 500 chars): topic words people search ("toothpaste color code"), the object,
  the category, myth/how-it-works phrasing, plus "engineering", "how it works", "Built This Way".
  Category Education (27), language en, not made for kids.
- Instagram: hook line + one-sentence answer + "Follow for the hidden engineering behind everyday things 🔧"
  + 6–8 hashtags (topic + #engineering #howitworks #science #didyouknow #learnonreels).
- Facebook: same as Instagram with 3–4 hashtags. TikTok: ≤ 150 chars, hook + answer + 3–4 hashtags
  incl. #learnontiktok.

## Titles, descriptions, tags (general rules)
- Title ≤ 55 characters, the question or a curiosity statement, no false clickbait:
  "Why Manhole Covers Are Round", "The Tiny Hole That Stops Gas Pumps".
- Description: 1–2 plain sentences with the answer, then `Sources:` with 1–3 links, then
  `#shorts #engineering #howitworks`.
- Tags: object, category, "engineering", "how it works", "why is".

## Quality bar (do not publish below it)
- Every visual beat lands on its word; no cross-fades between drawings, no jitter, no frozen frames.
- The reveal is understandable with the sound off (captions + diagram).
- 1080x1920, 60 fps, voice present, peak around -4 dBFS, no clipping.
- A human (the channel owner) approves every video before it goes public.
