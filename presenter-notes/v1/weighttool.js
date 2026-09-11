/* 文字の太さツール（ブログエディタ風）
 *
 * 常設のプルダウンではなく、原稿の中で文字を「ドラッグ選択」すると、その付近に
 * 小さなツールバーがふわっと出て、太さプルダウンで選んだ所だけ太さが変わる。
 * 300＝標準（素の状態）。選び直しでいつでも戻せる。
 *
 * 設定は原稿そのもの（span の font-weight）に埋め込まれるので、ページごとに独立。
 * 別のページへ引き継がれることはない。
 *
 * 使い方： WT.init(contenteditableな要素, 変更時に呼ぶ保存関数)
 */
window.WT = (function () {
  var WEIGHTS = [200, 300, 400, 500, 600, 700, 800, 900];
  var LABEL = { 200: 'ExtraLight', 300: 'Light（標準）', 400: 'Regular', 500: 'Medium',
                600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

  // 選択範囲を span で包んで太さを適用（300は素に戻す）。多重がけは防ぐ。
  function applyToRange(range, w) {
    var frag = range.extractContents();
    if (frag.querySelectorAll) {
      frag.querySelectorAll('[style]').forEach(function (el) { el.style.fontWeight = ''; });
    }
    var span = document.createElement('span');
    if (parseInt(w, 10) !== 300) span.style.fontWeight = String(w);
    span.appendChild(frag);
    range.insertNode(span);
    return span;
  }

  function init(el, onChange) {
    // ツールバー本体（body直下に固定配置。選択範囲の付近にふわっと出す）
    var bar = document.createElement('div');
    bar.className = 'wt-bar';
    bar.hidden = true;
    var sel = document.createElement('select');
    sel.className = 'wt-sel';
    WEIGHTS.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = LABEL[v] + ' ' + v;
      if (v === 300) o.selected = true;
      sel.appendChild(o);
    });
    bar.appendChild(sel);
    document.body.appendChild(bar);

    var saved = null;   // プルダウン操作中に選択が消えても適用できるよう控える

    function currentWeight(node) {
      var w = 300;
      while (node && node !== el) {
        if (node.style && node.style.fontWeight) { w = parseInt(node.style.fontWeight, 10) || 300; break; }
        node = node.parentNode;
      }
      return WEIGHTS.indexOf(w) >= 0 ? w : 300;
    }

    function place() {
      var s = window.getSelection();
      if (!s || !s.rangeCount || s.isCollapsed || !el.contains(s.anchorNode) || !el.contains(s.focusNode)) {
        bar.hidden = true; saved = null; return;
      }
      var rg = s.getRangeAt(0);
      var rect = rg.getBoundingClientRect();
      if (!rect.width && !rect.height) { bar.hidden = true; return; }
      saved = rg.cloneRange();
      sel.value = String(currentWeight(s.anchorNode));
      bar.hidden = false;
      var bw = bar.offsetWidth || 150, bh = bar.offsetHeight || 36;
      var left = rect.left + rect.width / 2 - bw / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
      var top = rect.top - bh - 8;
      if (top < 8) top = rect.bottom + 8;   // 上に入らなければ下へ
      bar.style.left = left + 'px';
      bar.style.top = top + 'px';
    }

    el.addEventListener('mouseup', function () { setTimeout(place, 0); });
    el.addEventListener('keyup', function (e) {
      if (e.shiftKey || String(e.key).indexOf('Arrow') === 0) setTimeout(place, 0);
    });
    // 選択が解除されたら隠す（ただしプルダウン操作中は触らない）
    document.addEventListener('selectionchange', function () {
      if (document.activeElement === sel) return;
      var s = window.getSelection();
      if (!s || s.isCollapsed) bar.hidden = true;
    });
    // 太さを選んだら、控えておいた範囲に適用
    sel.addEventListener('change', function () {
      if (!saved) return;
      var span = applyToRange(saved, sel.value);
      el.normalize();
      var s = window.getSelection();
      var r = document.createRange(); r.selectNodeContents(span);
      s.removeAllRanges(); s.addRange(r); saved = r.cloneRange();
      if (onChange) onChange();
      el.focus();
      setTimeout(place, 0);
    });
    // 原稿・ツールバー以外をクリックしたら隠す
    document.addEventListener('mousedown', function (e) {
      if (!bar.contains(e.target) && e.target !== el && !el.contains(e.target)) bar.hidden = true;
    });
    // 貼り付けの処理は mdcopy.js が担当（**太字** を実際の太字に変換）。ここでは何もしない。

    return { place: place, hide: function () { bar.hidden = true; } };
  }

  return { init: init, applyToRange: applyToRange };
})();
