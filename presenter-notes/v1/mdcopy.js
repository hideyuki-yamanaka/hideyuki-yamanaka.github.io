/* コピー＆ペーストでマークダウン（太字）をやりとりする
 *
 * ■ コピー：原稿の太字（font-weight 600以上 / <b><strong>）を **…** にして取り出す。
 *   → 素のテキスト欄でも Notion でも、太字が **…** として貼り付く。
 * ■ ペースト：貼り付けた文字の **…** を「実際の太字」に変換して入れる。
 *   → Gemini などの **太字** 記法も、貼るとちゃんと太字になる（記号は消える）。
 *   リッチな貼り付け（本物の太字つきHTML）も、太字だけ残してシンプルに正規化。
 *
 * 使い方： MDCopy.bind(contenteditableな要素)
 */
window.MDCopy = (function () {
  function esc(t) { return String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  // ---- HTML → マークダウン（コピー用） ----
  function walkMd(node, bold) {
    let md = '';
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) { md += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'br') { md += '\n'; return; }
      const w = parseInt((n.style && n.style.fontWeight) || '', 10);
      const isBold = (w >= 600) || tag === 'b' || tag === 'strong';
      let inner = walkMd(n, bold || isBold);
      if (isBold && !bold && inner.trim()) {
        inner = inner.replace(/^(\s*)([\s\S]*?)(\s*)$/, (m, a, c, z) => a + '**' + c + '**' + z);
      }
      md += inner;
      if (tag === 'div' || tag === 'p') { if (md && !md.endsWith('\n')) md += '\n'; }
    });
    return md;
  }
  function fromContainer(el) {
    return walkMd(el, false).replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').replace(/\s+$/, '');
  }

  // ---- マークダウン(**太字**) → HTML（ペースト用・行はbrで） ----
  function mdToHtml(text) {
    return String(text).split(/\r?\n/).map((line) => {
      let h = esc(line);
      h = h.replace(/\*\*(.+?)\*\*/g, '<span style="font-weight:700">$1</span>');   // **太字**
      return h;
    }).join('<br>');
  }
  // ---- リッチHTML → 「太字だけ残した」シンプルHTML（ペースト正規化） ----
  function richToSimpleHtml(container) {
    let out = '';
    const wrap = (t, b) => (!t ? '' : (b ? '<span style="font-weight:700">' + t + '</span>' : t));
    function w(node, bold) {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) { out += wrap(esc(n.nodeValue), bold); return; }
        if (n.nodeType !== 1) return;
        const tag = n.tagName.toLowerCase();
        if (tag === 'br') { out += '<br>'; return; }
        const wt = parseInt((n.style && n.style.fontWeight) || '', 10);
        const b = bold || wt >= 600 || tag === 'b' || tag === 'strong';
        w(n, b);
        if (tag === 'div' || tag === 'p') { if (!/<br>$/.test(out)) out += '<br>'; }
      });
    }
    w(container, false);
    return out;
  }

  function bind(el) {
    if (!el || el._mdcopy) return;
    el._mdcopy = true;

    // コピー：選択範囲をマークダウンにして渡す
    el.addEventListener('copy', (e) => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      const div = document.createElement('div');
      div.appendChild(range.cloneContents());
      const md = fromContainer(div);
      if (!md) return;
      try {
        e.clipboardData.setData('text/plain', md);
        e.clipboardData.setData('text/html', div.innerHTML);
        e.preventDefault();
      } catch (err) { /* だめなら既定にまかせる */ }
    });

    // ペースト：**太字** を実際の太字にして入れる（記号は消える）
    if (el.isContentEditable) {
      el.addEventListener('paste', (e) => {
        const cd = e.clipboardData || window.clipboardData;
        if (!cd) return;
        const text = cd.getData('text/plain') || '';
        const html = cd.getData('text/html') || '';
        let insert;
        if (text.indexOf('**') >= 0) insert = mdToHtml(text);          // **記法があれば最優先で太字化
        else if (html) { const d = document.createElement('div'); d.innerHTML = html; insert = richToSimpleHtml(d); }
        else insert = mdToHtml(text);
        e.preventDefault();
        try { document.execCommand('insertHTML', false, insert); }
        catch (err) { document.execCommand('insertText', false, text); }
      });
    }
  }

  return { bind, fromContainer, mdToHtml };
})();
