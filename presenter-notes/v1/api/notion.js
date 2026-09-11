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
  return { ok: r.ok, status: r.status, data, retryAfter: r.headers.get('retry-after') };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 混雑(429)やサーバ一時エラー(5xx)は少し待って自動リトライ
async function notionRetry(token, method, path, body, tries) {
  tries = tries || 4;
  let last = null;
  for (let a = 0; a < tries; a++) {
    const r = await notion(token, method, path, body);
    if (r.status !== 429 && r.status < 500) return r;
    last = r;
    const wait = r.retryAfter ? Math.min(3000, parseFloat(r.retryAfter) * 1000) : 350 * (a + 1);
    await sleep(wait || 350);
  }
  return last;
}

// 独立した処理を同時に走らせる（同時実行数を絞ってレート超過を防ぐ）
async function runPool(items, worker, concurrency) {
  let i = 0; const errors = [];
  async function lane() {
    while (i < items.length) {
      const idx = i++;
      try { const r = await worker(items[idx]); if (r && r.ok === false) errors.push(r); }
      catch (e) { errors.push(e); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, lane));
  return errors;
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
function h2(text, color) { const h = { rich_text: [{ type: 'text', text: { content: text } }] }; if (color) h.color = color; return { object: 'block', type: 'heading_2', heading_2: h }; }
function h3(text, color) { const h = { rich_text: [{ type: 'text', text: { content: text } }] }; if (color) h.color = color; return { object: 'block', type: 'heading_3', heading_3: h }; }
function divider() { return { object: 'block', type: 'divider', divider: {} }; }

// 見出しのプレビュー：原稿の中の「最初の太字」を使う。太字が無ければ空（＝番号だけ）
function firstBold(runs) {
  const r = (runs || []).find((x) => x && x.b && String(x.t).trim());
  if (!r) return '';
  const t = String(r.t).replace(/\r/g, '').split('\n')[0].trim();
  return t.length > 28 ? (t.slice(0, 28) + '…') : t;
}

// 原稿を「行」に割る（各行は {t,b} 断片の配列）。空行は捨てる。
function splitLines(runs) {
  const lines = []; let cur = [];
  (runs || []).forEach((r) => {
    const parts = String(r.t == null ? '' : r.t).split('\n');
    parts.forEach((p, idx) => {
      if (idx > 0) { lines.push(cur); cur = []; }
      if (p !== '') cur.push({ t: p, b: !!r.b });
    });
  });
  lines.push(cur);
  return lines.filter((l) => l.length && l.some((s) => s.t.trim() !== ''));
}
// 「太字だけの行」＝グループの見出し（サブラベル）とみなす
function isLabelLine(l) { return l.length && l.every((s) => s.t.trim() === '' || s.b); }

// 案B：ページ見出し=H2(青)、サブ見出し=H3、本文=段落。ページ間はH2の余白で区切る（区切り線なし）。
// サブ見出しの判定を統一：行の「先頭にある太字」をラベル(H3)とし、同じ行の残りは本文に回す。
// （太字直後に改行があるか無いかで見た目が割れていたのを解消）
function pageBlocks(numLabel, runs) {
  const out = [h2(numLabel, 'blue')];
  const lines = splitLines(runs);
  let buf = []; let skippedHead = false;
  const flush = () => { if (buf.length) { out.push(para(buf)); buf = []; } };
  const pushPara = (segs) => { const has = segs.some((s) => s.t.trim() !== ''); if (!has) return; if (buf.length) buf.push({ t: '\n', b: false }); segs.forEach((s) => buf.push(s)); };
  lines.forEach((line) => {
    let li = 0; while (li < line.length && line[li].b) li++;   // 行頭の連続太字＝ラベル
    const labelText = li > 0 ? line.slice(0, li).map((s) => s.t).join('').trim() : '';
    const rest = line.slice(li);
    if (labelText) {
      if (!skippedHead) { skippedHead = true; }                 // 先頭ラベルはH2に出したので見出しは出さない
      else { flush(); out.push(h3(labelText)); }                // サブ見出し（黒H3）
      pushPara(rest);                                           // 同じ行の残り（本文）は段落へ
    } else {
      pushPara(line);
    }
  });
  flush();
  return out;
}

// ブロックの中身を比較するための署名（差分更新の判定用）。既存(APIの形)と生成(送信の形)の両対応
function sigRich(rt) {
  return (rt || []).map((r) => {
    const t = (r.plain_text != null) ? r.plain_text : ((r.text && r.text.content) || '');
    const b = (r.annotations && r.annotations.bold) ? 1 : 0;
    return b + ':' + t;
  }).join('|');
}
function blockSig(b) {
  const t = b.type; const o = b[t] || {};
  if (t === 'divider') return 'divider';
  return t + '|' + (o.color || 'default') + '|' + sigRich(o.rich_text);
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

    // 1) 既存ブロックを取得（idだけでなく中身も。差分更新の判定に使う）
    let cursor = undefined, existing = [];
    for (let guard = 0; guard < 40; guard++) {
      const q = '/blocks/' + pageId + '/children?page_size=100' + (cursor ? '&start_cursor=' + cursor : '');
      const r = await notion(token, 'GET', q);
      if (!r.ok) return j(res, r.status, { ok: false, error: (r.data && r.data.message) || 'ページを読めません（トークンをこのページに接続しましたか？）' });
      (r.data.results || []).forEach((b) => existing.push(b));
      if (r.data.has_more) cursor = r.data.next_cursor; else break;
    }

    // 2) 望ましい中身を作る
    const now = new Date();
    const stamp = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    // 番号のゼロ埋め桁数（全12ページなら 01、全120ページなら 001）
    const pad = String(pages.length).length < 2 ? 2 : String(pages.length).length;
    // 先頭のタイトル見出しは付けない（Notionのページ名と重複するため）。1ページ目から始める。
    const blocks = [];
    // 案B：ページ見出し=H2(青)、サブ見出し=H3、本文=段落。ページ間はH2の余白で区切る（区切り線なし）
    pages.forEach((pg, i) => {
      const num = String(pg.n || (i + 1)).padStart(pad, '0');
      const sn = firstBold(pg.runs);   // 最初の太字をページ見出しに（なければ番号のみ）
      pageBlocks(num + (sn ? ' ｜ ' + sn : ''), pg.runs).forEach((b) => blocks.push(b));
    });

    // 3) 【差分優先・churn最小】前後の一致部分は残し、変わった“真ん中だけ”を差し替える。
    //    ・先頭から型が一致する範囲 … 中身が違えばパッチ（削除しない）
    //    ・末尾から型が一致する範囲 … 同上
    //    ・その間（middle）だけ … 既存を削除し、新規を「先頭側の直後」に挿入
    //    これで前の方を編集しても後続ページが巻き込まれて消えない。
    const bodyFor = (blk) => { const t = blk.type; const b = {}; b[t] = { rich_text: blk[t].rich_text }; if (blk[t].color) b[t].color = blk[t].color; return b; };
    const n = existing.length, m = blocks.length;
    const patchJobs = [];
    let p = 0;                                           // 先頭の一致数
    while (p < n && p < m && existing[p].type === blocks[p].type) {
      if (blocks[p].type !== 'divider' && blockSig(existing[p]) !== blockSig(blocks[p])) patchJobs.push({ id: existing[p].id, body: bodyFor(blocks[p]) });
      p++;
    }
    let sfx = 0;                                          // 末尾の一致数（先頭と重ならない範囲で）
    while (sfx < (n - p) && sfx < (m - p) && existing[n - 1 - sfx].type === blocks[m - 1 - sfx].type) {
      const e = existing[n - 1 - sfx], d = blocks[m - 1 - sfx];
      if (e.type !== 'divider' && blockSig(e) !== blockSig(d)) patchJobs.push({ id: e.id, body: bodyFor(d) });
      sfx++;
    }
    const delMiddle = existing.slice(p, n - sfx).map((b) => b.id);
    const insMiddle = blocks.slice(p, m - sfx);
    const afterId = p > 0 ? existing[p - 1].id : null;   // 挿入位置（先頭一致の最後の直後）

    // 先頭への挿入（afterが取れない）だけは安全に全書き換えへフォールバック（稀）
    if (insMiddle.length && afterId === null) {
      await runPool(existing.map((b) => b.id), (id) => notionRetry(token, 'DELETE', '/blocks/' + id), 8);
      for (let i = 0; i < blocks.length; i += 100) {
        const r = await notionRetry(token, 'PATCH', '/blocks/' + pageId + '/children', { children: blocks.slice(i, i + 100) });
        if (!r.ok) return j(res, r.status, { ok: false, error: (r.data && r.data.message) || '書き込みに失敗しました。' });
      }
      return j(res, 200, { ok: true, pages: pages.length, at: stamp, mode: 'rebuild' });
    }

    // 変わった前後ブロックの中身だけパッチ（削除しない）
    const patchErrs = await runPool(patchJobs, (job) => notionRetry(token, 'PATCH', '/blocks/' + job.id, job.body), 8);
    // 真ん中の既存を削除
    if (delMiddle.length) await runPool(delMiddle, (id) => notionRetry(token, 'DELETE', '/blocks/' + id), 8);
    // 真ん中の新規を「先頭一致の直後」に挿入（after で位置指定・末尾一致は残るので順序は保たれる）
    let cursorId = afterId;
    for (let i = 0; i < insMiddle.length; i += 100) {
      const body = { children: insMiddle.slice(i, i + 100) };
      if (cursorId) body.after = cursorId;
      const r = await notionRetry(token, 'PATCH', '/blocks/' + pageId + '/children', body);
      if (!r.ok) return j(res, r.status, { ok: false, error: (r.data && r.data.message) || '書き込みに失敗しました。' });
      const results = (r.data && r.data.results) || [];
      if (results.length) cursorId = results[results.length - 1].id;   // 次チャンクはこの後ろへ
    }
    const mode = (delMiddle.length === 0 && insMiddle.length === 0) ? 'diff' : 'partial';
    return j(res, 200, { ok: true, pages: pages.length, at: stamp, mode: mode, patched: patchJobs.length, inserted: insMiddle.length, deleted: delMiddle.length, patchErrs: patchErrs.length });
  } catch (e) {
    return j(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
