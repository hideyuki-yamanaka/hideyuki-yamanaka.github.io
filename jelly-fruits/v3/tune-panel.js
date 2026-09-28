/*!
 * tune-panel.js v2.0.0 — 汎用「調整パネル」（AnyFlow V5 準拠・2026-09-27 作り直し）
 * 1ファイル / 依存なし / CSSも自分で流し込む。
 *
 *   <script src="tune-panel.js"></script>
 *   const panel = TunePanel.create({ storageKey:'my-app', version:1, params, defaults, schema:[...] })
 *
 * 仕様の正は同じフォルダの README.md「📌 共通仕様（AnyFlow V5 準拠）」。
 * 手本: anyflow/v5/js/parts/06-sections.js・07-panel.js・css/style.css（読むだけ）
 * 土台: abashiri/v3/public/tune-panel.js（2026-09-26 版）
 * 旧版（v1.0.0）は tune-panel.v1.js に控えてある。
 *
 * MIT License
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else root.TunePanel = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '2.1.2';

  /* ============================================================
     0. 小道具
     ============================================================ */

  var isObj = function (v) { return v !== null && typeof v === 'object' && !Array.isArray(v); };
  var clone = function (v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
  var hasOwn = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  var escRe = function (s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var decOf = function (step) { var s = String(step); return s.indexOf('e-') >= 0 ? +s.split('e-')[1] : (s.split('.')[1] || '').length; };
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function getPath(obj, path) {
    if (path === undefined || path === null) return undefined;
    var ks = String(path).split('.'), cur = obj;
    for (var i = 0; i < ks.length; i++) { if (cur == null) return undefined; cur = cur[ks[i]]; }
    return cur;
  }
  function setPath(obj, path, v) {
    var ks = String(path).split('.'), last = ks.pop(), cur = obj;
    for (var i = 0; i < ks.length; i++) {
      if (!isObj(cur[ks[i]]) && !Array.isArray(cur[ks[i]])) cur[ks[i]] = {};
      cur = cur[ks[i]];
    }
    cur[last] = v;
  }
  /* 案の values は { 'kv.size': 120 } でも { kv: { size: 120 } } でも書ける */
  function lookup(vals, path) {
    if (!vals || path == null) return undefined;
    return hasOwn(vals, path) ? vals[path] : getPath(vals, path);
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

  /* 選択肢の書き方をそろえる。[名前, 値] / {name, value, …} / 値そのもの のどれでもよい */
  function normOptions(options) {
    return (options || []).map(function (o) {
      if (Array.isArray(o)) return { name: String(o[0]), value: o[1] };
      if (isObj(o)) {
        var v = o.value !== undefined ? o.value : o.key !== undefined ? o.key : o.name;
        var n = o.name !== undefined ? o.name : o.label !== undefined ? o.label : v;
        return { name: String(n), value: v, desc: o.desc || o.tip || '', swatch: o.swatch, values: o.values, fixed: !!o.fixed };
      }
      return { name: String(o), value: o };
    });
  }

  /* ── スライダーの範囲（AnyFlow V5 の slider() の rangeFor() と同じ考え方・2026-09-27 ヒデさん決定）──
     いまの値を真ん中に置く。半幅＝いまの値−床（書いた下限が0なら床は0／正の数ならその半分／負を含むなら床なし）。
     床に張り付いている値（0本・0秒など）は真ん中に置けないので、少し動かすだけで変化が出る幅を上へ取る。
     signed:true（0＝いまの位置）の項目は、0 を真ん中にマイナス〜プラスで持つ。 */
  function rangeFor(cur, dMin0, dMax0, step, signed) {
    if (typeof cur !== 'number' || !isFinite(cur)) cur = dMin0;
    var floor = signed ? -Infinity
      : (dMin0 < 0 ? -Infinity : (dMin0 > 0 ? Math.min(dMin0 * 0.5, Math.abs(cur) * 0.4) : 0));
    var room = signed ? Math.max(Math.abs(cur), (dMax0 - dMin0) * 0.5)
      : (isFinite(floor) ? (cur - floor) : (dMax0 - dMin0) * 0.5);
    var half = (room >= step * 2) ? room : Math.max(step * 4, (dMax0 - dMin0) * 0.15);
    var lo = cur - half, hi = cur + half;
    if (lo < floor) { lo = floor; hi = lo + half * 2; }
    var dec = decOf(step);
    var q = function (v) { return +(Math.round(v / step) * step).toFixed(dec); };
    lo = q(lo); hi = q(hi);
    if (hi - lo < step * 4) hi = q(lo + step * 4);
    if (cur < lo) lo = q(cur - step);
    if (cur > hi) hi = q(cur + step);
    return { lo: lo, hi: hi };
  }

  /* ── デザインの数値の決まり（ルール集 RULES.md 4-7・2026-09-27 ヒデさん）──
     余白・サイズ・角丸・文字サイズの px のつまみは、4の倍数（10px以下は2刻み・文字は14と18も可）に止まる。
     種類は項目の grid（'spacing'|'size'|'radius'|'fontSize'|false）で決める。無ければ単位が px の項目だけ、名前から見分ける。
     位置（X/Y/Z・ずらし）・秒・%・倍率・影・ぼかし・線幅などは止めない（決まりの外）。 */
  function gridKindOf(item, cfg) {
    if (!item || item.grid === false || (cfg && cfg.grid === false)) return null;
    if (typeof item.grid === 'string') return item.grid;
    var unit = item.unit != null ? String(item.unit) : (typeof item.fmt === 'string' ? item.fmt : '');
    if (unit !== 'px') return null;
    var t = String(item.slider || '') + ' ' + String(item.path || '');
    if (/位置|座標|ずらし|オフセット|offset|translate|shift|(^|[^a-z])[xyz]($|[^a-z])|top|left|right|bottom/i.test(t)) return null;
    if (/行間|字間|line-?height|letter|tracking|leading|影|shadow|ぼかし|ブラー|blur|線|太さ|stroke|border|不透明|opacity/i.test(t)) return null;   /* 線幅（0.5px・1pxも可）・影・ぼかし・不透明度は自由 */
    /* 順番が大事：余白・角丸・幅と高さを先に見てから、文字の話か（本文・見出しなども）を見る。
       「本文サイズ」「bodySize」が大きさ扱いになり、文字だけに許す 14・18 が 16・20 に寄っていた（2026-09-28 網走V3 で発覚） */
    if (/角丸|radius|round|corner/i.test(t)) return 'radius';
    if (/余白|ギャップ|パディング|マージン|間隔|gap|pad|margin|space|spacing|gutter/i.test(t)) return 'spacing';
    if (/幅|高さ|width|height/i.test(t)) return 'size';
    if (/文字|フォント|font|text|本文|見出し|タイトル|title|heading|body|ラベル|label|キャプション|caption|コピー|copy/i.test(t)) return 'fontSize';
    if (/大きさ|サイズ|size/i.test(t)) return 'size';
    return null;
  }
  function gridOk(x, kind) {
    x = Math.abs(x);
    if (Math.abs(x - Math.round(x)) > 1e-9) return false;
    return (x <= 10 && x % 2 === 0) || x % 4 === 0 || (kind === 'fontSize' && (x === 14 || x === 18)) || (kind === 'radius' && x >= 999);
  }
  function snapGrid(v, kind) {
    if (!kind || !isFinite(v) || gridOk(v, kind)) return v;
    var sign = v < 0 ? -1 : 1, a = Math.abs(v), best = null;
    for (var x = Math.max(0, Math.floor(a) - 4); x <= Math.ceil(a) + 4; x++) {
      if (!gridOk(x, kind)) continue;
      if (best === null || Math.abs(x - a) < Math.abs(best - a) || (Math.abs(x - a) === Math.abs(best - a) && x > best)) best = x;
    }
    return best === null ? v : sign * best;
  }

  /* 数値の見せ方のショートカット */
  var FMT = {
    s: function (v) { return (+v).toFixed(2) + 's'; },
    sec: function (v) { return (+v).toFixed(2) + 's'; },
    ms: function (v) { return Math.round(v) + 'ms'; },
    /* '%' は2通りの持ち方に対応（書いた max が 1 以下なら 0〜1 の割合とみなして100倍） */
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
  /* fmt（見せ方）が無く unit（単位）だけ書いてある時は「値＋単位」で出す（網走の unit:'ms' などを生かす） */
  function toFmt(item, step) {
    var f = item.fmt, dec = decOf(step);
    var safe = function (fn) { return function (v) { var n = +v; if (!isFinite(n)) return '–'; try { return fn(n); } catch (e) { return String(v); } }; };
    if (typeof f === 'function') return safe(f);
    if (typeof f === 'string' && FMT[f]) return safe(function (v) { return FMT[f](v, item); });
    var unit = item.unit != null ? String(item.unit) : (typeof f === 'string' ? f : '');
    if (unit === 'ms') dec = 0;
    return safe(function (v) { return v.toFixed(dec) + unit; });
  }

  /* ============================================================
     1. 見た目（CSS）。値は AnyFlow V5 の調整パネルの実装値（css/style.css）を写したもの
     ============================================================ */

  var ICON_CHEV = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z\'/%3E%3C/svg%3E") center/contain no-repeat';
  var ICON_RST = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z\'/%3E%3C/svg%3E") center/contain no-repeat';
  /* 書体：AnyFlow V5 のパネルと同じ Noto Sans JP（2026-09-28 網走V3 で見た目をそろえた）。
     読み込みはパネルを初めて出した時だけ（loadPanelFont）。隠れている間は読まないので、ふつうの見る人には余計な読み込みが無い */
  var FONT = '"Noto Sans JP",sans-serif';
  var FONT_HREF = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800&display=swap';

  var CSS = [
    /* ── 枠：既定 450×520・最小 240×46・最大は画面の92%。外寸は固定で中身だけスクロール ── */
    '.tp{position:fixed;z-index:2147483000;display:flex;flex-direction:column;overflow:hidden;',
    '  width:450px;height:520px;min-width:240px;min-height:46px;max-width:92vw;max-height:92vh;resize:both;',
    '  background:#fff;',   /* AnyFlow は白92%＋ぼかし（白いページの上なので白く見える）。色の濃いページでも同じ白に見えるよう白100%（2026-09-28 ヒデさん「色味も合わせて」） */
    '  border:1px solid #ececec;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.10);',
    '  font-family:' + FONT + ';font-size:11px;line-height:normal;color:#101828;font-weight:400;text-align:left;letter-spacing:0;}',
    '.tp *{box-sizing:border-box;}',
    '.tp.tp-hide{display:none!important;}',
    '.tp.closed{height:auto!important;resize:none;}',
    '.tp.closed .tp-body,.tp.closed .tp-z,.tp.closed .tp-banner{display:none!important;}',
    /* ── 見出しの帯（タブと同じ白の不透明地。つかんで移動・押して開閉） ── */
    '.tp-head{display:flex;align-items:center;justify-content:space-between;padding:14px 12px;cursor:grab;user-select:none;-webkit-user-select:none;flex:0 0 auto;}',
    '.tp-head:active{cursor:grabbing;}',
    '.tp-title{font-size:15px;font-weight:700;letter-spacing:.02em;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}',
    '.tp-head-sub{font-size:10px;color:#999;margin-left:8px;font-weight:300;letter-spacing:0;}',
    '.tp:not(.closed) .tp-head-sub{display:none;}',
    '.tp-head-btns{margin-left:auto;margin-right:10px;display:flex;gap:6px;align-items:center;flex:0 0 auto;}',
    '.tp-head-btn{flex:0 0 auto;padding:4px 10px;font-family:inherit;font-size:11px;border:1px solid #d5d5d5;border-radius:6px;background:#fff;color:#444;cursor:pointer;}',
    '.tp-head-btn:hover{border-color:#0EBBFF;color:#0aa2dd;}',
    '.tp-head-btn.on{background:#0EBBFF;border-color:#0EBBFF;color:#fff;}',
    '.tp-head-btn[hidden]{display:none!important;}',
    '.tp-chev{flex:0 0 auto;font-size:10px;color:#888;transition:transform .25s;cursor:pointer;}',
    '.tp.closed .tp-chev{transform:rotate(180deg);}',
    /* ── スマホモード中：帯が青っぽく＋上に「スマホモード」の帯 ── */
    '.tp-banner{display:none;gap:6px;align-items:center;justify-content:center;font:600 11px/1.35 -apple-system,system-ui,sans-serif;color:#0b4bd6;',
    '  background:linear-gradient(90deg,rgba(14,92,255,.10),rgba(14,187,255,.14));border-top:1px solid rgba(14,92,255,.22);',
    '  border-bottom:1px solid rgba(14,92,255,.22);padding:7px 12px;text-align:center;flex:0 0 auto;}',
    '.tp-banner b{font-weight:800;}',
    '.tp.tp-phone .tp-banner{display:flex;}',
    '.tp.tp-phone .tp-head{background:linear-gradient(90deg,rgba(14,92,255,.10),rgba(14,187,255,.12));}',
    '.tp.tp-phone{box-shadow:0 0 0 2px rgba(14,92,255,.45),0 14px 40px rgba(16,24,40,.22);}',
    '.tp.tp-phone .tp-phone-btn{background:#0e5cff;border-color:#0e5cff;color:#fff;}',
    '.tp .pm-banner{display:none!important;}',   /* phone-mode.client.js の帯はパネルの帯と重なるので出さない */
    /* ── 中身（ここだけスクロール。ページへスクロールを伝えない） ── */
    '.tp-body{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:0 10px 10px;scrollbar-width:thin;scrollbar-color:#cfcfcf transparent;}',
    '.tp-body::-webkit-scrollbar{width:6px;}',
    '.tp-body::-webkit-scrollbar-thumb{background:#cfcfcf;border-radius:3px;}',
    '.tp-body::-webkit-scrollbar-thumb:hover{background:#b8b8b8;}',
    '.tp-body::-webkit-scrollbar-track{background:transparent;}',
    /* ── タブ：下線型・横1列・はみ出たら横スクロール・貼りつく・バーは動かしている間だけ ── */
    '.tp-tabs{position:sticky;top:0;z-index:3;display:flex;flex-wrap:nowrap;gap:16px;margin:0 -10px;padding:6px 10px 0;background:#fff;',
    '  border-bottom:1px solid #dcdcdc;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;',
    '  color:transparent;transition:color .4s ease;}',
    '.tp-tabs.is-scrolling{color:#c4c4c4;transition-duration:.12s;}',
    '.tp-tabs::-webkit-scrollbar{height:3px;}',
    '.tp-tabs::-webkit-scrollbar-thumb{background:transparent;border-radius:2px;box-shadow:inset 0 0 0 10px;}',
    '.tp-tabs::-webkit-scrollbar-track{background:transparent;}',
    '@supports not selector(::-webkit-scrollbar){.tp-tabs{scrollbar-width:thin;scrollbar-color:transparent transparent;}.tp-tabs.is-scrolling{scrollbar-color:#c4c4c4 transparent;}}',
    '@supports selector(::-webkit-scrollbar){.tp-tabs{scrollbar-width:auto;scrollbar-color:auto;}}',
    '.tp-tab{flex:0 0 auto;height:34px;padding:0 2px;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;color:#8a8a8a;',
    '  font:-webkit-small-control;font-size:12.5px;font-weight:500;line-height:34px;cursor:pointer;white-space:nowrap;transition:color .15s,border-color .15s,font-weight .15s;}',
    '.tp-tab:hover{color:#333;}',
    '.tp-tab.on{color:#111;border-bottom-color:#111;font-weight:700;}',
    '.tp-tab[hidden]{display:none;}',
    '.tp-pane{display:none;padding-top:6px;}',
    '.tp-pane.on{display:block;}',
    '.tp-pane-title{font-size:14px;font-weight:800;color:#000;padding:14px 2px 2px;}',
    '.tp-off{display:none!important;}',
    /* ── カテゴリ（H1）。基本〜その他はカード、バリエーションは装飾なしの大見出し ── */
    '.tp-cs{margin:8px 0;}',
    '.tp-cs-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:13px 2px 7px;font-size:13px;font-weight:700;',
    '  letter-spacing:.03em;color:#111;user-select:none;-webkit-user-select:none;}',
    '.tp-cs.var{margin:0 0 4px;}',
    '.tp-cs.var>.tp-cs-head{font-size:14px;font-weight:800;color:#000;padding:15px 2px 6px;}',
    '.tp-cs.card{background:transparent;border:1px solid #e4e7eb;border-radius:10px;padding:0 11px 6px;box-shadow:0 1px 2px rgba(16,24,40,.04);}',   /* 2026-09-28 v2.1.2 ヒデさん「セクションの枠の色を上下のブロックと同じ色に」＝中は塗らない(AnyFlow V5 と同じ) */
    '.tp-cs.card>.tp-cs-head{padding:11px 2px 8px;cursor:pointer;}',
    '.tp-cs.var~.tp-cs.card>.tp-cs-head{letter-spacing:.02em;}',
    '.tp-cs.card>.tp-cs-body{padding-bottom:4px;}',
    '.tp-cs-chev{position:relative;width:22px;height:22px;flex:0 0 auto;transition:transform .2s;}',
    '.tp-cs-chev::before{content:"";position:absolute;inset:0;background:#8a8a8a;-webkit-mask:' + ICON_CHEV + ';mask:' + ICON_CHEV + ';}',
    '.tp-cs.card>.tp-cs-head:hover .tp-cs-chev::before{background:#333;}',
    '.tp-cs.closed .tp-cs-chev{transform:rotate(-90deg);}',
    '.tp-cs.closed>.tp-cs-body{display:none;}',
    /* 案ごとの大見出し（1タブに主役の案が複数ある時） */
    '.tp-vs{margin:6px 0 4px;}',
    '.tp-vs-head{font-size:14px;font-weight:800;color:#000;padding:15px 2px 6px;}',
    /* ── H2＝モノの見出し 12px 太字／H3＝入れ子 11px グレー／まとまり（小見出し）。左の縦線は使わない ── */
    '.tp-sec{margin-top:4px;}',
    '.tp-sec-head{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#333;margin:12px 0 5px;min-height:20px;}',
    '.tp-cs-body>.tp-sec:first-child>.tp-sec-head{margin-top:4px;}',
    '.tp-sec-head>span:first-child{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.tp-sec-body{padding-bottom:4px;}',
    '.tp-deep{margin:2px 0 6px;}',
    '.tp-deep-head{font-size:12px;font-weight:600;color:#8a8a8a;margin:4px 0 6px;}',
    '.tp-subg{margin:2px 0 6px;}',
    '.tp-subg-lab{font-size:12px;font-weight:600;color:#8a8a8a;margin:4px 0 6px;}',
    /* まとまりの ↺（28px 角）。押すと「✓ 戻しました」 */
    '.tp-gbtn{position:relative;flex:0 0 auto;width:28px;height:28px;padding:0;border:1px solid #e0e0e0;border-radius:8px;background:#fff;',
    '  color:transparent;-webkit-text-fill-color:transparent;font:-webkit-small-control;font-size:14px;line-height:26px;text-align:center;cursor:pointer;',
    '  white-space:nowrap;transition:background .15s,border-color .15s;}',
    '.tp-gbtn:active{transform:translateY(1px);}',
    '.tp-gbtn::after{content:"";position:absolute;inset:0;margin:auto;width:15px;height:15px;background:#8a8a8a;pointer-events:none;-webkit-mask:' + ICON_RST + ';mask:' + ICON_RST + ';}',
    '.tp-gbtn:hover{background:#f4f4f4;border-color:#d5d5d5;}',
    '.tp-gbtn:hover::after{background:#333;}',
    '.tp-gbtn.done{width:auto;padding:0 9px;font-size:12px;background:#000;border-color:#111;color:#fff;-webkit-text-fill-color:#fff;}',
    '.tp-gbtn.done::after{display:none;}',
    /* ── 1行：項目名100px → つまみ → 値48px（右寄せ・桁ぞろえ）→ ↺ ── */
    '.tp-item{position:relative;}',
    '.tp-item.tp-gap{margin-top:9px;}',
    '.tp-row{display:flex;align-items:center;gap:6px;margin:2px 0;min-height:24px;}',
    '.tp-row>label{flex:0 0 100px;min-width:0;color:#555;font-weight:300;}',
    '.tp-row.seg>label{flex:0 0 74px;}',
    '.tp-row input[type=range]{flex:1;min-width:0;margin:0;accent-color:#090909;}',
    '.tp-val{flex:0 0 48px;text-align:right;font-variant-numeric:tabular-nums;color:#333;white-space:nowrap;overflow:hidden;cursor:pointer;}',
    '.tp-val:hover{color:#000;text-decoration:underline dashed #aaa;}',
    '.tp-row .tp-num{flex:0 0 64px;min-width:0;padding:2px 5px;border:1px solid #0EBBFF;border-radius:5px;font:inherit;text-align:right;background:#fff;color:inherit;}',
    '.tp-rst{position:relative;flex:0 0 26px;width:26px;height:26px;padding:0;border:1px solid transparent;border-radius:7px;background:transparent;',
    '  color:transparent;-webkit-text-fill-color:transparent;cursor:pointer;transition:background .15s,border-color .15s;}',
    '.tp-rst::after{content:"";position:absolute;inset:0;margin:auto;width:15px;height:15px;background:#8a8a8a;pointer-events:none;-webkit-mask:' + ICON_RST + ';mask:' + ICON_RST + ';}',
    '.tp-rst:hover{background:#f0f0f0;border-color:#e0e0e0;}',
    '.tp-rst:hover::after{background:#333;}',
    '.tp-fill{flex:1 1 auto;}',
    /* スマホで上書きしている項目の印：青い文字＋小さな●（左の帯・背景は付けない） */
    '.tp.tp-phone .tp-row.tp-mb>label,.tp.tp-phone .tp-row.tp-mb .tp-val,.tp.tp-phone .tp-var.tp-mb .tp-var-lab{color:#0b4bd6;font-weight:600;}',
    '.tp.tp-phone .tp-row.tp-mb>label::before{content:"●";color:#0EBBFF;font-size:8px;margin-right:3px;vertical-align:1px;}',
    /* 2〜3択・する/しない（黒） */
    '.tp-seg{display:flex;flex:1;min-width:0;border:1px solid #d8d8d8;border-radius:8px;overflow:hidden;}',
    '.tp-seg button{flex:1;border:0;background:#fff;font-family:inherit;font-size:10px;padding:5px 2px;cursor:pointer;color:#555;white-space:nowrap;}',
    '.tp-seg button.on{background:#000;color:#fff;}',
    /* チップ（表示・非表示をいくつも・黒） */
    '.tp-chips{display:flex;gap:4px;flex:1 1 auto;min-width:0;}',
    '.tp-chip{flex:1 1 0;min-width:0;border:1px solid #d8d8d8;background:#fff;border-radius:7px;font-family:inherit;font-size:10px;padding:5px 3px;',
    '  cursor:pointer;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background .12s,color .12s,border-color .12s;}',
    '.tp-chip:hover{border-color:#999;}',
    '.tp-chip.on{background:#090909;color:#fff;border-color:#090909;}',
    /* プルダウン・文字・色 */
    '.tp-row select,.tp-row input[type=text]{flex:1;min-width:0;padding:4px 6px;border:1px solid #d8d8d8;border-radius:6px;font-family:inherit;font-size:11px;background:#fff;color:inherit;}',
    '.tp-row input[type=color]{flex:0 0 34px;width:34px;height:22px;padding:0;border:1px solid #ddd;border-radius:5px;background:none;cursor:pointer;}',
    '.tp-row input.tp-hex{flex:0 0 72px;width:72px;font-family:inherit;font-size:11px;border:1px solid #ddd;border-radius:5px;padding:2px 6px;color:#333;background:#fff;}',
    '.tp-row.col{flex-wrap:wrap;}',
    '.tp-row.col>label{flex:1 1 100%;}',
    '.tp-row textarea{flex:1 1 auto;min-width:0;padding:6px 8px;border:1px solid #d8d8d8;border-radius:6px;font-family:inherit;font-size:11px;line-height:1.6;background:#fff;color:inherit;resize:vertical;}',
    /* ── 案ピル（水色 #0EBBFF・角丸小さめ・10px）と ⋯ メニュー ── */
    '.tp-var{margin:2px 0 0;}',
    '.tp-var-lab{font-size:11px;color:#555;font-weight:300;margin:2px 0 0;}',
    '.tp-var-lab[hidden]{display:none;}',
    '.tp-favhead{font-size:11.5px;font-weight:500;color:#666;margin:9px 0 2px;}',
    '.tp-favhead[hidden]~.tp-pills:not(.tp-favrow){margin-top:9px;}',
    '.tp-pills{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:2px 0;}',
    '.tp-favrow{margin-bottom:4px;}',
    '.tp-favhead[hidden],.tp-favrow[hidden]{display:none!important;}',
    '.tp-pill{position:relative;display:inline-flex;align-items:center;gap:4px;padding:3px 17px 3px 7px;border:1px solid #dcdcdc;border-radius:6px;',
    '  background:#fbfbfc;font-family:inherit;font-size:10px;color:#555;cursor:pointer;transition:background .14s,color .14s,border-color .14s;}',
    '.tp-pill.nox,.tp-pill.back{padding-right:9px;}',
    '.tp-pill:hover{border-color:#9fdcf5;background:#f4fbfe;}',
    '.tp-pill.on{background:#0EBBFF;border-color:#0EBBFF;color:#fff;}',
    '.tp-pill.fav:not(.on){border-color:#e6c25a;background:#fffaf0;}',
    '.tp-pill.back{border-style:dashed;color:#999;}',
    '.tp-var.only-back .tp-var-lab,.tp-var.only-back .tp-favhead,.tp-var.only-back .tp-favrow,.tp-var.only-back .tp-pill:not(.back){display:none!important;}',
    '.tp-pill-x{position:absolute;right:2px;top:50%;transform:translateY(-50%);width:13px;height:13px;line-height:12px;text-align:center;border-radius:4px;',
    '  cursor:pointer;font-size:11px;color:#b9b9b9;opacity:0;transition:opacity .12s,color .12s;}',
    '.tp-pill:hover .tp-pill-x,.tp-pill-x:focus{opacity:1;}',
    '.tp-pill.on .tp-pill-x{color:rgba(255,255,255,.75);}',
    '.tp-pill-x:hover{color:#d94141;background:rgba(0,0,0,.06);}',
    '.tp-pill.on .tp-pill-x:hover{color:#fff;background:rgba(255,255,255,.22);}',
    '.tp-swatch{width:10px;height:10px;border-radius:50%;border:1px solid rgba(0,0,0,.08);flex:0 0 auto;}',
    /* 補足文は画面に出さない（項目名の吹き出しで読む）。keep:true だけ出す */
    '.tp-note,.tp-hint{display:none;font-size:8.5px;line-height:1.45;color:#a6a6a6;margin:-2px 0 3px;}',
    '.tp-note.keep,.tp-hint.keep{display:block;}',
    '.tp-note{line-height:1.4;}',
        /* 項目としてのボタン */
    '.tp-btnrow{display:flex;gap:8px;margin:4px 0;}',
    '.tp-btnrow button{flex:1 1 auto;font-family:inherit;font-size:11px;padding:6px 10px;border-radius:8px;border:1px solid #d8d8d8;background:#fff;color:#101828;cursor:pointer;}',
    '.tp-btnrow button:hover{background:#f2f2f2;}',
    '.tp-btnrow button.primary{background:#090909;color:#fff;border-color:#090909;}',
    /* ── 下のボタン3つ（中身のいちばん最後）＋注意書き ── */
    '.tp-foot{padding:0;}',
    '.tp-btns{display:flex;gap:8px;margin-top:12px;}',
    '.tp-btns button{flex:1 1 0;min-width:0;font-family:inherit;font-size:12px;padding:8px 0;border-radius:8px;border:1px solid #d8d8d8;',
    '  background:#fff;color:#000;cursor:pointer;transition:background .18s;}',
    '.tp-btns button:hover{background:#f2f2f2;}',
    '.tp-btns button.primary{background:#000;color:#fff;border-color:#090909;}',
    '.tp-btns button.primary:hover{background:#333;}',
    '.tp-btns button.primary.dirty{background:#FF5D97;border-color:#FF5D97;}',
    '.tp-btns button.primary.dirty:hover{background:#ff4487;}',
    '.tp-savenote{font-size:8.5px;line-height:1.4;color:#a6a6a6;margin:6px 0 0;}',
    '.tp-spacer{height:0;}',
    '.tp-toast{position:absolute;left:0;right:0;bottom:0;padding:7px 12px;background:#090909;color:#fff;font-size:11px;opacity:0;',
    '  transform:translateY(100%);transition:opacity .2s,transform .2s;pointer-events:none;z-index:5;}',
    '.tp-toast.show{opacity:1;transform:translateY(0);}',
    /* ── 4辺の大きさ変更（右下の角は標準の resize） ── */
    '.tp-z{position:absolute;z-index:4;}',
    '.tp-z-t{top:-3px;left:10px;right:10px;height:8px;cursor:ns-resize;}',
    '.tp-z-b{bottom:-3px;left:10px;right:16px;height:8px;cursor:ns-resize;}',
    '.tp-z-l{left:-3px;top:10px;bottom:10px;width:8px;cursor:ew-resize;}',
    '.tp-z-r{right:-3px;top:10px;bottom:16px;width:8px;cursor:ew-resize;}',
    /* ── 隠しモードの透明な四角（右下・PC 100px角・スマホ 72px角）。パネルより下に置く ── */
    '.tp-hot{position:fixed;right:0;bottom:0;width:100px;height:100px;z-index:2147482999;background:transparent;cursor:pointer;}',
    '@media (max-width:600px){.tp-hot{width:72px;height:72px;}}',
    /* ── ⋯ メニュー・確認 ── */
    '.tp-pmenu{position:fixed;z-index:2147483005;background:#fff;border:1px solid #e4e4e4;border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,.14);',
    '  padding:4px;min-width:138px;font-family:' + FONT + ';}',
    '.tp-pmenu button{display:block;width:100%;text-align:left;border:0;background:none;font-family:inherit;font-size:12px;padding:8px 10px;border-radius:6px;cursor:pointer;color:#222;}',
    '.tp-pmenu button:hover{background:#f2f2f2;}',
    '.tp-pmenu button.danger{color:#d94141;}',
    '.tp-pmenu button.danger:hover{background:#fdecec;}',
    '.tp-mdl-bg{position:fixed;inset:0;z-index:2147483006;background:rgba(20,20,20,.28);display:flex;align-items:center;justify-content:center;',
    '  -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);padding:20px;}',
    '.tp-mdl{width:290px;max-width:100%;background:#fff;border-radius:12px;padding:16px 16px 14px;box-shadow:0 18px 50px rgba(0,0,0,.24);',
    '  font-family:' + FONT + ';font-size:12px;color:#222;}',
    '.tp-mdl h4{margin:0 0 6px;font-size:14px;font-weight:600;}',
    '.tp-mdl p{margin:0 0 14px;font-size:12px;line-height:1.6;color:#777;}',
    '.tp-mdl-list{max-height:260px;overflow-y:auto;margin:0 0 12px;}',
    '.tp-mdl-li{display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid #f0f0f0;font-size:11.5px;color:#333;}',
    '.tp-mdl-li:last-child{border-bottom:0;}',
    '.tp-mdl-li span{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.tp-mdl-li button{flex:0 0 auto;font-family:inherit;font-size:10.5px;padding:4px 10px;border:1px solid #0EBBFF;background:#fff;color:#0aa2dd;border-radius:6px;cursor:pointer;}',
    '.tp-mdl-li button:hover{background:#0EBBFF;color:#fff;}',
    '.tp-mdl-btns{display:flex;gap:8px;}',
    '.tp-mdl-btns button{flex:1;font-family:inherit;font-size:11.5px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid #dcdcdc;background:#fff;color:#444;}',
    '.tp-mdl-btns button:hover{background:#f4f4f4;}',
    '.tp-mdl-btns button.danger{background:#d94141;border-color:#d94141;color:#fff;}',
    '.tp-mdl-btns button.danger:hover{background:#c23636;}',
    /* ── スマホ（幅600px以下）：画面下からせり上がるシート ── */
    '.tp-grip{display:none;justify-content:center;align-items:center;padding:8px 0 2px;cursor:grab;touch-action:none;flex:0 0 auto;background:#fff;}',
    '.tp-grip::before{content:"";width:40px;height:4px;border-radius:2px;background:#cfcfcf;}',
    '.tp.tp-sheet{left:0!important;right:0!important;bottom:0!important;top:auto!important;width:auto!important;max-width:none;height:52vh!important;',
    '  max-height:52vh;min-height:0;border-radius:16px 16px 0 0;resize:none;box-shadow:0 -6px 24px rgba(0,0,0,.12);',
    '  transform:translateY(calc(100% - var(--tp-peek,52px)));transition:transform .32s cubic-bezier(.32,.72,0,1);}',
    '.tp.tp-sheet.open{transform:translateY(0);}',
    '.tp.tp-sheet.dragging{transition:none;}',
    '.tp.tp-sheet .tp-grip{display:flex;}',
    '.tp.tp-sheet .tp-head{padding:4px 10px 8px;cursor:default;}',
    '.tp.tp-sheet .tp-chev,.tp.tp-sheet .tp-z{display:none!important;}',
    '.tp.tp-sheet .tp-body{zoom:.9;}',
    /* ── PC 上の 390×844 のスマホ枠（スマホモード中） ── */
    '.tp-pp{position:fixed;z-index:2147482990;right:20px;bottom:20px;display:none;flex-direction:column;width:390px;transform-origin:right bottom;}',
    '.tp-pp.on{display:flex;}',
    '.tp-pp-bar{display:flex;align-items:center;gap:8px;background:#111;color:#fff;border-radius:12px 12px 0 0;padding:7px 12px;',
    '  font:600 12px/1.2 ' + FONT + ';cursor:move;touch-action:none;user-select:none;-webkit-user-select:none;}',
    '.tp-pp-ttl{flex:1;}',
    '.tp-pp-bar button{width:24px;height:24px;border:0;border-radius:6px;background:#333;color:#fff;cursor:pointer;font-size:15px;line-height:1;}',
    '.tp-pp-bar button:hover{background:#4a4a4a;}',
    '.tp-pp-frame{width:390px;height:844px;background:#000;border-radius:0 0 28px 28px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.4);border:1px solid #222;}',
    '.tp-pp iframe{width:390px;height:844px;border:0;background:#fff;display:block;}',
    /* ── 暗いパネル（theme:"dark"） ── */
    '.tp.dark{background:rgba(20,20,22,.92);border-color:#333;color:#eee;}',
    '.tp.dark .tp-head,.tp.dark .tp-tabs,.tp.dark .tp-grip{background:#141416;border-color:#2e2e32;}',
    '.tp.dark .tp-title{color:#f2f2f2;}',
    '.tp.dark .tp-tab{color:#888;}',
    '.tp.dark .tp-tab.on{color:#fff;border-bottom-color:#fff;}',
    '.tp.dark .tp-cs.card{background:#1b1b1e;border-color:#2e2e32;}',
    '.tp.dark .tp-cs-head,.tp.dark .tp-vs-head,.tp.dark .tp-pane-title{color:#eee;}',
    '.tp.dark .tp-sec-head{color:#ddd;}',
    '.tp.dark .tp-row>label,.tp.dark .tp-var-lab{color:#aaa;}',
    '.tp.dark .tp-val{color:#ddd;}',
    '.tp.dark .tp-seg,.tp.dark .tp-chip,.tp.dark .tp-row select,.tp.dark .tp-row input[type=text],.tp.dark .tp-row textarea,',
    '.tp.dark .tp-btns button,.tp.dark .tp-btnrow button,.tp.dark .tp-head-btn,.tp.dark .tp-gbtn,.tp.dark .tp-hex{background:#1b1b1e;border-color:#3a3a3f;color:#eee;}',
    '.tp.dark .tp-seg button{background:#1b1b1e;color:#bbb;}',
    '.tp.dark .tp-seg button.on,.tp.dark .tp-chip.on{background:#fff;color:#111;}',
    '.tp.dark .tp-btns button.primary{background:#fff;color:#111;border-color:#fff;}',
    '.tp.dark .tp-pill{background:#1b1b1e;border-color:#3a3a3f;color:#ccc;}',
    '.tp.dark .tp-pill.on{background:#0EBBFF;border-color:#0EBBFF;color:#fff;}',
    '.tp.dark input[type=range]{accent-color:#fff;}'
  ].join('\n');

  function loadPanelFont(cfg) {
    if (cfg && cfg.font === false) return;
    if (document.getElementById('tune-panel-font')) return;
    var has = [].some.call(document.querySelectorAll('link[href*="fonts.googleapis.com"]'), function (l) {
      return /family=Noto\+Sans\+JP:wght@300;400;500;600;700;800/.test(l.href);
    });
    if (has) return;
    var ln = document.createElement('link');
    ln.id = 'tune-panel-font';
    ln.rel = 'stylesheet';
    ln.href = FONT_HREF;
    (document.head || document.documentElement).appendChild(ln);
  }

  function injectCSS() {
    if (document.getElementById('tune-panel-css-2')) return;
    var st = document.createElement('style');
    st.id = 'tune-panel-css-2';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ============================================================
     2. カテゴリ（タブの中の並び順）
     バリエーション → 基本 → フォント → エフェクト＆テクスチャ → アニメーション → その他（2026-09-20）
     見出しに grp:'basic' などの印が無ければ、見出しの言葉 → 中の項目名の順で判定する（README の振り分けの目安）
     ============================================================ */

  var GRP_ORDER = ['variation', 'basic', 'font', 'fxtex', 'anim', 'other'];
  var GRP_LABEL = { variation: 'バリエーション', basic: '基本', font: 'フォント', fxtex: 'エフェクト＆テクスチャ', anim: 'アニメーション', other: 'その他' };
  var GRP_ALIAS = {
    variant: 'variation', variants: 'variation', 'バリエーション': 'variation', '案': 'variation',
    base: 'basic', layout: 'basic', '基本': 'basic',
    text: 'font', typo: 'font', 'フォント': 'font', '文字': 'font',
    fx: 'fxtex', effect: 'fxtex', effects: 'fxtex', texture: 'fxtex', color: 'fxtex', colour: 'fxtex', 'エフェクト': 'fxtex', 'エフェクト＆テクスチャ': 'fxtex',
    animation: 'anim', motion: 'anim', 'アニメーション': 'anim',
    etc: 'other', misc: 'other', 'その他': 'other'
  };
  function normGrp(g) {
    if (!g) return null;
    g = String(g);
    if (GRP_LABEL[g]) return g;
    return GRP_ALIAS[g] || GRP_ALIAS[g.toLowerCase()] || null;
  }
  /* 言葉から判定。先に当たったものが勝つ（例:「出現のブラー」はアニメーション、「線の太さ」はエフェクト） */
  function grpFromText(t) {
    t = String(t || '');
    if (!t) return null;
    if (/バリエーション|パターン|の案|案の|^案|案$|案（/.test(t)) return 'variation';
    if (/アニメ|出現|登場|退場|切り替え|切替|ディレイ|順番|速さ|速度|再生|くり返し|繰り返し|ループ|回転|タイミング|表示時間|時間|間隔|遷移|揺らぎ|ゆらぎ|モーション|動き|フェード|イージング|タイピング/.test(t)) return 'anim';
    if (/色|配色|カラー|グラデ|ガラス|ディザ|線|光|影|立体|ぼかし|ブラー|質感|テクスチャ|マテリアル|エフェクト|不透明|透明|慣性|ノイズ|グリッド|方眼/.test(t)) return 'fxtex';
    if (/フォント|書体|文字|太さ|ウェイト|行間|字間|タイポ|テキスト/.test(t)) return 'font';
    if (/位置|余白|ギャップ|マージン|パディング|大きさ|サイズ|幅|高さ|レイアウト|配置|スケール|角丸|^[XYZ]$|\s[XYZ]$/.test(t)) return 'basic';
    return null;
  }
  function labelOfItem(it) {
    return it.slider || it.seg || it.toggle || it.select || it.color || it.text || it.chips || it.pills || '';
  }

  /* ============================================================
     3. ページ全体の状態（スマホモード・隠しボックス・スマホ枠）
     ============================================================ */

  var TP = { panels: [], hot: null, frame: null, observer: null, reloadingPage: false, seq: 0 };
  function isDevHost() {
    try {
      if (location.protocol === 'file:') return true;
      var h = location.hostname;
      return /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(h) || /\.(local|localhost|test)$/.test(h);
    } catch (e) { return false; }
  }
  /* スマホ枠の中（?tp-preview=1）／phone-mode.client.js のスマホ受信（?live=phone）では、パネルは出さずに値だけ当てる */
  var INNER = (function () {
    try { return /[?&](tp-preview|preview)=1(&|$)/.test(location.search) || /[?&]live=phone(&|$)/i.test(location.search); } catch (e) { return false; }
  })();
  function htmlPhone() { try { return document.documentElement.classList.contains('phone-mode'); } catch (e) { return false; } }
  function matchPhone(w) {
    try { if (window.matchMedia) return window.matchMedia('(max-width: ' + w + 'px)').matches; } catch (e) {}
    return (window.innerWidth || 1024) <= w;
  }

  /* ============================================================
     4. 値の入れ物（1つの項目の読み書き）
     PC の値 ……… params（スマホ実機では params はスマホ用の見た目なので、PC の値は _pcBase に控える）
     スマホの上書き … _mb[キー]（キー＝path）。スマホモード中とスマホ実機はここを読み書きする
     ============================================================ */

  function Acc(p, item, kind, key) {
    this.p = p; this.item = item; this.kind = kind; this.key = key;
    this.path = item.path != null ? String(item.path) : null;
    this.isPill = kind === 'pills';
    this.sp = !this.isPill && item.sp !== false;   /* 案の選択そのものは PC/スマホ共通 */
    this.owner = null; this.ctl = null; this.enumOpts = null;
  }
  Acc.prototype._get = function (src) {
    var it = this.item;
    if (typeof it.get === 'function') { try { return it.get(src); } catch (e) { return undefined; } }
    return this.path ? getPath(src, this.path) : undefined;
  };
  Acc.prototype._put = function (dst, v) {
    var it = this.item;
    if (typeof it.set === 'function') { try { it.set(v, dst); } catch (e) {} return; }
    if (this.path) setPath(dst, this.path, v);
  };
  Acc.prototype.def = function () {
    if (this.item.defaultValue !== undefined) return clone(this.item.defaultValue);
    return clone(this._get(this.p.defaults));
  };
  Acc.prototype.pcStore = function () { var p = this.p; return (p._isPhone && p._pcBase) ? p._pcBase : p.params; };
  Acc.prototype.readPC = function () { return this._get(this.pcStore()); };
  Acc.prototype.hasMB = function () { return this.sp && hasOwn(this.p._mb, this.key); };
  Acc.prototype.spDef = function () { var it = this.item; return it.spDefault !== undefined ? it.spDefault : it.mbDefault; };
  Acc.prototype.spEff = function () {
    if (this.hasMB()) return this.p._mb[this.key];
    var d = this.spDef();
    return d !== undefined ? clone(d) : this.readPC();
  };
  Acc.prototype.view = function () { return (this.sp && this.p._spView()) ? this.spEff() : this.readPC(); };
  /* スマホ実機では、画面が読む params へ「スマホで効く値」を流し込む */
  Acc.prototype.live = function () {
    var p = this.p;
    if (p._isPhone && p._pcBase) this._put(p.params, clone(this.sp ? this.spEff() : this.readPC()));
  };
  Acc.prototype.writePC = function (v) {
    var p = this.p;
    if (p._isPhone && p._pcBase) { this._put(p._pcBase, clone(v)); this.live(); }
    else this._put(p.params, v);
  };
  Acc.prototype.write = function (v) {
    if (this.sp && this.p._spView()) { this.p._mb[this.key] = clone(v); this.live(); }
    else this.writePC(v);
  };
  Acc.prototype.clearMB = function () { if (!this.sp) return; delete this.p._mb[this.key]; this.live(); };

  /* ============================================================
     5. 案ピル（バリエーション）の持ち物
     値は「案 × PC/スマホ」の組ごとに持つ。案を切り替える時は、離れる案の値を控えてから、選んだ案の控えを重ねる
     （AnyFlow の VAR_AUTOSAVE と同じ）。控えは params とは別の入れ物（tp:<キー>:variants）に保存する
     ============================================================ */

  function Ctl(p, item, acc) {
    this.p = p; this.item = item; this.acc = acc; this.id = acc.key;
    this.scope = [];   /* この案が持つ（案ごとに独立させる）項目 */
    this.owns = !item.fixedOptions && item.values !== false;
    this.depth = 0; this.fill = null; this.box = null; this.lab = null;
  }

  /* まだコードから消していない、隠した案（「↺ 消した案を戻す」で戻せる物） */
  Ctl.prototype.restorable = function () {
    var opts = this.opts();
    return this.st().hidden.filter(function (k) { return opts.some(function (o) { return String(o.value) === k; }); });
  };
  Ctl.prototype.opts = function () { return normOptions(this.item.options); };
  Ctl.prototype.st = function () {
    var vs = this.p._vs, id = this.id;
    if (!Array.isArray(vs.hidden[id])) vs.hidden[id] = [];
    if (!Array.isArray(vs.fav[id])) vs.fav[id] = [];
    if (!isObj(vs.ov[id])) vs.ov[id] = {};
    return { hidden: vs.hidden[id], fav: vs.fav[id], ov: vs.ov[id] };
  };
  Ctl.prototype.alive = function () {
    var h = this.st().hidden;
    return this.opts().filter(function (o) { return h.indexOf(String(o.value)) < 0; });
  };
  Ctl.prototype.sel = function () { return this.acc.readPC(); };
  Ctl.prototype.opt = function (v) {
    var k = String(v);
    return this.opts().filter(function (o) { return String(o.value) === k; })[0] || null;
  };
  /* コードに書いた「その案の最初の値」（options[].values → 無ければ defaults） */
  Ctl.prototype.baseOf = function (v) {
    var o = this.opt(v), vals = o && o.values, out = {};
    this.scope.forEach(function (a) {
      var x = vals ? lookup(vals, a.path) : undefined;
      out[a.key] = x !== undefined ? clone(x) : a.def();
    });
    return out;
  };
  /* いまの値（PC とスマホの上書き）を控えの形にする */
  Ctl.prototype.capture = function () {
    var pc = {}, sp = {}, mb = this.p._mb;
    this.scope.forEach(function (a) {
      pc[a.key] = clone(a.readPC());
      if (a.hasMB()) sp[a.key] = clone(mb[a.key]);
    });
    return { pc: pc, sp: sp };
  };
  /* 控え（無ければその案の最初の値）を当てる */
  Ctl.prototype.apply = function (snap, v) {
    var self = this, mb = this.p._mb, base = null;
    this.scope.forEach(function (a) {
      var x;
      if (snap && snap.pc && hasOwn(snap.pc, a.key)) x = snap.pc[a.key];
      else { base = base || self.baseOf(v); x = base[a.key]; }
      if (x !== undefined) a._put(a.pcStore(), clone(x));
      if (a.sp) delete mb[a.key];
    });
    if (snap && isObj(snap.sp)) {
      this.scope.forEach(function (a) { if (a.sp && hasOwn(snap.sp, a.key)) mb[a.key] = clone(snap.sp[a.key]); });
    }
    this.scope.forEach(function (a) { a.live(); });
  };
  /* 「上書き済み」＝控えがコードの最初の値と違う（スマホの上書きがある）時だけ */
  Ctl.prototype.custom = function (v) {
    if (!this.owns) return false;
    var ov = this.st().ov[String(v)];
    if (!ov) return false;
    if (ov.sp && Object.keys(ov.sp).length) return true;
    var b = this.baseOf(v);
    return this.scope.some(function (a) { return hasOwn(ov.pc, a.key) && !same(ov.pc[a.key], b[a.key]); });
  };

  /* ============================================================
     6. パネル本体
     ============================================================ */

  function Panel(cfg) {
    cfg = cfg || {};
    if (!cfg.params) throw new Error('[TunePanel] params が要ります');
    this.cfg = cfg;
    this.params = cfg.params;
    this.defaults = clone(cfg.defaults !== undefined ? cfg.defaults : cfg.params);
    this.version = cfg.version === undefined ? 1 : cfg.version;
    this.storageKey = cfg.storageKey || null;
    this.settleDelay = cfg.settleDelay === undefined ? 250 : cfg.settleDelay;
    this.autosaveDelay = cfg.autosaveDelay === undefined ? 800 : cfg.autosaveDelay;
    this.phoneWidth = cfg.phoneWidth || 600;
    /* 旧オプション。v2 では使わない（渡されても何もしない）: autoCenter / centerDefault / search / saveMode / presets */
    this._n = ++TP.seq;
    this._inner = INNER;
    this._isPhone = matchPhone(this.phoneWidth);   /* スマホ実機（幅600px以下）＝見るだけ・どこにも保存しない */
    this._atLoadPhone = this._isPhone;
    this._sheet = this._isPhone && !this._inner;
    this._phoneOn = false;
    this._mb = {};
    this._vs = { hidden: {}, fav: {}, ov: {} };
    this._dirty = false;
    this._ready = false;
    this._catOpen = {};
    this._rows = []; this.rows = []; this._accs = []; this._ctls = []; this._tabs = [];

    injectCSS();
    this._buildShell();
    var had = this._loadStored();
    this._loadUI();
    this._render();
    this._assignOwners();
    this._validate();
    this._startup(had);
    this._captureStart();
    this.sync();
    this._fillPills();
    this._applyVisibility();
    this._initPhoneMode();
    this._initSecret();
    this._initModeWatch();
    this._initRemote();
    TP.panels.push(this);
    this._ready = true;
  }

  /* ---------- 保存の鍵 ---------- */

  Panel.prototype._pKey = function () { return 'tp:' + this.storageKey + ':v' + this.version; };
  Panel.prototype._mbKey = function () { return 'tp:' + this.storageKey + ':v' + this.version + ':mb'; };
  Panel.prototype._vKey = function () { return 'tp:' + this.storageKey + ':variants'; };
  Panel.prototype._uKey = function () { return 'tp:' + this.storageKey + ':ui'; };
  /* phone-mode.client.js の storageKeys に渡す一覧 */
  Panel.prototype.storageKeys = function () {
    return this.storageKey ? [this._pKey(), this._mbKey(), this._vKey()] : [];
  };
  /* 保存してよいか。スマホ実機・スマホ枠の中・PC⇄スマホの開き直し待ちでは書かない */
  Panel.prototype._canWrite = function () {
    return !!this.storageKey && !this._isPhone && !this._inner && !this._reloading && !TP.reloadingPage;
  };

  Panel.prototype._readStore = function () {
    var out = { params: null, mb: {}, vs: null };
    if (!this.storageKey) return out;
    try { var raw = localStorage.getItem(this._pKey()); if (raw) { var s = JSON.parse(raw); if (isObj(s)) out.params = s; } } catch (e) {}
    try { var m = JSON.parse(localStorage.getItem(this._mbKey())); if (isObj(m)) out.mb = m; } catch (e) {}
    try { var v = JSON.parse(localStorage.getItem(this._vKey())); if (isObj(v)) out.vs = v; } catch (e) {}
    return out;
  };
  Panel.prototype._takeVars = function (v) {
    var vs = { hidden: {}, fav: {}, ov: {} };
    if (isObj(v)) {
      if (isObj(v.hidden)) vs.hidden = v.hidden;
      if (isObj(v.fav)) vs.fav = v.fav;
      /* 控え（値）は版が同じ時だけ使う。隠した案・★は版をまたいで残す */
      if (isObj(v.ov) && v.ver === this.version) vs.ov = v.ov;
    }
    this._vs = vs;
  };
  Panel.prototype._loadStored = function () {
    if (!this.storageKey) return false;
    /* 古い版の保存値は掃除する（PC だけ。スマホは見るだけなので消しもしない） */
    if (this._canWrite()) {
      try {
        var re = new RegExp('^tp:' + escRe(this.storageKey) + ':v(\\d+)(:mb)?$');
        for (var i = localStorage.length - 1; i >= 0; i--) {
          var k = localStorage.key(i), m = k && re.exec(k);
          if (m && String(m[1]) !== String(this.version)) localStorage.removeItem(k);
        }
      } catch (e) {}
    }
    var st = this._readStore(), had = false;
    if (st.params) { assignDeep(this.params, mergeSaved(this.defaults, st.params)); had = true; }
    this._mb = st.mb || {};
    this._takeVars(st.vs);
    return had;
  };

  Panel.prototype.save = function () {
    clearTimeout(this._saveT);
    this._savePending = false;
    if (!this._canWrite()) return false;
    this._captureAll();
    try {
      localStorage.setItem(this._pKey(), JSON.stringify(this.params));
      if (Object.keys(this._mb).length) localStorage.setItem(this._mbKey(), JSON.stringify(this._mb));
      else localStorage.removeItem(this._mbKey());
      localStorage.setItem(this._vKey(), JSON.stringify({ ver: this.version, hidden: this._vs.hidden, fav: this._vs.fav, ov: this._vs.ov }));
    } catch (e) { return false; }
    this._dirty = false;
    this._syncSaveBtn();
    this._pushPhone();
    return true;
  };

  /* 手が止まって 0.8 秒後に保存（スマホモード中は枠と実機へ早く届けるため 0.15 秒）。ドラッグの途中では書かない */
  Panel.prototype._scheduleSave = function () {
    var self = this;
    clearTimeout(this._saveT);
    if (!this._canWrite()) return;
    var delay = this._phoneOn ? 150 : this.autosaveDelay;
    this._saveT = setTimeout(function () {
      if (self._dragging) { self._savePending = true; return; }
      self.save();
    }, delay);
  };
  Panel.prototype._dragStart = function () {
    var self = this;
    this._dragging = true;
    var up = function () {
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      self._dragging = false;
      if (self._savePending) { self._savePending = false; self._scheduleSave(); }
    };
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  };

  /* ---------- パネルの位置・大きさ・開いていた箱 ---------- */

  Panel.prototype._saveUI = function () {
    if (!this._ready || !this._canWrite() || this._sheet) return;
    if (this.el.classList.contains('tp-hide')) return;
    var r = this.el.getBoundingClientRect();
    if (!innerWidth || !innerHeight || r.width < 120) return;
    var ui = { v: 2, tab: this._activeTab, cats: this._catOpen, w: this._openW, h: this._openH, closed: this.el.classList.contains('closed'), scroll: this.body.scrollTop };
    if (this._moved) ui.pos = { x: Math.round(r.left), y: Math.round(r.top) };
    try { localStorage.setItem(this._uKey(), JSON.stringify(ui)); } catch (e) {}
  };
  Panel.prototype._loadUI = function () {
    var ui = null;
    if (this.storageKey) { try { ui = JSON.parse(localStorage.getItem(this._uKey())); } catch (e) {} }
    if (!isObj(ui)) ui = {};
    var size = this.cfg.size || {};
    this._openW = (ui.w > 120 ? ui.w : 0) || size.w || 450;
    this._openH = (ui.h > 80 ? ui.h : 0) || size.h || 520;
    if (!ui.v && ui.w === 360 && !ui.w450) this._openW = 450;   /* 旧既定 360px のままの保存値は 450px へ */
    if (isObj(ui.cats)) this._catOpen = ui.cats;
    this._activeTab = typeof ui.tab === 'string' ? ui.tab : null;
    this._restoreScroll = ui.scroll || 0;
    this._closedAtLoad = ui.closed !== undefined ? !!ui.closed : !!this.cfg.startClosed;
    var pos = isObj(ui.pos) ? ui.pos : (typeof ui.x === 'number' ? { x: ui.x, y: ui.y } : null);
    this._applyPosition(pos);
  };
  Panel.prototype._applyPosition = function (pos) {
    var s = this.el.style;
    if (this._sheet) { s.left = s.top = s.right = s.bottom = s.transform = s.width = s.height = ''; return; }
    s.width = this._openW + 'px';
    s.height = this._openH + 'px';
    if (pos && isFinite(pos.x) && isFinite(pos.y)) { this._place(pos.x, pos.y); this._moved = true; return; }
    var P = isObj(this.cfg.position) ? this.cfg.position : {};
    s.left = s.top = s.right = s.bottom = 'auto'; s.transform = 'none';
    /* 既定は AnyFlow と同じ「画面の左・上下中央」（右下の隠しボックスと重ならない） */
    if (P.left !== undefined) s.left = P.left + 'px'; else if (P.right !== undefined) s.right = P.right + 'px'; else s.left = '24px';
    if (P.top !== undefined) s.top = P.top + 'px';
    else if (P.bottom !== undefined) s.bottom = P.bottom + 'px';
    else { s.top = '50%'; s.transform = 'translateY(-50%)'; }
  };
  /* 下へははみ出してよい（見出しの帯が画面に残る所まで）。横は 120px 残す */
  Panel.prototype._place = function (x, y) {
    var s = this.el.style, w = this.el.offsetWidth || this._openW, hh = this.head.offsetHeight || 46;
    if (innerWidth > 0 && innerHeight > 0) {
      x = Math.min(Math.max(0, x), Math.max(0, innerWidth - Math.min(w, 120)));
      y = Math.min(Math.max(0, y), Math.max(8, innerHeight - hh - 8));
    }
    s.left = x + 'px'; s.top = y + 'px'; s.right = 'auto'; s.bottom = 'auto'; s.transform = 'none';
  };
  /* 開いた時に下へ入りきらなければ、入る範囲で上へ持ち上げる */
  Panel.prototype._openDownward = function () {
    if (this._sheet) return;
    var s = this.el.style;
    if (!s.top || s.top === 'auto' || s.top.indexOf('%') >= 0) return;
    var top = parseFloat(s.top);
    if (!isFinite(top)) return;
    var h = this.el.offsetHeight, room = (innerHeight || 0) - top - 8;
    if (h <= room) return;
    var up = Math.max(0, Math.min(h - room, top - 8));
    if (up > 0) s.top = (top - up) + 'px';
  };

  /* ---------- 枠組み ---------- */

  Panel.prototype._buildShell = function () {
    var self = this, n = this._n;
    var root = this.el = el('div', 'tp' + (this.cfg.theme === 'dark' ? ' dark' : '') + (this._sheet ? ' tp-sheet' : ''));
    root.id = 'tp-panel-' + n;
    root.setAttribute('data-lenis-prevent', '');
    var grip = this.grip = el('div', 'tp-grip');
    var head = this.head = el('div', 'tp-head');
    var title = el('span', 'tp-title');
    title.textContent = this.cfg.title || '調整パネル';
    var sub = el('span', 'tp-head-sub');
    sub.textContent = 'クリックで開く';
    title.appendChild(sub);
    var btns = el('span', 'tp-head-btns');
    var pb = this.phoneBtn = el('button', 'tp-head-btn tp-phone-btn');
    pb.type = 'button'; pb.id = 'tp-phone-' + n; pb.textContent = '📱 スマホモード';
    pb.title = 'スマホ用の値を触るモード（もう一度押すと戻る）';
    pb.hidden = true;
    /* ✏️ 編集（ページの要素を直接ドラッグ）はプロダクトごとに作る物。onEdit を渡した時だけボタンを出す */
    var eb = this.editBtn = el('button', 'tp-head-btn tp-edit-btn');
    eb.type = 'button'; eb.textContent = '✏️ 編集'; eb.hidden = typeof this.cfg.onEdit !== 'function';
    eb.addEventListener('click', function (e) {
      e.stopPropagation();
      self._setEdit(!eb.classList.contains('on'));
    });
    btns.append(pb, eb);
    var chev = el('span', 'tp-chev');
    chev.textContent = '▲';
    chev.title = '開閉';
    head.append(title, btns, chev);
    var banner = this.banner = el('div', 'tp-banner');
    banner.innerHTML = '<span>📱 <b>スマホモード</b>：いま触った値はスマホだけに効きます（PCの値は変わりません）</span>';
    var body = this.body = el('div', 'tp-body');
    body.id = 'tp-body-' + n;
    body.setAttribute('data-lenis-prevent', '');
    var toast = this.toast = el('div', 'tp-toast');
    root.append(grip, head, banner, body, toast);
    ['t', 'b', 'l', 'r'].forEach(function (side) {
      var z = el('div', 'tp-z tp-z-' + side);
      z.addEventListener('pointerdown', function (e) { self._edgeResize(side, e); });
      root.appendChild(z);
    });
    (this.cfg.mount || document.body).appendChild(root);

    chev.addEventListener('click', function (e) { e.stopPropagation(); self.toggle(); });
    [pb, eb].forEach(function (b) { b.addEventListener('pointerdown', function (e) { e.stopPropagation(); }); });

    /* 見出しの帯、または中身の何も無い所をつかんで移動（つまみやボタンの上では動かない）。
       動かさずに見出しを押しただけなら開閉する */
    var isControl = function (t) {
      return !!(t && t.closest && t.closest('input,button,select,textarea,a,.tp-val,.tp-z,.tp-tabs,.tp-pill,.tp-pill-x,.tp-seg,.tp-chips,.tp-rst,.tp-gbtn,.tp-custom'));
    };
    var d = null;
    var onDown = function (e) {
      if (self._sheet || e.button !== 0 || isControl(e.target)) return;
      var r = root.getBoundingClientRect();
      d = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false, fromHead: e.currentTarget === head };
    };
    var onMove = function (e) {
      if (!d) return;
      var dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) <= 3) return;
      if (!d.moved) { d.moved = true; self._moved = true; try { window.getSelection().removeAllRanges(); } catch (er) {} }
      self._place(d.ox + dx, d.oy + dy);
      e.preventDefault();
    };
    var onUp = function () {
      if (!d) return;
      var moved = d.moved, fromHead = d.fromHead;
      d = null;
      if (moved) { self._justMoved = true; setTimeout(function () { self._justMoved = false; }, 0); self._saveUI(); }
      else if (fromHead) self.toggle();
    };
    head.addEventListener('pointerdown', onDown);
    body.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    /* 動かした直後のクリック（箱の開閉など）は起こさない */
    root.addEventListener('click', function (e) { if (self._justMoved) { e.stopPropagation(); e.preventDefault(); } }, true);
    this._offs = [function () { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }];

    /* 右下の角（標準の resize）で変えた大きさを覚える */
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        if (self._sheet || root.classList.contains('closed') || root.classList.contains('tp-hide')) return;
        if (root.offsetWidth < 120 || root.offsetHeight < 80) return;
        self._openW = root.offsetWidth; self._openH = root.offsetHeight;
        clearTimeout(self._roT);
        self._roT = setTimeout(function () { self._saveUI(); }, 300);
      });
      ro.observe(root);
      this._ro = ro;
    }
    body.addEventListener('scroll', function () {
      clearTimeout(self._scT);
      self._scT = setTimeout(function () { self._saveUI(); }, 300);
    });
    if (this._sheet) this._initSheet();
  };

  /* 辺をつかんでの大きさ変更。上と左は「つかんだ辺を動かす」ので位置も一緒に動かす */
  Panel.prototype._edgeResize = function (side, e) {
    var self = this, root = this.el;
    if (this._sheet || root.classList.contains('closed')) return;
    e.preventDefault(); e.stopPropagation();
    var r = root.getBoundingClientRect();
    this._place(r.left, r.top);
    var sx = e.clientX, sy = e.clientY, w0 = r.width, h0 = r.height, x0 = r.left, y0 = r.top, MIN_W = 240, MIN_H = 120;
    var move = function (ev) {
      var dx = ev.clientX - sx, dy = ev.clientY - sy, w = w0, h = h0, x = x0, y = y0;
      if (side === 'r') w = w0 + dx;
      if (side === 'b') h = h0 + dy;
      if (side === 'l') { w = w0 - dx; x = x0 + dx; }
      if (side === 't') { h = h0 - dy; y = y0 + dy; }
      if (w < MIN_W) { if (side === 'l') x = x0 + (w0 - MIN_W); w = MIN_W; }
      if (h < MIN_H) { if (side === 't') y = y0 + (h0 - MIN_H); h = MIN_H; }
      root.style.width = w + 'px'; root.style.height = h + 'px';
      root.style.left = x + 'px'; root.style.top = y + 'px';
    };
    var up = function () {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      self._openW = root.offsetWidth; self._openH = root.offsetHeight; self._moved = true;
      self._saveUI();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  /* スマホ：画面下からせり上がるシート。上のつまみを上下にスワイプ＝見出しだけ／画面の半分／しまう */
  Panel.prototype._initSheet = function () {
    var self = this, root = this.el, grip = this.grip;
    var drag = null;
    var peekPx = function () { return (grip.offsetHeight || 14) + (self.head.offsetHeight || 40); };
    var peekTY = function () { return Math.max(0, (root.getBoundingClientRect().height || 1) - peekPx()); };
    this._syncPeek = function () { root.style.setProperty('--tp-peek', peekPx() + 'px'); };
    grip.addEventListener('pointerdown', function (e) {
      var st = root.classList.contains('open') ? 0 : peekTY();
      drag = { y: e.clientY, st: st, cur: st };
      root.classList.add('dragging'); root.classList.remove('open');
      root.style.transform = 'translateY(' + st + 'px)';
      try { grip.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault(); e.stopPropagation();
    });
    grip.addEventListener('pointermove', function (e) {
      if (!drag) return;
      drag.cur = Math.max(0, Math.min(peekTY() + 90, drag.st + (e.clientY - drag.y)));
      root.style.transform = 'translateY(' + drag.cur + 'px)';
      e.preventDefault();
    });
    var end = function (e) {
      if (!drag) return;
      var p = peekTY(), dy = ((e && e.clientY) || drag.y) - drag.y, cur = drag.cur;
      drag = null;
      root.classList.remove('dragging');
      root.style.transform = '';
      if (cur > p + 40 && dy > 40) self._show(false);          /* 見出しだけの位置からさらに下げた → しまう */
      else if (cur < p * 0.5) root.classList.add('open');    /* 半分より上げた → 画面の半分まで */
      else root.classList.remove('open');                      /* それ以外 → 見出しだけ */
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    window.addEventListener('resize', function () { if (self._syncPeek) self._syncPeek(); });
  };

  /* ---------- 隠しモード ----------
     ページを開いた時・リロードした時は必ず隠れている。右下の透明な四角で出す／隠す（全パネル共通の1つ） */
  Panel.prototype._initSecret = function () {
    var self = this;
    this._secret = this.cfg.secret !== false;
    if (this._inner) { this.el.classList.add('tp-hide'); return; }
    if (!this._secret) {
      this._shown = true;
      this.el.classList.toggle('closed', !this._sheet && !!this._closedAtLoad);
      this._afterShow();
    } else {
      this._shown = false;
      this.el.classList.add('tp-hide');
      if (!TP.hot) {
        var hot = TP.hot = el('div', 'tp-hot');
        hot.setAttribute('aria-hidden', 'true');
        hot.addEventListener('click', function () {
          var any = TP.panels.some(function (p) { return p._secret && p._shown; });
          TP.panels.forEach(function (p) { if (p._secret && !p._inner) p._show(!any); });
        });
        document.body.appendChild(hot);
      }
    }
    var key = this.cfg.hotkey === undefined ? '.' : this.cfg.hotkey;
    if (key) {
      this._onKey = function (e) {
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (e.key === key && !e.metaKey && !e.ctrlKey && !e.altKey) self._show(!self._shown);
      };
      window.addEventListener('keydown', this._onKey);
    }
  };
  Panel.prototype._show = function (on) {
    on = !!on;
    this._shown = on;
    this.el.classList.toggle('tp-hide', !on);
    if (!on) { if (this.editBtn.classList.contains('on')) this._setEdit(false); return; }
    /* 出した時はアコーディオンが開いた状態（スマホは見出しだけの位置から） */
    if (this._sheet) { this.el.classList.remove('open'); }
    else { this.el.classList.remove('closed'); this.el.style.width = this._openW + 'px'; this.el.style.height = this._openH + 'px'; }
    this._afterShow();
  };
  Panel.prototype._afterShow = function () {
    var self = this;
    loadPanelFont(this.cfg);
    if (this._restoreScroll) { this.body.scrollTop = this._restoreScroll; this._restoreScroll = 0; }
    if (this._syncPeek) this._syncPeek();
    this._centerTab();
    requestAnimationFrame(function () { self._openDownward(); if (self._syncPeek) self._syncPeek(); });
  };
  Panel.prototype._setEdit = function (on) {
    this.editBtn.classList.toggle('on', !!on);
    this.editBtn.textContent = on ? '✏️ 編集中' : '✏️ 編集';
    try { if (typeof this.cfg.onEdit === 'function') this.cfg.onEdit(!!on, this); } catch (e) {}
  };

  /* ---------- 組み立て ---------- */

  /* タブ（または案ごとの大見出し）の中の書き方を、見出しのかたまりに読み替える。
     { sub } は「次の見出しまで」、{ sub, deep:true } は一段内側（次の見出しまで）、
     { sub, items:[…] } と { subgroup, items:[…] } は中身をはっきり入れ子で書く（閉じ忘れが起きない） */
  Panel.prototype._parseList = function (items) {
    var self = this, out = [], cur = null, deep = null;
    var implicit = function () { var s = { t: 'sec', implicit: true, item: {}, kids: [] }; out.push(s); return s; };
    (items || []).forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      if (it.varsec !== undefined) {
        out.push({ t: 'vs', title: String(it.varsec), item: it, kids: self._parseList(it.items || []) });
        cur = deep = null; return;
      }
      if (it.sub !== undefined) {
        var title = String(it.sub).replace(/<[^>]*>/g, '');
        if (Array.isArray(it.items)) {
          if (it.deep && cur) { cur.kids.push({ t: 'deep', title: title, item: it, kids: self._parseInner(it.items) }); deep = null; return; }
          out.push({ t: 'sec', title: title, item: it, kids: self._parseInner(it.items) });
          cur = deep = null; return;
        }
        if (it.deep) {
          if (!cur) cur = implicit();
          deep = { t: 'deep', title: title, item: it, kids: [] };
          cur.kids.push(deep); return;
        }
        cur = { t: 'sec', title: title, item: it, kids: [] };
        out.push(cur); deep = null; return;
      }
      if (it.pills !== undefined && !cur) {   /* 見出しより前の案ピル＝そのタブの主役の案 */
        out.push({ t: 'sec', implicit: true, varPills: true, item: {}, kids: [self._leaf(it)] });
        return;
      }
      var node = self._leaf(it);
      if (!node) return;
      if (!cur) cur = implicit();
      (deep || cur).kids.push(node);
    });
    return out;
  };
  Panel.prototype._parseInner = function (items) {
    var self = this, kids = [], deep = null;
    (items || []).forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      if (it.sub !== undefined) {
        var d = { t: 'deep', title: String(it.sub).replace(/<[^>]*>/g, ''), item: it, kids: Array.isArray(it.items) ? self._parseInner(it.items) : [] };
        kids.push(d); deep = Array.isArray(it.items) ? null : d; return;
      }
      var node = self._leaf(it);
      if (!node) return;
      (deep ? deep.kids : kids).push(node);
    });
    return kids;
  };
  Panel.prototype._leaf = function (it) {
    if (it.subgroup !== undefined) return { t: 'subg', title: it.subgroup == null ? '' : String(it.subgroup), item: it, kids: this._parseInner(it.items || []) };
    if (it.note !== undefined) return { t: 'note', item: it };
    if (typeof it.custom === 'function') return { t: 'custom', item: it };
    if (it.button !== undefined) return { t: 'button', item: it };
    var type = it.slider !== undefined ? 'slider' : it.seg !== undefined ? 'seg' : it.pills !== undefined ? 'pills'
      : it.toggle !== undefined ? 'toggle' : it.chips !== undefined ? 'chips' : it.select !== undefined ? 'select'
      : it.color !== undefined ? 'color' : it.text !== undefined ? 'text' : null;
    return type ? { t: 'row', type: type, item: it } : null;
  };

  /* 見出しのかたまりがどのカテゴリに入るか */
  Panel.prototype._grpOf = function (n) {
    if (n.varPills) return 'variation';
    var g = normGrp(n.item && n.item.grp);
    if (g) return g;
    var labels = [], real = false, pills = false;
    var walk = function (k) {
      if (k.t === 'row') { real = true; if (k.type === 'pills') pills = true; labels.push(labelOfItem(k.item)); if (k.type === 'chips') (k.item.items || []).forEach(function (c) { labels.push(c && c.name); }); }
      else if (k.t === 'button' || k.t === 'custom') real = true;
      if (k.t === 'deep' || k.t === 'subg') labels.push(k.title);
      (k.kids || []).forEach(walk);
    };
    (n.kids || []).forEach(walk);
    if (n.implicit && !real) return 'top';
    if (!n.implicit) { var t = grpFromText(n.title); if (t) return t; }
    var count = {}, best = null;
    labels.forEach(function (l) { var x = grpFromText(l); if (x && x !== 'variation') count[x] = (count[x] || 0) + 1; });
    GRP_ORDER.forEach(function (x) { if (count[x] && (!best || count[x] > count[best])) best = x; });
    if (best) return best;
    return pills ? 'variation' : 'other';
  };

  Panel.prototype._render = function () {
    var self = this;
    var keepScroll = this.body.scrollTop;
    this.body.textContent = '';
    this._rows = []; this.rows = []; this._accs = []; this._ctls = []; this._tabs = [];
    var schema = typeof this.cfg.schema === 'function' ? this.cfg.schema(this.params) : (this.cfg.schema || []);
    var cats = (schema || []).filter(function (c) { return c && typeof c === 'object'; });
    var tabbed = this.cfg.tabs !== false && cats.length > 1;
    var bar = this._tabBar = null;
    if (tabbed) {
      bar = this._tabBar = el('div', 'tp-tabs');
      var sbT = 0;
      bar.addEventListener('scroll', function () {
        bar.classList.add('is-scrolling');
        clearTimeout(sbT);
        sbT = setTimeout(function () { bar.classList.remove('is-scrolling'); }, 800);
      }, { passive: true });
      this.body.appendChild(bar);
    }
    cats.forEach(function (cat, i) {
      var title = String(cat.cat || cat.title || ('タブ' + (i + 1)));
      var pane = el('div', 'tp-pane');
      pane.dataset.tab = title;
      if (!tabbed && cats.length > 1) { var h = el('div', 'tp-pane-title'); h.textContent = title; pane.appendChild(h); }
      self.body.appendChild(pane);
      var tv = { el: pane, kids: [], test: typeof cat.when === 'function' ? function () { return !!cat.when(self._vp()); } : null, pane: true };
      var scope = { kind: 'tab', tabPills: [], parent: null, title: title };
      self._renderNodes(pane, self._parseList(cat.items || []), tv, scope, title, false);
      var btn = null;
      if (tabbed) {
        btn = el('button', 'tp-tab');
        btn.type = 'button';
        btn.textContent = title.split('（')[0].trim() || title;
        btn.title = title;
        btn.dataset.tab = title;
        btn.addEventListener('click', function () { self._showTab(title); });
        bar.appendChild(btn);
      }
      self._tabs.push({ title: title, pane: pane, btn: btn, v: tv });
    });
    this.foot = el('div', 'tp-foot');
    this.body.appendChild(this.foot);
    this._renderFoot();
    this._spacer = el('div', 'tp-spacer');
    this.body.appendChild(this._spacer);
    var titles = this._tabs.map(function (t) { return t.title; });
    if (titles.indexOf(this._activeTab) < 0) this._activeTab = titles[0] || null;
    if (tabbed) this._showTab(this._activeTab, { keepScroll: true, quiet: true });
    else this._tabs.forEach(function (t) { t.pane.classList.add('on'); });
    this.body.scrollTop = keepScroll;
  };

  /* タブ（または案ごとの大見出し）の中身を、カテゴリ順に並べ替えて置く */
  Panel.prototype._renderNodes = function (container, nodes, parentV, scope, prefix, nested) {
    var self = this, buckets = { top: [] }, vss = [];
    GRP_ORDER.forEach(function (g) { buckets[g] = []; });
    nodes.forEach(function (n) { if (n.t === 'vs') vss.push(n); else buckets[self._grpOf(n)].push(n); });
    buckets.top.forEach(function (n) { self._renderSection(n, container, parentV, scope); });
    GRP_ORDER.forEach(function (g) {
      var list = buckets[g];
      if (!list.length) return;
      if (g === 'variation') {
        /* 案ごとの大見出しの中では「バリエーション」の見出しを出さず、大見出しのすぐ下に案ピルを置く */
        if (nested) { list.forEach(function (n) { self._renderSection(n, container, parentV, scope); }); return; }
        var cs = el('div', 'tp-cs var');
        cs.dataset.grp = g;
        var hd = el('div', 'tp-cs-head');
        hd.textContent = GRP_LABEL[g];
        var bd = el('div', 'tp-cs-body');
        cs.append(hd, bd);
        container.appendChild(cs);
        var cv = { el: cs, kids: [] };
        parentV.kids.push(cv);
        list.forEach(function (n) { self._renderSection(n, bd, cv, scope); });
        return;
      }
      var ckey = prefix + '::' + g;
      var card = el('div', 'tp-cs card');
      card.dataset.grp = g;
      if (self._catOpen[ckey] === false) card.classList.add('closed');   /* 既定は全部開く */
      var head = el('div', 'tp-cs-head');
      var lab = el('span');
      lab.textContent = GRP_LABEL[g];
      head.append(lab, el('span', 'tp-cs-chev'));
      head.addEventListener('click', function () {
        self._catOpen[ckey] = !card.classList.toggle('closed');
        self._saveUI();
      });
      var body = el('div', 'tp-cs-body');
      card.append(head, body);
      container.appendChild(card);
      var cv2 = { el: card, kids: [] };
      parentV.kids.push(cv2);
      list.forEach(function (n) { self._renderSection(n, body, cv2, scope); });
    });
    vss.forEach(function (vs) {
      var box = el('div', 'tp-vs');
      box.dataset.title = vs.title;
      var h = el('div', 'tp-vs-head');
      h.textContent = vs.title;
      var b = el('div', 'tp-vs-body');
      box.append(h, b);
      container.appendChild(box);
      var vv = { el: box, kids: [], test: self._cond(vs.item, null, true) };
      parentV.kids.push(vv);
      var sc = { kind: 'vs', tabPills: [], parent: scope, title: scope.title };
      self._renderNodes(b, vs.kids, vv, sc, prefix + '::' + vs.title, true);
    });
  };

  /* H2＝モノの見出し（見出しの無いかたまりは中身だけ） */
  Panel.prototype._renderSection = function (n, into, parentV, scope) {
    var self = this;
    var sec = el('div', 'tp-sec' + (n.implicit ? ' bare' : ''));
    var head = null, titleEl = null;
    if (!n.implicit) {
      head = el('div', 'tp-sec-head');
      titleEl = el('span');
      titleEl.textContent = n.title;
      head.appendChild(titleEl);
      sec.appendChild(head);
      sec.dataset.title = n.title;
    }
    var body = el('div', 'tp-sec-body');
    sec.appendChild(body);
    into.appendChild(sec);
    var ctx = { scope: scope, secPills: [], varPills: !!n.varPills, accs: [], rows: [], head: titleEl, tab: scope.title };
    var sv = { el: sec, kids: [], test: this._cond(n.item, ctx, true) };
    parentV.kids.push(sv);
    (n.kids || []).forEach(function (k) { self._renderNode(k, body, sv, ctx); });
    if (head && ctx.accs.some(function (a) { return !a.isPill; })) head.appendChild(this._groupBtn(ctx, n.title));
  };

  var KIND = { slider: 'v', color: 'v', text: 'v', seg: 's', toggle: 's', chips: 's', select: 's', pills: 'p' };

  Panel.prototype._renderNode = function (k, into, parentV, ctx) {
    var self = this, v;
    if (k.t === 'deep' || k.t === 'subg') {
      var box = el('div', k.t === 'deep' ? 'tp-deep' : 'tp-subg');
      if (k.title) {
        var h = el('div', k.t === 'deep' ? 'tp-deep-head' : 'tp-subg-lab');
        h.textContent = k.title;
        box.appendChild(h);
      }
      box.dataset.title = k.title;
      var inner = el('div', k.t === 'deep' ? 'tp-deep-body' : 'tp-subg-body');
      box.appendChild(inner);
      into.appendChild(box);
      into._tpLast = null;
      v = { el: box, kids: [], test: this._cond(k.item, ctx) };
      parentV.kids.push(v);
      (k.kids || []).forEach(function (x) { self._renderNode(x, inner, v, ctx); });
      return;
    }
    if (k.t === 'note') {
      var nt = el('div', 'tp-note' + (k.item.keep ? ' keep' : ''));
      nt.textContent = k.item.note;
      into.appendChild(nt);
      parentV.kids.push({ el: nt, test: this._cond(k.item, ctx), note: !k.item.keep });
      if (!k.item.keep && ctx.head) ctx.head.title = (ctx.head.title ? ctx.head.title + '\n' : '') + k.item.note;
      return;
    }
    if (k.t === 'button') {
      var br = el('div', 'tp-btnrow tp-item');
      var b = el('button');
      b.type = 'button';
      b.textContent = k.item.button;
      if (k.item.primary) b.className = 'primary';
      if (k.item.hint) b.title = k.item.hint;
      b.addEventListener('click', function () { try { if (k.item.onClick) k.item.onClick(self); } catch (e) { console.error(e); } });
      br.appendChild(b);
      if (into._tpLast && into._tpLast !== 'b') br.classList.add('tp-gap');
      into._tpLast = 'b';
      into.appendChild(br);
      parentV.kids.push({ el: br, test: this._cond(k.item, ctx), author: true, inner: b });
      return;
    }
    if (k.t === 'custom') {
      var cw = el('div', 'tp-custom tp-item');
      into.appendChild(cw);
      if (into._tpLast) cw.classList.add('tp-gap');
      into._tpLast = 'c';
      try { k.item.custom(cw, this); } catch (e) { console.error(e); }
      parentV.kids.push({ el: cw, test: this._cond(k.item, ctx), author: true });
      return;
    }
    /* 値を持つ行 */
    var r = k.type === 'pills' ? this._pills(k.item, ctx) : this._row(k.item, k.type, ctx);
    if (!r) return;
    var wrap = r.el = el('div', 'tp-item');
    wrap.dataset.kind = k.type;
    if (r.accs[0]) wrap.dataset.key = r.accs[0].key;
    wrap.appendChild(r.line);
    if (k.item.hint && k.item.keep) {
      var hn = el('div', 'tp-hint keep');
      hn.textContent = k.item.hint;
      wrap.appendChild(hn);
    }
    var kind = KIND[k.type] || 'v';
    /* 違う種類の部品の前の 9px は、AnyFlow と同じく「ピルの列の前」だけ（CSS の .tp-favhead[hidden]~.tp-pills）。
       つまみ・2〜3択・チップ・色・文字の行どうしは詰める（2026-09-28 AnyFlow と実測で突き合わせて是正） */
    into._tpLast = kind;
    into.appendChild(wrap);
    var test = this._cond(k.item, ctx);
    if (r.ctl) {
      var ctl = r.ctl, t0 = test;
      /* 1案だけ残った欄は隠す。ただし消した案がある時は「↺ 消した案を戻す」だけ残す（2026-09-27 ヒデさん） */
      test = function () { return (!t0 || t0()) && (ctl.alive().length > 1 || ctl.restorable().length > 0); };
    }
    parentV.kids.push({ el: wrap, test: test });
  };

  /* 出し入れの条件（when・only・pcOnly・spOnly）。パネルは作り直さず、その部分だけ見せる／隠す */
  Panel.prototype._cond = function (item, ctx, isSection) {
    if (!item) return null;
    var self = this, tests = [];
    if (typeof item.when === 'function') tests.push(function () { return !!item.when(self._vp()); });
    if (item.only !== undefined && item.only !== null) {
      var list = (Array.isArray(item.only) ? item.only : [item.only]).map(String);
      tests.push(function () {
        var c = self._onlyOwner(item, ctx, isSection);
        return !c || list.indexOf(String(c.sel())) >= 0;
      });
    }
    if (item.pcOnly) tests.push(function () { return !self._spView(); });
    if (item.spOnly) tests.push(function () { return self._spView(); });
    if (!tests.length) return null;
    return function () {
      for (var i = 0; i < tests.length; i++) { try { if (!tests[i]()) return false; } catch (e) { return false; } }
      return true;
    };
  };
  Panel.prototype._ctlById = function (id) {
    return this._ctls.filter(function (c) { return c.id === String(id); })[0] || null;
  };
  Panel.prototype._onlyOwner = function (item, ctx, isSection) {
    if (item.onlyOf != null) return this._ctlById(item.onlyOf);
    if (!ctx) return null;
    if (!isSection && ctx.secPills.length) return ctx.secPills[0];
    var s = ctx.scope;
    while (s) { if (s.tabPills.length) return s.tabPills[0]; s = s.parent; }
    return null;
  };

  /* 項目ごとの値の入れ物を作る */
  Panel.prototype._mkAcc = function (item, kind, ctx) {
    var label = labelOfItem(item) || item.name || '';
    var key = item.path != null ? String(item.path) : ('k:' + (ctx.tab || '') + '/' + label);
    var a = new Acc(this, item, kind, key);
    a.ctx = ctx;
    this._accs.push(a);
    ctx.accs.push(a);
    return a;
  };

  /* どの案がこの項目を持つか。
     ①項目に variant:'<案ピルの path>' → その案 ②shared:true → 全案共通
     ③案ピルのある見出し（まとまり）の中 → その案 ④案ピルのあるタブ（案ごとの大見出し）の中 → その案 */
  Panel.prototype._assignOwners = function () {
    var self = this;
    this._ctls.forEach(function (c) { c.scope = []; });
    this._accs.forEach(function (a) {
      a.owner = null;
      var it = a.item, ctx = a.ctx, own = null;
      if (it.variant != null) own = self._ctlById(it.variant);
      else if (it.shared) own = null;
      else if (a.isPill && ctx.varPills) own = null;
      else {
        own = ctx.secPills.filter(function (c) { return c.acc !== a; })[0] || null;
        if (!own) {
          var s = ctx.scope;
          while (s) {
            var tp = s.tabPills.filter(function (c) { return c.acc !== a; })[0];
            if (tp) { own = tp; break; }
            if (s.tabPills.length) break;
            s = s.parent;
          }
        }
      }
      if (own && own.owns) { a.owner = own; own.scope.push(a); }
    });
    /* 1つのタブに主役の案ピルが2つ以上ある時だけ、ピルの上に名前を出す */
    this._ctls.forEach(function (c) {
      if (!c.lab) return;
      var sc = c.acc.ctx.scope;
      if (c.acc.ctx.varPills) c.lab.hidden = sc.tabPills.length < 2;
    });
  };

  /* ---------- 行 ---------- */

  Panel.prototype._lab = function (text, item) {
    var lab = el('label');
    lab.textContent = text;
    lab.title = item.hint || String(text);   /* 補足文は画面に出さず、項目名に乗せた吹き出しで読む */
    return lab;
  };
  Panel.prototype._rstBtn = function (getRow) {
    var self = this, b = el('button', 'tp-rst');
    b.type = 'button';
    b.textContent = '↺';
    b.title = 'このページを開いた時の値に戻す（スマホモード中はスマホ用の上書きを外す）';
    b.addEventListener('click', function (e) { e.stopPropagation(); self._resetRow(getRow()); });
    return b;
  };

  Panel.prototype._row = function (item, type, ctx) {
    var r = null;
    if (type === 'slider') r = this._slider(item, ctx);
    else if (type === 'seg') r = this._seg(item, ctx, false);
    else if (type === 'toggle') r = this._seg(item, ctx, true);
    else if (type === 'chips') r = this._chips(item, ctx);
    else if (type === 'select') r = this._select(item, ctx);
    else if (type === 'color') r = this._color(item, ctx);
    else if (type === 'text') r = this._text(item, ctx);
    if (!r) return null;
    r.item = item;
    r.mark = function () { r.line.classList.toggle('tp-mb', r.accs.some(function (a) { return a.hasMB(); })); };
    r.line._sync = function () { r.sync(); };
    this._rows.push(r);
    this.rows.push(r.line);
    ctx.rows.push(r);
    return r;
  };

  Panel.prototype._slider = function (item, ctx) {
    var self = this, acc = this._mkAcc(item, 'slider', ctx);
    var dMin = isFinite(+item.min) && item.min !== null ? +item.min : 0;
    var dMax = isFinite(+item.max) && item.max !== null ? +item.max : dMin + 1;
    var step = isFinite(+item.step) && +item.step > 0 ? +item.step : 0.01;
    var dec = decOf(step), signed = !!item.signed, fixed = !!(item.clamp || item.fixedRange);
    var line = el('div', 'tp-row');
    var lab = this._lab(item.slider, item);
    var input = el('input');
    input.type = 'range';
    var val = el('span', 'tp-val');
    val.title = 'クリックで数値を直接入力';
    var fmt = toFmt(item, step);
    var gk = gridKindOf(item, this.cfg);   /* デザインの数値の決まり（4-7）に止まる種類。null なら止めない */
    var snap = function (v) { return gk ? snapGrid(v, gk) : v; };
    var q = function (v) { return +(Math.round(v / step) * step).toFixed(dec); };
    var num = function (x) { var n = typeof x === 'number' ? x : parseFloat(x); return isFinite(n) ? n : NaN; };
    var setRange = function (lo, hi) { input.min = lo; input.max = hi; input.step = step; };
    /* 外から値が変わって範囲を出た時（案の切り替えなど）は、範囲を取り直して追いつく */
    var fit = function (v) {
      if (fixed) { setRange(dMin, dMax); return; }
      var lo = parseFloat(input.min), hi = parseFloat(input.max);
      if (!(isFinite(lo) && isFinite(hi) && v >= lo && v <= hi)) { var r = rangeFor(v, dMin, dMax, step, signed); setRange(r.lo, r.hi); }
    };
    var read = function () { var v = parseFloat(input.value); return isFinite(v) ? +v.toFixed(dec) : 0; };
    var v0 = num(acc.view());
    if (fixed) setRange(dMin, dMax);
    else { var r0 = rangeFor(isFinite(v0) ? v0 : dMin, dMin, dMax, step, signed); setRange(r0.lo, r0.hi); }
    var row = { line: line, accs: [acc], input: input, kind: 'slider', grid: gk };
    if (gk) line.dataset.grid = gk;
    row.sync = function () {
      var v = num(acc.view());
      if (isFinite(v)) { fit(v); input.value = v; }
      val.textContent = isFinite(v) ? fmt(v) : '–';
      row.mark();
    };
    input.addEventListener('pointerdown', function () { self._dragStart(); });
    input.addEventListener('input', function () {
      var v = snap(read());
      if (gk && +input.value !== v) input.value = v;
      acc.write(v);
      val.textContent = fmt(v);
      row.mark();
      self._changed({ item: item, path: item.path, value: v, immediate: !!item.immediate, row: row });
    });
    /* 端（1割）で手を離したら、そこを真ん中に範囲を取り直す（どこまでも広げられる） */
    input.addEventListener('change', function () {
      var v = snap(read());
      if (!fixed) {
        var lo = +input.min, hi = +input.max, k = hi > lo ? (v - lo) / (hi - lo) : 0.5;
        if (k < 0.1 || k > 0.9) {
          var r = rangeFor(v, dMin, dMax, step, signed), span = Math.max(r.hi - r.lo, hi - lo);
          var c = Math.min(Math.max(v, r.lo), r.hi), nlo = c - span / 2, nhi = c + span / 2;
          if (nlo < r.lo) { nlo = r.lo; nhi = nlo + span; }
          setRange(q(nlo), q(nhi));
          input.value = v;
        }
      }
      self._changed({ item: item, path: item.path, value: v, immediate: true, row: row });
    });
    /* 右の数値を押すと直接打ち込める（Enter／外を押すと決定、Esc で取り消し） */
    val.addEventListener('click', function (e) {
      e.stopPropagation();
      if (line.querySelector('.tp-num')) return;
      var ed = el('input', 'tp-num');
      ed.type = 'number';
      ed.step = step;
      ed.value = num(acc.view());
      val.style.display = 'none';
      line.insertBefore(ed, val);
      ed.focus(); ed.select();
      var closed = false;
      var done = function (commit) {
        if (closed) return;   /* Enter で消す時にも blur が来るので、2回目は何もしない */
        closed = true;
        var v = parseFloat(ed.value);
        if (ed.parentNode) ed.parentNode.removeChild(ed);
        val.style.display = '';
        if (!commit || !isFinite(v)) return;
        v = snap(+v.toFixed(Math.max(dec, decOf(v))));   /* 打ち込んだ数字も決まり（4-7）に止める */
        acc.write(v);
        row.sync();
        self._changed({ item: item, path: item.path, value: v, immediate: true, row: row });
      };
      ed.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false);
        ev.stopPropagation();
      });
      ed.addEventListener('blur', function () { done(true); });
    });
    line.append(lab, input, val, this._rstBtn(function () { return row; }));
    return row;
  };

  /* 2〜3択（seg）と する/しない（toggle）。どちらも黒の2〜3択ボタン */
  Panel.prototype._seg = function (item, ctx, isToggle) {
    var self = this, acc = this._mkAcc(item, isToggle ? 'toggle' : 'seg', ctx);
    var labels = Array.isArray(item.labels) ? item.labels : [];
    var opts = isToggle
      ? [{ name: labels[0] || 'する', value: true }, { name: labels[1] || 'しない', value: false }]
      : normOptions(item.options);
    if (!isToggle) acc.enumOpts = opts;
    var line = el('div', 'tp-row seg');
    var lab = this._lab(isToggle ? item.toggle : item.seg, item);
    var box = el('div', 'tp-seg');
    var row = { line: line, accs: [acc], kind: isToggle ? 'toggle' : 'seg' };
    var btns = opts.map(function (o) {
      var b = el('button');
      b.type = 'button';
      b.textContent = o.name;
      b.dataset.value = String(o.value);
      b.addEventListener('click', function () {
        var v = o.value;
        if (isToggle) { var d = acc.def(); if (typeof d === 'number') v = o.value ? 1 : 0; }
        acc.write(v);
        row.sync();
        self._changed({ item: item, path: item.path, value: v, immediate: true, row: row });
        self._maybeRebuild();
      });
      box.appendChild(b);
      return [b, o.value];
    });
    row.sync = function () {
      var cur = acc.view();
      btns.forEach(function (p) { p[0].classList.toggle('on', isToggle ? (!!cur === p[1]) : String(cur) === String(p[1])); });
      row.mark();
    };
    if (item.seg === '' || item.toggle === '') lab.style.display = 'none';
    line.append(lab, box, this._rstBtn(function () { return row; }));
    return row;
  };

  /* チップ：表示・非表示をいくつも1行に並べる。{ chips:'表示', items:[{ name, path }] } */
  Panel.prototype._chips = function (item, ctx) {
    var self = this;
    var list = (item.items || []).filter(Boolean);
    var accs = list.map(function (c) {
      return self._mkAcc({ path: c.path, get: c.get, set: c.set, name: c.name, hint: c.hint, shared: item.shared, variant: item.variant, sp: item.sp, spDefault: c.spDefault }, 'chip', ctx);
    });
    var line = el('div', 'tp-row seg');
    var lab = this._lab(item.chips, item);
    var box = el('div', 'tp-chips');
    var row = { line: line, accs: accs, kind: 'chips' };
    var btns = list.map(function (c, i) {
      var b = el('button', 'tp-chip');
      b.type = 'button';
      b.textContent = c.name;
      b.dataset.key = accs[i].key;
      b.title = (c.hint || c.name) + '（押すと表示・非表示が切り替わります）';
      b.addEventListener('click', function () {
        var a = accs[i], cur = a.view(), d = a.def();
        var v = typeof d === 'number' ? (cur ? 0 : 1) : !cur;
        a.write(v);
        row.sync();
        self._changed({ item: item, path: c.path, value: v, immediate: true, row: row });
        self._maybeRebuild();
      });
      box.appendChild(b);
      return b;
    });
    row.sync = function () {
      btns.forEach(function (b, i) { b.classList.toggle('on', !!accs[i].view()); });
      row.mark();
    };
    line.append(lab, box, this._rstBtn(function () { return row; }));
    return row;
  };

  Panel.prototype._select = function (item, ctx) {
    var self = this, acc = this._mkAcc(item, 'select', ctx);
    var opts = acc.enumOpts = normOptions(item.options);
    var line = el('div', 'tp-row');
    var lab = this._lab(item.select, item);
    var sel = el('select');
    opts.forEach(function (o, i) {
      var op = el('option');
      op.value = String(i);
      op.textContent = o.name;
      sel.appendChild(op);
    });
    var row = { line: line, accs: [acc], kind: 'select' };
    row.sync = function () {
      var cur = String(acc.view());
      opts.forEach(function (o, i) { if (String(o.value) === cur) sel.value = String(i); });
      row.mark();
    };
    sel.addEventListener('change', function () {
      var o = opts[+sel.value];
      if (!o) return;
      acc.write(o.value);
      row.mark();
      self._changed({ item: item, path: item.path, value: o.value, immediate: true, row: row });
      self._maybeRebuild();
    });
    line.append(lab, sel, this._rstBtn(function () { return row; }));
    return row;
  };

  Panel.prototype._color = function (item, ctx) {
    var self = this, acc = this._mkAcc(item, 'color', ctx);
    var norm = function (v) { var m = /^#?([0-9a-f]{6})$/i.exec(String(v == null ? '' : v).trim()); if (m) return '#' + m[1].toLowerCase(); var m3 = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(String(v == null ? '' : v).trim()); return m3 ? ('#' + m3[1] + m3[1] + m3[2] + m3[2] + m3[3] + m3[3]).toLowerCase() : null; };
    var line = el('div', 'tp-row');
    var lab = this._lab(item.color, item);
    var inp = el('input');
    inp.type = 'color';
    var hex = el('input', 'tp-hex');
    hex.type = 'text';
    hex.maxLength = 7;
    hex.spellcheck = false;
    var row = { line: line, accs: [acc], kind: 'color' };
    row.sync = function () {
      var v = acc.view(), n = norm(v);
      if (n) inp.value = n;
      if (document.activeElement !== hex) hex.value = v == null ? '' : String(v);
      row.mark();
    };
    var apply = function (v, immediate) {
      acc.write(v);
      row.mark();
      self._changed({ item: item, path: item.path, value: v, immediate: immediate, row: row });
    };
    inp.addEventListener('input', function () { hex.value = inp.value; apply(inp.value, false); });
    inp.addEventListener('change', function () { apply(inp.value, true); });
    hex.addEventListener('change', function () { var n = norm(hex.value); if (n) { inp.value = n; apply(n, true); } else row.sync(); });
    line.append(lab, inp, hex, el('span', 'tp-fill'), this._rstBtn(function () { return row; }));
    return row;
  };

  Panel.prototype._text = function (item, ctx) {
    var self = this, acc = this._mkAcc(item, 'text', ctx);
    var line = el('div', 'tp-row' + (item.multiline ? ' col' : ''));
    var lab = this._lab(item.text, item);
    var inp = el(item.multiline ? 'textarea' : 'input');
    if (item.multiline) inp.rows = item.rows || 6; else inp.type = 'text';
    var row = { line: line, accs: [acc], kind: 'text' };
    row.sync = function () {
      var v = acc.view();
      if (document.activeElement !== inp) inp.value = v == null ? '' : String(v);
      row.mark();
    };
    inp.addEventListener('input', function () {
      acc.write(inp.value);
      row.mark();
      self._changed({ item: item, path: item.path, value: inp.value, immediate: false, row: row });
    });
    inp.addEventListener('change', function () { self._changed({ item: item, path: item.path, value: inp.value, immediate: true, row: row }); });
    line.append(lab, inp, this._rstBtn(function () { return row; }));
    return row;
  };

  /* ---------- 案ピル（水色）。⋯ メニュー／見えている順の番号／★の段／消した案を戻す ---------- */

  Panel.prototype._pills = function (item, ctx) {
    var self = this, acc = this._mkAcc(item, 'pills', ctx);
    acc.enumOpts = normOptions(item.options);
    var ctl = new Ctl(this, item, acc);
    acc.ctl = ctl;
    ctl.depth = ctx.varPills ? 0 : 1;
    this._ctls.push(ctl);
    (ctx.varPills ? ctx.scope.tabPills : ctx.secPills).push(ctl);
    var box = ctl.box = el('div', 'tp-var');
    var lab = ctl.lab = el('div', 'tp-var-lab');
    lab.textContent = item.pills || '';
    if (item.hint) lab.title = item.hint;
    lab.hidden = ctx.varPills || !item.pills;
    var favHead = el('div', 'tp-favhead');
    favHead.textContent = '★ ピン留め';
    var favRow = el('div', 'tp-pills tp-favrow');
    var rowEl = el('div', 'tp-pills');
    box.append(lab, favHead, favRow, rowEl);

    /* 番号：autoNum:false で番号なし／'案' で「案1」／{prefix,style:'alpha'} で「案A」。既定は「1 名前」 */
    var auto = item.autoNum === undefined ? { prefix: '', style: 'num' }
      : item.autoNum === false ? null
      : typeof item.autoNum === 'string' ? { prefix: item.autoNum, style: 'num' }
      : { prefix: item.autoNum.prefix || '', style: item.autoNum.style || 'num' };
    var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    /* 名前から頭の「案1」「1」などを外した残り（何も残らない時は空） */
    var rest = function (o) {
      var s = String(o.name);
      if (auto && auto.prefix) s = s.replace(new RegExp('^' + escRe(auto.prefix) + '\\s*[0-9A-Za-z]+\\s*'), '');
      return s.replace(/^(\d+(?:-\d+)?|[A-Za-z]{1,2}\d{0,2})\s+/, '').trim();
    };
    var plain = function (o) { return rest(o) || String(o.name); };
    var numbered = function (n, o) {
      if (!auto) return plain(o);
      var mark = auto.style === 'alpha' ? (ALPHA[n - 1] || String(n)) : String(n);
      var head = auto.prefix ? auto.prefix + mark : mark;
      var r = rest(o);
      /* 名前が「案1」だけの時は、番号の後ろに名前をもう一度付けない（「案1 案1」になっていた・2026-09-28 ヒデさん指摘） */
      return r ? head + ' ' + r : head;
    };
    var mk = function (o, label, target, isFav) {
      var k = String(o.value), on = k === String(ctl.sel());
      var b = el('button', 'tp-pill' + (on ? ' on' : '') + (isFav ? ' fav' : '') + (item.fixedOptions ? ' nox' : ''));
      b.type = 'button';
      b.dataset.value = k;
      b.dataset.label = label;
      b.title = plain(o) + (o.desc ? ' — ' + o.desc : '') + '（ID ' + k + '）' + (ctl.custom(o.value) ? '（⤓ 上書き済み・⋯から解除できます）' : '');
      if (o.swatch) { var sw = el('span', 'tp-swatch'); sw.style.background = o.swatch; b.appendChild(sw); }
      b.appendChild(document.createTextNode(label));
      b.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('.tp-pill-x')) return;
        self._choose(ctl, o.value, box);
      });
      if (!item.fixedOptions) {
        var x = el('span', 'tp-pill-x');
        x.setAttribute('role', 'button');
        x.tabIndex = 0;
        x.textContent = '⋯';
        x.title = 'ピン留め / この設定で上書き / 削除';
        x.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); self._pillMenu(ctl, o, label, x); });
        b.appendChild(x);
      }
      target.appendChild(b);
    };
    var row = { line: box, accs: [acc], ctl: ctl, kind: 'pills', item: item };
    var fill = function () {
      var st = ctl.st(), opts = ctl.opts(), alive = ctl.alive();
      rowEl.textContent = '';
      favRow.textContent = '';
      var pinned = st.fav.map(function (k) { return alive.filter(function (o) { return String(o.value) === k; })[0]; }).filter(Boolean);
      favHead.hidden = favRow.hidden = !pinned.length;
      /* 「現行」（fixed）は先頭・番号なし → ★は別の段で ★1, ★2… → 残りは見えている順に 1, 2, 3… */
      alive.forEach(function (o) { if (o.fixed && pinned.indexOf(o) < 0) mk(o, plain(o), rowEl, false); });
      pinned.forEach(function (o, i) { mk(o, '★' + (i + 1) + ' ' + plain(o), favRow, true); });
      var n = 0;
      alive.forEach(function (o) { if (o.fixed || pinned.indexOf(o) >= 0) return; n++; mk(o, numbered(n, o), rowEl, false); });
      var restorable = ctl.restorable();
      box.classList.toggle('only-back', alive.length === 1 && restorable.length > 0);   /* 1案＋消した案あり＝戻すボタンだけ */
      if (restorable.length) {
        var back = el('button', 'tp-pill back');
        back.type = 'button';
        back.textContent = '↺ 消した案を戻す (' + restorable.length + ')';
        back.addEventListener('click', function () {
          var names = restorable.map(function (k) { var o = ctl.opt(k); return o ? plain(o) : k; });
          self._pick('消した案を戻す', '戻したい案の「戻す」を押してください。まとめて全部は戻しません。', names, function (nm, idx) {
            self._restoreVariant(ctl, restorable[idx]);
          });
        });
        rowEl.appendChild(back);
      }
      /* 1案だけ残った欄は、その案を既定にする（欄は隠れる） */
      if (alive.length === 1 && String(alive[0].value) !== String(ctl.sel()) && !ctl._fixing) {
        ctl._fixing = true;
        setTimeout(function () { ctl._fixing = false; self._choose(ctl, alive[0].value); }, 0);
      }
    };
    ctl.fill = fill;
    row.sync = fill;
    row.mark = function () {};
    this._rows.push(row);
    ctx.rows.push(row);
    return row;
  };

  Panel.prototype._fillPills = function () { this._ctls.forEach(function (c) { if (c.fill) c.fill(); }); };

  /* 案を選ぶ。離れる案の値を控えてから、選んだ案の控え（無ければその案の最初の値）を重ねる */
  Panel.prototype._choose = function (ctl, v, anchor) {
    var self = this, K = String;
    var o = ctl.opt(v);
    if (!o) return;
    var cur = ctl.sel();
    if (K(cur) === K(o.value)) return;
    var run = function () {
      var inner = self._ctls.filter(function (c) { return c.acc.owner === ctl; });
      var innerOld = inner.map(function (c) { return K(c.sel()); });
      var st = ctl.st();
      if (ctl.owns) st.ov[K(cur)] = ctl.capture();
      ctl.acc.writePC(o.value);
      if (ctl.owns) ctl.apply(st.ov[K(o.value)] || null, o.value);
      /* 中にある別の案ピルの選択が変わったら、その案の値も入れ替える */
      inner.forEach(function (c, i) {
        var now = K(c.sel());
        if (now === innerOld[i] || !c.owns) return;
        var s2 = c.st();
        s2.ov[innerOld[i]] = c.capture();
        c.apply(s2.ov[now] || null, now);
      });
      self._vpCache = null;
      self.sync();
      self._applyVisibility();
    };
    if (anchor) this._stabilize(anchor, run); else run();
    this._changed({ item: ctl.item, path: ctl.item.path, value: o.value, immediate: true, variant: true });
    this._maybeRebuild();
  };

  /* 切り替えより上の行を動かさない。出し入れで中身が縮んでスクロール位置が押し戻された時は、下に余白を足して保つ */
  Panel.prototype._stabilize = function (anchor, fn) {
    var b = this.body;
    if (!anchor || !anchor.isConnected || this.el.classList.contains('tp-hide')) { fn(); return; }
    var before = anchor.getBoundingClientRect().top;
    fn();
    if (!anchor.isConnected) return;
    var d = anchor.getBoundingClientRect().top - before;
    if (Math.abs(d) < 0.5) return;
    var need = b.scrollTop + d, max = b.scrollHeight - b.clientHeight;
    if (need > max) this._spacer.style.height = ((parseFloat(this._spacer.style.height) || 0) + (need - max)) + 'px';
    b.scrollTop = need;
  };

  Panel.prototype._pillMenu = function (ctl, o, label, anchor) {
    var self = this, st = ctl.st(), k = String(o.value), fav = st.fav.indexOf(k) >= 0, entries = [];
    entries.push([fav ? '★ ピン留めを解除（元の位置に戻す）' : '★ お気に入りにピン留め', function () {
      if (fav) st.fav.splice(st.fav.indexOf(k), 1); else st.fav.push(k);
      ctl.fill(); self._touchVariants();
    }]);
    if (ctl.owns) {
      entries.push(['⤓ いまの設定で上書き', function () {
        st.ov[k] = ctl.capture();
        ctl.fill(); self._touchVariants();
        self.flash('「' + label + '」に、いまの設定を覚えさせました');
      }]);
      if (ctl.custom(o.value)) {
        entries.push(['↺ 上書きを解除（元の設定に戻す）', function () { self._clearOverride(ctl, o.value); }]);
      }
    }
    entries.push(['🗑 削除', function () { self._deleteVariant(ctl, o.value, label); }, 'danger']);
    this._menu(anchor, entries);
  };
  Panel.prototype._clearOverride = function (ctl, v) {
    var k = String(v);
    delete ctl.st().ov[k];
    if (String(ctl.sel()) === k) {
      ctl.apply(null, v);
      this._vpCache = null;
      this.sync();
      this._applyVisibility();
      this._changed({ item: ctl.item, path: ctl.item.path, value: v, immediate: true, variant: true });
    } else { ctl.fill(); this._touchVariants(); }
    this.flash('上書きを解除しました（コードの最初の値に戻ります）');
  };
  /* 削除＝一覧から隠す（戻せる）。最後の1案は消せない。選んでいた案を消したら残りの先頭へ */
  Panel.prototype._deleteVariant = function (ctl, v, label, opts) {
    var self = this, k = String(v);
    if (ctl.alive().length <= 1) {
      this._ask('削除できません', 'このまとまりの最後の1案です。欄そのものは消せません（消せるのは各案だけです）。', 'OK', null, true);
      return false;
    }
    var run = function () {
      var st = ctl.st();
      if (st.hidden.indexOf(k) < 0) st.hidden.push(k);
      var fi = st.fav.indexOf(k);
      if (fi >= 0) st.fav.splice(fi, 1);
      if (String(ctl.sel()) === k) { var a = ctl.alive()[0]; if (a) self._choose(ctl, a.value, ctl.box); }
      ctl.fill();
      self._applyVisibility();
      self._touchVariants();
    };
    if (opts && opts.noConfirm) { run(); return true; }
    this._ask('削除しますか？', '「' + (label || k) + '」を一覧から消します。以降の番号は自動で詰めます。あとで「↺ 消した案を戻す」で戻せます。', '削除する', run);
    return true;
  };
  Panel.prototype._restoreVariant = function (ctl, k) {
    var st = ctl.st(), i = st.hidden.indexOf(String(k));
    if (i >= 0) st.hidden.splice(i, 1);
    ctl.fill();
    this._applyVisibility();
    this._touchVariants();
  };
  /* 隠した案・★ などを変えた時（値は変わらない）は、保存だけ予約する */
  Panel.prototype._touchVariants = function () {
    if (!this._ready || !this._canWrite()) return;
    this._dirty = true;
    this._syncSaveBtn();
    this._scheduleSave();
  };

  /* 小さなメニュー（⋯ を押すと出る） */
  Panel.prototype._menu = function (anchor, entries) {
    var old = document.querySelector('.tp-pmenu');
    if (old) old.remove();
    var m = el('div', 'tp-pmenu');
    entries.forEach(function (e) {
      var b = el('button');
      b.type = 'button';
      b.textContent = e[0];
      if (e[2]) b.className = e[2];
      b.addEventListener('click', function (ev) { ev.stopPropagation(); m.remove(); e[1](); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
    m.style.top = Math.max(8, Math.min(r.bottom + 4, innerHeight - m.offsetHeight - 8)) + 'px';
    setTimeout(function () {
      var off = function (ev) {
        if (m.contains(ev.target)) return;
        m.remove();
        document.removeEventListener('pointerdown', off, true);
      };
      document.addEventListener('pointerdown', off, true);
    }, 0);
  };
  /* 確認ダイアログ（infoOnly のときはボタン1つ） */
  Panel.prototype._ask = function (title, body, okLabel, onOk, infoOnly) {
    var bg = el('div', 'tp-mdl-bg'), m = el('div', 'tp-mdl');
    var h = el('h4'); h.textContent = title;
    var p = el('p'); p.textContent = body;
    var row = el('div', 'tp-mdl-btns');
    var onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    function close() { bg.remove(); document.removeEventListener('keydown', onKey, true); }
    if (!infoOnly) {
      var no = el('button'); no.type = 'button'; no.textContent = 'やめる';
      no.addEventListener('click', close);
      row.appendChild(no);
    }
    var yes = el('button', infoOnly ? '' : 'danger');
    yes.type = 'button';
    yes.textContent = okLabel || '削除する';
    yes.addEventListener('click', function () { close(); if (onOk) onOk(); });
    row.appendChild(yes);
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey, true);
    m.append(h, p, row); bg.appendChild(m);
    document.body.appendChild(bg);
    yes.focus();
  };
  /* 一覧から1つずつ選ぶダイアログ（消した案を戻す用） */
  Panel.prototype._pick = function (title, body, names, onPick) {
    var bg = el('div', 'tp-mdl-bg'), m = el('div', 'tp-mdl');
    var h = el('h4'); h.textContent = title;
    var p = el('p'); p.textContent = body;
    var list = el('div', 'tp-mdl-list'), row = el('div', 'tp-mdl-btns');
    var onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    function close() { bg.remove(); document.removeEventListener('keydown', onKey, true); }
    var cur = names.map(function (n, i) { return { n: n, i: i }; });
    function draw() {
      list.textContent = '';
      if (!cur.length) { close(); return; }
      cur.forEach(function (x, j) {
        var li = el('div', 'tp-mdl-li'), t = el('span'), b = el('button');
        t.textContent = x.n; b.type = 'button'; b.textContent = '戻す';
        b.addEventListener('click', function () { onPick(x.n, x.i); cur.splice(j, 1); draw(); });
        li.append(t, b); list.appendChild(li);
      });
    }
    var done = el('button'); done.type = 'button'; done.textContent = '閉じる';
    done.addEventListener('click', close);
    row.appendChild(done);
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey, true);
    draw();
    m.append(h, p, list, row); bg.appendChild(m);
    document.body.appendChild(bg);
  };

  /* ---------- 出し入れ（見せる／隠す） ---------- */

  /* when に渡す params。スマホモード中は「スマホで効く値」を重ねたものを渡す */
  Panel.prototype._vp = function () {
    if (!this._phoneOn || this._isPhone) return this.params;
    if (this._vpCache) return this._vpCache;
    var vp = clone(this.params);
    this._accs.forEach(function (a) {
      if (!a.sp || !a.path || a.item.get) return;
      if (a.hasMB()) setPath(vp, a.path, clone(a.p._mb[a.key]));
      else if (a.spDef() !== undefined) setPath(vp, a.path, clone(a.spDef()));
    });
    return (this._vpCache = vp);
  };
  Panel.prototype._spView = function () { return this._isPhone || this._phoneOn; };

  /* 条件を見直して、見出しのかたまりごと出し入れする。
     中身が全部隠れた まとまり・見出し・カテゴリのカード・案ごとの大見出し・タブは、見出しごと隠す（名前だけ・見出しだけを残さない）。
     部品が隠した物には tp-off の印だけを付け、中身が戻ったらそれだけ戻す。作る人が自分で隠した物（custom・ボタンの
     hidden / style.display='none'）は触らず、「見えている中身」に数えないだけ（AnyFlow の hideEmptyPanelGroups と同じ考え方） */
  var authorHidden = function (e) {
    if (!e || e.hidden || e.style.display === 'none') return true;
    var kids = e.children;
    if (!kids.length) return false;
    for (var i = 0; i < kids.length; i++) { if (!(kids[i].hidden || kids[i].style.display === 'none')) return false; }
    return true;
  };
  Panel.prototype._applyVisibility = function () {
    var walk = function (v) {
      var ok = true;
      if (v.test) { try { ok = !!v.test(); } catch (e) { ok = false; } }
      var vis = ok;
      if (ok && v.kids) {
        var any = false;
        for (var i = 0; i < v.kids.length; i++) { if (walk(v.kids[i])) any = true; }
        vis = any;
      }
      if (v.author) {   /* 作る人の部品：条件（when など）で隠す時だけ印を付ける */
        if (v.el.classList.contains('tp-off') !== !ok) v.el.classList.toggle('tp-off', !ok);
        return ok && !authorHidden(v.inner || v.el);
      }
      var off = !vis && !v.note;
      if (v.el.classList.contains('tp-off') !== off) v.el.classList.toggle('tp-off', off);
      return v.note ? false : vis;
    };
    var self = this, activeOk = false;
    this._tabs.forEach(function (t) {
      var vis = walk(t.v);
      if (t.btn && t.btn.hidden !== !vis) t.btn.hidden = !vis;
      if (t.title === self._activeTab && vis) activeOk = true;
    });
    if (this._tabBar && !activeOk) {
      var first = this._tabs.filter(function (t) { return !t.btn || !t.btn.hidden; })[0];
      if (first && first.title !== this._activeTab) this._showTab(first.title, { quiet: true });
    }
  };

  Panel.prototype._showTab = function (title, opts) {
    opts = opts || {};
    this._activeTab = title;
    this._tabs.forEach(function (t) {
      var on = t.title === title;
      t.pane.classList.toggle('on', on);
      if (t.btn) t.btn.classList.toggle('on', on);
    });
    if (this._spacer) this._spacer.style.height = '0px';
    if (!opts.keepScroll) this.body.scrollTop = 0;
    this._centerTab();
    if (!opts.quiet) this._saveUI();
  };
  /* 選んだタブを横スクロールの真ん中へ寄せる */
  Panel.prototype._centerTab = function () {
    var bar = this._tabBar;
    if (!bar || !bar.clientWidth) return;
    var on = bar.querySelector('.tp-tab.on');
    if (!on) return;
    var target = on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2;
    try { bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' }); } catch (e) { bar.scrollLeft = Math.max(0, target); }
  };

  /* ---------- 値が変わった時 ---------- */

  Panel.prototype._captureAll = function () {
    this._ctls.forEach(function (c) { if (c.owns) c.st().ov[String(c.sel())] = c.capture(); });
  };

  Panel.prototype._changed = function (info) {
    var self = this;
    info = info || {};
    if (!this._ready) return;
    this._vpCache = null;
    this._captureAll();   /* 触った値＝いま選んでいる案の値（案の控えをその場で更新） */
    this._applyVisibility();
    if (this._canWrite()) {
      this._dirty = true;
      this._syncSaveBtn();
      this._scheduleSave();
    }
    var cfg = this.cfg;
    try { if (cfg.onChange) cfg.onChange(info); } catch (e) { console.error(e); }
    clearTimeout(this._settleT);
    if (info.immediate) { try { if (cfg.onSettle) cfg.onSettle(info); } catch (e) { console.error(e); } }
    else this._settleT = setTimeout(function () { try { if (cfg.onSettle) cfg.onSettle(info); } catch (e) { console.error(e); } }, this.settleDelay);
  };
  Panel.prototype._maybeRebuild = function () {
    var self = this;
    if (typeof this.cfg.schema !== 'function') return;
    clearTimeout(this._rbT);
    this._rbT = setTimeout(function () { self.rebuild(); }, 0);
  };

  /* ---------- 戻す（↺） ---------- */

  /* 戻す先は「このページを開いた時の値」（無ければ既定値）。案ごとの項目は、いま選んでいる案の開いた時の値 */
  Panel.prototype._startOf = function (a) {
    var st = this._start || { pc: {}, vars: {} };
    if (a.owner) {
      var sel = String(a.owner.sel()), s = st.vars[a.owner.id];
      if (s && s[sel] && hasOwn(s[sel].pc, a.key)) return clone(s[sel].pc[a.key]);
      return clone(a.owner.baseOf(sel)[a.key]);
    }
    if (hasOwn(st.pc, a.key)) return clone(st.pc[a.key]);
    return a.def();
  };
  Panel.prototype._captureStart = function () {
    var st = this._start = { pc: {}, vars: {} };
    this._accs.forEach(function (a) { if (!hasOwn(st.pc, a.key)) st.pc[a.key] = clone(a.readPC()); });
    this._ctls.forEach(function (c) {
      if (!c.owns) return;
      var m = st.vars[c.id] = {}, sel = String(c.sel()), ov = c.st().ov;
      c.opts().forEach(function (o) {
        var k = String(o.value);
        m[k] = k === sel ? c.capture() : (ov[k] ? clone(ov[k]) : { pc: c.baseOf(o.value), sp: {} });
      });
    });
  };
  /* スマホモード中（とスマホ実機）は「スマホの上書きを外す」だけ。PC の値は触らない */
  Panel.prototype._resetAcc = function (a) {
    if (a.sp && this._spView()) a.clearMB();
    else { var v = this._startOf(a); if (v !== undefined) a.writePC(v); }
  };
  Panel.prototype._resetRow = function (row) {
    var self = this;
    if (!row) return;
    row.accs.forEach(function (a) { self._resetAcc(a); });
    row.sync();
    this._changed({ item: row.item, path: row.item && row.item.path, reset: true, immediate: true, row: row });
  };
  /* モノの見出しの ↺：中の項目をまとめて戻す（押すと「✓ 戻しました」） */
  Panel.prototype._groupBtn = function (ctx, label) {
    var self = this, b = el('button', 'tp-gbtn');
    b.type = 'button';
    b.textContent = '↺';
    b.title = '「' + label + '」の中を、このページを開いた時の値にまとめて戻す（スマホモード中はスマホ用の上書きを外す）';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      ctx.accs.forEach(function (a) { if (!a.isPill) self._resetAcc(a); });
      ctx.rows.forEach(function (r) { r.sync(); });
      self._changed({ reset: true, group: label, immediate: true });
      b.classList.add('done');
      b.textContent = '✓ 戻しました';
      clearTimeout(b._t);
      b._t = setTimeout(function () { b.classList.remove('done'); b.textContent = '↺'; }, 1200);
    });
    return b;
  };

  /* ---------- 起動時の順番 ----------
     保存値を読む → 保存値が無ければ選んでいる案の値を当てる → スマホ実機ならスマホ用の値を流す（案の値の後） */
  Panel.prototype._validate = function () {
    var self = this, byKey = {}, mb = {};
    this._accs.forEach(function (a) { if (a.sp) byKey[a.key] = a; });
    Object.keys(this._mb || {}).forEach(function (k) {
      var a = byKey[k], v = self._mb[k];
      if (!a || v === undefined) return;
      var pc = a.readPC();
      if (pc !== undefined && pc !== null && typeof v !== typeof pc) return;
      if (a.enumOpts && !a.enumOpts.some(function (o) { return String(o.value) === String(v); })) return;
      mb[k] = v;
    });
    this._mb = mb;
    /* 廃止した選択肢が保存に残っていたら既定値へ（anyflow-embed で実際に起きた） */
    this._accs.forEach(function (a) {
      if (!a.enumOpts || !a.enumOpts.length) return;
      var cur = a.readPC();
      if (a.enumOpts.some(function (o) { return String(o.value) === String(cur); })) return;
      var d = a.def();
      if (!a.enumOpts.some(function (o) { return String(o.value) === String(d); })) d = a.enumOpts[0].value;
      a._put(a.pcStore(), d);
    });
    var vs = this._vs, ids = {};
    this._ctls.forEach(function (c) { ids[c.id] = c; });
    ['hidden', 'fav'].forEach(function (kk) {
      Object.keys(vs[kk]).forEach(function (id) {
        var c = ids[id];
        if (!c || !Array.isArray(vs[kk][id])) { delete vs[kk][id]; return; }
        var known = {};
        c.opts().forEach(function (o) { known[String(o.value)] = 1; });
        vs[kk][id] = vs[kk][id].map(String).filter(function (x, i, arr) { return known[x] && arr.indexOf(x) === i; });
      });
    });
    Object.keys(vs.ov).forEach(function (id) {
      var c = ids[id];
      if (!c || !isObj(vs.ov[id])) { delete vs.ov[id]; return; }
      var inScope = {};
      c.scope.forEach(function (a) { inScope[a.key] = a; });
      Object.keys(vs.ov[id]).forEach(function (v) {
        var s = vs.ov[id][v];
        if (!c.opt(v) || !isObj(s) || !isObj(s.pc)) { delete vs.ov[id][v]; return; }
        var pc = {}, sp = {};
        Object.keys(s.pc).forEach(function (k) { if (inScope[k]) pc[k] = s.pc[k]; });
        if (isObj(s.sp)) Object.keys(s.sp).forEach(function (k) { if (inScope[k] && inScope[k].sp) sp[k] = s.sp[k]; });
        vs.ov[id][v] = { pc: pc, sp: sp };
      });
    });
    /* 選んでいる案は、隠していない案のどれか（全部隠れていたら隠したのを戻す） */
    this._ctls.forEach(function (c) {
      var alive = c.alive();
      if (!alive.length) { c.st().hidden.length = 0; alive = c.opts(); }
      if (!alive.some(function (o) { return String(o.value) === String(c.sel()); }) && alive[0]) c.acc._put(c.acc.pcStore(), alive[0].value);
    });
  };
  Panel.prototype._startup = function (had) {
    var ctls = this._ctls.slice().sort(function (a, b) { return a.depth - b.depth; });
    /* 保存値がある時は、それがいま選んでいる案の値そのもの（控えより保存値を正にする） */
    if (!had) ctls.forEach(function (c) { if (!c.owns) return; var v = c.sel(); c.apply(c.st().ov[String(v)] || null, v); });
    if (this._isPhone) {
      this._pcBase = clone(this.params);
      this._accs.forEach(function (a) { a.live(); });
    }
    this._captureAll();
  };

  /* スマホ枠の中・スマホ実機：保存されたら（storage の知らせ）読み直して当て直す。自分では保存しない */
  Panel.prototype._initRemote = function () {
    var self = this;
    if (!this.storageKey || !(this._isPhone || this._inner)) return;
    var pre = 'tp:' + this.storageKey + ':';
    this._onStorage = function (e) {
      if (!e || !e.key || e.key.indexOf(pre) !== 0 || e.key === self._uKey()) return;
      clearTimeout(self._remT);
      self._remT = setTimeout(function () { self._remoteApply(); }, 30);
    };
    window.addEventListener('storage', this._onStorage);
  };
  Panel.prototype._remoteApply = function () {
    var st = this._readStore();
    if (st.params) assignDeep(this.params, mergeSaved(this.defaults, st.params));
    else assignDeep(this.params, clone(this.defaults));
    this._mb = st.mb || {};
    this._takeVars(st.vs);
    this._pcBase = null;
    this._validate();
    if (this._isPhone) { this._pcBase = clone(this.params); this._accs.forEach(function (a) { a.live(); }); }
    this._vpCache = null;
    this.sync();
    this._applyVisibility();
    var info = { remote: true, immediate: true };
    try { if (this.cfg.onChange) this.cfg.onChange(info); } catch (e) { console.error(e); }
    try { if (this.cfg.onSettle) this.cfg.onSettle(info); } catch (e) { console.error(e); }
  };

  /* PC⇄スマホの境目（600px）をまたいだら開き直す。
     PC→スマホ：保存待ちはまだ PC の値なので、またいだ瞬間に保存してから止める／スマホ→PC：保存待ちは捨てる。
     そのあと開き直すまでは保存しない。途中で元の側へ戻したら開き直さない */
  Panel.prototype._initModeWatch = function () {
    var self = this;
    if (this._inner || this.cfg.reloadOnModeSwitch === false) return;
    var check = function () {
      var next = matchPhone(self.phoneWidth);
      if (next === self._atLoadPhone) {
        if (self._modeT) { clearTimeout(self._modeT); self._modeT = null; self._reloading = false; }
        return;
      }
      if (self._reloading) return;
      if (!self._atLoadPhone && self._dirty) self.save();
      clearTimeout(self._saveT);
      self._reloading = true;
      self._modeT = setTimeout(function () {
        var last = 0;
        try { last = +sessionStorage.getItem('tp-mode-reload') || 0; } catch (e) {}
        if (Date.now() - last < 4000) { self._reloading = false; self._modeT = null; return; }   /* 往復ループ防止 */
        try { sessionStorage.setItem('tp-mode-reload', String(Date.now())); } catch (e) {}
        if (TP.reloadingPage) return;
        TP.reloadingPage = true;
        location.reload();
      }, 400);
    };
    this._onResize = check;
    window.addEventListener('resize', check);
  };

  /* ---------- スマホモード（PC でスマホ用の値を触るモード） ---------- */

  Panel.prototype._initPhoneMode = function () {
    var self = this;
    var allow = (this.cfg.phone === undefined || this.cfg.phone === 'auto') ? isDevHost() : !!this.cfg.phone;
    this.phoneBtn.hidden = !(allow && !this._isPhone && !this._inner);
    this.phoneBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      /* phone-mode.client.js がこのボタンを受け持っている時は、そちらに任せる（QR・実機への反映） */
      var C = window.PHONE_MODE_CONFIG;
      if (window.PhoneMode && C && C.headBtnSel) { try { if (document.querySelector(C.headBtnSel) === self.phoneBtn) return; } catch (er) {} }
      setPhoneMode(!htmlPhone());
    });
    if (!TP.observer && window.MutationObserver) {
      TP.observer = new MutationObserver(function () { phoneSync(); });
      TP.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    if (htmlPhone()) this._phoneChanged(true);
  };
  Panel.prototype._phoneChanged = function (on) {
    on = !!on;
    if (this._isPhone || this._inner || this._phoneOn === on) return;
    this._phoneOn = on;
    this.el.classList.toggle('tp-phone', on);
    this.phoneBtn.classList.toggle('on', on);
    this.phoneBtn.textContent = on ? '📱 スマホモード中' : '📱 スマホモード';
    this._vpCache = null;
    this.sync();
    this._applyVisibility();
    this._syncSaveBtn();
    if (on && this._dirty) this.save();
  };
  Panel.prototype._pushPhone = function () {
    try { if (window.PhoneMode && window.__phoneModeOn && typeof window.PhoneMode.push === 'function') window.PhoneMode.push(); } catch (e) {}
  };
  /* phone-mode.client.js に渡す設定のひな形（QR と実機への反映を使う時） */
  Panel.prototype.phoneModeConfig = function (extra) {
    var c = {
      syncPort: 8779,
      storageKeys: this.storageKeys(),
      saveFnName: '__tpNoSave__',
      panelSel: '#' + this.el.id,
      headBtnSel: '#' + this.phoneBtn.id,
      bannerBeforeSel: '#' + this.body.id,
      theme: 'blue'
    };
    if (isObj(extra)) for (var k in extra) c[k] = extra[k];
    return c;
  };

  function phoneSync() {
    var on = htmlPhone();
    TP.panels.forEach(function (p) { p._phoneChanged(on); });
    frameSync(on);
  }
  function setPhoneMode(on) {
    try { document.documentElement.classList.toggle('phone-mode', !!on); } catch (e) {}
    phoneSync();
  }

  /* PC 上に 390×844 のスマホ枠（中は本物のページ。?tp-preview=1 で開き、中のパネルは隠れて値だけ当たる） */
  function frameSync(on) {
    var want = on && !INNER && TP.panels.some(function (p) { return !p._isPhone && p.cfg.phoneFrame !== false; });
    if (!want) {
      if (TP.frame) { TP.frame.box.classList.remove('on'); TP.frame.ifr.setAttribute('src', 'about:blank'); }
      return;
    }
    var f = TP.frame || buildFrame();
    var url = previewUrl();
    if ((f.ifr.getAttribute('src') || '') !== url) f.ifr.setAttribute('src', url);
    f.box.classList.add('on');
    f.fit();
  }
  function previewUrl() {
    var s = location.search ? location.search + '&' : '?';
    return location.pathname + s + 'tp-preview=1';
  }
  function buildFrame() {
    var box = el('div', 'tp-pp');
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<div class="tp-pp-bar"><span class="tp-pp-ttl">スマホプレビュー 390×844</span>'
      + '<button type="button" class="rl" title="再読み込み">↻</button><button type="button" class="cl" title="閉じる（スマホモードを終える）">×</button></div>'
      + '<div class="tp-pp-frame"><iframe title="スマホプレビュー" src="about:blank"></iframe></div>';
    document.body.appendChild(box);
    var f = TP.frame = { box: box, ifr: box.querySelector('iframe'), dx: 0, dy: 0, sc: 1 };
    var tr = function () { box.style.transform = 'translate(' + f.dx + 'px,' + f.dy + 'px) scale(' + f.sc + ')'; };
    f.fit = function () { f.sc = Math.min(1, ((innerHeight || 900) - 32) / 892); tr(); };
    box.querySelector('.rl').addEventListener('click', function () { f.ifr.setAttribute('src', previewUrl() + '&_t=' + Date.now()); });
    box.querySelector('.cl').addEventListener('click', function () {
      var stop = document.getElementById('pmStop');   /* phone-mode.client.js が動いていれば、その「スマホモード終了」を押す */
      if (window.PhoneMode && stop) stop.click(); else setPhoneMode(false);
    });
    var bar = box.querySelector('.tp-pp-bar'), drag = null;
    bar.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      drag = { x: e.clientX, y: e.clientY, dx: f.dx, dy: f.dy };
      try { bar.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    });
    bar.addEventListener('pointermove', function (e) { if (!drag) return; f.dx = drag.dx + (e.clientX - drag.x); f.dy = drag.dy + (e.clientY - drag.y); tr(); });
    var end = function () { drag = null; };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
    window.addEventListener('resize', function () { if (box.classList.contains('on')) f.fit(); });
    return f;
  }

  /* ---------- 下のボタン3つ＋注意書き ---------- */

  var SAVE_NOTE = '調整は自動でこのブラウザに保存されます（リロード・ブラウザを閉じてもOK）。本番サイトに反映したい時は「設定書き出し」を押して、出てきたファイルをClaudeに渡してください。';

  Panel.prototype._renderFoot = function () {
    var self = this, foot = this.foot;
    foot.textContent = '';
    this._saveBtn = null;
    if (this.cfg.footer === false) { foot.style.display = 'none'; return; }
    var defs = [];
    if (this.storageKey && !this._isPhone) {
      defs.push({
        label: 'デフォルトに設定', primary: true, isSave: true,
        title: 'いまの値をすぐ保存して「最初に出る形」にします。スマホモード中はスマホの値を保存します。',
        onClick: function (pnl, b) {
          self.save();
          try { if (self.cfg.onSave) self.cfg.onSave(self.params, self); } catch (e) { console.error(e); }
          b.textContent = '✅ デフォルトにしました';
          b._busy = true;
          setTimeout(function () { b._busy = false; self._syncSaveBtn(); }, 1600);
        }
      });
    }
    defs.push({
      label: '設定書き出し',
      title: 'このブラウザの設定を JSON ファイルでダウンロードします。Claude に渡すと本番の初期値に焼き込めます。',
      onClick: function (pnl, b) { self._exportFile(b); }
    });
    defs.push({
      label: 'バリエーション削除',
      title: '「削除」で隠している案の一覧をコピーします。Claude に貼るとコードから消せます（まだ消していない案だけ）。',
      onClick: function (pnl, b) { self._copyPurge(b); }
    });
    var list = (Array.isArray(this.cfg.footer) ? this.cfg.footer : []).concat(this.cfg.footerDefaults === false ? [] : defs);
    if (list.length) {
      var box = el('div', 'tp-btns');
      list.forEach(function (d) {
        var b = el('button');
        b.type = 'button';
        b.textContent = d.label;
        if (d.title) b.title = d.title;
        if (d.primary) b.className = 'primary';
        if (d.isSave) self._saveBtn = b;
        b.addEventListener('click', function () { try { if (d.onClick) d.onClick(self, b); } catch (e) { console.error(e); } });
        box.appendChild(b);
      });
      foot.appendChild(box);
    }
    if (this.storageKey) {
      var note = el('div', 'tp-savenote');
      note.textContent = this._isPhone
        ? 'スマホ（幅600px以下）では見るだけで、どこにも保存しません。値を変えるのは PC の「📱 スマホモード」で行ってください。'
        : SAVE_NOTE;
      foot.appendChild(note);
    }
    this._syncSaveBtn();
  };
  /* 保存待ちの間は「デフォルトに設定（未保存）」でピンク。スマホモード中は「スマホのデフォルトに設定」 */
  Panel.prototype._syncSaveBtn = function () {
    var b = this._saveBtn;
    if (!b || b._busy) return;
    b.textContent = (this._phoneOn ? 'スマホのデフォルトに設定' : 'デフォルトに設定') + (this._dirty ? '（未保存）' : '');
    b.classList.toggle('dirty', !!this._dirty);
  };
  Panel.prototype._dump = function () {
    var dump = {}, pre = 'tp:' + (this.storageKey || '') + ':';
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(pre) === 0) dump[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    /* 焼き込みでそのまま使えるように、いまの値も素の形で入れておく */
    dump.__panel = this.storageKey;
    dump.__version = this.version;
    dump.__params = JSON.stringify(this._isPhone && this._pcBase ? this._pcBase : this.params);
    dump.__mb = JSON.stringify(this._mb);
    dump.__variants = JSON.stringify({ ver: this.version, hidden: this._vs.hidden, fav: this._vs.fav, ov: this._vs.ov });
    return dump;
  };
  Panel.prototype._exportFile = function (b) {
    if (this._dirty) this.save();
    var name = (this.storageKey || 'tune') + '-settings.json';
    try {
      var blob = new Blob([JSON.stringify(this._dump(), null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      if (b) b.textContent = '✅ 書き出しました（Claudeに渡してください）';
    } catch (e) {
      if (b) b.textContent = '書き出せませんでした';
    }
    if (b) setTimeout(function () { b.textContent = '設定書き出し'; }, 2200);
  };
  Panel.prototype._copyPurge = function (b) {
    var self = this, hidden = {}, n = 0;
    if (this._dirty) this.save();
    this._ctls.forEach(function (c) {
      var st = c.st();
      var list = st.hidden.filter(function (k) { return !!c.opt(k); }).map(function (k) { return { value: k, name: c.opt(k).name }; });
      if (list.length) { hidden[c.id] = list; n += list.length; }
    });
    var text = (n
      ? '【完全削除の依頼】以下の案をコードから恒久的に消してください。（まだコードに残っている案だけを出しています）\n'
      : '【完全削除の依頼】新しく消した案はありません（いま隠している案はありません）。\n')
      + JSON.stringify({ panel: this.storageKey, hiddenVariants: hidden }, null, 1);
    this._lastPurgeText = text;
    this._copy(text, function (ok) {
      if (!b) return;
      b.textContent = ok ? '✅ コピーしました（Claudeに貼ってください）' : 'コピーできませんでした';
      setTimeout(function () { b.textContent = 'バリエーション削除'; }, 2600);
    });
  };
  /* クリップボードへコピー（古いブラウザ向けの逃げ道つき） */
  Panel.prototype._copy = function (text, done) {
    var fallback = function () {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e) { return false; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback()); });
      return;
    }
    done(fallback());
  };

  Panel.prototype.flash = function (msg) {
    var self = this;
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(function () { self.toast.classList.remove('show'); }, 1600);
    return this;
  };

  /* ============================================================
     公開の操作（今までの使い方はそのまま動く）
     ============================================================ */

  /* params を外から書き換えた後、表示を合わせる */
  Panel.prototype.sync = function () {
    if (this._isPhone && this._pcBase && this._ready) {
      /* スマホ実機：外から書き換えられた params を PC の値として読み直す（スマホで上書きした項目はそのまま） */
      var self = this;
      this._accs.forEach(function (a) { if (!a.hasMB() && a.spDef() === undefined) a._put(self._pcBase, clone(a._get(self.params))); });
    }
    this._rows.forEach(function (r) { try { r.sync(); } catch (e) {} });
    if (this._ready) { this._vpCache = null; this._applyVisibility(); }
    return this;
  };
  Panel.prototype.rebuild = function () {
    this._render();
    this._assignOwners();
    this._validate();
    this.sync();
    this._fillPills();
    this._applyVisibility();
    return this;
  };
  Panel.prototype.toggle = function (force) {
    if (this._sheet) return this;
    var closed = force === undefined ? !this.el.classList.contains('closed') : !force;
    this.el.classList.toggle('closed', closed);
    if (!closed) {
      var self = this;
      this.el.style.width = this._openW + 'px';
      this.el.style.height = this._openH + 'px';
      requestAnimationFrame(function () { self._openDownward(); });
    }
    this._saveUI();
    return this;
  };
  Panel.prototype.show = function (on) { this._show(on === undefined ? true : on); return this; };
  Panel.prototype.hide = function () { this._show(false); return this; };
  Panel.prototype.isPhoneMode = function () { return this._phoneOn; };
  Panel.prototype.setPhoneMode = function (on) { setPhoneMode(!!on); return this; };
  /* 案を外から選ぶ（path は案ピルの path） */
  Panel.prototype.setVariant = function (id, v) { var c = this._ctlById(id); if (c) this._choose(c, v, c.box); return this; };
  Panel.prototype.getVariant = function (id) { var c = this._ctlById(id); return c ? c.sel() : undefined; };
  /* 隠した案を全部戻す（id を省くと全部の欄）。画面の「↺ 消した案を戻す」は1つずつ戻す。1案だけ残っても戻すボタンは残る（2026-09-27〜） */
  Panel.prototype.restoreVariants = function (id) {
    var self = this;
    this._ctls.forEach(function (c) {
      if (id != null && c.id !== String(id)) return;
      c.st().hidden.length = 0;
      c.fill();
    });
    this._applyVisibility();
    this._touchVariants();
    return this;
  };
  /* いま画面に出ている値（スマホモード中はスマホで効く値） */
  Panel.prototype.value = function (key) {
    var a = this._accs.filter(function (x) { return x.key === String(key); })[0];
    return a ? a.view() : undefined;
  };
  /* 全部を初期値に戻す（画面のボタンは置かない。必要な時だけコードから呼ぶ） */
  Panel.prototype.reset = function () {
    assignDeep(this.params, clone(this.defaults));
    this._mb = {};
    this._vs.ov = {};
    this._startup(false);
    this._captureStart();
    this.sync();
    this._fillPills();
    this._applyVisibility();
    this._changed({ reset: true, immediate: true });
    this.flash('初期値に戻しました');
    return this;
  };
  Panel.prototype.exportJSON = function () { return JSON.stringify(this._isPhone && this._pcBase ? this._pcBase : this.params, null, 2); };
  Panel.prototype.copy = function () {
    var self = this;
    this._copy(this.exportJSON(), function () { self.flash('コピーしました（Claude に貼れば既定値にできます）'); });
    return this;
  };
  Panel.prototype.importJSON = function (str) {
    var obj;
    try { obj = typeof str === 'string' ? JSON.parse(str) : str; } catch (e) { this.flash('JSON が読めませんでした'); return this; }
    if (obj && isObj(obj.__params)) obj = obj.__params;
    else if (obj && typeof obj.__params === 'string') { try { obj = JSON.parse(obj.__params); } catch (e) {} }
    assignDeep(this.params, mergeSaved(this.defaults, obj));
    if (this._isPhone) { this._pcBase = clone(this.params); this._accs.forEach(function (a) { a.live(); }); }
    this.sync();
    this._fillPills();
    this._applyVisibility();
    this._changed({ imported: true, immediate: true });
    if (this._canWrite()) this.save();
    this.flash('読み込みました');
    return this;
  };
  Panel.prototype.importPrompt = function () {
    var s = window.prompt('設定JSONを貼り付けてください');
    if (s) this.importJSON(s);
    return this;
  };
  Panel.prototype.destroy = function () {
    var self = this;
    if (this._onKey) window.removeEventListener('keydown', this._onKey);
    if (this._onStorage) window.removeEventListener('storage', this._onStorage);
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    (this._offs || []).forEach(function (f) { try { f(); } catch (e) {} });
    if (this._ro) this._ro.disconnect();
    clearTimeout(this._saveT); clearTimeout(this._settleT); clearTimeout(this._modeT);
    var i = TP.panels.indexOf(this);
    if (i >= 0) TP.panels.splice(i, 1);
    if (!TP.panels.some(function (p) { return p._secret; }) && TP.hot) { TP.hot.remove(); TP.hot = null; }
    if (!TP.panels.length && TP.frame) { TP.frame.box.remove(); TP.frame = null; }
    this.el.remove();
    var inst = api.instances.indexOf(self);
    if (inst >= 0) api.instances.splice(inst, 1);
    return this;
  };

  /* ============================================================
     7. 入口
     ============================================================ */

  var api = {
    /* 作ったパネルを控えておく（動作確認で中の値を外から読むため。画面には何も出ない） */
    instances: [],
    create: function (cfg) {
      var p = new Panel(cfg);
      api.instances.push(p);
      return p;
    },
    Panel: Panel,
    setPhoneMode: setPhoneMode,
    utils: { getPath: getPath, setPath: setPath, mergeSaved: mergeSaved, assignDeep: assignDeep, clone: clone, rangeFor: rangeFor, gridKindOf: gridKindOf, snapGrid: snapGrid, grpFromText: grpFromText },
    version: VERSION
  };
  return api;
});
