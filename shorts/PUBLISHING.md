# Publishing (approval → YouTube Shorts + Instagram Reels + TikTok)

Status: **waiting for owner setup** (YouTube channel + Make connections + webhook secret).

## Flow (no MCP connectors needed – works from scheduled runs)
1. The production run renders `out/<ID>.mp4`, sends it to the owner, waits for "approve".
2. `python3 -I tools/publish.py <ID> --slot auto`
   - pushes the MP4 to the `renders` branch → public raw URL
   - books the next free slot (17:00 or 22:00 UTC = 12:00 / 17:00 New York) in `channel/schedule.json`
   - POSTs `{id, video_url, title, description, tags, publish_at, privacy, category_id, made_for_kids, platforms}`
     to the Make custom webhook in env `MAKE_PUBLISH_WEBHOOK`.
3. Make scenario **"Built This Way – publish"**: Webhook → HTTP *Get a file* (video_url) →
   YouTube *Upload a video* (privacy private + publishAt = scheduled release; Education; not made for kids)
   → Instagram for Business *Create a Reel* → TikTok (if a working module/connection exists).
4. The session records the returned links in `channel/topics.md`.

Why Make: its YouTube app is a verified Google app, so API uploads can go public (uploads from an
unverified personal API project are locked to private).

## Owner setup
1. Create the YouTube channel "Built This Way" (avatar + banner in `shorts/brand/`).
2. Make → Connections: **YouTube** (that channel); **Instagram for Business** (needs an Instagram
   professional account linked to a Facebook page); TikTok if available.
3. Ask Claude (in a session that has the Make connector) to build the scenario; it creates the webhook
   and tests with an unlisted/private upload first.
4. Environment settings: add the webhook URL as secret/env `MAKE_PUBLISH_WEBHOOK`, and allow
   `hook.eu2.make.com` in Allowed domains.

Note: the repo is public, so a pushed render is reachable by URL until it is removed (the `renders`
branch can be wiped any time after Make has uploaded).
