#!/usr/bin/env python3
"""Publish an APPROVED Short: host the MP4 on the `renders` branch, book a time slot, and hand it to
the owner's Make.com scenario (YouTube Shorts + Instagram Reels [+ TikTok]) through a webhook.

  python3 -I tools/publish.py <ID> [--publish-at 2026-11-03T22:00:00Z | --slot auto] [--dry-run]

Only run after the owner explicitly approved this exact video in the conversation.
Needs env MAKE_PUBLISH_WEBHOOK (Make custom-webhook URL, stored as an environment secret – never
commit or print it) and network access to hook.eu2.make.com. Works without any MCP connector.
"""
import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

SHORTS = Path(__file__).resolve().parents[1]
REPO = SHORTS.parent
RAW = 'https://raw.githubusercontent.com/AmitRog/Wayndale/renders/{name}'
SLOTS_UTC = ['17:00', '22:00']  # = 12:00 and 17:00 New York (winter); 2 Shorts/day
SCHEDULE = SHORTS / 'channel' / 'schedule.json'
WT = Path('/tmp/renders-worktree')


def git(*args, cwd=REPO):
    return subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


def host(mp4: Path, name: str, dry: bool) -> str:
    subprocess.run(['git', 'worktree', 'remove', '--force', str(WT)], cwd=REPO, capture_output=True)
    if WT.exists():
        shutil.rmtree(WT)
    git('worktree', 'prune')
    exists = bool(git('ls-remote', '--heads', 'origin', 'renders'))
    if exists:
        git('fetch', 'origin', 'renders:refs/remotes/origin/renders')
        git('worktree', 'add', '--force', '-B', 'renders', str(WT), 'origin/renders')
    else:
        git('worktree', 'add', '--detach', str(WT))
        git('checkout', '--orphan', 'renders', cwd=WT)
        git('rm', '-rf', '--quiet', '.', cwd=WT)
        (WT / 'README.md').write_text('Rendered Shorts waiting to be published by the Make scenario.\n')
        git('add', 'README.md', cwd=WT)
    shutil.copy2(mp4, WT / name)
    git('add', name, cwd=WT)
    git('commit', '-q', '-m', f'Render {name}', cwd=WT)
    if not dry:
        git('push', '-q', 'origin', 'renders', cwd=WT)
    git('worktree', 'remove', '--force', str(WT))
    return RAW.format(name=name)


def next_slot() -> str:
    booked = json.loads(SCHEDULE.read_text()) if SCHEDULE.exists() else []
    now = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)
    day = now.date()
    for _ in range(60):
        for hhmm in SLOTS_UTC:
            h, m = map(int, hhmm.split(':'))
            t = dt.datetime(day.year, day.month, day.day, h, m, tzinfo=dt.timezone.utc)
            iso = t.strftime('%Y-%m-%dT%H:%M:%SZ')
            if t > now and iso not in booked:
                return iso
        day += dt.timedelta(days=1)
    sys.exit('no free slot found')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('id')
    ap.add_argument('--publish-at')
    ap.add_argument('--slot', choices=['auto'])
    ap.add_argument('--platforms', default='youtube,instagram,tiktok')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--host-only', action='store_true', help='only push the MP4 to the renders branch and print its URL')
    a = ap.parse_args()
    if a.host_only:
        mp4 = SHORTS / 'out' / f'{a.id}.mp4'
        print(host(mp4, f'{a.id}.mp4', a.dry_run))
        return

    meta = json.loads((SHORTS / 'src' / 'episodes' / a.id / 'meta.json').read_text())
    mp4 = SHORTS / 'out' / f'{a.id}.mp4'
    if not mp4.exists():
        sys.exit(f'missing {mp4} – render it first')
    hook = os.environ.get('MAKE_PUBLISH_WEBHOOK')
    if not hook and not a.dry_run:
        sys.exit('MAKE_PUBLISH_WEBHOOK is not set – ask the owner to add it in the environment settings (not in chat).')

    publish_at = a.publish_at or (next_slot() if a.slot == 'auto' else '')
    url = host(mp4, f'{a.id}.mp4', a.dry_run)
    payload = {
        'id': a.id,
        'video_url': url,
        'title': meta['title'],
        'description': meta['description'],
        'tags': meta.get('tags', []),
        'publish_at': publish_at,
        'privacy': 'private' if publish_at else 'public',
        'category_id': '27',
        'made_for_kids': False,
        'platforms': a.platforms.split(','),
    }
    print(json.dumps({k: v for k, v in payload.items() if k != 'description'}, indent=1))
    if a.dry_run:
        print('dry run: nothing pushed or sent')
        return
    req = urllib.request.Request(hook, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=120) as r:
        print('make:', r.status, r.read()[:300].decode(errors='replace'))
    if publish_at:
        booked = json.loads(SCHEDULE.read_text()) if SCHEDULE.exists() else []
        SCHEDULE.write_text(json.dumps(sorted(set(booked + [publish_at])), indent=1) + '\n')
        print('booked slot', publish_at, '-> commit channel/schedule.json')


if __name__ == '__main__':
    main()
