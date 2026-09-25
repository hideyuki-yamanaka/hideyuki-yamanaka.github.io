/*!
 * tune-panel.js — 汎用「調整パネル」
 * 1ファイル / 依存なし / CSSも自分で流し込む。
 *
 *   <script src="tune-panel.js"></script>
 *   const panel = TunePanel.create({ storageKey:'my-app', version:1, params, defaults, schema:[...] })
 *
 * MIT License
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.TunePanel = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ============================================================
     小道具
     ============================================================ */

  var isObj = function (v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  };
  var clone = function (v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  };

  function getPath(obj, path) {
    var ks = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < ks.length; i++) {
      if (cur == null) return undefined;
      cur = cur[ks[i]];
    }
    return cur;
  }
  function setPath(obj, path, v) {
    var ks = String(path).split('.');
    var last = ks.pop();
    var cur = obj;
    for (var i = 0; i < ks.length; i++) {
      if (!isObj(cur[ks[i]]) && !Array.isArray(cur[ks[i]])) cur[ks[i]] = {};
      cur = cur[ks[i]];
    }
    cur[last] = v;
  }

  /* 保存値を初期値の形に合わせて取り込む。
     初期値に無いキーは捨て、型が違う値も初期値へ戻す（＝壊れた保存値で事故らない） */
  function mergeSaved(def, saved) {
    if (saved === undefined) return clone(def);
    if (isObj(def)) {
      if (!isObj(saved)) return clone(def);
      var out = {};
      for (var k in def) out[k] = mergeSaved(def[k], saved[k]);
      return out;
    }
    if (Array.isArray(def)) {
      if (!Array.isArray(saved)) return clone(def);
      return def.map(function (d, i) { return mergeSaved(d, saved[i]); });
    }
    return typeof saved === typeof def ? saved : clone(def);
  }

  /* params の「箱」は差し替えず中身だけ書き換える（利用側が持っている参照を生かすため） */
  function assignDeep(target, src) {
    for (var k in src) {
      if (isObj(src[k]) && isObj(target[k])) assignDeep(target[k], src[k]);
      else target[k] = clone(src[k]);
    }
  }

  /* 数値の見せ方のショートカット */
  var FMT = {
    s: function (v) { return (+v).toFixed(2) + 's'; },
    sec: function (v) { return (+v).toFixed(2) + 's'; },
    ms: function (v) { return Math.round(v) + 'ms'; },
    /* '%' は2通りの持ち方に対応する（2026-08-23 ヒデさん指摘：8000%のような表示になっていた）
       ・0〜1 の割合で持つ値（Anyflowのシェーダー系）… 100倍して % に
       ・0〜100 の%そのもので持つ値（網走の音量・透過率など）… そのまま % に
       スライダーの max が 1 以下かどうかで自動判別する */
    '%': function (v, item) {
      var asIs = item && typeof item.max === 'number' && item.max > 1;
      return Math.round(asIs ? +v : v * 100) + '%';
    },
    px: function (v) { return Math.round(v) + 'px'; },
    deg: function (v) { return Math.round(v) + '°'; },
    '°': function (v) { return Math.round(v) + '°'; },
    x: function (v) { return '×' + (+v).toFixed(2); },
    '×': function (v) { return '×' + (+v).toFixed(2); },
    int: function (v) { return String(Math.round(v)); },
    n1: function (v) { return (+v).toFixed(1); },
    n2: function (v) { return (+v).toFixed(2); }
  };
  function toFmt(f, step, item) {
    if (typeof f === 'function') return f;
    if (typeof f === 'string' && FMT[f]) {
      var base = FMT[f];
      return function (v) { return base(v, item); };
    }
    var dec = String(step || 1).indexOf('.') >= 0 ? String(step).split('.')[1].length : 0;
    return function (v) { return (+v).toFixed(dec); };
  }

  /* ============================================================
     CSS（1回だけ差し込む）
     ============================================================ */

  var CSS = [
    '.tp{position:fixed;z-index:2147483000;display:flex;flex-direction:column;overflow:hidden;',
    /* 既定サイズは anyflow の調整パネルに合わせる（2026-09-16 ヒデさん指示）。
       外寸は固定して中身だけスクロールさせる：開閉のたびに外寸が変わると
       パネルごと動いて、触っている場所がズレるため */
    '  width:450px;height:520px;min-width:240px;min-height:44px;max-width:92vw;max-height:92vh;',
    /* 地・枠・角丸・文字サイズは anyflow の調整パネルの実測値に合わせている
       （2026-09-16 実測：地 rgba(255,255,255,.92) / 枠 #ececec / 角丸 8px / 文字 11px） */
    '  resize:both;background:rgba(255,255,255,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);',
    '  border:1px solid #ececec;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.10);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;',
    '  font-size:11px;color:#101828;font-weight:400;}',
    '.tp *{box-sizing:border-box;}',
    /* 掴める幅が狭いと動かしづらいので、ヘッダーは上下を厚めに（anyflow 実測 14px 12px） */
    '.tp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 12px;',
    '  cursor:grab;user-select:none;flex:0 0 auto;}',
    '.tp-head:active{cursor:grabbing;}',
    /* タイトルの字は anyflow の .panel-head-title と同じ（2026-09-20 実測移植）
       15px / 700 / 字送り .02em / #1a1a1a。歯車アイコンは付けない */
    '.tp-title{font-size:15px;font-weight:700;letter-spacing:.02em;color:#1a1a1a;'+
    '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    /* たたんでいる時だけ「押せば開く」と分かるように添える（anyflow 準拠） */
    '.tp-head-sub{font-size:10px;color:#999;margin-left:8px;font-weight:300;}',
    '.tp:not(.closed) .tp-head-sub{display:none;}',
    '.tp-chev{font-size:10px;color:#888;transition:transform .25s;padding:2px 4px;cursor:pointer;}',
    '.tp.closed .tp-chev{transform:rotate(180deg);}',
    '.tp.closed{height:auto !important;resize:none;}',
    '.tp.closed .tp-body,.tp.closed .tp-foot{display:none;}',
    '.tp-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:0 10px 10px;}',
    '.tp-foot{flex:0 0 auto;padding:8px 10px 10px;border-top:1px solid #ececec;background:rgba(255,255,255,.6);}',
    /* 大カテゴリ */
    /* 枠・地・余白は anyflow の .cat の実測に合わせた */
    /* ── カテゴリ（H1）。anyflow のミニマル指定にそろえる（2026-09-20）
       ・絵文字なし ・左のインデント縦線なし
       ・階層は文字サイズ／太さ／余白で表す。区切り線は H1 だけ */
    /* ⚠️ anyflow 2026-09-20「カテゴリの上の横棒線は不要。区切りは見出しの
       大きさ・余白で表す」に合わせ、横線は引かない */
    '.tp-cat{margin-top:2px;background:transparent;border:0;}',
    '.tp-cat-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:13px 2px 7px;',
    '  font-size:13px;font-weight:700;letter-spacing:.03em;color:#111;' +
    '  background:transparent;cursor:pointer;user-select:none;}',
    '.tp-cat-head:hover{color:#000;}',
    /* バリエーションは開閉なしのプレーン大見出し（▾なし・塗りなし） */
    '.tp-cat.plain>.tp-cat-head{cursor:default;}',
    /* 開閉アイコンは anyflow と同じマテリアル(expand_more)。文字は透明にして mask で描く
       （2026-09-20 ヒデさん指示「アイコンも含めて anyflow を真似る」） */
    '.tp-cat-chev{position:relative;width:22px;height:22px;color:transparent;flex:0 0 auto;transition:transform .2s;}',
    '.tp-cat-chev::before{content:\'\';position:absolute;inset:0;margin:auto;width:22px;height:22px;'+
    '  background:#8a8a8a;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z\'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z\'/%3E%3C/svg%3E") center/contain no-repeat;}',
    '.tp-cat-head:hover .tp-cat-chev::before{background:#333;}',
    '.tp-cat.closed .tp-cat-chev{transform:rotate(-90deg);}',
    '.tp-cat-body{padding:0 0 6px;}',
    '.tp-cat.closed .tp-cat-body{display:none;}',
    '.tp-hidden{display:none !important;}',
    /* タブ（ページ切替。cfg.tabs:true で cat がタブになる）
       anyflow 実測に合わせた：高さ26px・角丸13px の丸いピル・文字11.5px／行送り24px・
       幅は内容ぶんだけ（均等割りにしない）・上に貼り付いてスクロールしても見える */
    /* タブ。anyflow V5.0 の実装値をそのまま移植（2026-09-20 ヒデさん指示
       「調整パネルの見た目も完全に寄せて」）。
       ⚠️ ピル型ではなく【アンダーライン型（X風）】＝透明地・選択は下線＋濃い文字。
          折り返さず横スクロールにする（タブが増えても高さが変わらない） */
    '.tp-tabs{position:sticky;top:0;z-index:3;display:flex;flex-wrap:nowrap;gap:16px;',
    '  margin:0 -10px;padding:6px 10px 0;background:rgba(255,255,255,.96);',
    '  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);border-bottom:1px solid #ececec;',
    '  overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;-webkit-overflow-scrolling:touch;',
    '  overscroll-behavior-x:contain;}',
    '.tp-tabs::-webkit-scrollbar{height:6px;}',
    '.tp-tabs::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:3px;}',
    '.tp-tabs::-webkit-scrollbar-track{background:transparent;}',
    '.tp-tab{flex:0 0 auto;height:34px;padding:0 2px;border:0;border-bottom:2px solid transparent;',
    '  border-radius:0;background:transparent;color:#8a8a8a;cursor:pointer;font-family:inherit;',
    '  font-size:12.5px;font-weight:600;line-height:34px;white-space:nowrap;',
    '  transition:color .15s,border-color .15s;}',
    '.tp-tab:hover{color:#333;}',
    '.tp-tab.on{color:#111;border-bottom-color:#111;background:transparent;}',
    /* セクション（タブの中の折りたたみ）
       2026-09-16：anyflow と同じ「箱で囲まない・区切り線だけ」の見せ方に変更。
       白い箱が入れ子になると、中の小見出しとの階層が読み取りづらかったため */
    '.tp-sec{margin-top:9px;padding-top:8px;border-top:1px solid #e8e8e8;background:transparent;}',
    '.tp-cat-body>.tp-sec:first-child{border-top:none;margin-top:4px;padding-top:0;}',
    '.tp-sec-head{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0;',
    /* H2＝オブジェクト。H1(13px/700)より一段控えめにして階層差を出す（2026-09-20） */
    '  font-weight:600;font-size:12px;color:#333;margin:12px 0 5px;min-height:22px;',
    '  background:transparent;cursor:pointer;user-select:none;}',
    '.tp-sec-head:hover{color:#000;}',
    '.tp-sec-chev{position:relative;width:18px;height:18px;color:transparent;flex:0 0 auto;transition:transform .2s;}',
    '.tp-sec-chev::before{content:\'\';position:absolute;inset:0;margin:auto;width:18px;height:18px;'+
    '  background:#9a9a9a;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z\'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z\'/%3E%3C/svg%3E") center/contain no-repeat;}',
    '.tp-sec-head:hover .tp-sec-chev::before{background:#333;}',
    '.tp-sec.closed .tp-sec-chev{transform:rotate(-90deg);}',
    '.tp-sec-body{padding:0;}',
    '.tp-sec.closed .tp-sec-body{display:none;}',
    /* 隠しスイッチ（画面右上の透明ボックス）。見た目は何もないが、クリックでパネルが出る */
    /* 調整パネルを出す透明の四角（見た目は何もない）。
       2026-09-16 ヒデさん指示で、PC・スマホとも【右下】に統一した（anyflow のスマホと同じ置き方）。
       ⚠パネル自体も右下に出るので、表示中はこの四角を右上へ逃がす。
          そうしないと、パネル右下の「書き出す」ボタンやサイズ変更のつまみの上に
          透明な四角がかぶさって、押したつもりがパネルが閉じてしまう */
    '.tp-secret-hot{position:fixed;bottom:0;right:0;width:72px;height:72px;z-index:2147483001;background:transparent;}',
    '.tp-secret-hot.shown{top:0;bottom:auto;}',
    /* 小見出し */
    /* 小見出し（anyflow の .grp / .grp.sub2 の実測に合わせた） */
    '.tp-grp{margin-top:9px;padding-top:8px;border-top:1px solid #e8e8e8;}',
    /* 先頭の小見出しは上の区切り線がいらない。ただし入れ子(deep)は、ぶら下がりを示す
       破線と左線を残したいので対象外にする */
    '.tp-cat-body>.tp-grp:first-child:not(.deep),.tp-sec-body>.tp-grp:first-child:not(.deep)',
    '  {border-top:none;margin-top:8px;padding-top:0;}',
    '.tp-grp-title{font-weight:500;font-size:11.5px;color:#666;margin-bottom:4px;',
    '  display:flex;align-items:center;gap:6px;min-height:22px;}',
    /* 入れ子は「破線の上罫線＋左の縦線」でぶら下がりを示す */
    /* ⚠2026-09-20: anyflow のルールで【左のインデント縦線は禁止】。
       階層は文字サイズ・太さ・余白で表す */
    '.tp-grp.deep{margin-top:9px;padding-top:2px;padding-left:0;border-left:0;border-top:0;}',
    '.tp-grp.deep .tp-grp-title{font-size:11.5px;font-weight:500;color:#666;}',
    '.tp-grp.deep .tp-grp.deep{border-left:0;}',
    /* グレーの補足文は既定で出さない（anyflow と同じ）。
       文面は消していないので、見出しにマウスを乗せれば吹き出しで読める。
       どうしても出したい所は item.keep:true を付ける */
    '.tp-note{display:none;font-size:10px;line-height:1.6;color:#999;margin:-2px 0 6px;}',
    '.tp-note.keep{display:block;}',
    /* 小見出しもたためる（2026-09-16 anyflow 準拠）。
       見出し全体が押せるので、行が多いカテゴリでも目的の所まで一気に畳める */
    '.tp-grp-title{cursor:pointer;}',
    '.tp-grp-chev{font-size:9px;color:#aaa;transition:transform .2s;flex:0 0 auto;}',
    '.tp-grp.closed .tp-grp-chev{transform:rotate(-90deg);}',
    '.tp-grp.closed .tp-grp-body{display:none;}',
    /* 四辺リサイズ（右下つまみだけでなく、上下左右の辺も掴める。anyflow 準拠） */
    '.tp-z{position:absolute;z-index:3;}',
    '.tp-z-t{top:-3px;left:10px;right:10px;height:8px;cursor:ns-resize;}',
    '.tp-z-b{bottom:-3px;left:10px;right:16px;height:8px;cursor:ns-resize;}',
    '.tp-z-l{left:-3px;top:10px;bottom:10px;width:8px;cursor:ew-resize;}',
    '.tp-z-r{right:-3px;top:10px;bottom:16px;width:8px;cursor:ew-resize;}',
    '.tp.closed .tp-z{display:none;}',
    /* 行ごとの↺リセット（その項目だけ既定値に戻す） */
    /* リセットは anyflow と同じマテリアル(refresh)。文字は透明にして mask で描く */
    /* ⚠️ 行のリセットは【ホバー時だけ右端に浮く】作り。22px だと値の数字に
       かぶるので 18px に抑える（2026-09-20 実測で被りを確認して調整） */
    '.tp-item-rst{position:relative;flex:0 0 18px;width:18px;height:18px;padding:0;border:1px solid transparent;'+
    '  border-radius:7px;background:transparent;color:transparent;cursor:pointer;'+
    '  transition:background .15s,border-color .15s;}',
    '.tp-item-rst::after{content:\'\';position:absolute;inset:0;margin:auto;width:12px;height:12px;'+
    '  background:#aeaeae;pointer-events:none;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z\'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z\'/%3E%3C/svg%3E") center/contain no-repeat;}',
    '.tp-item-rst:hover{background:#f0f0f0;border-color:#e0e0e0;}',
    '.tp-item-rst:hover::after{background:#333;}',
    /* プリセット（いまの値に名前を付けて保存し、あとで呼び戻す） */
    '.tp-pset{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 8px;}',
    '.tp-pset-lab{flex:0 0 auto;font-size:11px;line-height:22px;color:#999;}',
    '.tp-pset-chip{display:inline-flex;align-items:stretch;border:1px solid #e2e2e2;border-radius:999px;',
    '.tp-pset-chip.on{border-color:#0EBBFF;box-shadow:0 0 0 1px #0EBBFF inset;}',
    '.tp-pset-chip.on .tp-pset-name{color:#0a86b8;font-weight:600;}',
    '  overflow:hidden;background:#fff;}',
    '.tp-pset-name{border:0;background:transparent;padding:3px 4px 3px 11px;font:inherit;font-size:11px;',
    '  color:#333;cursor:pointer;max-width:128px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.tp-pset-menu{border:0;background:transparent;padding:3px 8px 3px 3px;font-size:12px;color:#bbb;cursor:pointer;}',
    '.tp-pset-menu:hover{color:#666;}',
    '.tp-pset-add{border:1px dashed #d8d8d8;border-radius:999px;background:#fff;color:#777;',
    '  font:inherit;font-size:11px;padding:3px 11px;cursor:pointer;}',
    '.tp-pset-add:hover{border-color:#999;color:#333;}',
    '.tp-pmenu{position:fixed;z-index:2147483002;background:#fff;border:1px solid #e4e4e4;border-radius:9px;',
    '  box-shadow:0 8px 24px rgba(0,0,0,.16);padding:4px;min-width:138px;}',
    '.tp-pmenu button{display:block;width:100%;text-align:left;border:0;background:none;font:inherit;',
    '  font-size:11px;padding:7px 10px;border-radius:6px;cursor:pointer;color:#222;}',
    '.tp-pmenu button:hover{background:#f2f2f2;}',
    '.tp-pmenu button.danger{color:#d94141;}',
    '.tp-pmenu button.danger:hover{background:#fdecec;}',
    '.tp.dark .tp-pset-chip,.tp.dark .tp-pset-add{background:#1b1b1e;border-color:#3a3a3f;}',
    '.tp.dark .tp-pset-name{color:#eee;}',
    '.tp.dark .tp-pmenu{background:#1b1b1e;border-color:#3a3a3f;}',
    '.tp.dark .tp-pmenu button{color:#eee;}',
    '.tp.dark .tp-pmenu button:hover{background:#2a2a2f;}',
    /* スマホ：画面の下からせり上がるシート（anyflow 準拠）。
       小さい画面で右下に浮かせると、指でも掴みにくく中身も読めないため */
    '@media (max-width:640px){',
    '  .tp{left:0 !important;right:0 !important;bottom:0 !important;top:auto !important;',
    '    width:100% !important;max-width:100%;height:62vh !important;max-height:82vh;',
    '    border-radius:14px 14px 0 0;resize:none;}',
    '  .tp.closed{height:auto !important;}',
    '  .tp-head{cursor:default;padding:12px 14px;}',
    '  .tp-z{display:none;}',
    '}',
    /* 項目ツール：anyflow 準拠で ↺（この項目だけ元の値に戻す）だけ。
       2026-09-16 に （項目を消す）・⠿（並び替え）は撤去した。
       消せるのは「デザイン案」だけ＝ピルの ⋯ メニュー。
       ↺のぶんだけ右に場所を空けておく（値の文字と重ならないように） */
    '.tp-item{position:relative;padding-right:18px;}',
    '.tp-item-tools{position:absolute;right:-2px;top:1px;display:flex;gap:0;align-items:center;z-index:6;',
    '  background:transparent;border:1px solid transparent;border-radius:6px;padding:0 1px;}',
    '.tp-item:hover>.tp-item-tools{background:rgba(255,255,255,.95);border-color:#e4e4e4;',
    '  padding:0 3px;box-shadow:0 1px 4px rgba(0,0,0,.08);}',
    '.tp-gbtn{flex:0 0 auto;border:1px solid #e2e2e2;border-radius:6px;background:#fff;color:#888;',
    '  font:inherit;font-size:10px;line-height:1.4;padding:2px 6px;cursor:pointer;}',
    '.tp-gbtn{position:relative;color:transparent;}',
    '.tp-gbtn::after{content:\'\';position:absolute;inset:0;margin:auto;width:15px;height:15px;'+
    '  background:#8a8a8a;pointer-events:none;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z\'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z\'/%3E%3C/svg%3E") center/contain no-repeat;}',
    '.tp-gbtn:hover{background:#f3f3f3;}',
    '.tp-gbtn:hover::after{background:#333;}',
    /* 「✓ 戻しました」の文字を出す時はアイコンを消す */
    '.tp-gbtn.done{color:#111;}',
    '.tp-gbtn.done::after{display:none;}',
    '.tp.dark .tp-gbtn{background:#1b1b1e;border-color:#3a3a3f;color:#bbb;}',
    '.tp-modal{position:absolute;inset:0;background:rgba(20,22,30,.35);display:flex;align-items:center;justify-content:center;z-index:60;border-radius:14px;}',
    '.tp-modal-box{background:#fff;border:1px solid #e4e4e4;border-radius:10px;padding:14px;max-width:86%;box-shadow:0 10px 34px rgba(0,0,0,.22);}',
    '.tp-modal-msg{font-size:11px;line-height:1.7;white-space:pre-line;margin-bottom:12px;color:#333;}',
    '.tp-btns button.danger{background:#e5485f;border-color:#e5485f;color:#fff;}',
    '.tp-btns button.danger:hover{background:#d63a52;}',
    /* 行の補足文も既定では出さない（anyflow と同じ）。項目名の吹き出しで読める */
    '.tp-hint{display:none;font-size:10px;line-height:1.55;color:#999;margin:-1px 0 6px 106px;}',
    '.tp-hint.keep{display:block;}',
    /* 行 */
    '.tp-row{display:flex;align-items:center;gap:6px;margin:2px 0;}',
    '.tp-row>label{flex:0 0 100px;color:#555;font-weight:300;}',
    '.tp-row input[type=range]{flex:1;accent-color:#090909;min-width:0;}',
    '.tp-val{flex:0 0 48px;text-align:right;font-variant-numeric:tabular-nums;color:#333;}',
    '.tp-val-edit{cursor:pointer;border-bottom:1px dashed transparent;}',
    '.tp-item:hover .tp-val-edit{border-bottom-color:#bbb;}',
    '.tp-val-edit:hover{color:#000;border-bottom-color:#666;}',
    '.tp-row .tp-val-input{flex:0 0 64px;min-width:0;padding:3px 5px;border:1px solid #0070c9;border-radius:5px;',
    '  font:inherit;text-align:right;background:#fff;color:inherit;}',
    '.tp.dark .tp-row .tp-val-input{background:#1b1b1e;border-color:#7ab8ff;color:#eee;}',
    '.tp.dark .tp-val-edit{border-bottom-color:#555;}',
    '.tp-row select,.tp-row input[type=text],.tp-row input[type=number]{flex:1;min-width:0;padding:5px 7px;',
    '  border:1px solid #d8d8d8;border-radius:6px;font:inherit;background:#fff;color:inherit;}',
    '.tp-row input[type=color]{flex:0 0 34px;height:24px;padding:0;border:1px solid #d8d8d8;border-radius:5px;background:#fff;}',
    /* 複数行テキスト（textarea）：ラベルを上に置いて縦並び */
    '.tp-row.tp-row-col{flex-direction:column;align-items:stretch;gap:5px;}',
    '.tp-row textarea{width:100%;min-width:0;box-sizing:border-box;padding:7px 8px;',
    '  border:1px solid #d8d8d8;border-radius:6px;font:inherit;line-height:1.7;background:#fff;color:inherit;resize:vertical;}',
    /* セグメント */
    '.tp-seg{display:flex;border:1px solid #d8d8d8;border-radius:6px;overflow:hidden;flex:1;}',
    '.tp-seg button{flex:1;border:none;background:#fff;font-family:inherit;font-size:11px;padding:5px 0;cursor:pointer;color:#555;}',
    '.tp-seg button.on{background:#090909;color:#fff;}',
    /* ピル */
    '.tp-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px;}',
    '.tp-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid #ddd;border-radius:999px;',
    '  background:#fff;font-family:inherit;font-size:11px;color:#333;cursor:pointer;}',
    '.tp-pill:hover{border-color:#999;}',
    '.tp-pill.on{background:#090909;color:#fff;border-color:#090909;}',
    '.tp-swatch{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.08);}',
    '.tp-desc{margin:4px 0 6px;color:#777;font-weight:300;font-size:11px;}',
    /* ★ピン留めの別セクション（anyflow 準拠） */
    '.tp-favhead{font-size:10.5px;color:#999;margin:6px 0 0;}',
    '.tp-favrow{margin-top:3px;}',
    '.tp-pill.fav{border-color:#0EBBFF;}',
    '.tp-pill.fav.on{border-color:#090909;}',
    /* 案ごとの「⋯」。ピルの右端に小さく。触れた時だけはっきり出す */
    '.tp-var-x{border:0;background:transparent;color:#bbb;font:inherit;font-size:12px;line-height:1;',
    '  padding:0 0 0 4px;margin-left:2px;cursor:pointer;opacity:.45;border-radius:4px;}',
    '.tp-pill:hover .tp-var-x{opacity:1;}',
    '.tp-pill.on .tp-var-x{color:rgba(255,255,255,.75);opacity:.8;}',
    '.tp-var-x:hover{color:#d94141;background:rgba(0,0,0,.06);}',
    '.tp-pill.on .tp-var-x:hover{color:#fff;background:rgba(255,255,255,.22);}',
    '.tp-pill.tp-var-back{border-style:dashed;color:#888;}',
    '.tp-pill.tp-var-back:hover{color:#111;border-color:#999;}',
    /* 確認・選択ダイアログ */
    '.tp-mdl-bg{position:fixed;inset:0;z-index:2147483003;background:rgba(20,22,30,.38);',
    '  display:flex;align-items:center;justify-content:center;padding:20px;}',
    '.tp-mdl{width:320px;max-width:100%;background:#fff;border-radius:12px;padding:18px 18px 14px;',
    '  box-shadow:0 18px 50px rgba(0,0,0,.28);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;color:#101828;}',
    '.tp-mdl h4{margin:0 0 6px;font-size:13px;font-weight:600;}',
    '.tp-mdl p{margin:0 0 12px;font-size:11px;line-height:1.7;color:#666;}',
    '.tp-mdl-list{max-height:240px;overflow-y:auto;margin:0 0 12px;border:1px solid #ececec;border-radius:8px;}',
    '.tp-mdl-li{display:flex;align-items:center;justify-content:space-between;gap:8px;',
    '  padding:7px 10px;border-bottom:1px solid #f2f2f2;font-size:11px;}',
    '.tp-mdl-li:last-child{border-bottom:none;}',
    '.tp-mdl-li button{border:1px solid #e2e2e2;border-radius:6px;background:#fff;font:inherit;font-size:10.5px;',
    '  padding:3px 10px;cursor:pointer;color:#444;}',
    '.tp-mdl-li button:hover{background:#f3f3f3;color:#111;}',
    '.tp-mdl-btns{display:flex;gap:8px;justify-content:flex-end;}',
    '.tp-mdl-btns button{border:1px solid #e2e2e2;border-radius:7px;background:#fff;font:inherit;font-size:11px;',
    '  height:30px;padding:0 14px;cursor:pointer;color:#444;}',
    '.tp-mdl-btns button:hover{background:#f3f3f3;color:#111;}',
    '.tp-mdl-btns button.danger{background:#d94141;border-color:#d94141;color:#fff;}',
    '.tp-mdl-btns button.danger:hover{background:#c23636;}',
    /* スイッチ */
    '.tp-switch{position:relative;width:36px;height:20px;flex:0 0 36px;border-radius:999px;background:#d8d8d8;',
    '  border:none;cursor:pointer;transition:background .2s;padding:0;}',
    '.tp-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;',
    '  background:#fff;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);}',
    '.tp-switch.on{background:#090909;}',
    '.tp-switch.on::after{transform:translateX(16px);}',
    /* ボタン */
    '.tp-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}',
    /* 下部のボタン。anyflow の .panel-edit-btn にそろえる（2026-09-20 ヒデさん指示
       「塗りはいらないので取る。並びも名称も全部揃えて」）。
       11px・白地・1px の線・角丸6px。ホバーでブランド色の線に変わる */
    '.tp-btns button{flex:1 1 auto;white-space:nowrap;font-family:inherit;font-size:11px;padding:4px 10px;height:28px;',
    '  border-radius:6px;border:1px solid #d8d8d8;background:#fff;cursor:pointer;transition:background .2s;color:#101828;}',
    '.tp-btns button:hover{border-color:#0EBBFF;color:#0aa2dd;background:#fff;}',
    /* ⚠️ 塗りつぶし（黒地）はやめる。anyflow は下部ボタンを塗らない */
    '.tp-btns button.primary{background:#fff;color:#444;border-color:#d5d5d5;}',
    '.tp-btns button.primary:hover{border-color:#0EBBFF;color:#0aa2dd;background:#fff;}',
    /* 未保存の変更があることを目立たせる（Anyflow のパネルと同じピンク） */
    '.tp-btns button.primary.dirty{background:#FF5D97;border-color:#FF5D97;}',
    '.tp-btns button.primary.dirty:hover{background:#ff4487;}',
    '.tp-toast{position:absolute;left:0;right:0;bottom:0;padding:7px 12px;background:#090909;color:#fff;',
    '  font-size:11px;opacity:0;transform:translateY(100%);transition:opacity .2s,transform .2s;pointer-events:none;}',
    '.tp-toast.show{opacity:1;transform:translateY(0);}',
    /* ダーク */
    '.tp.dark{background:rgba(20,20,22,.92);border-color:#333;color:#eee;}',
    '.tp.dark .tp-cat{background:#1b1b1e;border-color:#2e2e32;}',
    '.tp.dark .tp-cat-head{background:#232327;}',
    '.tp.dark .tp-cat-head:hover{background:#2a2a2f;}',
    '.tp.dark .tp-row>label{color:#aaa;}',
    '.tp.dark .tp-val{color:#ddd;}',
    '.tp.dark .tp-grp{border-top-color:#2e2e32;}',
    '.tp.dark .tp-seg,.tp.dark .tp-pill,.tp.dark .tp-btns button,',
    '.tp.dark .tp-row select,.tp.dark .tp-row input[type=text],.tp.dark .tp-row input[type=number],.tp.dark .tp-row textarea',
    '  {background:#1b1b1e;border-color:#3a3a3f;color:#eee;}',
    '.tp.dark .tp-seg button{background:#1b1b1e;color:#bbb;}',
    '.tp.dark .tp-seg button.on,.tp.dark .tp-pill.on{background:#fff;color:#111;border-color:#fff;}',
    '.tp.dark .tp-btns button.primary{background:#fff;color:#111;border-color:#fff;}',
    '.tp.dark .tp-foot{background:rgba(20,20,22,.6);border-top-color:#2e2e32;}',
    '.tp.dark input[type=range]{accent-color:#fff;}',
    /* ===== 2026-09-26 anyflow 調整パネルの完全踏襲（ヒデさん指示）=====
       値はすべて anyflow/v5/index.html の .panel 系の実装値をそのまま写したもの */
    /* ヘッダー右の小さいボタン（📱スマホモード／✏️編集）＝ .panel-edit-btn */
    /* 見出しの帯もタブと同じ白の不透明地（2026-09-26 ヒデさん指示「ヘッダーのボックスにもタブと同じ白を」）。
       半透明だと後ろの写真の色が透けて、タブの白と段差に見えていた */
    '.tp-head{background:#fff;}',
    /* スマホモードの帯は、スマホモード中だけ出す（開発時の CSS で出し分け） */
    '.tp-phone-banner{display:none;}',
    '.tp.dark .tp-head{background:#141416;}',
    '.tp-head-btns{margin-left:auto;margin-right:10px;display:flex;gap:6px;align-items:center;flex:0 0 auto;}',
    '.tp-head-btn{flex:0 0 auto;padding:4px 10px;font-size:11px;font-family:inherit;border:1px solid #d5d5d5;',
    '  border-radius:6px;background:#fff;color:#444;cursor:pointer;}',
    '.tp-head-btn:hover{border-color:#0EBBFF;color:#0aa2dd;}',
    '.tp-head-btn.on{background:#0EBBFF;border-color:#0EBBFF;color:#fff;}',
    '.tp-head-btn[hidden]{display:none;}',
    /* タブ＝ .pan-tabs / .pan-tab（白の不透明地・下線 #dcdcdc・バー3px・選択は太字） */
    '.tp-tabs{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none;border-bottom:1px solid #dcdcdc;}',
    '.tp-tabs::-webkit-scrollbar{height:3px;}',
    '.tp-tabs::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:2px;}',
    '.tp-tab{font-weight:500;transition:color .15s,border-color .15s,font-weight .15s;}',
    '.tp-tab.on{font-weight:700;}',
    /* H1（基本・フォント…）＝カード。 .cat-section:not(.cs-variation)
       バリエーション（.plain）は装飾しない */
    '.tp-cat:not(.plain){background:#f8f9fb;border:1px solid #e4e7eb;border-radius:10px;margin:8px 0;',
    '  padding:0 11px 6px;box-shadow:0 1px 2px rgba(16,24,40,.04);}',
    '.tp-cat>.tp-cat-head{padding:11px 2px 8px;font-size:13px;font-weight:700;color:#111;}',
    /* H2（オブジェクトのまとまり）：開閉なし・区切り線なし。右に28px角の「まとめて戻す」 */
    '.tp-sec{margin-top:4px;padding-top:0;border-top:0;}',
    '.tp-cat-body>.tp-sec:first-child{margin-top:0;}',
    '.tp-sec-head{font-size:13px;font-weight:700;color:#111;margin:12px 0 5px;min-height:28px;cursor:default;}',
    '.tp-sec-head:hover{color:#111;}',
    '.tp-sec-chev{display:none;}',
    '.tp-sec.closed .tp-sec-body{display:block;}',
    /* H3（入れ子）＝ .grp.sub2：小さめ・muted */
    '.tp-grp.deep .tp-grp-title{font-size:11px;font-weight:600;color:#777;margin:8px 0 4px;}',
    /* まとまりの戻すボタン＝ .gbtn（28px角・枠 #e0e0e0・角丸8px） */
    '.tp-gbtn{width:28px;height:28px;padding:0;border:1px solid #e0e0e0;border-radius:8px;background:#fff;',
    '  line-height:26px;text-align:center;transition:background .15s,border-color .15s;}',
    '.tp-gbtn:hover{background:#f4f4f4;border-color:#d5d5d5;}',
    '.tp-gbtn.done{width:auto;padding:0 9px;background:#090909;color:#fff;border-color:#111;}',
    /* 下のボタン＝ .btns（本文の最後・3つ同じ幅・1つ目だけ黒）。未保存はピンク */
    '.tp-foot{padding:0;border-top:0;background:transparent;}',
    '.tp-btns{flex-wrap:nowrap;gap:8px;margin-top:12px;}',
    '.tp-btns button{flex:1 1 0;min-width:0;height:auto;padding:8px 0;font-size:11px;border-radius:8px;',
    '  border:1px solid #d8d8d8;background:#fff;color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.tp-btns button:hover{background:#f2f2f2;border-color:#d8d8d8;color:#101828;}',
    '.tp-btns button.primary{background:#090909;color:#fff;border-color:#090909;}',
    '.tp-btns button.primary:hover{background:#333;border-color:#333;color:#fff;}',
    '.tp-btns button.primary.dirty{background:#FF5D97;border-color:#FF5D97;color:#fff;}',
    '.tp-btns button.primary.dirty:hover{background:#ff4487;}',
    /* 下の注意書き＝ .grp-note.keep（8.5px・#a6a6a6） */
    '.tp-savenote{font-size:8.5px;line-height:1.5;color:#a6a6a6;margin:6px 0 0;}',
    /* プリセットはカードの中へ（下のボタンの並びには入れない） */
    '.tp-pset-card .tp-pset{margin:0 0 4px;}',
    '.tp-pset-card .tp-pset-lab{display:none;}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('tune-panel-css')) return;
    var st = document.createElement('style');
    st.id = 'tune-panel-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ============================================================
     本体
     ============================================================ */

  function Panel(cfg) {
    this.cfg = cfg = cfg || {};
    this.params = cfg.params;
    if (!this.params) throw new Error('[TunePanel] params が要ります');
    this.defaults = clone(cfg.defaults !== undefined ? cfg.defaults : cfg.params);
    this.version = cfg.version === undefined ? 1 : cfg.version;
    this.storageKey = cfg.storageKey || null;
    this.settleDelay = cfg.settleDelay === undefined ? 250 : cfg.settleDelay;
    /* 保存のしかた（2026-08-21 ヒデさん指示で Anyflow のパネルに統一）
       'button'（既定）: 触った値はその場で反映されるが localStorage には書かない。
                         未保存の変更があると「💾 保存」がピンクになり、押した時だけ確定する
       'auto'          : 従来どおり、触るたびに自動保存 */
    this.saveMode = cfg.saveMode === undefined ? 'button' : cfg.saveMode;
    this._dirty = false;
    this.autoCenter = cfg.autoCenter !== false;
    this.rows = [];
    this._itemByKey = {};
    this.catOpen = {};
    this.secOpen = {};
    this.activeTab = null;
    this._settleTimer = 0;
    this._muted = false;

    injectCSS();
    this._buildShell();
    this._loadParams();
    this._loadUI();
    this.rebuild();
    this._phoneInit();
  }

  /* ---------- 保存 ---------- */

  Panel.prototype._pKey = function () { return 'tp:' + this.storageKey + ':v' + this.version; };
  Panel.prototype._uKey = function () { return 'tp:' + this.storageKey + ':ui'; };

  Panel.prototype._loadParams = function () {
    if (!this.storageKey) return;
    /* 古いバージョンの保存値は掃除する（＝バージョンを上げれば必ず新しい初期値で出る）
       ⚠2026-09-16 の不具合：'tp:<キー>:v' で前方一致させていたため、
          案の隠し／ピン留めを入れている 'tp:<キー>:variants' まで毎回消えていた
          （保存はされるのにリロードで戻る、という症状）。
          数字つきのバージョン鍵だけを対象にする */
    try {
      var vRe = new RegExp('^tp:' + this.storageKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':v\\d+$');
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && vRe.test(k) && k !== this._pKey()) localStorage.removeItem(k);
      }
      var raw = localStorage.getItem(this._pKey());
      if (raw) assignDeep(this.params, mergeSaved(this.defaults, JSON.parse(raw)));
    } catch (e) { /* 壊れていたら初期値のまま */ }
  };

  Panel.prototype.save = function () {
    if (!this.storageKey) return;
    try { localStorage.setItem(this._pKey(), JSON.stringify(this.params)); } catch (e) {}
  };

  Panel.prototype._saveUI = function () {
    if (!this.storageKey) return;
    var r = this.el.getBoundingClientRect();
    /* 画面サイズが取れない瞬間（タブが裏／最小化など）に潰れた値を保存しない。
       これを保存すると次回から左上に小さく貼りついたまま復元されてしまう */
    if (!innerWidth || !innerHeight || r.width < 120 || (!this.el.classList.contains('closed') && r.height < 80)) return;
    try {
      localStorage.setItem(this._uKey(), JSON.stringify({
        tab: this.activeTab,
        secs: this.secOpen,
        x: r.left, y: r.top,
        w: this.el.classList.contains('closed') ? this._openW : r.width,
        h: this.el.classList.contains('closed') ? this._openH : r.height,
        closed: this.el.classList.contains('closed'),
        cats: this.catOpen,
        scroll: this.body.scrollTop,
        /* 幅の既定を 360→450 に上げる一度きりの移行を済ませた印。
           これが付いていれば、自分で 360px に狭めても勝手に広げ直さない */
        w450: true
      }));
    } catch (e) {}
  };

  Panel.prototype._loadUI = function () {
    var ui = null;
    if (this.storageKey) {
      try { ui = JSON.parse(localStorage.getItem(this._uKey())); } catch (e) {}
    }
    var size = this.cfg.size || {};
    /* 潰れた保存値（過去バージョンで入り込んだもの）は無視して既定サイズに戻す */
    var w = (ui && ui.w > 120 ? ui.w : 0) || size.w || 450;
    var h = (ui && ui.h > 80 ? ui.h : 0) || size.h || 520;
    /* 2026-09-16 既定幅を anyflow に合わせて 360→450 に変えた。
       旧既定のまま（＝自分で広げていない）保存値は、一度だけ新しい既定に引き上げる。
       自分で動かした幅は尊重したいので、ぴったり360の時だけ */
    if (ui && ui.w === 360 && !ui.w450) { w = 450; }
    this._openW = w; this._openH = h;
    this.el.style.width = w + 'px';
    this.el.style.height = h + 'px';

    if (ui && typeof ui.x === 'number') {
      this._place(ui.x, ui.y);
    } else {
      var pos = this.cfg.position || {};
      var margin = 20;
      this.el.style.left = 'auto'; this.el.style.top = 'auto';
      this.el.style.right = (pos.right === undefined ? margin : pos.right) + 'px';
      this.el.style.bottom = (pos.bottom === undefined ? margin : pos.bottom) + 'px';
      if (pos.left !== undefined) { this.el.style.left = pos.left + 'px'; this.el.style.right = 'auto'; }
      if (pos.top !== undefined) { this.el.style.top = pos.top + 'px'; this.el.style.bottom = 'auto'; }
    }
    if (ui && ui.cats) this.catOpen = ui.cats;
    if (ui && ui.secs) this.secOpen = ui.secs;
    if (ui && ui.tab) this.activeTab = ui.tab;
    var startClosed = ui ? ui.closed : !!this.cfg.startClosed;
    this.el.classList.toggle('closed', !!startClosed);
    this._restoreScroll = (ui && ui.scroll) || 0;
  };

  Panel.prototype._place = function (x, y) {
    var w = this.el.offsetWidth, h = this.el.offsetHeight;
    /* 画面サイズが取れない時（幅0で返ってくる瞬間がある）は、はみ出し補正をしない */
    if (innerWidth > 0 && innerHeight > 0) {
      x = Math.min(Math.max(0, x), Math.max(0, innerWidth - w));
      y = Math.min(Math.max(0, y), Math.max(0, innerHeight - h));
    }
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
    this.el.style.right = 'auto';
    this.el.style.bottom = 'auto';
  };

  /* ---------- 枠組み ---------- */

  Panel.prototype._buildShell = function () {
    var self = this;
    var el = this.el = document.createElement('div');
    el.className = 'tp' + (this.cfg.theme === 'dark' ? ' dark' : '');

    var head = this.head = document.createElement('div');
    head.className = 'tp-head';
    var title = document.createElement('span');
    title.className = 'tp-title';
    title.textContent = this.cfg.title || '調整パネル';
    var sub = document.createElement('span');
    sub.className = 'tp-head-sub';
    sub.textContent = 'クリックで開く';
    title.appendChild(sub);
    var chev = document.createElement('span');
    chev.className = 'tp-chev';
    chev.textContent = '▲';
    chev.title = '開閉';
    /* タイトル横のボタン（anyflow の .panel-head-btns と同じ並び：左=スマホ実機／右=編集）。
       📱スマホモード … ローカル確認用。本番（公開URL）では出さない
       ✏️編集 ………… ページ側に編集の仕組みがある時だけ出す（cfg.onEdit） */
    var hbtns = this.headBtns = document.createElement('span');
    hbtns.className = 'tp-head-btns';
    var phoneBtn = this.phoneBtn = document.createElement('button');
    phoneBtn.type = 'button';
    phoneBtn.className = 'tp-head-btn';
    phoneBtn.textContent = '📱 スマホモード';
    phoneBtn.title = 'スマホモード（実機とライブ同期・QR）';
    phoneBtn.hidden = true;
    var editBtn = this.editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'tp-head-btn';
    editBtn.textContent = '✏️ 編集';
    editBtn.title = 'オブジェクトを直接編集';
    editBtn.hidden = typeof this.cfg.onEdit !== 'function';
    editBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var on = !editBtn.classList.contains('on');
      editBtn.classList.toggle('on', on);
      try { self.cfg.onEdit(on, self); } catch (er) {}
    });
    hbtns.append(phoneBtn, editBtn);
    head.append(title, hbtns, chev);

    var body = this.body = document.createElement('div');
    body.className = 'tp-body';
    /* 慣性スクロール(Lenis)を使っているページで、パネル内のホイールを
       ページに持っていかれないようにする。Lenis が公式に見る属性 */
    body.setAttribute('data-lenis-prevent', '');
    el.setAttribute('data-lenis-prevent', '');
    var foot = this.foot = document.createElement('div');
    foot.className = 'tp-foot';
    var toast = this.toast = document.createElement('div');
    toast.className = 'tp-toast';

    /* ⚠️ 2026-09-26 anyflow 準拠：下のボタンは「パネルの床」ではなく【本文の最後】。
       rebuild のたびに本文の末尾へ付け直す */
    el.append(head, body, toast);
    /* 四辺リサイズのつまみ（2026-09-16 anyflow 準拠）。
       右下の標準つまみだけだと、左や上に広げたい時にいちど動かす手間がいる */
    ['t', 'b', 'l', 'r'].forEach(function (side) {
      var z = document.createElement('div');
      z.className = 'tp-z tp-z-' + side;
      z.addEventListener('pointerdown', function (e) { self._edgeResize(side, e); });
      el.appendChild(z);
    });
    (this.cfg.mount || document.body).appendChild(el);

    /* 開閉 */
    chev.addEventListener('click', function (e) { e.stopPropagation(); self.toggle(); });

    /* ヘッダーを掴んで移動 */
    var drag = null;
    head.addEventListener('pointerdown', function (e) {
      if (e.target === chev) return;
      if (e.target.closest && e.target.closest('.tp-head-btn')) return;
      var r = el.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', function (e) {
      if (!drag) return;
      /* 3px 以上動いたら「移動」とみなす。指やマウスの微妙なブレで
         開閉が誤爆しないようにするための遊び */
      if (Math.abs(e.clientX - drag.x0) > 3 || Math.abs(e.clientY - drag.y0) > 3) drag.moved = true;
      self._place(e.clientX - drag.dx, e.clientY - drag.dy);
    });
    head.addEventListener('pointerup', function () {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      if (moved) self._saveUI();
      else self.toggle();   /* 動かさず押しただけなら開閉（anyflow と同じ） */
    });

    /* リサイズ（CSS resize:both）を保存 */
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        if (el.classList.contains('closed')) return;
        if (el.offsetWidth < 120 || el.offsetHeight < 80) return;   /* 潰れた瞬間は無視 */
        self._openW = el.offsetWidth; self._openH = el.offsetHeight;
        clearTimeout(self._roT);
        self._roT = setTimeout(function () { self._saveUI(); }, 300);
      });
      ro.observe(el);
    }
    body.addEventListener('scroll', function () {
      clearTimeout(self._scT);
      self._scT = setTimeout(function () { self._saveUI(); }, 300);
    });

    /* 隠しモード（既定ON。cfg.secret:false で常時表示に戻せる）
       パネルは最初は見えない。画面右上の透明ボックス（64px）をクリックすると
       出る/隠れる（2026-08-21 ヒデさん指示：関係者に見せる時はパネルを隠したい）。
       出した状態は同じタブの間だけ覚える（調整中にリロードしても消えない） */
    var secret = this.cfg.secret === undefined ? true : this.cfg.secret;
    var setShown = this._setShown = function (on) {
      el.style.display = on ? '' : 'none';
      if (self._hot) self._hot.classList.toggle('shown', !!on);
      if (!secret) return;
      try { sessionStorage.setItem('tp-secret-' + (self.cfg.storageKey || 'panel'), on ? '1' : '0'); } catch (e) {}
    };
    if (secret) {
      var shown0 = false;
      try { shown0 = sessionStorage.getItem('tp-secret-' + (this.cfg.storageKey || 'panel')) === '1'; } catch (e) {}
      setShown(shown0);
      var hot = this._hot = document.createElement('div');
      hot.className = 'tp-secret-hot';
      (this.cfg.mount || document.body).appendChild(hot);
      hot.classList.toggle('shown', shown0);
      hot.addEventListener('click', function () { setShown(el.style.display === 'none'); });
    }

    /* ショートカット（既定 "." キー）でパネルを隠す/出す */
    var key = this.cfg.hotkey === undefined ? '.' : this.cfg.hotkey;
    if (key) {
      this._onKey = function (e) {
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (e.key === key && !e.metaKey && !e.ctrlKey && !e.altKey) {
          setShown(el.style.display === 'none');
        }
      };
      window.addEventListener('keydown', this._onKey);
    }
  };

  /* 辺を掴んでのリサイズ。上と左は「掴んだ辺を動かす」ので、位置も一緒に動かす */
  Panel.prototype._edgeResize = function (side, e) {
    var self = this, el = this.el;
    if (el.classList.contains('closed')) return;
    e.preventDefault();
    var r = el.getBoundingClientRect();
    var sx = e.clientX, sy = e.clientY;
    var w0 = r.width, h0 = r.height, x0 = r.left, y0 = r.top;
    var MIN_W = 240, MIN_H = 120;
    var move = function (ev) {
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      var w = w0, h = h0, x = x0, y = y0;
      if (side === 'r') w = w0 + dx;
      if (side === 'b') h = h0 + dy;
      if (side === 'l') { w = w0 - dx; x = x0 + dx; }
      if (side === 't') { h = h0 - dy; y = y0 + dy; }
      /* 最小サイズに当たったら、そこで辺を止める（位置だけ動いて痩せ続けるのを防ぐ） */
      if (w < MIN_W) { if (side === 'l') x = x0 + (w0 - MIN_W); w = MIN_W; }
      if (h < MIN_H) { if (side === 't') y = y0 + (h0 - MIN_H); h = MIN_H; }
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      self._place(x, y);
    };
    var up = function () {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      self._openW = el.offsetWidth; self._openH = el.offsetHeight;
      self._saveUI();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  /* ---------- 通知 ---------- */

  Panel.prototype._markDirty = function (on) {
    this._dirty = !!on;
    this._syncSaveBtn();
  };

  Panel.prototype._changed = function (info) {
    var self = this;
    if (this._muted) return;
    /* 2026-09-26 anyflow 準拠：触った値は 0.8 秒後に自動でこのブラウザへ保存する
       （リロードしても消えない）。「デフォルトに設定」を押すまではボタンがピンクのまま
       ＝まだ確定していない印。保存と同時に、スマホモードの枠や実機へも知らせる */
    if (this.saveMode === 'button') {
      this._markDirty(true);
      clearTimeout(this._autoSaveT);
      this._autoSaveT = setTimeout(function () {
        try { self.save(); self._saveVars(); } catch (e) {}
        tpPhonePush();
      }, TP_PHONE.on ? 120 : 800);
    } else this.save();
    if (this.cfg.onChange) this.cfg.onChange(info);
    clearTimeout(this._settleTimer);
    if (info && info.immediate) {
      if (this.cfg.onSettle) this.cfg.onSettle(info);
    } else {
      this._settleTimer = setTimeout(function () {
        if (self.cfg.onSettle) self.cfg.onSettle(info);
      }, this.settleDelay);
    }
  };

  Panel.prototype.flash = function (msg) {
    var self = this;
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(function () { self.toast.classList.remove('show'); }, 1600);
  };

  /* ---------- アクセサ ---------- */

  Panel.prototype._get = function (item) {
    return item.get ? item.get(this.params) : getPath(this.params, item.path);
  };
  Panel.prototype._set = function (item, v) {
    if (item.set) item.set(v, this.params); else setPath(this.params, item.path, v);
  };
  Panel.prototype._default = function (item) {
    if (item.defaultValue !== undefined) return item.defaultValue;
    if (item.get) {
      /* get が params を閉じ込んでいる書き方でも初期値を取れるようにする */
      var keep = this.params;
      try { this.params = this.defaults; return item.get(this.defaults); }
      catch (e) { return undefined; }
      finally { this.params = keep; }
    }
    return getPath(this.defaults, item.path);
  };

  /* 廃止した選択肢が localStorage に残っていると、どれも選ばれていない状態になる。
     options に無い値だったら初期値へ戻す（anyflow-embed で実際に起きた） */
  Panel.prototype._validateEnum = function (item) {
    if (!item.options || !item.options.length) return;
    var cur = this._get(item);
    var ok = item.options.some(function (o) {
      var v = Array.isArray(o) ? o[1] : (o.value !== undefined ? o.value : o);
      return String(v) === String(cur);
    });
    if (!ok) {
      var d = this._default(item);
      this._set(item, d);
      this.save();
    }
  };

  /* ---------- 描画 ---------- */

  Panel.prototype.rebuild = function () {
    var self = this;
    var keepScroll = this.body.scrollTop || this._restoreScroll || 0;
    this.body.innerHTML = '';
    this.foot.innerHTML = '';
    this.rows = [];
    this._itemByKey = {};

    /* 検索ボックス */
    /* 【2026-09-16 ヒデさん指示】項目の検索バーは調整パネルに入れない */
    var schema = typeof this.cfg.schema === 'function' ? this.cfg.schema(this.params) : (this.cfg.schema || []);
    var cats = schema.filter(function (cat) { return !(cat.when && !cat.when(self.params)); });

    if (this.cfg.tabs) {
      /* タブモード（2026-08-23 ヒデさん依頼）：カテゴリ＝ページをタブで切り替え、
         タブの中はセクション（小見出し単位）の折りたたみで並ぶ */
      var titles = cats.map(function (c) { return c.cat || c.title || ''; });
      if (!this.activeTab || titles.indexOf(this.activeTab) < 0) this.activeTab = titles[0];
      var bar = document.createElement('div');
      bar.className = 'tp-tabs';
      titles.forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tp-tab' + (t === self.activeTab ? ' on' : '');
        b.textContent = t;
        b.addEventListener('click', function () {
          if (self.activeTab === t) return;
          self.activeTab = t;
          self._saveUI();
          self.rebuild();
        });
        bar.appendChild(b);
      });
      /* タブが1つだけなら帯は出さない（anyflow は 2つ以上の時だけタブにする） */
      if (titles.length > 1) this.body.appendChild(bar);
      var activeCat = cats[titles.indexOf(this.activeTab)];
      if (activeCat) this._renderCatSections(activeCat);
    } else {
      cats.forEach(function (cat) { self._renderCat(cat); });
    }

    this._renderFoot();
    if (this.foot.parentNode !== this.body) this.body.appendChild(this.foot);
    this.body.scrollTop = keepScroll;
    this._restoreScroll = 0;
    return this;
  };

  /* タブモード用：非deepの小見出しを「折りたたみセクション」に昇格して並べる */
  Panel.prototype._renderCatSections = function (cat) {
    var self = this;
    var root = document.createElement('div');
    root.dataset.okey = (cat.cat || '') + '|_top';
    this.body.appendChild(root);

    /* ── カテゴリ（第1階層）──────────────────────────────
       【2026-09-20 ヒデさん指示】anyflow と同じ構成・同じ並びにそろえる。
       ルールの本体は settings/docs/anyflow/ANYFLOW-PANEL-STRUCTURE.md。
         バリエーション → 基本 → フォント → エフェクト＆テクスチャ
         → アニメーション → その他
       各節（item.sub）に grp: 'basic' などを書くと、その名前の
       カテゴリの下に入る。書かなければ言葉から自動で振り分ける。
       ⚠バリエーションだけは開閉しないプレーンな大見出し（anyflow と同じ）。 */
    var GRP_ORDER = ['variation', 'basic', 'font', 'fxtex', 'anim', 'other'];
    var GRP_LABEL = {
      variation: 'バリエーション',
      basic: '基本',
      font: 'フォント',
      fxtex: 'エフェクト＆テクスチャ',
      anim: 'アニメーション',
      other: 'その他',
    };
    /* 節の名前から行き先を推測する（grp を書き忘れた時の保険） */
    var grpFromLabel = function (t) {
      if (/案|バリエーション|パターン/.test(t)) return 'variation';
      if (/文字|フォント|見出し|書体|サイズ/.test(t)) return 'font';
      if (/色|配色|濃さ|ブラー|ぼか|影|光|質感|線|不透明|テクスチャ|慣性/.test(t)) return 'fxtex';
      if (/アニメ|登場|出現|遷移|ディレイ|タイミング|速度|速さ|再生|時間|ループ|間隔/.test(t)) return 'anim';
      if (/位置|大きさ|余白|幅|高さ|間|距離|傾き|ずれ|パディング|ギャップ/.test(t)) return 'basic';
      return 'other';
    };
    var catBoxes = {};
    var catBodyOf = function (g) {
      if (catBoxes[g]) return catBoxes[g];
      var box = document.createElement('div');
      var isVar = g === 'variation';
      box.className = 'tp-cat' + (isVar ? ' plain' : '');
      var head = document.createElement('div');
      head.className = 'tp-cat-head';
      head.innerHTML = '<span></span>' + (isVar ? '' : '<span class="tp-cat-chev">▾</span>');
      head.firstChild.textContent = GRP_LABEL[g] || g;
      head.firstChild.style.flex = '1 1 auto';
      var cbody = document.createElement('div');
      cbody.className = 'tp-cat-body';
      if (!isVar) {
        /* 既定は全部ひらく（anyflow と同じ） */
        var ckey = (cat.cat || '') + '|@' + g;
        if (self.catOpen[ckey] === false) box.classList.add('closed');
        head.addEventListener('click', function () {
          self.catOpen[ckey] = !box.classList.toggle('closed');
          self._saveUI();
        });
      }
      box.append(head, cbody);
      root.appendChild(box);
      catBoxes[g] = cbody;
      return cbody;
    };
    /* 並び順どおりに器を先に作っておく（中身が無い器はあとで消す） */
    GRP_ORDER.forEach(function (g) { catBodyOf(g); });

    var currentBody = root;
    this._mount = root;
    (cat.items || []).forEach(function (item) {
      if (!item) return;
      if (item.when && !item.when(self.params)) return;
      if (item.sub !== undefined && !item.deep) {
        var title = String(item.sub);
        var key = (cat.cat || '') + '|' + title;
        /* 2026-09-26 anyflow 準拠：H2 は開閉なし（いつも開いている）。
           右端に28px角の「まとめて戻す」ボタンだけを置く */
        var sec = document.createElement('div');
        sec.className = 'tp-sec';
        var head = document.createElement('div');
        head.className = 'tp-sec-head';
        head.innerHTML = '<span></span>';
        head.firstChild.textContent = title;
        head.firstChild.style.flex = '1 1 auto';
        head.firstChild.style.minWidth = '0';
        var secBody = document.createElement('div');
        secBody.className = 'tp-sec-body';
        secBody.dataset.okey = key;
        /* このまとまりの項目を、ひとまとめに既定値へ戻す（anyflow 準拠） */
        head.appendChild(self._groupResetBtn(secBody, title));
        sec.append(head, secBody);
        catBodyOf(item.grp || grpFromLabel(title)).appendChild(sec);
        currentBody = secBody;
        self._mount = secBody;
        return;
      }
      self._renderItem(item, currentBody);
      if (!(item.sub !== undefined && item.deep)) {
        /* deep見出しは _renderItem が _mount を切り替える。それ以外は現セクションへ戻す */
        if (item.sub === undefined) return;
      }
    });
    /* 中身が入らなかったカテゴリの器は片づける */
    GRP_ORDER.forEach(function (g) {
      var bodyEl = catBoxes[g];
      if (bodyEl && !bodyEl.children.length && bodyEl.parentElement) {
        bodyEl.parentElement.remove();
      }
    });
  };

  Panel.prototype._renderCat = function (cat) {
    var self = this;
    var title = cat.cat || cat.title || '';
    var isOpen = this.catOpen[title] !== undefined ? this.catOpen[title] : cat.open !== false;
    this.catOpen[title] = isOpen;

    var box = document.createElement('div');
    box.className = 'tp-cat' + (isOpen ? '' : ' closed');
    var head = document.createElement('div');
    head.className = 'tp-cat-head';
    head.innerHTML = '<span></span><span class="tp-cat-chev">▾</span>';
    head.firstChild.textContent = title;
    var content = document.createElement('div');
    content.className = 'tp-cat-body';
    head.addEventListener('click', function () {
      self.catOpen[title] = !box.classList.toggle('closed');
      self._saveUI();
    });
    box.append(head, content);
    this.body.appendChild(box);

    content.dataset.okey = title;
    this._mount = content;
    (cat.items || []).forEach(function (item) { self._renderItem(item, content); });
  };

  Panel.prototype._renderItem = function (item, catBody) {
    var self = this;
    if (!item) return;
    if (item.when && !item.when(this.params)) return;

    /* 小見出し。2026-09-16 から anyflow と同じくここもたためる。
       中身は .tp-grp-body に入れて、見出しクリックで開閉する。
       開いているかどうかは他の折りたたみと同じく localStorage に覚える */
    if (item.sub !== undefined) {
      var g = document.createElement('div');
      g.className = 'tp-grp' + (item.deep ? ' deep' : '');
      var gkey = (catBody.dataset.okey || '') + '>' + String(item.sub);
      g.dataset.okey = gkey;
      var t = document.createElement('div');
      t.className = 'tp-grp-title';
      var tLabel = document.createElement('span');
      tLabel.innerHTML = item.sub;
      tLabel.style.flex = '1 1 auto';
      tLabel.style.minWidth = '0';
      var gchev = document.createElement('span');
      gchev.className = 'tp-grp-chev';
      gchev.textContent = '▾';
      var gbody = document.createElement('div');
      gbody.className = 'tp-grp-body';
      t.append(tLabel, this._groupResetBtn(gbody, String(item.sub).replace(/<[^>]*>/g, '')), gchev);
      g.append(t, gbody);
      /* 既定は開いた状態。閉じたものだけ覚える */
      if (this.secOpen[gkey] === false) g.classList.add('closed');
      t.addEventListener('click', function () {
        var closed = g.classList.toggle('closed');
        self.secOpen[gkey] = !closed;
        self._saveUI();
      });
      catBody.appendChild(g);
      this._mount = gbody;
      return;
    }
    var mount = this._mount || catBody;

    if (item.note !== undefined) {
      var n = document.createElement('div');
      /* 既定では出さない（anyflow と同じ）。item.keep:true の時だけ常時表示。
         出していない時は、直前の見出しの吹き出しから読める */
      n.className = 'tp-note' + (item.keep ? ' keep' : '');
      n.textContent = item.note;
      mount.appendChild(n);
      if (!item.keep) {
        var near = mount.parentElement &&
          (mount.parentElement.querySelector('.tp-grp-title > span:first-child') ||
           mount.parentElement.querySelector('.tp-sec-head > span:first-child'));
        if (near) near.title = (near.title ? near.title + '\n' : '') + item.note;
      }
      return;
    }
    if (item.custom) { item.custom(mount, this); return; }

    /* 値を持つ行は .tp-item で包む：↺（この項目だけ戻す）を置く単位 */
    var label = item.slider || item.pills || item.toggle || item.select ||
      item.color || item.text || item.seg || item.button || '';
    var ikey = item.path || (label ? 'k:' + label : '');
    var host = mount;
    var wrapItem = null;
    if (ikey) {
      if (!this._itemByKey) this._itemByKey = {};
      this._itemByKey[ikey] = item;   /* まとめて戻す時に引くための索引 */
      wrapItem = document.createElement('div');
      wrapItem.className = 'tp-item';
      wrapItem.dataset.key = ikey;
      wrapItem._label = String(label);
      mount.appendChild(wrapItem);
      host = wrapItem;
    }

    var row = null;
    if (item.slider !== undefined) row = this._slider(item, host);
    else if (item.seg !== undefined) row = this._seg(item, host);
    else if (item.pills !== undefined) row = this._pills(item, host);
    else if (item.toggle !== undefined) row = this._toggle(item, host);
    else if (item.select !== undefined) row = this._select(item, host);
    else if (item.color !== undefined) row = this._color(item, host);
    else if (item.text !== undefined) row = this._text(item, host);
    else if (item.button !== undefined) row = this._button(item, host);

    if (row && item.hint) {
      var h = document.createElement('div');
      /* 既定では出さない（anyflow と同じ）。item.keep:true の時だけ常時表示 */
      h.className = 'tp-hint' + (item.keep ? ' keep' : '');
      h.textContent = item.hint;
      host.appendChild(h);
      row._hint = h;
      /* 出していない時でも読めるように、項目名の吹き出しに入れておく */
      if (!item.keep) {
        var lb = row.querySelector ? row.querySelector('label, .tp-grp-title, .tp-pills-title') : null;
        if (lb && !lb.title) lb.title = item.hint;
        else if (!lb && row.title === '') row.title = item.hint;
      }
    }
    if (row) this.rows.push(row);
    if (row && wrapItem) this._itemTools(wrapItem, item, row);
    else if (wrapItem && !row) { wrapItem.remove(); }
  };

  /* --- まとまりごとの「↺ まとめて戻す」。2026-09-16 anyflow 準拠 ---
     中に入っている行を数え、その項目だけを既定値へ戻す。
     見出しの開閉と取り合わないよう、クリックは止めてから処理する */
  Panel.prototype._groupResetBtn = function (hostEl, label) {
    var self = this;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp-gbtn';
    b.textContent = '↺';
    b.title = '「' + label + '」の中を、まとめて最初の値に戻す';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var keys = [].slice.call(hostEl.querySelectorAll('.tp-item[data-key]'))
        .map(function (w) { return w.dataset.key; });
      var n = 0;
      keys.forEach(function (k) {
        var it = self._itemByKey[k];
        if (!it || it.path === undefined) return;
        self._set(it, clone(self._default(it)));
        n++;
      });
      if (!n) { self.flash('戻せる項目がありませんでした'); return; }
      self.sync();
      self._changed({});
      self.flash('「' + label + '」の' + n + '項目を最初の値に戻しました');
    });
    return b;
  };

  /* --- 項目ごとのツール（↺ 元に戻す だけ） --- */
  /* 【2026-09-16 ヒデさん指示・anyflow に合わせた】
     anyflow では「デザイン案（バリエーション）」だけが ⋯ メニューから
     削除・上書きでき、スライダーなどの【indicator 的な行】は ↺ で戻すだけ。
     網走はどの行でも で消せてしまっていたので、と ⠿ を撤去した。
     ・案 1粒ずつ → ピルの ⋯（★ピン留め／⤓上書き／↺解除／削除）
     ・行（スライダー・ON/OFF・選択・文字）→ ↺ だけ */
  Panel.prototype._itemTools = function (wrap, item, row) {
    var self = this;
    if (!item || item.path === undefined) return;
    var tools = document.createElement('div');
    tools.className = 'tp-item-tools';
    var rst = document.createElement('button');
    rst.type = 'button';
    rst.className = 'tp-item-rst';
    rst.textContent = '↺';
    rst.title = 'この項目だけ最初の値に戻す';
    rst.addEventListener('click', function (e) {
      e.stopPropagation();
      self._set(item, clone(self._default(item)));
      if (row && row._sync) row._sync();
      self._changed({ path: item.path });
      self.flash('「' + String(item.slider || item.pills || item.toggle || item.select ||
        item.color || item.text || item.seg || 'この項目') + '」を最初の値に戻しました');
    });
    tools.appendChild(rst);
    wrap.appendChild(tools);
  };

  /* 【2026-09-16】項目の削除・並び替え（_confirmDelete / _dragItem / _applyOrder）は
     anyflow に合わせて撤去した。消せるのは「案」だけ（ピルの ⋯ メニュー） */

  Panel.prototype._slider = function (item, mount) {
    var self = this;
    var min = item.min === undefined ? 0 : item.min;
    var step = item.step === undefined ? 0.01 : item.step;
    var max = item.max === undefined ? 1 : item.max;

    /* ツマミの既定位置を真ん中にする（＝初期値から下げることも上げることもできる）。
       item.autoCenter:false で個別に切れる */
    if (this.autoCenter && item.autoCenter !== false) {
      var d = this._default(item);
      if (typeof d === 'number' && isFinite(d) && d > min) {
        max = Math.round((2 * d - min) / step) * step;
      }
    }

    var row = document.createElement('div');
    row.className = 'tp-row';
    var lab = document.createElement('label');
    lab.textContent = item.slider;
    var input = document.createElement('input');
    input.type = 'range';

    /* ── 既定値がつまみの真ん中に来るスケール（2026-08-30 ヒデさん依頼） ──
       左半分＝min〜既定値、右半分＝既定値〜max を割り当てる折れ線スケール。
       範囲は書いたまま削らず、既定値がどこにあっても中央スタートになる。
       cfg.centerDefault:false（パネル全体）/ item.center:false（個別）で切れる */
    var d0 = this._default(item);
    var useCenter = this.cfg.centerDefault !== false && item.center !== false &&
      typeof d0 === 'number' && isFinite(d0) && d0 > min && d0 < max;
    var decimals = (String(step).split('.')[1] || '').length;
    var snap = function (v) {
      var s = Math.round((v - min) / step) * step + min;
      return +s.toFixed(decimals);
    };
    var toPos = function (v) {
      if (v <= d0) return ((v - min) / (d0 - min)) * 500;
      return 500 + ((v - d0) / (max - d0)) * 500;
    };
    var toVal = function (p) {
      var v = p <= 500 ? min + (p / 500) * (d0 - min) : d0 + ((p - 500) / 500) * (max - d0);
      return snap(Math.max(min, Math.min(max, v)));
    };
    if (useCenter) {
      input.min = 0; input.max = 1000; input.step = 1;
      input.value = toPos(this._get(item));
    } else {
      input.min = min; input.max = max; input.step = step;
      input.value = this._get(item);
    }
    var readVal = function () {
      var raw = parseFloat(input.value);
      return useCenter ? toVal(raw) : raw;
    };

    var val = document.createElement('span');
    val.className = 'tp-val';
    var fmt = toFmt(item.fmt, step, item);
    val.textContent = fmt(this._get(item));

    input.addEventListener('input', function () {
      var v = readVal();
      self._set(item, v);
      val.textContent = fmt(v);
      self._changed({ item: item, path: item.path, value: v, immediate: false });
    });
    input.addEventListener('change', function () {
      self._changed({ item: item, path: item.path, value: readVal(), immediate: true });
    });

    /* ── 数値の直打ち（2026-08-30 ヒデさん依頼）──
       右の数値をクリックすると入力欄になる。Enter/フォーカスを外すと確定、
       Escで取り消し。スライダーの範囲外の値も入れられる（実装側のガードに任せる） */
    val.classList.add('tp-val-edit');
    val.title = 'クリックで数値を直接入力';
    val.addEventListener('click', function () {
      if (row.querySelector('.tp-val-input')) return;
      var ed = document.createElement('input');
      ed.type = 'number';
      ed.step = step;
      ed.className = 'tp-val-input';
      ed.value = self._get(item);
      val.style.display = 'none';
      row.appendChild(ed);
      ed.focus();
      ed.select();
      var done = function (commit) {
        var v = parseFloat(ed.value);
        ed.remove();
        val.style.display = '';
        if (!commit || !isFinite(v)) return;
        self._set(item, v);
        val.textContent = fmt(v);
        if (useCenter) input.value = toPos(Math.max(min, Math.min(max, v)));
        else input.value = Math.max(min, Math.min(max, v));
        self._changed({ item: item, path: item.path, value: v, immediate: true });
      };
      ed.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') done(true);
        else if (e.key === 'Escape') done(false);
        e.stopPropagation();
      });
      ed.addEventListener('blur', function () { done(true); });
    });

    row.append(lab, input, val);
    mount.appendChild(row);
    row._label = item.slider;
    row._sync = function () {
      var cur = self._get(item);
      input.value = useCenter ? toPos(Math.max(min, Math.min(max, cur))) : cur;
      val.textContent = fmt(cur);
    };
    return row;
  };

  /* --- 2〜3択のセグメント --- */
  Panel.prototype._seg = function (item, mount) {
    var self = this;
    this._validateEnum(item);
    var row = document.createElement('div');
    row.className = 'tp-row';
    if (item.seg) { var lab = document.createElement('label'); lab.textContent = item.seg; row.appendChild(lab); }
    var seg = document.createElement('div');
    seg.className = 'tp-seg';
    var btns = (item.options || []).map(function (o) {
      var text = Array.isArray(o) ? o[0] : o.name;
      var value = Array.isArray(o) ? o[1] : o.value;
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', function () {
        self._set(item, value);
        sync();
        self._changed({ item: item, path: item.path, value: value, immediate: true });
        if (item.rebuild || typeof self.cfg.schema === 'function') self.rebuild();
      });
      seg.appendChild(b);
      return [b, value];
    });
    function sync() {
      var cur = self._get(item);
      btns.forEach(function (p) { p[0].classList.toggle('on', p[1] === cur); });
    }
    sync();
    row.appendChild(seg);
    mount.appendChild(row);
    row._label = item.seg || '';
    row._sync = sync;
    return row;
  };

  /* --- ピル（案の切替） --- */
  /* ============================================================
     案（バリエーション）のピル。2026-09-16 に anyflow の
     バリエーション行と同じ仕様へ作り替えた。
       ・★ ピン留め ……… よく使う案を上の別セクションへ出す
       ・⤓ 上書き ……… その案を選んだ時に、いまのつまみの値ごと再現する
       ・削除 ………… 一覧から隠す（確認モーダル。あとで戻せる）
       ・↺ 消した案を戻す … 隠した案を1つずつ選んで戻す
     隠し／ピン／上書きの控えは params とは別の保存場所に置く
     （つまみの値そのものではなく「見せ方」なので、混ぜると焼き込みが濁る）
     ============================================================ */

  Panel.prototype._vKey = function () { return 'tp:' + this.storageKey + ':variants'; };

  Panel.prototype._vars = function () {
    if (this._varCache) return this._varCache;
    var v = null;
    if (this.storageKey) {
      try { v = JSON.parse(localStorage.getItem(this._vKey())); } catch (e) {}
    }
    if (!v || typeof v !== 'object') v = {};
    if (!v.hidden) v.hidden = {};
    if (!v.fav) v.fav = {};
    if (!v.ov) v.ov = {};
    this._varCache = v;
    return v;
  };

  Panel.prototype._saveVars = function () {
    if (!this.storageKey) return;
    try { localStorage.setItem(this._vKey(), JSON.stringify(this._vars())); } catch (e) {}
  };

  /* その項目の「隠している案 / ピン留め / 上書きの控え」を取り出す小道具 */
  Panel.prototype._vBucket = function (item) {
    var v = this._vars();
    var k = item.path || ('k:' + (item.pills || ''));
    if (!v.hidden[k]) v.hidden[k] = [];
    if (!v.fav[k]) v.fav[k] = [];
    if (!v.ov[k]) v.ov[k] = {};

    /* 【2026-09-17 ヒデさん指摘】「消した案を戻す (22)」の数が、
       コードから恒久削除しても減らずに溜まりっぱなしになる。
       原因：消した控え（hidden）に値だけを残していて、その案がコードから
       無くなっても控えが残り続けていた。
       → ここで「いま存在しない案」を控えから捨てる。
         ピン留め（fav）と上書きの控え（ov）も同じ理由で掃除する。
         恒久削除したぶんは、次にパネルを開いた時点で自動的に 0 に戻る */
    if (item && item.options) {
      var known = {};
      item.options.forEach(function (o) { known[String(o.value)] = 1; });
      var dirty = false;
      ['hidden', 'fav'].forEach(function (kk) {
        var a = v[kk][k];
        for (var i = a.length - 1; i >= 0; i--) {
          if (!known[a[i]]) { a.splice(i, 1); dirty = true; }
        }
      });
      Object.keys(v.ov[k]).forEach(function (kk) {
        if (!known[kk]) { delete v.ov[k][kk]; dirty = true; }
      });
      if (dirty) this._saveVars();
    }

    return { key: k, hidden: v.hidden[k], fav: v.fav[k], ov: v.ov[k] };
  };

  Panel.prototype._pills = function (item, mount) {
    var self = this;
    this._validateEnum(item);
    var B = this._vBucket(item);
    var wrap = document.createElement('div');
    if (item.pills) {
      var t = document.createElement('div');
      t.className = 'tp-grp-title tp-pills-title';
      t.style.marginBottom = '2px';
      t.textContent = item.pills;
      wrap.appendChild(t);
    }
    /* ★ピン留めは上の別セクションへ（anyflow と同じ。通常の案に紛れさせない） */
    var favHead = document.createElement('div');
    favHead.className = 'tp-favhead';
    favHead.textContent = '★ ピン留め';
    var favRow = document.createElement('div');
    favRow.className = 'tp-pills tp-favrow';
    var rowEl = document.createElement('div');
    rowEl.className = 'tp-pills';
    var desc = document.createElement('div');
    desc.className = 'tp-desc';

    var K = function (v) { return String(v); };
    var alive = function () {
      return (item.options || []).filter(function (o) { return B.hidden.indexOf(K(o.value)) < 0; });
    };

    /* ── 案の通し番号を自動で振る（2026-09-16 ヒデさん指示）─────────
       「案を削除したあと、残った総数に応じて再度1番からナンバリングされる形」
       item.autoNum に呼び方を渡すと、残っている案を上から 1,2,3… と数え直す。
         autoNum: '案'                  → 案1・案2・案3…
         autoNum: { prefix:'階層', style:'alpha' } → 階層A・階層B・階層C…
       元の name に「案11」「階層C」のような古い番号が付いていても、
       先頭のその部分だけ外してから振り直すので、二重に番号が出ることはない */
    var autoCfg = (function () {
      var a = item.autoNum;
      if (!a) return null;
      if (typeof a === 'string') return { prefix: a, style: 'num' };
      return { prefix: a.prefix || '', style: a.style || 'num' };
    })();
    var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var numOf = function (i) {
      return autoCfg.style === 'alpha' ? (ALPHA[i] || String(i + 1)) : String(i + 1);
    };
    /* 先頭の「<呼び方><番号や英字>」を外して、説明の部分だけ残す */
    var bareName = function (name) {
      if (!autoCfg || !name) return name || '';
      var re = new RegExp('^' + autoCfg.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[0-9A-Za-z]+\\s*');
      return String(name).replace(re, '').trim();
    };
    /* 一覧に出す名前。autoNum が無ければ今まで通り name をそのまま出す */
    var labelOf = function (o, i) {
      if (!autoCfg) return o.name;
      var b = bareName(o.name);
      return autoCfg.prefix + numOf(i) + (b ? ' ' + b : '');
    };
    var isFav = function (o) { return B.fav.indexOf(K(o.value)) >= 0; };

    var choose = function (o) {
      self._set(item, o.value);
      /* 上書きの控えがある案なら、その時のつまみの値ごと戻す */
      var ov = B.ov[K(o.value)];
      if (ov) assignDeep(self.params, clone(ov));
      self._changed({ item: item, path: item.path, value: o.value, immediate: true });
      if (ov) { self.sync(); self._markDirty(true); }
      fill();
      if (item.rebuild !== false && (typeof self.cfg.schema === 'function' || item.rebuild)) self.rebuild();
    };

    var menuFor = function (anchor, o) {
      var idx = alive().map(function (q) { return K(q.value); }).indexOf(K(o.value));
      var label = (autoCfg && idx >= 0) ? labelOf(o, idx) : o.name;
      var items = [];
      var fav = isFav(o);
      items.push([fav ? '★ ピン留めを解除（元の位置に戻す）' : '★ お気に入りにピン留め', function () {
        if (fav) B.fav.splice(B.fav.indexOf(K(o.value)), 1);
        else B.fav.push(K(o.value));
        self._saveVars(); fill();
      }]);
      items.push(['⤓ いまの設定で上書き', function () {
        B.ov[K(o.value)] = clone(self.params);
        self._saveVars(); fill();
        self.flash('「' + label + '」に、いまの設定を覚えさせました');
      }]);
      if (B.ov[K(o.value)]) {
        items.push(['↺ 上書きを解除（元の設定に戻す）', function () {
          delete B.ov[K(o.value)];
          self._saveVars();
          /* 選んでいる案なら、その場で元の状態へ戻す */
          if (K(self._get(item)) === K(o.value)) {
            assignDeep(self.params, clone(self.defaults));
            self._set(item, o.value);
            self.sync(); self._changed({ item: item, path: item.path, value: o.value });
          }
          fill();
        }]);
      }
      items.push(['削除', function () {
        self._ask('削除しますか？', '「' + label + '」を一覧から消します。あとで「↺ 消した案を戻す」で戻せます。',
          '削除する', function () {
            B.hidden.push(K(o.value));
            var fi = B.fav.indexOf(K(o.value));
            if (fi >= 0) B.fav.splice(fi, 1);
            /* 選んでいた案を消したら、残っている先頭の案へ移る */
            if (K(self._get(item)) === K(o.value)) {
              var a = alive()[0];
              if (a) { self._set(item, a.value); self._changed({ item: item, path: item.path, value: a.value }); }
            }
            self._saveVars(); fill();
          });
      }, 'danger']);
      self._menu(anchor, items);
    };

    var pill = function (o, label, target) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tp-pill' + (isFav(o) ? ' fav' : '');
      b.dataset.value = o.value;
      b.title = label + (o.desc ? ' — ' + o.desc : '') +
        (B.ov[K(o.value)] ? '（⤓ 上書き済み・⋯から解除できます）' : '');
      if (o.swatch) {
        var sw = document.createElement('span');
        sw.className = 'tp-swatch';
        sw.style.background = o.swatch;
        b.appendChild(sw);
      }
      b.append(document.createTextNode(label));
      b.addEventListener('click', function () { choose(o); });
      /* item.fixedOptions:true の項目は消したりピン留めしたりできない（ON/OFF など） */
      if (!item.fixedOptions) {
        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'tp-var-x';
        x.textContent = '⋯';
        x.title = 'ピン留め / この設定で上書き / 削除';
        x.addEventListener('click', function (ev) { ev.stopPropagation(); menuFor(x, o); });
        b.appendChild(x);
      }
      (target || rowEl).appendChild(b);
    };

    function fill() {
      rowEl.innerHTML = '';
      favRow.innerHTML = '';
      var list = alive();
      var pinned = B.fav.map(function (k) {
        return list.filter(function (o) { return K(o.value) === k; })[0];
      }).filter(Boolean);
      favHead.style.display = favRow.style.display = pinned.length ? '' : 'none';
      /* ピン留めも通常の案も、番号は「残っている案の並び順」で数える。
         ピン留めして上に出しても、案の番号そのものは変わらない */
      var numAt = {};
      list.forEach(function (o, i) { numAt[K(o.value)] = i; });
      pinned.forEach(function (o, i) {
        pill(o, '★' + (i + 1) + ' ' + labelOf(o, numAt[K(o.value)]), favRow);
      });
      list.forEach(function (o, i) {
        if (pinned.indexOf(o) >= 0) return;
        pill(o, labelOf(o, i), rowEl);
      });
      /* 消した案を戻す */
      if (B.hidden.length) {
        var back = document.createElement('button');
        back.type = 'button';
        back.className = 'tp-pill tp-var-back';
        back.textContent = '↺ 消した案を戻す (' + B.hidden.length + ')';
        back.addEventListener('click', function () {
          var names = B.hidden.map(function (k) {
            var o = (item.options || []).filter(function (q) { return K(q.value) === k; })[0];
            if (!o) return k;
            return autoCfg ? (bareName(o.name) || o.name) : o.name;
          });
          self._pick('消した案を戻す', '戻したい案の「戻す」を押してください。', names, function (nm, idx) {
            B.hidden.splice(idx, 1);
            self._saveVars(); fill();
          });
        });
        rowEl.appendChild(back);
      }
      sync();
    }

    function sync() {
      var cur = self._get(item);
      var found = null;
      wrap.querySelectorAll('.tp-pill').forEach(function (b) {
        if (b.classList.contains('tp-var-back')) return;
        var on = b.dataset.value === String(cur);
        b.classList.toggle('on', on);
        if (on) found = b;
      });
      var opt = (item.options || []).filter(function (o) { return String(o.value) === String(cur); })[0];
      desc.textContent = (opt && opt.desc) || '';
      desc.style.display = desc.textContent ? '' : 'none';
    }

    wrap.append(favHead, favRow, rowEl, desc);
    mount.appendChild(wrap);
    fill();
    wrap._label = (item.pills || '') + ' ' + (item.options || []).map(function (o) { return o.name; }).join(' ');
    wrap._sync = fill;
    return wrap;
  };

  /* --- 小さなメニュー（⋯ を押すと出る）--- */
  Panel.prototype._menu = function (anchor, entries) {
    var old = document.querySelector('.tp-pmenu');
    if (old) old.remove();
    var m = document.createElement('div');
    m.className = 'tp-pmenu';
    entries.forEach(function (e) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = e[0];
      if (e[2]) b.className = e[2];
      b.addEventListener('click', function () { m.remove(); e[1](); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    m.style.left = Math.min(r.left, window.innerWidth - m.offsetWidth - 8) + 'px';
    m.style.top = Math.min(r.bottom + 4, window.innerHeight - m.offsetHeight - 8) + 'px';
    setTimeout(function () {
      var off = function (ev) {
        if (m.contains(ev.target)) return;
        m.remove();
        document.removeEventListener('pointerdown', off);
      };
      document.addEventListener('pointerdown', off);
    }, 0);
  };

  /* --- 確認ダイアログ（消す前に一度止める）--- */
  Panel.prototype._ask = function (title, body, okLabel, onOk) {
    var bg = document.createElement('div');
    bg.className = 'tp-mdl-bg';
    var m = document.createElement('div');
    m.className = 'tp-mdl';
    var h = document.createElement('h4'); h.textContent = title;
    var p = document.createElement('p'); p.textContent = body;
    var row = document.createElement('div'); row.className = 'tp-mdl-btns';
    var no = document.createElement('button'); no.type = 'button'; no.textContent = 'やめる';
    var yes = document.createElement('button'); yes.type = 'button'; yes.className = 'danger';
    yes.textContent = okLabel || '削除する';
    var onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    function close() { bg.remove(); document.removeEventListener('keydown', onKey, true); }
    no.addEventListener('click', close);
    yes.addEventListener('click', function () { close(); onOk(); });
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey, true);
    row.append(no, yes); m.append(h, p, row); bg.appendChild(m);
    document.body.appendChild(bg);
    yes.focus();
  };

  /* --- 一覧から1つずつ選ぶダイアログ（消した案を戻す用）--- */
  Panel.prototype._pick = function (title, body, names, onPick) {
    var bg = document.createElement('div');
    bg.className = 'tp-mdl-bg';
    var m = document.createElement('div');
    m.className = 'tp-mdl';
    var h = document.createElement('h4'); h.textContent = title;
    var p = document.createElement('p'); p.textContent = body;
    var list = document.createElement('div'); list.className = 'tp-mdl-list';
    var row = document.createElement('div'); row.className = 'tp-mdl-btns';
    var onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    function close() { bg.remove(); document.removeEventListener('keydown', onKey, true); }
    var cur = names.slice();
    function draw() {
      list.innerHTML = '';
      if (!cur.length) { close(); return; }
      cur.forEach(function (nm, i) {
        var li = document.createElement('div'); li.className = 'tp-mdl-li';
        var t = document.createElement('span'); t.textContent = nm;
        var b = document.createElement('button'); b.type = 'button'; b.textContent = '戻す';
        b.addEventListener('click', function () {
          onPick(nm, cur.indexOf(nm));
          cur.splice(i, 1);
          draw();
        });
        li.append(t, b); list.appendChild(li);
      });
    }
    var done = document.createElement('button'); done.type = 'button'; done.textContent = '閉じる';
    done.addEventListener('click', close);
    row.appendChild(done);
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey, true);
    draw();
    m.append(h, p, list, row); bg.appendChild(m);
    document.body.appendChild(bg);
  };

  /* --- ON/OFF --- */
  Panel.prototype._toggle = function (item, mount) {
    var self = this;
    var row = document.createElement('div');
    row.className = 'tp-row';
    var lab = document.createElement('label');
    lab.textContent = item.toggle;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp-switch';
    function sync() { b.classList.toggle('on', !!self._get(item)); }
    b.addEventListener('click', function () {
      var v = !self._get(item);
      self._set(item, v);
      sync();
      self._changed({ item: item, path: item.path, value: v, immediate: true });
      if (item.rebuild || typeof self.cfg.schema === 'function') self.rebuild();
    });
    sync();
    row.append(lab, b);
    mount.appendChild(row);
    row._label = item.toggle;
    row._sync = sync;
    return row;
  };

  /* --- プルダウン --- */
  Panel.prototype._select = function (item, mount) {
    var self = this;
    this._validateEnum(item);
    var row = document.createElement('div');
    row.className = 'tp-row';
    var lab = document.createElement('label');
    lab.textContent = item.select;
    var sel = document.createElement('select');
    (item.options || []).forEach(function (o) {
      var text = Array.isArray(o) ? o[0] : (o.name !== undefined ? o.name : o);
      var value = Array.isArray(o) ? o[1] : (o.value !== undefined ? o.value : o);
      var op = document.createElement('option');
      op.value = value; op.textContent = text;
      sel.appendChild(op);
    });
    function sync() { sel.value = self._get(item); }
    sel.addEventListener('change', function () {
      self._set(item, sel.value);
      self._changed({ item: item, path: item.path, value: sel.value, immediate: true });
      if (item.rebuild || typeof self.cfg.schema === 'function') self.rebuild();
    });
    sync();
    row.append(lab, sel);
    mount.appendChild(row);
    row._label = item.select;
    row._sync = sync;
    return row;
  };

  /* --- 色 --- */
  Panel.prototype._color = function (item, mount) {
    var self = this;
    var row = document.createElement('div');
    row.className = 'tp-row';
    var lab = document.createElement('label');
    lab.textContent = item.color;
    var inp = document.createElement('input');
    inp.type = 'color';
    var txt = document.createElement('input');
    txt.type = 'text';
    function sync() { inp.value = self._get(item); txt.value = self._get(item); }
    function apply(v) {
      self._set(item, v); sync();
      self._changed({ item: item, path: item.path, value: v, immediate: false });
    }
    inp.addEventListener('input', function () { apply(inp.value); });
    txt.addEventListener('change', function () { apply(txt.value); });
    sync();
    row.append(lab, inp, txt);
    mount.appendChild(row);
    row._label = item.color;
    row._sync = sync;
    return row;
  };

  /* --- 文字 --- */
  Panel.prototype._text = function (item, mount) {
    var self = this;
    var row = document.createElement('div');
    /* multiline:true で textarea（本文など長い文字用）。ラベルは上に置く */
    row.className = 'tp-row' + (item.multiline ? ' tp-row-col' : '');
    var lab = document.createElement('label');
    lab.textContent = item.text;
    var inp = document.createElement(item.multiline ? 'textarea' : 'input');
    if (item.multiline) inp.rows = item.rows || 8; else inp.type = 'text';
    function sync() { inp.value = self._get(item) == null ? '' : self._get(item); }
    inp.addEventListener('input', function () {
      self._set(item, inp.value);
      self._changed({ item: item, path: item.path, value: inp.value, immediate: false });
    });
    sync();
    row.append(lab, inp);
    mount.appendChild(row);
    row._label = item.text;
    row._sync = sync;
    return row;
  };

  /* --- ボタン --- */
  Panel.prototype._button = function (item, mount) {
    var self = this;
    var box = document.createElement('div');
    box.className = 'tp-btns';
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.button;
    if (item.primary) b.className = 'primary';
    b.addEventListener('click', function () { item.onClick && item.onClick(self); });
    box.appendChild(b);
    mount.appendChild(box);
    box._label = item.button;
    box._sync = function () {};
    return box;
  };

  /* ---------- フッター ---------- */

  /* ---------- プリセット（2026-09-16 anyflow 準拠） ----------
     いまのつまみの値ぜんぶに名前を付けて保存し、あとで一発で呼び戻せる。
     案を見比べる時に「さっきの状態」へ戻れないのが不便だったため。
     保存先は localStorage（このパネル専用のキー）。 */

  Panel.prototype._psKey = function () { return 'tp:' + this.storageKey + ':presets'; };

  Panel.prototype._presets = function () {
    if (!this.storageKey) return [];
    try { return JSON.parse(localStorage.getItem(this._psKey())) || []; } catch (e) { return []; }
  };

  Panel.prototype._savePresets = function (list) {
    try { localStorage.setItem(this._psKey(), JSON.stringify(list)); } catch (e) {}
  };

  Panel.prototype._renderPresets = function (mount) {
    var self = this;
    if (!this.storageKey || this.cfg.presets === false) return;
    var list = this._presets();
    var box = document.createElement('div');
    box.className = 'tp-pset';
    var lab = document.createElement('span');
    lab.className = 'tp-pset-lab';
    lab.textContent = 'プリセット';
    box.appendChild(lab);

    list.forEach(function (p, i) {
      var chip = document.createElement('span');
      /* いま呼び出しているプリセットは青くしておく（anyflow 準拠） */
      chip.className = 'tp-pset-chip' + (self._psetOn === p.name ? ' on' : '');
      var name = document.createElement('button');
      name.type = 'button';
      name.className = 'tp-pset-name';
      name.textContent = p.name;
      name.title = '押すとこの状態に戻す';
      name.addEventListener('click', function () {
        assignDeep(self.params, clone(p.params));
        self._psetOn = p.name;
        self._markDirty(true);
        self.rebuild();
        self._changed({});
        self.flash('「' + p.name + '」を呼び出しました（デフォルトにするなら下のボタンを押す）');
      });
      var menu = document.createElement('button');
      menu.type = 'button';
      menu.className = 'tp-pset-menu';
      menu.textContent = '⋯';
      menu.title = '名前の変更・上書き・削除';
      menu.addEventListener('click', function (e) {
        e.stopPropagation();
        self._presetMenu(e.currentTarget, i);
      });
      chip.append(name, menu);
      box.appendChild(chip);
    });

    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'tp-pset-add';
    add.textContent = '＋ いまの状態を保存';
    add.addEventListener('click', function () {
      var n = window.prompt('この状態に名前を付けてください', '案' + (list.length + 1));
      if (!n) return;
      list.push({ name: n, params: clone(self.params) });
      self._savePresets(list);
      self._psetOn = n;
      self._renderFoot();
      self.flash('「' + n + '」として保存しました');
    });
    box.appendChild(add);
    mount.appendChild(box);
  };

  Panel.prototype._presetMenu = function (anchor, idx) {
    var self = this;
    var old = document.querySelector('.tp-pmenu');
    if (old) old.remove();
    var list = this._presets();
    var m = document.createElement('div');
    m.className = 'tp-pmenu';
    var r = anchor.getBoundingClientRect();
    m.style.left = Math.min(r.left, window.innerWidth - 150) + 'px';
    m.style.top = (r.bottom + 4) + 'px';
    var mk = function (label, danger, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (danger) b.className = 'danger';
      b.addEventListener('click', function () { m.remove(); fn(); });
      m.appendChild(b);
    };
    mk('いまの状態で上書き', false, function () {
      list[idx].params = clone(self.params);
      self._savePresets(list);
      self.flash('「' + list[idx].name + '」を上書きしました');
    });
    mk('名前を変える', false, function () {
      var n = window.prompt('新しい名前', list[idx].name);
      if (!n) return;
      list[idx].name = n;
      self._savePresets(list);
      self._renderFoot();
    });
    mk('削除する', true, function () {
      var n = list[idx].name;
      list.splice(idx, 1);
      self._savePresets(list);
      self._renderFoot();
      self.flash('「' + n + '」を削除しました');
    });
    document.body.appendChild(m);
    /* 外side を押したら閉じる */
    setTimeout(function () {
      var off = function (ev) {
        if (m.contains(ev.target)) return;
        m.remove();
        document.removeEventListener('pointerdown', off);
      };
      document.addEventListener('pointerdown', off);
    }, 0);
  };

  Panel.prototype._renderFoot = function () {
    var self = this;
    if (this.cfg.footer === false) { this.foot.style.display = 'none'; return; }
    this.foot.innerHTML = '';
    /* プリセット（いまの値に名前を付けて残す）は、anyflow の下のボタン列には無い。
       機能は残しつつ、本文の最後の「プリセット」カードに移す（2026-09-26） */
    if (this._psetCard && this._psetCard.parentNode) this._psetCard.parentNode.removeChild(this._psetCard);
    if (this.storageKey && this.cfg.presets !== false) {
      var pc = this._psetCard = document.createElement('div');
      pc.className = 'tp-cat tp-pset-card';
      var ph = document.createElement('div');
      ph.className = 'tp-cat-head';
      ph.style.cursor = 'default';
      ph.textContent = 'プリセット';
      var pb = document.createElement('div');
      pb.className = 'tp-cat-body';
      pc.append(ph, pb);
      this._renderPresets(pb);
      if (this.foot.parentNode === this.body) this.body.insertBefore(pc, this.foot);
      else this.body.appendChild(pc);
    }
    var box = document.createElement('div');
    box.className = 'tp-btns';

    /* 下のボタンは anyflow と同じ3つ（2026-09-16 ヒデさん指示で全面的に合わせた）。
         ① これをデフォルトに設定 …… いまの状態を「最初に出る形」として確定する
         ② ⬇ 設定を書き出す ………… このブラウザの設定をファイルに落とす（本番へ焼き込む用）
         ③ 完全削除リストをコピー … 隠している案の一覧をコピー（コードから恒久的に消す用）
       「↺ 全部リセット」は anyflow にならって廃止。戻すのは各行と各まとまりの ↺ で行う */
    var defs = [];

    /* ① これをデフォルトに設定 */
    if (this.storageKey) {
      defs.push({
        label: this._dirty ? 'デフォルトに設定（未保存）' : 'デフォルトに設定',
        title: 'いまの状態を「最初に出る形」として確定します。',
        primary: true, isSave: true,
        onClick: function (pnl, el) {
          self.save();
          self._saveVars();
          tpPhonePush();
          self._markDirty(false);
          if (self.cfg.onSave) {
            try { self.cfg.onSave(self.params, self); } catch (e) {}
          }
          el.textContent = '✅ デフォルトにしました';
          setTimeout(function () { self._syncSaveBtn(); }, 1600);
        }
      });
    }

    /* ② ⬇ 設定を書き出す（本番反映用）
       ローカルで触った値はこのブラウザにしか残らない。本番へ載せるには
       書き出して Claude に渡し、tune-defaults.json へ焼き込む必要がある */
    defs.push({
      label: '設定書き出し',
      title: 'いまのブラウザの設定ぜんぶをファイルとしてダウンロードします。これをClaudeに渡すと、同じ見た目を本番に焼き込めます。',
      onClick: function (pnl, el) {
        try { self.save(); self._saveVars(); } catch (e) {}
        var dump = {};
        try {
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf('tp:') === 0) dump[k] = localStorage.getItem(k);
          }
        } catch (e) {}
        /* 焼き込みでそのまま使えるよう、いまのつまみの値も素の形で入れておく */
        dump['__params'] = JSON.stringify(self.params);
        var name = (self.storageKey || 'tune') + '-settings.json';
        try {
          var blob = new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = name;
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
          el.textContent = '✅ 書き出しました（Claudeに渡してください）';
        } catch (e) {
          el.textContent = '書き出せませんでした';
        }
        setTimeout(function () { el.textContent = '設定書き出し'; }, 2200);
      }
    });

    /* ③ 完全削除リストをコピー（Claude用）
       パネルの「削除」は隠しているだけ（戻せる）。コードから恒久的に消すには
       Claude に焼き込んでもらう必要があるので、いま隠しているものを一括でコピーする */
    defs.push({
      label: 'バリエーション削除',
      title: 'いま「削除」で隠している案の一覧をコピーします。Claudeに貼って「完全削除して」と言えば、コードから恒久的に消してもらえます。',
      onClick: function (pnl, el) {
        try { self.save(); self._saveVars(); } catch (e) {}
        var v = self._vars();
        var hidden = {};
        Object.keys(v.hidden || {}).forEach(function (k) {
          if ((v.hidden[k] || []).length) hidden[k] = v.hidden[k].slice();
        });
        var nVar = Object.keys(hidden).reduce(function (a, k) { return a + hidden[k].length; }, 0);
        var payload = { panel: self.storageKey, hiddenVariants: hidden };
        var text = (nVar
          ? '【完全削除の依頼】以下の案・項目をコードから恒久的に消してください。\n'
          : '【完全削除の依頼】新しく消したものはありません。\n') + JSON.stringify(payload, null, 1);
        self._copy(text, function (ok) {
          el.textContent = ok ? '✅ コピーしました（Claudeに貼ってください）' : 'コピーできませんでした';
          setTimeout(function () { el.textContent = 'バリエーション削除'; }, 2600);
        });
      }
    });


    var list = (this.cfg.footer || []).concat(this.cfg.footerDefaults === false ? [] : defs);
    list.forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.textContent = b.label;
      if (b.title) el.title = b.title;
      if (b.primary) el.className = 'primary';
      if (b.isSave) { self._saveBtn = el; el.classList.toggle('dirty', self._dirty); }
      el.addEventListener('click', function () { b.onClick && b.onClick(self, el); });
      box.appendChild(el);
    });
    this.foot.appendChild(box);
    /* ボタンの下の注意書き（anyflow の saveNote と同じ文面） */
    if (this.storageKey) {
      var note = document.createElement('div');
      note.className = 'tp-savenote';
      note.textContent = '調整は自動でこのブラウザに保存されます(リロード・ブラウザを閉じてもOK)。'
        + '本番サイトに反映したい時は「設定書き出し」を押して、出てきたファイルをClaudeに渡してください。';
      this.foot.appendChild(note);
    }
  };

  /* 「これをデフォルトに設定」の文字を、未保存かどうかに合わせて書き換える */
  Panel.prototype._syncSaveBtn = function () {
    if (!this._saveBtn) return;
    this._saveBtn.textContent = this._dirty
      ? 'デフォルトに設定（未保存）'
      : 'デフォルトに設定';
    this._saveBtn.classList.toggle('dirty', this._dirty);
  };

  /* クリップボードへコピー（古いブラウザ向けの逃げ道つき） */
  Panel.prototype._copy = function (text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); })
        .catch(function () { done(fallback()); });
      return;
    }
    done(fallback());
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e) { return false; }
    }
  };

  /* ---------- 公開API ---------- */

  Panel.prototype.sync = function () {
    this.rows.forEach(function (r) { r._sync && r._sync(); });
    return this;
  };

  Panel.prototype.toggle = function (force) {
    var closed = force === undefined ? !this.el.classList.contains('closed') : !force;
    this.el.classList.toggle('closed', closed);
    if (!closed) { this.el.style.width = this._openW + 'px'; this.el.style.height = this._openH + 'px'; }
    this._saveUI();
    return this;
  };

  Panel.prototype.reset = function () {
    assignDeep(this.params, this.defaults);
    if (this.saveMode === 'button') {
      /* 保存ボタン方式：保存値ごと消して「まっさら」に戻す（戻した直後は未保存扱いにしない） */
      if (this.storageKey) { try { localStorage.removeItem(this._pKey()); } catch (e) {} }
    } else {
      this.save();
    }
    this.rebuild();
    this._changed({ reset: true, immediate: true });
    this._markDirty(false);
    this.flash('初期値に戻しました');
    return this;
  };

  Panel.prototype.exportJSON = function () { return JSON.stringify(this.params, null, 2); };

  Panel.prototype.copy = function () {
    var self = this;
    var text = this.exportJSON();
    var done = function () { self.flash('コピーしました（Claude に貼れば既定値にできます）'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { self._fallbackCopy(text, done); });
    } else this._fallbackCopy(text, done);
    return this;
  };

  Panel.prototype._fallbackCopy = function (text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { window.prompt('コピーしてください', text); }
    document.body.removeChild(ta);
  };

  Panel.prototype.importJSON = function (str) {
    var obj;
    try { obj = JSON.parse(str); } catch (e) { this.flash('JSON が読めませんでした'); return this; }
    assignDeep(this.params, mergeSaved(this.defaults, obj));
    this.save();
    this.rebuild();
    this._changed({ imported: true, immediate: true });
    this.flash('読み込みました');
    return this;
  };

  Panel.prototype.importPrompt = function () {
    var s = window.prompt('設定JSONを貼り付けてください');
    if (s) this.importJSON(s);
    return this;
  };

  /* 【2026-09-16】項目の検索（_filter）は検索バーごと撤去した */
  Panel.prototype.destroy = function () {
    if (this._onKey) window.removeEventListener('keydown', this._onKey);
    if (this._onRemote) {
      window.removeEventListener('storage', this._onStorage);
      window.removeEventListener('tp:remote-apply', this._onRemote);
    }
    var ix = TP_PHONE.panels.indexOf(this);
    if (ix >= 0) TP_PHONE.panels.splice(ix, 1);
    if (this._hot) this._hot.remove();
    this.el.remove();
    return this;
  };

  /* ============================================================
     スマホモード（実機ライブ同期）
     2026-09-26 ヒデさん指示「Anyflow の調整パネルの仕様（ローカル環境でスマホモード）も全部真似して」
     anyflow/v5/index.html の liveSync（PC側）と同じ動き：
       ・📱スマホモード を押す → スマホモードON（パネルが青く縁取られ、帯が出る）
                                 ＋ QR のポップアップ ＋ 390×844 のスマホ枠（中は本物のページ）
       ・もう一度押す → QR だけ閉じる（モードは続く）／「スマホモード終了」で解除
       ・触った値は自動保存され、スマホ枠（同じブラウザ）と、QR で開いた実機へ届く
     中継サーバ: node abashiri/v3/tools/live-sync.mjs（:8780）
     ⚠️ 開発（localhost / 同じ Wi-Fi のアドレス）でだけ出す。本番では出さない
     ============================================================ */

  var TP_PHONE = {
    on: false,
    panels: [],
    dom: null,
    port: 8780,
    dev: (function () {
      try {
        var h = location.hostname;
        return /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || /\.local$/.test(h);
      } catch (e) { return false; }
    })(),
    /* スマホ枠の中身／本物のスマホ側では出さない（入れ子になるため） */
    inner: (function () {
      try { return /[?&](preview=1|live=phone)(&|$)/i.test(location.search); } catch (e) { return false; }
    })()
  };
  var TP_SYNC = (function () {
    try { return location.protocol + '//' + location.hostname + ':' + TP_PHONE.port; } catch (e) { return ''; }
  })();

  /* 保存のたびに、実機へ設定を投げる（スマホモード中だけ）。
     送るのは調整パネルの保存値（localStorage の tp:*）と、いま開いているページ */
  function tpPhonePush() {
    if (!TP_PHONE.on || !TP_SYNC) return;
    var ls = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('tp:') === 0) ls[k] = localStorage.getItem(k);
      }
    } catch (e) { return; }
    var body = JSON.stringify({ ls: ls, path: location.pathname });
    /* ⚠️ keepalive は付けない（64KB を超えると無言で失敗する。anyflow で実測） */
    try { fetch(TP_SYNC + '/push', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body }).catch(function () {}); } catch (e) {}
  }

  var TP_PHONE_CSS = [
    /* QR のポップアップ（anyflow の .live-pop） */
    '.tp-live-pop{position:fixed;left:12px;bottom:64px;z-index:2147483004;width:250px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;',
    '  box-shadow:0 12px 40px rgba(16,24,40,.22);padding:14px;font:400 12px/1.5 -apple-system,system-ui,sans-serif;color:#222;display:none;}',
    '.tp-live-pop.show{display:block;}',
    '.tp-live-pop h4{margin:0 0 8px;font-size:12px;font-weight:700;cursor:move;user-select:none;}',
    '.tp-live-pop .qr{width:190px;height:190px;margin:2px auto 8px;display:block;background:#f4f4f5;border-radius:8px;}',
    '.tp-live-pop .url{word-break:break-all;background:#f4f4f5;border-radius:7px;padding:6px 8px;font-size:11px;color:#333;margin-bottom:8px;}',
    '.tp-live-pop .url.err{color:#c0392b;}',
    '.tp-live-pop .row{display:flex;gap:6px;align-items:center;margin-top:8px;}',
    '.tp-live-pop button{flex:1;border:1px solid rgba(0,0,0,.1);background:#fff;border-radius:8px;padding:7px 4px;font:600 12px/1 -apple-system,system-ui,sans-serif;cursor:pointer;color:#222;white-space:nowrap;}',
    '.tp-live-pop button.pri{background:#0e5cff;color:#fff;border-color:#0e5cff;}',
    '.tp-live-pop .st{font-size:11px;color:#666;margin-top:8px;min-height:15px;}',
    '.tp-live-pop .st.err{color:#c0392b;}',
    '.tp-live-pop .pm-prompt{display:none;width:100%;margin-top:8px;border:1px dashed rgba(14,92,255,.5);background:#eef8ff;color:#0b4bd6;',
    '  border-radius:8px;padding:8px;font:600 11px/1.35 -apple-system,system-ui,sans-serif;cursor:pointer;text-align:center;}',
    '.tp-live-pop .pm-prompt.show{display:block;}',
    /* スマホモード中の見た目（帯・青い縁・ボタンの青） */
    '.tp-phone-banner{display:none;gap:6px;align-items:center;justify-content:center;font:600 11px/1.35 -apple-system,system-ui,sans-serif;',
    '  color:#0b4bd6;background:linear-gradient(90deg,rgba(14,92,255,.10),rgba(14,187,255,.14));border-top:1px solid rgba(14,92,255,.22);',
    '  border-bottom:1px solid rgba(14,92,255,.22);padding:7px 12px;text-align:center;flex:0 0 auto;}',
    '.tp-phone-banner b{font-weight:800;}',
    'html.phone-mode .tp:not(.closed) .tp-phone-banner{display:flex;}',
    'html.phone-mode .tp-head{background:linear-gradient(90deg,rgba(14,92,255,.10),rgba(14,187,255,.12));}',
    'html.phone-mode .tp{box-shadow:0 0 0 2px rgba(14,92,255,.45),0 14px 40px rgba(16,24,40,.22);}',
    'html.phone-mode .tp-head-btn.tp-phone-btn{background:#0e5cff;border-color:#0e5cff;color:#fff;}',
    /* スマホ枠（anyflow の #phonePreview。パネルが右下なので、枠は左下に出す） */
    '#tp-pp{position:fixed;z-index:2147482990;left:20px;bottom:20px;display:none;flex-direction:column;width:390px;transform-origin:left bottom;}',
    'html.phone-mode #tp-pp.on{display:flex;}',
    '#tp-pp .pp-bar{display:flex;align-items:center;gap:8px;background:#111;color:#fff;border-radius:12px 12px 0 0;padding:7px 12px;',
    '  font:600 12px/1.2 -apple-system,system-ui,sans-serif;cursor:move;touch-action:none;user-select:none;}',
    '#tp-pp .pp-ttl{flex:1;}',
    '#tp-pp .pp-bar button{width:24px;height:24px;border:0;border-radius:6px;background:#333;color:#fff;cursor:pointer;font-size:15px;line-height:1;}',
    '#tp-pp .pp-bar button:hover{background:#4a4a4a;}',
    '#tp-pp .pp-frame{width:390px;height:844px;background:#000;border-radius:0 0 28px 28px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.4);border:1px solid #222;}',
    '#tp-pp iframe{width:390px;height:844px;border:0;background:#fff;display:block;}'
  ].join('\n');

  function tpPhoneDom() {
    if (TP_PHONE.dom) return TP_PHONE.dom;
    var st = document.createElement('style');
    st.id = 'tune-panel-phone-css';
    st.textContent = TP_PHONE_CSS;
    document.head.appendChild(st);

    /* QR のポップアップ */
    var pop = document.createElement('div');
    pop.className = 'tp-live-pop';
    pop.innerHTML = '<h4>📱 スマホモード（実機プレビュー）</h4>'
      + '<img class="qr" alt="QR">'
      + '<div class="url">読み込み中…</div>'
      + '<div class="st"></div>'
      + '<button type="button" class="pm-prompt">📋 起動プロンプトをコピー（Claudeに貼る）</button>'
      + '<div class="row"><button type="button" class="cp">URLコピー</button><button type="button" class="pri stop">スマホモード終了</button></div>';
    document.body.appendChild(pop);

    /* スマホ枠（中は本物のページ。?preview=1 で開き、中の調整パネルは隠す） */
    var pp = document.createElement('div');
    pp.id = 'tp-pp';
    pp.setAttribute('aria-hidden', 'true');
    pp.innerHTML = '<div class="pp-bar"><span class="pp-ttl">スマホプレビュー 390×844</span>'
      + '<button type="button" class="rl" title="再読み込み">↻</button><button type="button" class="cl" title="閉じる">×</button></div>'
      + '<div class="pp-frame"><iframe title="スマホプレビュー" src="about:blank"></iframe></div>';
    document.body.appendChild(pp);

    var d = TP_PHONE.dom = {
      pop: pop, pp: pp,
      qr: pop.querySelector('.qr'), url: pop.querySelector('.url'), st: pop.querySelector('.st'),
      prompt: pop.querySelector('.pm-prompt'), copy: pop.querySelector('.cp'), stop: pop.querySelector('.stop'),
      frame: pp.querySelector('iframe'), phoneUrl: '', timer: 0
    };

    d.stop.addEventListener('click', function () { tpPhoneSet(false); tpPopHide(); });
    d.copy.addEventListener('click', function () {
      if (!d.phoneUrl) return;
      try {
        navigator.clipboard.writeText(d.phoneUrl);
        d.copy.textContent = 'コピーしました';
        setTimeout(function () { d.copy.textContent = 'URLコピー'; }, 1200);
      } catch (e) {}
    });
    d.prompt.addEventListener('click', function () {
      var t = '網走V3 のスマホモード(実機ライブ同期)の中継サーバが起動していないようです。起動してください。\n\n'
        + 'cd "/Users/hideyuki/Developer/Claude Code/abashiri/v3/tools" && (test -d node_modules || npm install) && node live-sync.mjs';
      try {
        navigator.clipboard.writeText(t);
        d.prompt.textContent = '✅ コピーしました（Claudeに貼ってください）';
        setTimeout(function () { d.prompt.textContent = '📋 起動プロンプトをコピー（Claudeに貼る）'; }, 2000);
      } catch (e) {}
    });
    pp.querySelector('.rl').addEventListener('click', function () {
      d.frame.setAttribute('src', location.pathname + '?preview=1&_t=' + Date.now());
    });
    pp.querySelector('.cl').addEventListener('click', function () { tpPhoneSet(false); tpPopHide(); });

    /* ポップアップは見出しで、スマホ枠は上のバーでドラッグ移動（anyflow と同じ） */
    tpDraggable(pop.querySelector('h4'), function (dx, dy, s) {
      pop.__dragged = true;
      var pad = 6;
      pop.style.left = Math.max(pad, Math.min(s.l + dx, innerWidth - pop.offsetWidth - pad)) + 'px';
      pop.style.top = Math.max(pad, Math.min(s.t + dy, innerHeight - pop.offsetHeight - pad)) + 'px';
      pop.style.bottom = 'auto';
    }, function () { var r = pop.getBoundingClientRect(); return { l: r.left, t: r.top }; });
    tpDraggable(pp.querySelector('.pp-bar'), function (dx, dy, s) {
      pp._dx = s.x + dx; pp._dy = s.y + dy; tpPpTransform();
    }, function () { return { x: pp._dx || 0, y: pp._dy || 0 }; });

    window.addEventListener('resize', function () { tpPopPlace(); if (TP_PHONE.on) tpPpFit(); });
    return d;
  }

  function tpDraggable(handle, onMove, start) {
    if (!handle) return;
    var drag = null;
    handle.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('button')) return;   /* ↻/× はドラッグしない */
      drag = { x: e.clientX, y: e.clientY, s: start() };
      try { handle.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    });
    handle.addEventListener('pointermove', function (e) {
      if (!drag) return;
      onMove(e.clientX - drag.x, e.clientY - drag.y, drag.s);
    });
    var end = function (e) { drag = null; try { handle.releasePointerCapture(e.pointerId); } catch (er) {} };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function tpPpTransform() {
    var pp = TP_PHONE.dom && TP_PHONE.dom.pp;
    if (!pp) return;
    pp.style.transform = 'translate(' + (pp._dx || 0) + 'px,' + (pp._dy || 0) + 'px) scale(' + (pp._sc != null ? pp._sc : 1) + ')';
  }
  /* 画面が低い時は枠ごと縮めて収める（バー36＋枠844＋余白） */
  function tpPpFit() {
    var pp = TP_PHONE.dom && TP_PHONE.dom.pp;
    if (!pp) return;
    pp._sc = Math.min(1, (innerHeight - 32) / 892);
    tpPpTransform();
  }
  function tpPpSync(on) {
    var d = tpPhoneDom();
    if (on) {
      var u = location.pathname + '?preview=1';
      if ((d.frame.getAttribute('src') || '') !== u) d.frame.setAttribute('src', u);
      d.pp.classList.add('on');
      tpPpFit();
    } else {
      d.pp.classList.remove('on');
      d.frame.setAttribute('src', 'about:blank');
    }
  }

  /* QR のポップアップは、パネルと反対側（パネルの横）に出す */
  function tpPopPlace() {
    var d = TP_PHONE.dom;
    if (!d || !d.pop.classList.contains('show') || d.pop.__dragged) return;
    var pop = d.pop, pad = 12;
    pop.style.right = ''; pop.style.bottom = 'auto';
    var pw = pop.offsetWidth || 250, ph = pop.offsetHeight || 320;
    var panel = TP_PHONE.panels[0] && TP_PHONE.panels[0].el;
    var pr = panel ? panel.getBoundingClientRect() : null;
    var left, top;
    if (pr && pr.width) {
      var mid = pr.left + pr.width / 2;
      left = (mid < innerWidth / 2) ? (pr.right + pad) : (pr.left - pw - pad);
      if (left + pw > innerWidth - pad) left = pr.left - pw - pad;
      if (left < pad) left = pr.right + pad;
      top = pr.top;
    } else { left = innerWidth - pw - pad; top = pad; }
    left = Math.max(pad, Math.min(left, innerWidth - pw - pad));
    top = Math.max(pad, Math.min(top, innerHeight - ph - pad));
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }

  function tpPopStatus() {
    var d = TP_PHONE.dom;
    if (!d) return;
    var q = '?port=' + encodeURIComponent(location.port || (location.protocol === 'https:' ? '443' : '80'))
      + '&path=' + encodeURIComponent(location.pathname);
    fetch(TP_SYNC + '/ip' + q).then(function (r) { return r.json(); }).then(function (j) {
      d.phoneUrl = j.phoneUrl;
      d.url.textContent = j.phoneUrl; d.url.classList.remove('err');
      d.qr.src = TP_SYNC + '/qr?u=' + encodeURIComponent(j.phoneUrl) + '&t=' + Date.now();
      var n = j.clients || 0;
      d.st.classList.remove('err'); d.prompt.classList.remove('show');
      d.st.textContent = TP_PHONE.on
        ? ('同期ON ・ つないでいるスマホ ' + n + '台')
        : ('スマホでこのQRを読むと同期プレビューが開きます（' + n + '台接続中）');
    }).catch(function () {
      d.url.textContent = '同期サーバが起動していません'; d.url.classList.add('err');
      d.qr.removeAttribute('src');
      d.st.classList.add('err');
      d.st.textContent = 'このボタンでプロンプトをコピーして Claude に貼ると起動できます↓';
      d.prompt.classList.add('show');
    });
  }
  function tpPopShow() {
    var d = tpPhoneDom();
    d.pop.__dragged = false;
    d.pop.classList.add('show');
    tpPopPlace(); requestAnimationFrame(tpPopPlace);
    tpPopStatus();
    clearInterval(d.timer);
    d.timer = setInterval(tpPopStatus, 3000);
  }
  function tpPopHide() {
    var d = TP_PHONE.dom;
    if (!d) return;
    d.pop.classList.remove('show');
    clearInterval(d.timer);
  }

  function tpPhoneSet(on) {
    TP_PHONE.on = !!on;
    try { document.documentElement.classList.toggle('phone-mode', !!on); } catch (e) {}
    TP_PHONE.panels.forEach(function (p) {
      if (!p.phoneBtn) return;
      p.phoneBtn.classList.toggle('on', !!on);
      p.phoneBtn.textContent = on ? '📱 スマホモード中' : '📱 スマホモード';
      /* スマホモード中は、いまの値をすぐ保存して枠・実機へ届ける */
      if (on) { try { p.save(); p._saveVars(); } catch (e) {} }
    });
    if (on) tpPhonePush();
    tpPpSync(!!on);
  }

  /* パネルごとの受付（constructor の最後で呼ぶ） */
  Panel.prototype._phoneInit = function () {
    var self = this;
    /* 同じブラウザの別の画面（スマホ枠の中など）で保存された時／実機の受け手から
       「読み直して」と言われた時に、保存値を読み直して反映する */
    this._onStorage = function (e) { if (e && e.key === self._pKey()) self._remoteApply(); };
    this._onRemote = function () { self._remoteApply(); };
    window.addEventListener('storage', this._onStorage);
    window.addEventListener('tp:remote-apply', this._onRemote);

    /* スマホモードの帯（パネルの見出しのすぐ下） */
    var banner = document.createElement('div');
    banner.className = 'tp-phone-banner';
    /* ⚠️ 帯は flex なので、文字を1つの span にまとめないと太字の所で段が割れる（実測で「スマホモー／ド」と折れた） */
    banner.innerHTML = '<span>📱 <b>スマホモード</b>：この画面の調整が、スマホ枠と同期中のスマホ実機に反映されます</span>';
    this.el.insertBefore(banner, this.body);

    if (!TP_PHONE.dev || TP_PHONE.inner || !this.phoneBtn) return;
    TP_PHONE.panels.push(this);
    tpPhoneDom();   /* CSS を先に入れておく（帯などの見た目） */
    this.phoneBtn.hidden = false;
    this.phoneBtn.classList.add('tp-phone-btn');
    this.phoneBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!TP_PHONE.on) { tpPhoneSet(true); tpPopShow(); }                 /* 初回: モードON＋QR */
      else if (TP_PHONE.dom && TP_PHONE.dom.pop.classList.contains('show')) tpPopHide();   /* 2回目: QRだけ隠す */
      else tpPopShow();                                                     /* もう一度: QR 再表示 */
    });
  };

  /* 保存値を読み直して、ページ側に反映させる（自分では保存しない＝行ったり来たりしない） */
  Panel.prototype._remoteApply = function () {
    try {
      this._loadParams();
      this.rebuild();
      var info = { remote: true, immediate: true };
      if (this.cfg.onChange) this.cfg.onChange(info);
      if (this.cfg.onSettle) this.cfg.onSettle(info);
    } catch (e) {}
  };

  /* ============================================================
     入口
     ============================================================ */

  return {
    /* 作ったパネルを控えておく。動作確認の時に中の値を外から読むために使う
       （画面には何も出ない。TunePanel.instances[0].params で今の値が見られる） */
    instances: [],
    create: function (cfg) {
      var p = new Panel(cfg);
      try { this.instances.push(p); } catch (e) {}
      return p;
    },
    Panel: Panel,
    /* 便利物（利用側でも使えるように） */
    utils: { getPath: getPath, setPath: setPath, mergeSaved: mergeSaved, assignDeep: assignDeep, clone: clone },
    version: '1.0.0'
  };
});
