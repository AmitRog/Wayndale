#!/usr/bin/env python3
"""Voice-over + exact word timings from ElevenLabs in one call (no Whisper needed).

Needs env var ELEVENLABS_API_KEY and network access to api.elevenlabs.io.

  python3 -I tools/tts_elevenlabs.py --list-voices
  python3 -I tools/tts_elevenlabs.py --text-file script.txt --voice "Chris" \
      --out public/episodes/<slug>/vo.mp3 --words src/episodes/<slug>/words.json

Word times are relative to the start of the audio file. Never print or commit the API key.
"""
import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request

API = 'https://api.elevenlabs.io/v1'


def call(method, path, body=None):
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        sys.exit('ELEVENLABS_API_KEY is not set (add it in the environment settings, not in chat).')
    req = urllib.request.Request(API + path, method=method, headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'application/json'})
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=180) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'ElevenLabs HTTP {e.code}: {e.read()[:500]!r}')


def list_voices():
    for v in call('GET', '/voices').get('voices', []):
        labels = v.get('labels') or {}
        print(f"{v['voice_id']}  {v['name']:<32} {labels.get('gender', ''):<7} {labels.get('accent', ''):<12} {labels.get('description', labels.get('descriptive', ''))}")


def resolve_voice(name_or_id):
    voices = call('GET', '/voices').get('voices', [])
    for v in voices:
        if v['voice_id'] == name_or_id or v['name'].lower().startswith(name_or_id.lower()):
            return v['voice_id'], v['name']
    sys.exit(f'voice {name_or_id!r} not found; run --list-voices')


def words_from_alignment(al):
    chars = al['characters']
    st = al['character_start_times_seconds']
    en = al['character_end_times_seconds']
    words, cur, s0, e0 = [], '', None, None
    for c, s, e in zip(chars, st, en):
        if c.isspace():
            if cur:
                words.append({'w': cur, 's': round(s0, 3), 'e': round(e0, 3)})
            cur, s0 = '', None
            continue
        if s0 is None:
            s0 = s
        cur += c
        e0 = e
    if cur:
        words.append({'w': cur, 's': round(s0, 3), 'e': round(e0, 3)})
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list-voices', action='store_true')
    ap.add_argument('--text-file')
    ap.add_argument('--voice', default='Chris')
    ap.add_argument('--model', default='eleven_multilingual_v2')
    ap.add_argument('--stability', type=float, default=0.45)
    ap.add_argument('--similarity', type=float, default=0.8)
    ap.add_argument('--style', type=float, default=0.15)
    ap.add_argument('--speed', type=float, default=1.05)
    ap.add_argument('--out')
    ap.add_argument('--words')
    a = ap.parse_args()
    if a.list_voices:
        return list_voices()
    text = open(a.text_file).read().strip()
    vid, vname = resolve_voice(a.voice)
    body = {
        'text': text,
        'model_id': a.model,
        'voice_settings': {'stability': a.stability, 'similarity_boost': a.similarity, 'style': a.style, 'use_speaker_boost': True, 'speed': a.speed},
    }
    res = call('POST', f'/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128', body)
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    with open(a.out, 'wb') as f:
        f.write(base64.b64decode(res['audio_base64']))
    al = res.get('alignment') or res.get('normalized_alignment')
    words = words_from_alignment(al)
    os.makedirs(os.path.dirname(a.words) or '.', exist_ok=True)
    json.dump(words, open(a.words, 'w'), indent=1)
    print(f'voice={vname} ({vid}) model={a.model} chars={len(text)} words={len(words)} dur={words[-1]["e"]:.2f}s')


if __name__ == '__main__':
    main()
