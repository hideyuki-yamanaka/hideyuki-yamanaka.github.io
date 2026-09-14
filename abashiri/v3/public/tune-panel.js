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
    '  width:360px;height:520px;min-width:240px;min-height:44px;max-width:92vw;max-height:92vh;',
    '  resize:both;background:rgba(255,255,255,.93);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);',
    '  border:1px solid #e2e2e2;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.10);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;',
    '  font-size:12px;line-height:1.5;color:#101828;font-weight:400;}',
    '.tp *{box-sizing:border-box;}',
    '.tp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;',
    '  cursor:grab;user-select:none;flex:0 0 auto;}',
    '.tp-head:active{cursor:grabbing;}',
    '.tp-title{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.tp-chev{font-size:10px;color:#888;transition:transform .25s;padding:2px 4px;cursor:pointer;}',
    '.tp.closed .tp-chev{transform:rotate(180deg);}',
    '.tp.closed{height:auto !important;resize:none;}',
    '.tp.closed .tp-body,.tp.closed .tp-foot{display:none;}',
    '.tp-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:0 12px 12px;}',
    '.tp-foot{flex:0 0 auto;padding:8px 12px 10px;border-top:1px solid #ececec;background:rgba(255,255,255,.6);}',
    '.tp-search{width:100%;padding:6px 9px;margin:8px 0 2px;border:1px solid #e2e2e2;border-radius:6px;',
    '  font:inherit;color:inherit;background:#fff;}',
    '.tp-search::placeholder{color:#bbb;}',
    /* 大カテゴリ */
    '.tp-cat{border:1px solid #e8e8e8;border-radius:8px;margin-top:10px;overflow:hidden;background:#fff;}',
    '.tp-cat-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;',
    '  font-weight:500;background:#fafafa;cursor:pointer;user-select:none;}',
    '.tp-cat-head:hover{background:#f2f2f2;}',
    '.tp-cat-chev{font-size:10px;color:#888;transition:transform .2s;}',
    '.tp-cat.closed .tp-cat-chev{transform:rotate(-90deg);}',
    '.tp-cat-body{padding:0 12px 12px;}',
    '.tp-cat.closed .tp-cat-body{display:none;}',
    '.tp-hidden{display:none !important;}',
    /* タブ（ページ切替。cfg.tabs:true で cat がタブになる） */
    '.tp-tabs{display:flex;gap:4px;margin:10px 0 2px;flex-wrap:wrap;}',
    '.tp-tab{flex:1 1 auto;padding:6px 8px;border:1px solid #e2e2e2;border-radius:8px;background:#fff;',
    '  cursor:pointer;font-family:inherit;font-size:11px;color:#555;white-space:nowrap;}',
    '.tp-tab.on{background:#090909;color:#fff;border-color:#090909;}',
    /* セクション（タブの中の折りたたみ。フォルダのインデックス風） */
    '.tp-sec{border:1px solid #e8e8e8;border-radius:8px;margin-top:10px;overflow:hidden;background:#fff;}',
    '.tp-sec-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;',
    '  font-weight:500;font-size:11.5px;background:#fafafa;cursor:pointer;user-select:none;}',
    '.tp-sec-head:hover{background:#f2f2f2;}',
    '.tp-sec-chev{font-size:10px;color:#888;transition:transform .2s;}',
    '.tp-sec.closed .tp-sec-chev{transform:rotate(-90deg);}',
    '.tp-sec-body{padding:0 12px 12px;}',
    '.tp-sec.closed .tp-sec-body{display:none;}',
    /* 隠しスイッチ（画面右上の透明ボックス）。見た目は何もないが、クリックでパネルが出る */
    '.tp-secret-hot{position:fixed;top:0;right:0;width:64px;height:64px;z-index:2147483001;background:transparent;}',
    /* 小見出し */
    '.tp-grp{margin-top:10px;padding-top:10px;border-top:1px solid #ececec;}',
    '.tp-cat-body>.tp-grp:first-child{border-top:none;margin-top:6px;}',
    '.tp-grp-title{font-weight:400;margin-bottom:6px;display:flex;align-items:center;gap:6px;}',
    '.tp-grp.deep{margin-top:8px;padding-top:8px;border-top:1px dashed #eee;padding-left:10px;border-left:2px solid #ececec;}',
    '.tp-grp.deep .tp-grp-title{font-size:11px;color:#666;}',
    '.tp-note{font-size:10px;line-height:1.6;color:#999;margin:-2px 0 6px;}',
    /* 項目ツール（🗑削除・⠿並び替え）と削除確認モーダル（2026-08-23） */
    '.tp-item{position:relative;}',
    '.tp-item-tools{position:absolute;right:0;top:-3px;display:none;gap:0;align-items:center;z-index:6;',
    '  background:rgba(255,255,255,.95);border:1px solid #e4e4e4;border-radius:6px;padding:0 3px;box-shadow:0 1px 4px rgba(0,0,0,.08);}',
    '.tp-item:hover>.tp-item-tools{display:flex;}',
    '.tp-item-grab{cursor:grab;opacity:.5;font-size:11px;padding:2px 3px;user-select:none;touch-action:none;}',
    '.tp-item-del{border:none;background:none;cursor:pointer;font-size:10px;opacity:.5;padding:2px 3px;line-height:1;}',
    '.tp-item-grab:hover,.tp-item-del:hover{opacity:1;}',
    '.tp-item.tp-dragging{opacity:.45;outline:1.5px dashed #FF5D97;border-radius:6px;}',
    '.tp-modal{position:absolute;inset:0;background:rgba(20,22,30,.35);display:flex;align-items:center;justify-content:center;z-index:60;border-radius:14px;}',
    '.tp-modal-box{background:#fff;border:1px solid #e4e4e4;border-radius:10px;padding:14px;max-width:86%;box-shadow:0 10px 34px rgba(0,0,0,.22);}',
    '.tp-modal-msg{font-size:11px;line-height:1.7;white-space:pre-line;margin-bottom:12px;color:#333;}',
    '.tp-btns button.danger{background:#e5485f;border-color:#e5485f;color:#fff;}',
    '.tp-btns button.danger:hover{background:#d63a52;}',
    '.tp-hint{font-size:10px;line-height:1.55;color:#999;margin:-1px 0 6px 100px;}',
    /* 行 */
    '.tp-row{display:flex;align-items:center;gap:8px;margin:4px 0;}',
    '.tp-row>label{flex:0 0 92px;color:#555;font-weight:300;}',
    '.tp-row input[type=range]{flex:1;accent-color:#090909;min-width:0;}',
    '.tp-val{flex:0 0 46px;text-align:right;font-variant-numeric:tabular-nums;color:#333;}',
    '.tp-val-edit{cursor:pointer;border-bottom:1px dashed #bbb;}',
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
    /* スイッチ */
    '.tp-switch{position:relative;width:36px;height:20px;flex:0 0 36px;border-radius:999px;background:#d8d8d8;',
    '  border:none;cursor:pointer;transition:background .2s;padding:0;}',
    '.tp-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;',
    '  background:#fff;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);}',
    '.tp-switch.on{background:#090909;}',
    '.tp-switch.on::after{transform:translateX(16px);}',
    /* ボタン */
    '.tp-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}',
    '.tp-btns button{flex:1 1 auto;white-space:nowrap;font-family:inherit;font-size:11px;padding:7px 10px;',
    '  border-radius:6px;border:1px solid #d8d8d8;background:#fff;cursor:pointer;transition:background .2s;color:#101828;}',
    '.tp-btns button:hover{background:#f2f2f2;}',
    '.tp-btns button.primary{background:#090909;color:#fff;border-color:#090909;}',
    '.tp-btns button.primary:hover{background:#333;}',
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
    '.tp.dark .tp-seg,.tp.dark .tp-pill,.tp.dark .tp-btns button,.tp.dark .tp-search,',
    '.tp.dark .tp-row select,.tp.dark .tp-row input[type=text],.tp.dark .tp-row input[type=number],.tp.dark .tp-row textarea',
    '  {background:#1b1b1e;border-color:#3a3a3f;color:#eee;}',
    '.tp.dark .tp-seg button{background:#1b1b1e;color:#bbb;}',
    '.tp.dark .tp-seg button.on,.tp.dark .tp-pill.on{background:#fff;color:#111;border-color:#fff;}',
    '.tp.dark .tp-btns button.primary{background:#fff;color:#111;border-color:#fff;}',
    '.tp.dark .tp-foot{background:rgba(20,20,22,.6);border-top-color:#2e2e32;}',
    '.tp.dark input[type=range]{accent-color:#fff;}'
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
    this.catOpen = {};
    this.secOpen = {};
    this.activeTab = null;
    /* 項目のカスタマイズ（🗑削除・⠿並び替え。2026-08-23 ヒデさん依頼） */
    this.hiddenItems = [];
    this.itemOrder = {};
    this._settleTimer = 0;
    this._muted = false;

    injectCSS();
    this._buildShell();
    this._loadParams();
    this._loadUI();
    this.rebuild();
  }

  /* ---------- 保存 ---------- */

  Panel.prototype._pKey = function () { return 'tp:' + this.storageKey + ':v' + this.version; };
  Panel.prototype._uKey = function () { return 'tp:' + this.storageKey + ':ui'; };

  Panel.prototype._loadParams = function () {
    if (!this.storageKey) return;
    /* 古いバージョンの保存値は掃除する（＝バージョンを上げれば必ず新しい初期値で出る） */
    try {
      var prefix = 'tp:' + this.storageKey + ':v';
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0 && k !== this._pKey()) localStorage.removeItem(k);
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
        hidden: this.hiddenItems,
        order: this.itemOrder
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
    var w = (ui && ui.w > 120 ? ui.w : 0) || size.w || 360;
    var h = (ui && ui.h > 80 ? ui.h : 0) || size.h || 520;
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
    if (ui && ui.hidden) this.hiddenItems = ui.hidden;
    if (ui && ui.order) this.itemOrder = ui.order;
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
    title.textContent = this.cfg.title || '⚙️ 調整パネル';
    var chev = document.createElement('span');
    chev.className = 'tp-chev';
    chev.textContent = '▲';
    chev.title = '開閉';
    head.append(title, chev);

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

    el.append(head, body, foot, toast);
    (this.cfg.mount || document.body).appendChild(el);

    /* 開閉 */
    chev.addEventListener('click', function (e) { e.stopPropagation(); self.toggle(); });

    /* ヘッダーを掴んで移動 */
    var drag = null;
    head.addEventListener('pointerdown', function (e) {
      if (e.target === chev) return;
      var r = el.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', function (e) {
      if (!drag) return;
      self._place(e.clientX - drag.dx, e.clientY - drag.dy);
    });
    head.addEventListener('pointerup', function () { if (drag) { drag = null; self._saveUI(); } });

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

  /* ---------- 通知 ---------- */

  Panel.prototype._markDirty = function (on) {
    this._dirty = !!on;
    if (this._saveBtn) this._saveBtn.classList.toggle('dirty', this._dirty);
  };

  Panel.prototype._changed = function (info) {
    var self = this;
    if (this._muted) return;
    /* 保存ボタン方式では、触っただけでは書かない（保存を押した時だけ確定） */
    if (this.saveMode === 'button') this._markDirty(true);
    else this.save();
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

    /* 検索ボックス */
    if (this.cfg.search !== false) {
      var s = document.createElement('input');
      s.className = 'tp-search';
      s.type = 'search';
      s.placeholder = '項目を検索…';
      s.value = this._query || '';
      s.addEventListener('input', function () { self._filter(s.value); });
      this.body.appendChild(s);
    }

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
      this.body.appendChild(bar);
      var activeCat = cats[titles.indexOf(this.activeTab)];
      if (activeCat) this._renderCatSections(activeCat);
    } else {
      cats.forEach(function (cat) { self._renderCat(cat); });
    }

    this._renderFoot();
    this.body.scrollTop = keepScroll;
    this._restoreScroll = 0;
    if (this._query) this._filter(this._query);
    return this;
  };

  /* タブモード用：非deepの小見出しを「折りたたみセクション」に昇格して並べる */
  Panel.prototype._renderCatSections = function (cat) {
    var self = this;
    var root = document.createElement('div');
    root.dataset.okey = (cat.cat || '') + '|_top';
    this.body.appendChild(root);
    var currentBody = root;
    this._mount = root;
    (cat.items || []).forEach(function (item) {
      if (!item) return;
      if (item.when && !item.when(self.params)) return;
      if (item.sub !== undefined && !item.deep) {
        var title = String(item.sub);
        var key = (cat.cat || '') + '|' + title;
        var isOpen = self.secOpen[key] === true; /* 既定は閉じる＝目次として見える */
        var sec = document.createElement('div');
        sec.className = 'tp-sec' + (isOpen ? '' : ' closed');
        var head = document.createElement('div');
        head.className = 'tp-sec-head';
        head.innerHTML = '<span></span><span class="tp-sec-chev">▾</span>';
        head.firstChild.textContent = title;
        var secBody = document.createElement('div');
        secBody.className = 'tp-sec-body';
        secBody.dataset.okey = key;
        head.addEventListener('click', function () {
          self.secOpen[key] = !sec.classList.toggle('closed');
          self._saveUI();
        });
        sec.append(head, secBody);
        root.appendChild(sec);
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
    this._applyOrder();
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
    this._applyOrder();
  };

  Panel.prototype._renderItem = function (item, catBody) {
    var self = this;
    if (!item) return;
    if (item.when && !item.when(this.params)) return;

    /* 小見出し */
    if (item.sub !== undefined) {
      var g = document.createElement('div');
      g.className = 'tp-grp' + (item.deep ? ' deep' : '');
      if (item.deep) g.dataset.okey = (catBody.dataset.okey || '') + '>' + String(item.sub);
      var t = document.createElement('div');
      t.className = 'tp-grp-title';
      t.innerHTML = item.sub;
      g.appendChild(t);
      catBody.appendChild(g);
      this._mount = item.deep ? g : catBody;
      return;
    }
    var mount = this._mount || catBody;

    if (item.note !== undefined) {
      var n = document.createElement('div');
      n.className = 'tp-note';
      n.textContent = item.note;
      mount.appendChild(n);
      return;
    }
    if (item.custom) { item.custom(mount, this); return; }

    /* 値を持つ行は .tp-item で包む：🗑削除＋⠿並び替えの単位になる（2026-08-23） */
    var label = item.slider || item.pills || item.toggle || item.select ||
      item.color || item.text || item.seg || item.button || '';
    var ikey = item.path || (label ? 'k:' + label : '');
    if (ikey && this.hiddenItems.indexOf(ikey) >= 0) return; /* 削除済みは出さない */
    var host = mount;
    var wrapItem = null;
    if (ikey) {
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
      h.className = 'tp-hint';
      h.textContent = item.hint;
      host.appendChild(h);
      row._hint = h;
    }
    if (row) this.rows.push(row);
    if (row && wrapItem) this._itemTools(wrapItem);
    else if (wrapItem && !row) { wrapItem.remove(); }
  };

  /* --- 項目ごとのツール（🗑削除・⠿並び替え）。2026-08-23 ヒデさん依頼 --- */
  Panel.prototype._itemTools = function (wrap) {
    var self = this;
    var tools = document.createElement('div');
    tools.className = 'tp-item-tools';
    var grab = document.createElement('span');
    grab.className = 'tp-item-grab';
    grab.textContent = '⠿';
    grab.title = 'ドラッグで並び替え';
    grab.addEventListener('pointerdown', function (e) { self._dragItem(wrap, e); });
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'tp-item-del';
    del.textContent = '🗑';
    del.title = 'この項目をパネルから削除（あとで戻せます）';
    del.addEventListener('click', function (e) { e.stopPropagation(); self._confirmDelete(wrap); });
    tools.append(grab, del);
    wrap.appendChild(tools);
  };

  /* 削除の確認モーダル（パネル内に重ねる） */
  Panel.prototype._confirmDelete = function (wrap) {
    var self = this;
    var old = this.el.querySelector('.tp-modal');
    if (old) old.remove();
    var m = document.createElement('div');
    m.className = 'tp-modal';
    var box = document.createElement('div');
    box.className = 'tp-modal-box';
    var msg = document.createElement('div');
    msg.className = 'tp-modal-msg';
    msg.textContent = '「' + (wrap._label || wrap.dataset.key) + '」をパネルから削除しますか？\n\nサイトの動きは今の値のまま変わりません。フッターの「削除した項目を戻す」でいつでも復活できます。';
    var btns = document.createElement('div');
    btns.className = 'tp-btns';
    var no = document.createElement('button');
    no.type = 'button';
    no.textContent = 'やめる';
    no.addEventListener('click', function () { m.remove(); });
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = '削除する';
    ok.className = 'danger';
    ok.addEventListener('click', function () {
      self.hiddenItems.push(wrap.dataset.key);
      self._saveUI();
      m.remove();
      self.rebuild(); /* フッターの「戻す」件数も更新 */
      self.flash('削除しました（フッターから戻せます）');
    });
    btns.append(no, ok);
    box.append(msg, btns);
    m.appendChild(box);
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    this.el.appendChild(m);
  };

  /* ⠿ドラッグで同じセクション内の並び替え */
  Panel.prototype._dragItem = function (wrap, e) {
    var self = this;
    e.preventDefault();
    e.stopPropagation();
    var parent = wrap.parentNode;
    wrap.classList.add('tp-dragging');
    var move = function (ev) {
      var els = document.elementsFromPoint(ev.clientX, ev.clientY);
      for (var i = 0; i < els.length; i++) {
        var t = els[i].closest ? els[i].closest('.tp-item') : null;
        if (t && t !== wrap && t.parentNode === parent) {
          var r = t.getBoundingClientRect();
          parent.insertBefore(wrap, ev.clientY < r.top + r.height / 2 ? t : t.nextSibling);
          break;
        }
      }
    };
    var up = function () {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      wrap.classList.remove('tp-dragging');
      var okey = parent.dataset.okey || '';
      var keys = [];
      for (var c = parent.firstChild; c; c = c.nextSibling) {
        if (c.classList && c.classList.contains('tp-item')) keys.push(c.dataset.key);
      }
      self.itemOrder[okey] = keys;
      self._saveUI();
      self.flash('並び順を保存しました（このブラウザに記憶されます）');
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };

  /* 保存済みの並び順を各セクションへ適用 */
  Panel.prototype._applyOrder = function () {
    var self = this;
    this.body.querySelectorAll('[data-okey]').forEach(function (cont) {
      var saved = self.itemOrder[cont.dataset.okey];
      if (!saved || !saved.length) return;
      var items = [];
      for (var c = cont.firstChild; c; c = c.nextSibling) {
        if (c.classList && c.classList.contains('tp-item')) items.push(c);
      }
      if (items.length < 2) return;
      var anchor = items[items.length - 1].nextSibling;
      items.slice().sort(function (a, b) {
        var ia = saved.indexOf(a.dataset.key), ib = saved.indexOf(b.dataset.key);
        if (ia < 0) ia = 999 + items.indexOf(a);
        if (ib < 0) ib = 999 + items.indexOf(b);
        return ia - ib;
      }).forEach(function (el) { cont.insertBefore(el, anchor); });
    });
  };

  /* --- スライダー --- */
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
  Panel.prototype._pills = function (item, mount) {
    var self = this;
    this._validateEnum(item);
    var wrap = document.createElement('div');
    if (item.pills) {
      var t = document.createElement('div');
      t.className = 'tp-grp-title';
      t.style.marginBottom = '2px';
      t.textContent = item.pills;
      wrap.appendChild(t);
    }
    var rowEl = document.createElement('div');
    rowEl.className = 'tp-pills';
    var desc = document.createElement('div');
    desc.className = 'tp-desc';

    (item.options || []).forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tp-pill';
      b.dataset.value = o.value;
      if (o.swatch) {
        var sw = document.createElement('span');
        sw.className = 'tp-swatch';
        sw.style.background = o.swatch;
        b.appendChild(sw);
      }
      b.append(document.createTextNode(o.name));
      b.addEventListener('click', function () {
        self._set(item, o.value);
        sync();
        self._changed({ item: item, path: item.path, value: o.value, immediate: true });
        if (item.rebuild !== false && (typeof self.cfg.schema === 'function' || item.rebuild)) self.rebuild();
      });
      rowEl.appendChild(b);
    });
    function sync() {
      var cur = self._get(item);
      var found = null;
      rowEl.querySelectorAll('.tp-pill').forEach(function (b) {
        var on = b.dataset.value === String(cur);
        b.classList.toggle('on', on);
        if (on) found = b;
      });
      var opt = (item.options || []).filter(function (o) { return String(o.value) === String(cur); })[0];
      desc.textContent = (opt && opt.desc) || '';
      desc.style.display = desc.textContent ? '' : 'none';
    }
    wrap.append(rowEl, desc);
    mount.appendChild(wrap);
    sync();
    wrap._label = (item.pills || '') + ' ' + (item.options || []).map(function (o) { return o.name; }).join(' ');
    wrap._sync = sync;
    return wrap;
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

  Panel.prototype._renderFoot = function () {
    var self = this;
    if (this.cfg.footer === false) { this.foot.style.display = 'none'; return; }
    var box = document.createElement('div');
    box.className = 'tp-btns';
    box.style.marginTop = '0';

    /* 既定ボタンは「↺ リセット」だけ（＋saveMode:'button' なら先頭に「💾 保存」）。
       「📥 読み込み」は 2026-08-21、「📋 設定をコピー」は 2026-08-23 ヒデさん指示で撤去。
       copy() / importPrompt() 自体は残してあるので、必要なら footer で足せる */
    var defs = [
      { label: '↺ リセット', onClick: function () { self.reset(); } }
    ];
    /* 🗑で削除した項目がある時だけ「戻す」を出す */
    if (this.hiddenItems.length) {
      defs.push({
        label: '🗑 削除した項目を戻す(' + this.hiddenItems.length + ')',
        onClick: function () {
          self.hiddenItems = [];
          self._saveUI();
          self.rebuild();
          self.flash('削除した項目をすべて戻しました');
        }
      });
    }
    /* 保存ボタン方式（既定）：先頭に「💾 保存」。未保存の変更があるとピンクになる */
    if (this.saveMode === 'button' && this.storageKey) {
      defs.unshift({
        label: '💾 保存', primary: true, isSave: true,
        onClick: function () {
          self.save();
          self._markDirty(false);
          /* cfg.onSave: 保存後のフック（ローカルの「デプロイ用ファイルへの自動書き込み」等に使う） */
          if (self.cfg.onSave) {
            try { self.cfg.onSave(self.params, self); } catch (e) {}
          } else {
            self.flash('保存しました（リロードしてもこの設定で出ます）');
          }
        }
      });
    }
    var list = (this.cfg.footer || []).concat(this.cfg.footerDefaults === false ? [] : defs);
    list.forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.textContent = b.label;
      if (b.primary) el.className = 'primary';
      if (b.isSave) { self._saveBtn = el; el.classList.toggle('dirty', self._dirty); }
      el.addEventListener('click', function () { b.onClick && b.onClick(self); });
      box.appendChild(el);
    });
    this.foot.appendChild(box);
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

  /* 検索で行を絞る（74本あっても目的の項目にすぐ着く） */
  Panel.prototype._filter = function (q) {
    this._query = q;
    var key = (q || '').trim().toLowerCase();
    var self = this;
    /* タブモードではセクション（.tp-sec）を対象にする */
    var secs = this.body.querySelectorAll('.tp-sec');
    if (secs.length) {
      secs.forEach(function (sec) {
        var hit = 0;
        sec.querySelectorAll('.tp-row, .tp-pills, .tp-btns').forEach(function (row) {
          var host = row.classList.contains('tp-pills') ? row.parentNode : row;
          var text = (host.textContent || '') + ' ' + (host._label || '');
          var on = !key || text.toLowerCase().indexOf(key) >= 0;
          host.classList.toggle('tp-hidden', !on);
          var hint = host.nextSibling;
          if (hint && hint.classList && hint.classList.contains('tp-hint')) hint.classList.toggle('tp-hidden', !on);
          if (on) hit++;
        });
        if (key) {
          sec.classList.toggle('tp-hidden', hit === 0);
          sec.classList.remove('closed');
        } else {
          sec.classList.remove('tp-hidden');
          var title = sec.querySelector('.tp-sec-head span').textContent;
          var k2 = (self.activeTab || '') + '|' + title;
          sec.classList.toggle('closed', self.secOpen[k2] !== true);
        }
      });
      return this;
    }
    var cats = this.body.querySelectorAll('.tp-cat');
    cats.forEach(function (cat) {
      var hit = 0;
      cat.querySelectorAll('.tp-row, .tp-pills, .tp-btns').forEach(function (row) {
        var host = row.classList.contains('tp-pills') ? row.parentNode : row;
        var text = (host.textContent || '') + ' ' + (host._label || '');
        var on = !key || text.toLowerCase().indexOf(key) >= 0;
        host.classList.toggle('tp-hidden', !on);
        var hint = host.nextSibling;
        if (hint && hint.classList && hint.classList.contains('tp-hint')) hint.classList.toggle('tp-hidden', !on);
        if (on) hit++;
      });
      if (key) {
        cat.classList.toggle('tp-hidden', hit === 0);
        cat.classList.remove('closed');
        cat.querySelectorAll('.tp-grp').forEach(function (g) { g.classList.remove('tp-hidden'); });
      } else {
        cat.classList.remove('tp-hidden');
        var title = cat.querySelector('.tp-cat-head span').textContent;
        cat.classList.toggle('closed', this.catOpen[title] === false);
      }
    }, this);
    return this;
  };

  Panel.prototype.destroy = function () {
    if (this._onKey) window.removeEventListener('keydown', this._onKey);
    if (this._hot) this._hot.remove();
    this.el.remove();
    return this;
  };

  /* ============================================================
     入口
     ============================================================ */

  return {
    create: function (cfg) { return new Panel(cfg); },
    Panel: Panel,
    /* 便利物（利用側でも使えるように） */
    utils: { getPath: getPath, setPath: setPath, mergeSaved: mergeSaved, assignDeep: assignDeep, clone: clone },
    version: '1.0.0'
  };
});
