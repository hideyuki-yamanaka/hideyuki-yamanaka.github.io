/* トークスクリプトを Notion の1ページにまとめて書き込む中継サーバ（Vercel 関数）
 *
 * なぜ必要か：Notion API はブラウザから直接呼べない（CORS＋鍵が要る）。
 * そこで、ブラウザ →（このサーバ）→ Notion と中継する。
 *
 * 受け取るもの（POST JSON）:
 *   { token, pageId, deckName, updatedAt, pages: [{ n, runs:[{t, b}] }] }
 *     token  … ユーザーの Notion 連携トークン（アプリの⚙で保存し、都度送る）
 *     pageId … 書き込み先の Notion ページID
 *     pages  … 各ページの原稿。runs は太字情報つきの文字列片（b=true で太字）
 *
 * トークンは Notion への転送だけに使い、保存・記録は一切しない。
 */
const NV = '2022-06-28';

function j(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

async function notion(token, method, path, body) {
  const r = await fetch('https://api.notion.com/v1' + path, {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Notion-Version': NV,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
  return { ok: r.ok, status: r.status, data };
}

// 長文は 2000 文字ごとに分割（Notion の rich_text 上限）
function toRich(runs) {
  const out = [];
  (runs || []).forEach((run) => {
    const t = String(run.t == null ? '' : run.t);
    const bold = !!run.b;
    for (let i = 0; i < t.length; i += 1900) {
      out.push({ type: 'text', text: { content: t.slice(i, i + 1900) }, annotations: { bold: bold } });
    }
  });
  if (!out.length) out.push({ type: 'text', text: { content: '' } });
  return out.slice(0, 100); // 1ブロックあたり100片まで
}
function para(runs, color) { const p = { rich_text: toRich(runs) }; if (color) p.color = color; return { object: 'block', type: 'paragraph', paragraph: p }; }
function h1(text) { return { object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: text } }] } }; }
function h3(text, color) { const h = { rich_text: [{ type: 'text', text: { content: text } }] }; if (color) h.color = color; return { object: 'block', type: 'heading_3', heading_3: h }; }
function divider() { return { object: 'block', type: 'divider', divider: {} }; }

// 原稿の冒頭を短く取り出して見出しのプレビューにする（改行までの先頭16文字）
function snippet(runs) {
  let t = (runs || []).map((r) => (r && r.t) || '').join('');
  t = t.replace(/\r/g, '').split('\n')[0].trim();
  if (!t) return '';
  return t.length > 16 ? (t.slice(0, 16) + '…') : t;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return j(res, 405, { ok: false, error: 'POST only' });
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    if (!body || typeof body !== 'object') {
      // 生ボディを読む（Vercel が未パースの場合）
      const chunks = []; for await (const c of req) chunks.push(c);
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    }
    const token = (body.token || '').trim();
    // URL でもIDでも受け取れるよう、32桁の16進IDを取り出す
    const _pm = String(body.pageId || '').replace(/-/g, '').match(/[0-9a-fA-F]{32}/g);
    const pageId = _pm ? _pm[_pm.length - 1].toLowerCase() : '';
    const deckName = body.deckName || 'トークスクリプト';
    const pages = Array.isArray(body.pages) ? body.pages : [];
    if (!token) return j(res, 400, { ok: false, error: 'Notion連携トークンが未設定です。' });
    if (!pageId) return j(res, 400, { ok: false, error: 'Notionページが未設定です。' });

    // 1) 既存の中身を消す（毎回まるごと作り直して最新に保つ）
    let cursor = undefined, ids = [];
    for (let guard = 0; guard < 30; guard++) {
      const q = '/blocks/' + pageId + '/children?page_size=100' + (cursor ? '&start_cursor=' + cursor : '');
      const r = await notion(token, 'GET', q);
      if (!r.ok) return j(res, r.status, { ok: false, error: (r.data && r.data.message) || 'ページを読めません（トークンをこのページに接続しましたか？）' });
      (r.data.results || []).forEach((b) => ids.push(b.id));
      if (r.data.has_more) cursor = r.data.next_cursor; else break;
    }
    for (const id of ids) { await notion(token, 'DELETE', '/blocks/' + id); }

    // 2) 新しい中身を作る
    const now = new Date();
    const stamp = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    // 番号のゼロ埋め桁数（全12ページなら 01、全120ページなら 001）
    const pad = String(pages.length).length < 2 ? 2 : String(pages.length).length;
    const blocks = [
      h1(deckName + '（トークスクリプト）'),
      para([{ t: '最終更新: ' + stamp + ' ／ 全 ' + pages.length + ' ページ' }], 'gray'),
    ];
    // 案1：番号＋冒頭プレビューの見出しを青く → 本文 → 細い区切り線
    pages.forEach((pg, i) => {
      const num = String(pg.n || (i + 1)).padStart(pad, '0');
      const sn = snippet(pg.runs);
      blocks.push(h3(num + (sn ? ' ｜ ' + sn : '　（原稿なし）'), 'blue'));
      blocks.push(para(pg.runs && pg.runs.length ? pg.runs : [{ t: '（原稿なし）' }]));
      if (i < pages.length - 1) blocks.push(divider());
    });

    // 3) 100ブロックずつ追加
    for (let i = 0; i < blocks.length; i += 100) {
      const r = await notion(token, 'PATCH', '/blocks/' + pageId + '/children', { children: blocks.slice(i, i + 100) });
      if (!r.ok) return j(res, r.status, { ok: false, error: (r.data && r.data.message) || '書き込みに失敗しました。' });
    }
    return j(res, 200, { ok: true, pages: pages.length, at: stamp });
  } catch (e) {
    return j(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
