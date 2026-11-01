#!/usr/bin/env python3
"""Minimal MCP (streamable HTTP) client for Composio Connect – lets code (and scheduled runs without
connectors) use the owner's connected YouTube / Instagram / Facebook / TikTok accounts.

Auth: an environment network secret for connect.composio.dev that injects the header
`x-consumer-api-key: ck_...` (the key never reaches this code).

  python3 -I tools/composio_mcp.py tools                       # list the MCP tools
  python3 -I tools/composio_mcp.py call <TOOL> '<json args>'   # call one tool, print the result
"""
import json
import sys
import urllib.error
import urllib.request

URL = 'https://connect.composio.dev/mcp'


class MCP:
    def __init__(self, url=URL):
        self.url = url
        self.sid = None
        self.n = 0

    def _post(self, payload, notify=False):
        headers = {'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'}
        if self.sid:
            headers['Mcp-Session-Id'] = self.sid
        req = urllib.request.Request(self.url, data=json.dumps(payload).encode(), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                self.sid = r.headers.get('Mcp-Session-Id') or self.sid
                body = r.read().decode('utf-8', 'replace')
                ctype = r.headers.get('Content-Type', '')
        except urllib.error.HTTPError as e:
            sys.exit(f'Composio MCP HTTP {e.code}: {e.read()[:400]!r}\n'
                     'Check the network secret: website connect.composio.dev, header x-consumer-api-key (no prefix).')
        except urllib.error.URLError as e:
            sys.exit(f'Cannot reach {self.url} ({e.reason}). Allow connect.composio.dev via the network secret.')
        if notify or not body.strip():
            return None
        if 'text/event-stream' in ctype:
            msgs = [json.loads(line[5:].strip()) for line in body.splitlines() if line.startswith('data:') and line[5:].strip()]
            for m in msgs:
                if m.get('id') == payload.get('id'):
                    return m
            return msgs[-1] if msgs else None
        return json.loads(body)

    def rpc(self, method, params=None):
        self.n += 1
        res = self._post({'jsonrpc': '2.0', 'id': self.n, 'method': method, 'params': params or {}})
        if res and 'error' in res:
            raise RuntimeError(f"{method}: {res['error']}")
        return (res or {}).get('result')

    def start(self):
        self.rpc('initialize', {'protocolVersion': '2025-06-18', 'capabilities': {}, 'clientInfo': {'name': 'built-this-way', 'version': '1.0'}})
        self._post({'jsonrpc': '2.0', 'method': 'notifications/initialized'}, notify=True)
        return self

    def tools(self):
        return self.rpc('tools/list').get('tools', [])

    def call(self, name, args):
        res = self.rpc('tools/call', {'name': name, 'arguments': args})
        out = []
        for c in (res or {}).get('content', []):
            out.append(c.get('text') if c.get('type') == 'text' else json.dumps(c)[:2000])
        return '\n'.join(x for x in out if x), res


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    m = MCP().start()
    if sys.argv[1] == 'tools':
        for t in m.tools():
            print(f"- {t['name']}: {(t.get('description') or '').strip().splitlines()[0][:160] if t.get('description') else ''}")
    elif sys.argv[1] == 'schema':
        for t in m.tools():
            if t['name'] == sys.argv[2]:
                print(json.dumps(t.get('inputSchema'), indent=1)[:6000])
    elif sys.argv[1] == 'call':
        text, _ = m.call(sys.argv[2], json.loads(sys.argv[3]) if len(sys.argv) > 3 else {})
        print(text[:20000])
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
