#!/usr/bin/env node
/* ============================================================================
   anyflow V5.0 — スマホ実機プレビュー用ライブ同期サーバ（2026-09-19 ヒデさん依頼）
   目的: PC で調整パネルの数値をいじると、同じ LAN のスマホの実機プレビューに
         リアルタイムで反映される。スマホは QR を読むだけで最新版が開く。

   仕組み(かんたん):
     ・本体ページは既存の 8778(python) が LAN 公開で配信している(http://<LAN-IP>:8778)。
     ・このサーバ(8779)は「PC が投げた設定を、見ているスマホ全部に配る」中継役 + QR 生成。
       - PC:   保存のたびに POST /push で設定を投げる
       - スマホ: GET /events (SSE) で受け取り、保存し直してリロード → 最新表示
       - QR:   GET /qr?u=<スマホURL> で SVG の QR を返す
   使い方:  node anyflow/v5/tools/live-sync.mjs   (Ctrl+C で停止)
   ============================================================================ */
import http from 'node:http';
import os from 'node:os';
import QRCode from 'qrcode';

const SYNC_PORT = 8779;   /* この中継サーバ */
const PAGE_PORT = 8778;   /* 本体ページを配信している python サーバ */

function lanIP() {
  const ifs = os.networkInterfaces();
  const cand = [];
  for (const name of Object.keys(ifs)) {
    for (const ni of ifs[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) cand.push({ name, addr: ni.address });
    }
  }
  /* en0(Wi-Fi/有線) を優先、次に 192.168 / 172.16 系 */
  const pick = cand.find(c => c.name === 'en0') ||
               cand.find(c => /^(192\.168|172\.(1[6-9]|2\d|3[01])|10\.)/.test(c.addr)) ||
               cand[0];
  return pick ? pick.addr : '127.0.0.1';
}

const IP = lanIP();
const PHONE_URL = `http://${IP}:${PAGE_PORT}/?live=phone`;

/* --- SSE クライアント(スマホ)の集合と、最後に配った設定 --- */
const clients = new Set();
let latest = null;   /* 直近の設定(後から繋いだスマホにも即送る) */

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

  /* --- LAN IP とスマホURLを教える --- */
  if (u.pathname === '/ip') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ip: IP, pagePort: PAGE_PORT, syncPort: SYNC_PORT, phoneUrl: PHONE_URL, clients: clients.size }));
    return;
  }

  /* --- QR(SVG) --- */
  if (u.pathname === '/qr') {
    const target = u.searchParams.get('u') || PHONE_URL;
    try {
      const svg = await QRCode.toString(target, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', width: 220 });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      res.end(svg);
    } catch (e) {
      res.writeHead(500); res.end('qr error: ' + e.message);
    }
    return;
  }

  /* --- PC が設定を投げる --- */
  if (u.pathname === '/push' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 12 * 1024 * 1024) req.destroy(); });
    req.on('end', () => { latest = body; broadcast(body); console.log('[push] ' + body.length + ' bytes → ' + clients.size + ' phone(s)'); res.writeHead(204); res.end(); });
    return;
  }

  /* --- スマホが受け取る(SSE) --- */
  if (u.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    if (latest) res.write(`data: ${latest}\n\n`);
    clients.add(res);
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 20000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }

  /* --- 状態確認 --- */
  if (u.pathname === '/' || u.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`anyflow live-sync\nLAN IP: ${IP}\nphone URL: ${PHONE_URL}\nつないでいるスマホ: ${clients.size}台\n最後の設定: ${latest ? (latest.length + ' bytes') : 'まだ無し'}\n`);
    return;
  }

  res.writeHead(404); res.end('not found');
});

server.listen(SYNC_PORT, '0.0.0.0', async () => {
  const line = '─'.repeat(52);
  let qrTerminal = '';
  try { qrTerminal = await QRCode.toString(PHONE_URL, { type: 'terminal', small: true }); } catch (e) {}
  console.log(line);
  console.log(' anyflow V5.0  スマホ実機プレビュー(ライブ同期)');
  console.log(line);
  console.log(' スマホでこの QR を読み取ってください(同じ Wi-Fi 必須):');
  console.log('');
  console.log(qrTerminal);
  console.log(' スマホURL : ' + PHONE_URL);
  console.log(' PCは通常どおり http://localhost:' + PAGE_PORT + '/ で調整 → 自動でスマホへ反映');
  console.log(' 中継サーバ : http://' + IP + ':' + SYNC_PORT + '/  (Ctrl+C で停止)');
  console.log(line);
});
