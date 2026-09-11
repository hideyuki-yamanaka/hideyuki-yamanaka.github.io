/* アイコン（案A：ライン 1.75px / 角丸）
 *
 * 以前は ⚙ ◧ ▤ 🔗 ↻ ▶ ✎ ⋯ ＋ ‹ › を「文字」として置いていた。
 * 文字だと ①フォント任せで太さが揃わない ②24pxグリッドに乗らずボケる
 * ③OS/ブラウザで形が変わる（絵文字はカラーで浮く）④ベースラインで上下がズレる。
 * ここで 24×24 のSVGに統一して、その全部を断ち切っている。
 *
 * 見分けの要：
 *   panelLeft（スライド一覧）＝ 枠の「左」に柱を塗る
 *   notes    （トークスクリプト）＝ 枠の「下」に帯を塗る＋上に本文の線
 *   塗る位置が左と下で真逆なので、16pxでもシルエットで区別できる。
 *
 * 使い方：
 *   静的HTML → <span data-ic="settings"></span>（読み込み時に差し替わる）
 *   JSで組む → PNI.svg('more', 18)
 */
window.PNI = (function () {
  const FRAME = 'M5.5 4.5h13A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V7a2.5 2.5 0 0 1 2.5-2.5z';
  const BAND_LEFT = 'M5.5 4.5H9.5v15H5.5A2.5 2.5 0 0 1 3 17V7a2.5 2.5 0 0 1 2.5-2.5z';
  const BAND_BOTTOM = 'M3 14h18v3a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17v-3z';
  const DOT = (x) => '<circle cx="' + x + '" cy="12" r="1.5" fill="currentColor" stroke="none"/>';

  const D = {
    settings: '<path d="M4 8h9.6"/><path d="M18.4 8H20"/><circle cx="16" cy="8" r="2.4"/>'
            + '<path d="M4 16h3.6"/><path d="M12.4 16H20"/><circle cx="10" cy="16" r="2.4"/>',
    panelLeft: '<path d="' + FRAME + '"/><path d="' + BAND_LEFT + '" fill="currentColor" stroke="none"/>',
    notes: '<path d="' + FRAME + '"/><path d="M6.8 8h10.4"/><path d="M6.8 11h6.6"/>'
         + '<path d="' + BAND_BOTTOM + '" fill="currentColor" stroke="none"/>',
    link: '<path d="M10.5 13.5a4.2 4.2 0 0 0 6.02 0l2.6-2.6a4.25 4.25 0 0 0-6.01-6.01l-1.5 1.49"/>'
        + '<path d="M13.5 10.5a4.2 4.2 0 0 0-6.02 0l-2.6 2.6a4.25 4.25 0 0 0 6.01 6.01l1.49-1.49"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/>',
    play: '<path d="M8.5 5.4v13.2L19 12z"/>',
    prev: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    next: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    up: '<path d="M5.5 14.5 12 8l6.5 6.5"/>',
    down: '<path d="M5.5 9.5 12 16l6.5-6.5"/>',
    edit: '<path d="M4 20h4.2L19 9.2a2.97 2.97 0 0 0-4.2-4.2L4 15.8V20z"/><path d="M13.9 6.1l4.2 4.2"/>',
    more: DOT(5) + DOT(12) + DOT(19),
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  };

  function svg(name, size) {
    const d = D[name];
    if (!d) return '';
    const px = size || 20;
    return '<svg class="ic" width="' + px + '" height="' + px + '" viewBox="0 0 24 24" aria-hidden="true">'
      + '<g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
      + d + '</g></svg>';
  }

  // data-ic を持つ要素を実際のSVGに差し替える（あとから足した要素にも使える）
  function paint(root) {
    (root || document).querySelectorAll('[data-ic]').forEach((el) => {
      const s = svg(el.getAttribute('data-ic'), parseInt(el.getAttribute('data-ic-size'), 10) || 20);
      if (s) el.outerHTML = s;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => paint());
  else paint();

  return { svg, paint };
})();
