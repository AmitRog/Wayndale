---
name: plan-week
description: Writers' room for the hidden-engineering Shorts channel – research, fact-check and script a batch of upcoming episodes (default 14) into shorts/channel/queue/ for the owner to approve, so daily production runs only animate. Use when asked to plan the week, fill the script queue, or when the weekly scheduled run fires.
---

# Plan the week (research + scripts, no animation)

Read `shorts/channel/BIBLE.md` and `shorts/channel/topics.md` first. Output goes to
`shorts/channel/queue/`, one file per script. Default batch = 14 (2 per day); the request may say otherwise.

## 1. Pick topics
- Take `idea` rows from topics.md, rotating categories (no two neighbours from the same category).
- Add fresh ideas to topics.md when the backlog runs low: everyday objects/infrastructure with a surprising,
  verifiable design reason. Avoid anything already `published`/`review`/queued. Use NexLev outlier search
  (`faceless_outliers_videos`, query about engineering/how-it-works Shorts) for inspiration on what works,
  never to copy a specific video.

## 2. Verify (per topic, before writing a word)
- Web research: the central claim confirmed by **2+ reliable, independent sources** (standards bodies,
  manufacturers, universities, government/transport agencies, museums, established encyclopedias or science
  outlets). Prefer primary sources. Note the exact URLs.
- Myth or contested → mark the topic `rejected` in topics.md with the reason; pick another.
- If several reasons exist, the script says "one big reason" or names the main one honestly.

## 3. Write each queue file `shorts/channel/queue/<YYYY-MM-DD>-<slug>.md`
```markdown
---
status: proposed        # proposed -> approved -> in-production -> produced (or rejected)
category: transport
topic_row: 1
title: Why Train Wheels Are Cone-Shaped
---
## Script (45–75 words)
<the narration, BIBLE rules: first line = the question naming frame 0; no hype, no "!", no "did you know">

## Visual concept
- Frame 0 (premise): …
- Hardy tries the obvious: … → gag: …
- Blueprint mode: what diagram, which 1–3 word labels, what moves
- Payoff on the last word: …
- Props: code-drawn list (flag any that need an AI image)

## Description
<1–2 sentences with the answer>
Sources: <url> · <url>
#shorts #engineering #howitworks

## Sources (with the specific fact each supports)
- <url> – …
```
Then set the topic row to `scripted` in topics.md.

## 4. Hand off
- Commit + push. Reply to the owner with a compact numbered list: title · one-line answer · category, and
  ask which to approve/change/drop. When they answer, set `status: approved` (or edit/reject) and push.
- Production runs (`make-short`) take the oldest `approved` file.
