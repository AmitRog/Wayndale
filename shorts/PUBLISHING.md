# Publishing (approval → YouTube)

Status: **not set up yet** – needs the YouTube channel connected in Make.com.

## Flow
1. The production session renders `out/<ID>.mp4`, sends it to the owner, and waits.
2. Owner replies "approve" (optionally with a publish time).
3. The session makes the MP4 reachable for Make (pushes it to the `renders` branch → raw GitHub URL),
   then runs the Make scenario **"Shorts → YouTube"** with
   `{video_url, title, description, tags, publish_at}` via the Make MCP `scenarios_run` tool.
4. Make: HTTP "Get a file" (video_url) → YouTube "Upload a video" (category Education, not made for
   kids, privacy `private` + `publishAt` for scheduled release, or `public`).
5. The session records the returned video id/link in `channel/topics.md`.

Why Make: its YouTube app is a verified Google app, so API uploads can go public (uploads from an
unverified personal API project are locked to private).

## Owner setup still needed
- Create the YouTube channel.
- Make → Connections → add **YouTube** for that channel (OAuth).
- Then ask Claude to build the scenario; Claude will create it via the Make tools and test it with an
  unlisted upload first.

Note: the GitHub repo is public, so a pushed render is publicly reachable by URL until it is removed.
Make the repo private (and give Make a GitHub token) if that matters.

Until then: download the MP4 Claude sends, upload it from the YouTube app, paste the title/description.
