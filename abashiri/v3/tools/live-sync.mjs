#!/usr/bin/env node
/* ============================================================================
   網走 V3 — スマホモード（実機ライブ同期）の中継サーバ
   2026-09-26 ヒデさん指示「Anyflow の調整パネルの仕様（スマホモード）を全部真似して」
   → anyflow/v5/tools/live-sync.mjs と同じ仕組み。ポートだけ anyflow(8779) と被らない 8780。

   仕組み(かんたん):
     ・ページ本体は Next.js の開発サーバ（例 http://<LAN-IP>:3000）。同じ Wi-Fi のスマホから見る
     ・このサーバ(8780)は「PC が投げた設定を、見ているスマホ全部に配る」中継役 + QR 生成
       - PC:    調整パネルの保存のたびに POST /push で設定を投げる
       - スマホ: GET /events (SSE) で受け取り、自分のブラウザに書いて反映
       - QR:    GET /qr?u=<スマホURL> で SVG の QR を返す
       - GET /ip?port=<ページのポート>&path=<いま開いているページ> で、スマホ用URLを返す
   使い方:  node abashiri/v3/tools/live-sync.mjs   (Ctrl+C で停止)
   ============================================================================ */
import http from 'node:http';
import os from 'node:os';
import QRCode from 'qrcode';

const SYNC_PORT = 8780;

function lanIP() {
  const ifs = os.networkInterfaces();
  const cand = [];
  for (const name of Object.keys(ifs)) {
    for (const ni of ifs[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) cand.push({ name, addr: ni.address });
    }
  }
  /* en0(Wi-Fi/有線) を優先、次に 192.168 / 172.16 / 10 系 */
  const pick = cand.find(c => c.name === 'en0') ||
               cand.find(c => /^(192\.168|172\.(1[6-9]|2\d|3[01])|10\.)/.test(c.addr)) ||
               cand[0];
  return pick ? pick.addr : '127.0.0.1';
}

const IP = lanIP();
const phoneUrlOf = (port, path) =>
  `http://${IP}:${port || 3000}${path && path.startsWith('/') ? path : '/'}?live=phone`;

const clients = new Set();
let latest = null;   /* 直近の設定（後から繋いだスマホにも即送る） */

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function broadcast(payload) {
  const chunk = `data: ${payload}\n\n`;
  for (const res of clients) { try { res.write(chunk); } catch (e) { /* 切断済み */ } }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (u.pathname === '/ip') {
    const url = phoneUrlOf(u.searchParams.get('port'), u.searchParams.get('path'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ip: IP, syncPort: SYNC_PORT, phoneUrl: url, clients: clients.size }));
    return;
  }
  if (u.pathname === '/qr') {
    const target = u.searchParams.get('u') || phoneUrlOf();
    try {
      const svg = await QRCode.toString(target, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', width: 220 });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      res.end(svg);
    } catch (e) { res.writeHead(500); res.end('qr error: ' + e.message); }
    return;
  }
  if (u.pathname === '/push' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 12 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      latest = body; broadcast(body);
      console.log('[push] ' + body.length + ' bytes → ' + clients.size + ' phone(s)');
      res.writeHead(204); res.end();
    });
    return;
  }
  if (u.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive' });
    res.write('retry: 2000\n\n');
    if (latest) res.write(`data: ${latest}\n\n`);
    clients.add(res);
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 20000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (u.pathname === '/' || u.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`abashiri live-sync\nLAN IP: ${IP}\nつないでいるスマホ: ${clients.size}台\n最後の設定: ${latest ? (latest.length + ' bytes') : 'まだ無し'}\n`);
    return;
  }
  res.writeHead(404); res.end('not found');
});

server.listen(SYNC_PORT, '0.0.0.0', () => {
  const line = '─'.repeat(52);
  console.log(line);
  console.log(' 網走 V3  スマホモード（実機ライブ同期）の中継サーバ');
  console.log(line);
  console.log(' PC の調整パネル「📱 スマホモード」を押すと QR が出ます（同じ Wi-Fi 必須）');
  console.log(' 中継サーバ : http://' + IP + ':' + SYNC_PORT + '/  (Ctrl+C で停止)');
  console.log(line);
});
