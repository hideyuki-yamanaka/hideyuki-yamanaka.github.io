/* Notion バックアップ同期（ブラウザ側）
 *
 * 原稿を直すと、少し待って（まとめて）中継サーバ /api/notion に送る。
 * サーバがユーザーのトークンで Notion の1ページに全ページ分を書き込む。
 *
 * 使い方:
 *   NotionSync.onStatus(fn)   … 状態表示のコールバック（'idle'|'syncing'|'ok'|'off'|'error', 詳細）
 *   NotionSync.schedule()     … 編集のたびに呼ぶ（自動でまとめて送る）
 *   NotionSync.flush()        … 今すぐ送る（手動ボタン・画面を閉じる前）
 */
window.NotionSync = (function () {
  let timer = null;
  let statusFn = null;
  let last = 0;

  function setStatus(s, detail) { if (statusFn) statusFn(s, detail || ''); }
  function onStatus(fn) { statusFn = fn; }

  // 原稿HTML → 太字情報つきの文字列片 [{t, b}]（Notionは太字/非太字だけなので 600以上を太字扱い）
  function htmlToRuns(html, plain) {
    if (!html && plain != null) return [{ t: plain, b: false }];
    const box = document.createElement('div');
    box.innerHTML = html || '';
    const runs = [];
    function walk(node, bold) {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {                     // テキスト
          if (n.nodeValue) runs.push({ t: n.nodeValue, b: bold });
        } else if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (tag === 'br') { runs.push({ t: '\n', b: bold }); return; }
          let b = bold;
          const w = parseInt((n.style && n.style.fontWeight) || '', 10);
          if (w >= 600) b = true;
          if (tag === 'b' || tag === 'strong') b = true;
          walk(n, b);
          if (tag === 'div' || tag === 'p') runs.push({ t: '\n', b: false });  // ブロックの改行
        }
      });
    }
    walk(box, false);
    // 連続する同じ太さをまとめる
    const merged = [];
    runs.forEach((r) => {
      const p = merged[merged.length - 1];
      if (p && p.b === r.b) p.t += r.t; else merged.push({ t: r.t, b: r.b });
    });
    return merged.length ? merged : [{ t: '', b: false }];
  }

  function buildPayload() {
    const deck = PN.getActiveDeck();
    const token = PN.getNotionToken();
    const pageId = PN.getNotionPage();
    if (!token || !pageId) return null;                 // 未設定なら同期しない
    const s = PN.loadScripts();
    const pages = s.order.map((id, i) => {
      const c = s.cards[id] || {};
      return { n: i + 1, runs: htmlToRuns(c.html, c.script || '') };
    });
    return { token: token, pageId: pageId, deckName: deck.name || 'トークスクリプト', pages: pages };
  }

  async function flush() {
    clearTimeout(timer); timer = null;
    const payload = buildPayload();
    if (!payload) { setStatus('off'); return; }
    setStatus('syncing');
    try {
      const r = await fetch('/api/notion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) { last = Date.now(); setStatus('ok', data.at || ''); }
      else setStatus('error', (data && data.error) || ('HTTP ' + r.status));
    } catch (e) { setStatus('error', String((e && e.message) || e)); }
  }

  function schedule() {
    if (!PN.getNotionToken() || !PN.getNotionPage()) { setStatus('off'); return; }
    clearTimeout(timer);
    timer = setTimeout(flush, 4000);   // 編集が止まって4秒後にまとめて送る
    setStatus('pending');
  }

  // 自動送信はしない（『Notionへ反映』ボタンで flush() を呼んだ時だけ送る）

  return { onStatus, schedule, flush, buildPayload };
})();
