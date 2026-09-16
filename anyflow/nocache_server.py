#!/usr/bin/env python3
# 【2026-09-16】dev プレビュー用: Cache-Control: no-store を付けて配信する軽量サーバ。
# ブラウザが古い index.html を握って「反映されない」と誤解する事故を防ぐ。
# 使い方: python3 anyflow/nocache_server.py <PORT> <DIR>
import http.server, socketserver, sys
PORT = int(sys.argv[1]); DIR = sys.argv[2]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=DIR, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache'); self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), H) as httpd:
    httpd.serve_forever()
