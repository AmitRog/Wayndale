# Publishing (approval → YouTube Shorts + Instagram Reels + TikTok)

## Current routing (2026-11-01, after testing)
| Platform | Route | Status |
|---|---|---|
| YouTube | Make.com YouTube app (verified Google app) | waiting for the owner's YouTube connection in Make |
| YouTube (fallback) | Composio `YOUTUBE_MULTIPART_UPLOAD_VIDEO` | unreliable: Composio's shared Google project hit its daily video-upload quota (HTTP 429, 966/day for all Composio users) |
| Instagram Reels | Composio Connect (`tools/composio_mcp.py`): `INSTAGRAM_POST_IG_USER_MEDIA` (REELS, video_url) → `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` | connected (creator account) |
| Facebook Page | Composio: `FACEBOOK_CREATE_VIDEO_POST` (page_id, file_url) | needs the Built This Way page + re-connect |
| TikTok | Higgsfield TikTok (owner confirms each post) or manual | not connected yet |

Per-video metadata lives in `src/episodes/<ID>/meta.json` under `youtube` / `instagram` / `facebook` / `tiktok`
(see the BIBLE's SEO rules). Videos are fetched from the public `renders` branch URL (`tools/publish.py --host-only`).

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
