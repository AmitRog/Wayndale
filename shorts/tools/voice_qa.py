#!/usr/bin/env python3
"""Whisper-style check of a generated voice-over: transcribe it with ElevenLabs Scribe (speech-to-text,
same API/network secret as the voice) and compare with the script. Catches skipped, repeated or
garbled words before animating.

  python3 -I tools/voice_qa.py public/episodes/<ID>/vo.mp3 src/episodes/<ID>/script.txt [--words-out file]
Exit code 1 if the word error rate is above 8 %.
"""
import argparse
import difflib
import json
import re
import sys
import urllib.error
import urllib.request
import uuid

URL = 'https://api.elevenlabs.io/v1/speech-to-text'


def transcribe(path, model='scribe_v1'):
    boundary = uuid.uuid4().hex
    parts = []
    for name, value in (('model_id', model), ('timestamps_granularity', 'word'), ('language_code', 'en'), ('tag_audio_events', 'false')):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    audio = open(path, 'rb').read()
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="vo.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode() + audio + b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    req = urllib.request.Request(URL, data=b''.join(parts), method='POST', headers={'Content-Type': f'multipart/form-data; boundary={boundary}', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'Scribe HTTP {e.code}: {e.read()[:300]!r}')


norm = lambda s: [w for w in re.sub(r"[^a-z0-9' ]", ' ', s.lower().replace('’', "'")).split() if w]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('audio')
    ap.add_argument('script')
    ap.add_argument('--model', default='scribe_v1')
    ap.add_argument('--words-out')
    a = ap.parse_args()
    res = transcribe(a.audio, a.model)
    heard = res.get('text', '')
    ref, hyp = norm(open(a.script).read()), norm(heard)
    sm = difflib.SequenceMatcher(a=ref, b=hyp)
    errors = sum(max(i2 - i1, j2 - j1) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal')
    wer = errors / max(1, len(ref))
    print(f'heard: {heard}')
    print(f'word error rate: {wer:.1%} ({errors} of {len(ref)} words)')
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op != 'equal':
            print(f'  {op}: script "{" ".join(ref[i1:i2])}" -> heard "{" ".join(hyp[j1:j2])}"')
    if a.words_out:
        words = [{'w': w['text'], 's': round(w['start'], 3), 'e': round(w['end'], 3)} for w in res.get('words', []) if w.get('type') == 'word']
        json.dump(words, open(a.words_out, 'w'), indent=1)
        print(f'wrote {len(words)} word timings to {a.words_out}')
    sys.exit(1 if wer > 0.08 else 0)


if __name__ == '__main__':
    main()
