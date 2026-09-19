#!/usr/bin/env node
/* ============================================================================
   スマホモード（実機ライブ同期）中継サーバ — プロダクト共通の単一ソース
   2026-09-19 ヒデさん依頼。どのプロダクトでも使い回せる「PC で調整 → 同じ
   Wi-Fi のスマホ実機にリアルタイム反映」の中継役 + QR 生成。

   これは【プロダクト非依存】。中身(設定JSON)は不透明なまま右から左へ流すだけ。
   使い方:
     PAGE_PORT=8778 SYNC_PORT=8779 node server.mjs
     （PAGE_PORT = 本体ページを LAN 公開している既存サーバのポート。
       SYNC_PORT = この中継サーバのポート。省略時 8779）
   依存: qrcode のみ（settings/tune-panel/phone-mode/package.json）。
   詳しい入れ方は同フォルダ README.md / settings/docs/general/PHONE-MODE.md。
   ============================================================================ */
import http from 'node:http';
import os from 'node:os';
import QRCode from 'qrcode';

const SYNC_PORT = +(process.env.SYNC_PORT || process.argv[2] || 8779);
const PAGE_PORT = +(process.env.PAGE_PORT || process.argv[3] || 8778);

function lanIP() {
  const ifs = os.networkInterfaces(), cand = [];
  for (const name of Object.keys(ifs)) for (const ni of ifs[name] || []) {
    if (ni.family === 'IPv4' && !ni.internal) cand.push({ name, addr: ni.address });
  }
  const pick = cand.find(c => c.name === 'en0') ||
    cand.find(c => /^(192\.168|172\.(1[6-9]|2\d|3[01])|10\.)/.test(c.addr)) || cand[0];
  return pick ? pick.addr : '127.0.0.1';
}
const IP = lanIP();
const PHONE_URL = `http://${IP}:${PAGE_PORT}/?live=phone`;

const clients = new Set();
let latest = null;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function broadcast(payload) { const chunk = `data: ${payload}\n\n`; for (const res of clients) { try { res.write(chunk); } catch (e) {} } }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (u.pathname === '/ip') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ip: IP, pagePort: PAGE_PORT, syncPort: SYNC_PORT, phoneUrl: PHONE_URL, clients: clients.size }));
    return;
  }
  if (u.pathname === '/qr') {
    const target = u.searchParams.get('u') || PHONE_URL;
    try { const svg = await QRCode.toString(target, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', width: 220 });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' }); res.end(svg);
    } catch (e) { res.writeHead(500); res.end('qr error: ' + e.message); }
    return;
  }
  if (u.pathname === '/push' && req.method === 'POST') {
    let body = ''; req.on('data', c => { body += c; if (body.length > 12 * 1024 * 1024) req.destroy(); });
    req.on('end', () => { latest = body; broadcast(body); console.log('[push] ' + body.length + ' bytes → ' + clients.size + ' phone(s)'); res.writeHead(204); res.end(); });
    return;
  }
  if (u.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive' });
    res.write('retry: 2000\n\n'); if (latest) res.write(`data: ${latest}\n\n`);
    clients.add(res); const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 20000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (u.pathname === '/' || u.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`phone-mode sync\nLAN IP: ${IP}\nphone URL: ${PHONE_URL}\nつないでいるスマホ: ${clients.size}台\n最後の設定: ${latest ? (latest.length + ' bytes') : 'まだ無し'}\n`);
    return;
  }
  res.writeHead(404); res.end('not found');
});

server.listen(SYNC_PORT, '0.0.0.0', async () => {
  const line = '─'.repeat(52); let qr = '';
  try { qr = await QRCode.toString(PHONE_URL, { type: 'terminal', small: true }); } catch (e) {}
  console.log(line);
  console.log(' スマホモード（実機ライブ同期）');
  console.log(line);
  console.log(' スマホでこの QR を読み取ってください(同じ Wi-Fi 必須):\n');
  console.log(qr);
  console.log(' スマホURL : ' + PHONE_URL);
  console.log(' PCは通常どおり http://localhost:' + PAGE_PORT + '/ で調整 → 自動でスマホへ反映');
  console.log(' 中継サーバ : http://' + IP + ':' + SYNC_PORT + '/  (Ctrl+C で停止)');
  console.log(line);
});
