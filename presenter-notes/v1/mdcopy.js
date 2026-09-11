/* コピー時にマークダウンで取れるようにする
 *
 * 原稿の太字（font-weight 600以上 / <b><strong>）を **…** に、
 * 細字・通常はそのままの文字で、クリップボードへ入れる。
 * これで、素のテキスト欄でも Notion でも、太字が **…** として貼り付く。
 *
 * 使い方： MDCopy.bind(要素)  … その要素内の選択をコピーするとマークダウンになる
 */
window.MDCopy = (function () {
  function walk(node, bold) {
    let md = '';
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) { md += n.nodeValue; return; }   // テキスト
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'br') { md += '\n'; return; }
      const w = parseInt((n.style && n.style.fontWeight) || '', 10);
      const isBold = (w >= 600) || tag === 'b' || tag === 'strong';
      let inner = walk(n, bold || isBold);
      // この要素で初めて太字になった時だけ ** で囲む（入れ子の二重付けを防ぐ）
      if (isBold && !bold && inner.trim()) {
        inner = inner.replace(/^(\s*)([\s\S]*?)(\s*)$/, (m, a, c, z) => a + '**' + c + '**' + z);
      }
      md += inner;
      if (tag === 'div' || tag === 'p') { if (md && !md.endsWith('\n')) md += '\n'; }  // ブロックは改行
    });
    return md;
  }

  // 要素（またはDocumentFragmentを入れたdiv）→ マークダウン文字列
  function fromContainer(el) {
    return walk(el, false).replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').replace(/\s+$/,'');
  }

  function bind(el) {
    if (!el || el._mdcopy) return;
    el._mdcopy = true;
    el.addEventListener('copy', (e) => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;   // この要素内の選択だけ対象
      const div = document.createElement('div');
      div.appendChild(range.cloneContents());
      const md = fromContainer(div);
      if (!md) return;
      try {
        e.clipboardData.setData('text/plain', md);            // 素の欄・Notionにはマークダウンで
        e.clipboardData.setData('text/html', div.innerHTML);  // リッチ先では見た目そのまま
        e.preventDefault();
      } catch (err) { /* 取れなければ既定動作にまかせる */ }
    });
  }

  return { bind, fromContainer };
})();
