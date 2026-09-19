/* ============================================================================
   スマホモード（実機ライブ同期）クライアント — プロダクト共通の単一ソース
   2026-09-19 ヒデさん依頼。どのプロダクトでも <script> で読み込むだけで使える。
   PC で調整パネルの値を変えると、同じ Wi-Fi のスマホ実機プレビューにリアルタイム反映。

   使い方（本体ページの末尾で、調整パネルより後に）:
     <script>
       window.PHONE_MODE_CONFIG = {
         syncPort: 8779,                       // 中継サーバ server.mjs のポート
         storageKeys: ['<app>-settings-key'],  // スマホへ配る localStorage キー(複数可)
         saveFnName: 'save',                   // 保存関数名(あればラップして保存時に配信)
         panelSel: '#panel',                   // 調整パネル(枠を付ける)
         headBtnSel: '#panelPhoneBtn',         // ヘッダーの「📱 スマホモード」ボタン(無ければ右下にFAB)
         bannerBeforeSel: '#panelBody',        // この要素の前に帯を差し込む
         fontRowSel: '.txt-row',               // (任意)レスポンシブ値をオレンジで示す行
         rowElOf: function (row) { var l = row.querySelector('label'); return l && l.title; }, // (任意)行→対象要素セレクタ
         shippedGenKey: '<app>-shipped-gen',   // (任意)焼き込み世代ガードに勝つためのキー
         theme: 'orange'                       // 'orange'(既定・STUDIO風) | 'blue'
       };
     </script>
     <script src="phone-mode.client.js"></script>

   中継サーバは同フォルダ server.mjs（PAGE_PORT/SYNC_PORT で起動）。
   詳細は settings/docs/general/PHONE-MODE.md。
   ============================================================================ */
(function phoneMode() {
  var C = window.PHONE_MODE_CONFIG || {};
  var SYNC = location.protocol + '//' + location.hostname + ':' + (C.syncPort || 8779);
  var KEYS = C.storageKeys || [];
  var mode = (new URLSearchParams(location.search).get('live') || '').toLowerCase();
  /* 開発(ローカル/LAN)だけで動かす。本番(vercel等)では何も出さない */
  var isDev = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
  if (!isDev) return;
  /* 既定はブランド寄りのブルー/ライトブルー。theme:'orange' で STUDIO 風オレンジ */
  var ACCENT = (C.theme === 'orange') ? { fg: '#b45309', a: '245,130,10', b: '255,170,60', btn: '#f5820a', dot: '#f5820a', diffBg: '#fff7ed' }
                                      : { fg: '#0b4bd6', a: '14,92,255', b: '14,187,255', btn: '#0e5cff', dot: '#0EBBFF', diffBg: '#eef8ff' };

  /* ---------------- スマホ側: 受信してリロード ---------------- */
  if (mode === 'phone') {
    try { document.documentElement.classList.add('live-phone'); } catch (e) {}
    var st = document.createElement('style');
    st.textContent = (C.panelSel || '#panel') + '{display:none!important}'
      + '.tools{display:none!important}'
      + '.pm-badge{position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:2147483647;'
      + 'background:rgba(17,24,39,.82);color:#fff;font:600 11px/1 -apple-system,system-ui,sans-serif;'
      + 'padding:7px 10px;border-radius:999px;pointer-events:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}'
      + '.pm-badge.off{background:rgba(190,40,40,.9)}';
    document.head.appendChild(st);
    var badge = document.createElement('div'); badge.className = 'pm-badge'; badge.textContent = '📱 PCと接続中…';
    document.body.appendChild(badge);
    try { var sv = sessionStorage.getItem('pm-scroll'); if (sv != null) { var y = +sv; requestAnimationFrame(function () { window.scrollTo(0, y); setTimeout(function () { window.scrollTo(0, y); }, 60); }); } } catch (e) {}
    var reloadT = null, firstMsg = true;
    function applyIncoming(text) {
      var d; try { d = JSON.parse(text); } catch (e) { return; }
      if (!(d && typeof d === 'object' && d.store)) return;
      badge.classList.remove('off'); badge.textContent = '📱 PCと同期中';
      /* SSE は接続のたびに前回値(latest)を送るので、前回適用した“生ペイロード”と同じならリロードしない(=チカチカ無限リロード防止)。
         localStorage 比較だと起動時 migration が値を書き換えて常に不一致になり止まらないため、生ペイロードで判定。 */
      var last = null; try { last = sessionStorage.getItem('pm-last'); } catch (e) {}
      if (text === last) return;
      try { sessionStorage.setItem('pm-last', text); } catch (e) {}
      for (var k in d.store) { if (d.store[k] != null) localStorage.setItem(k, d.store[k]); else localStorage.removeItem(k); }
      if (C.shippedGenKey) { try { localStorage.setItem(C.shippedGenKey, '99999999999999'); } catch (e) {} }
      clearTimeout(reloadT);
      reloadT = setTimeout(function () { try { sessionStorage.setItem('pm-scroll', String(window.scrollY || 0)); } catch (e) {} location.reload(); }, firstMsg ? 120 : 260);
      firstMsg = false;
    }
    (function connect() {
      var es; try { es = new EventSource(SYNC + '/events'); } catch (e) { badge.classList.add('off'); badge.textContent = '📱 同期サーバに接続できません'; return; }
      es.onmessage = function (ev) { if (ev && ev.data) applyIncoming(ev.data); };
      es.onerror = function () { badge.classList.add('off'); badge.textContent = '📱 再接続中…'; };
      es.onopen = function () { badge.classList.remove('off'); badge.textContent = '📱 PCと同期中'; };
    })();
    return;
  }

  /* ---------------- PC側 ---------------- */
  window.__phoneModeOn = false;
  function push() {
    if (!window.__phoneModeOn) return;
    var store = {}; for (var i = 0; i < KEYS.length; i++) { try { store[KEYS[i]] = localStorage.getItem(KEYS[i]); } catch (e) {} }
    /* keepalive は付けない: 設定JSONが64KB超だと keepalive fetch は無言で失敗する */
    try { fetch(SYNC + '/push', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ store: store }) }).catch(function () {}); } catch (e) {}
  }
  window.PhoneMode = { push: push };
  /* 保存関数があればラップ(保存 → 配信) */
  try { var fn = C.saveFnName || 'save'; if (typeof window[fn] === 'function') { var _o = window[fn]; window[fn] = function () { var r = _o.apply(this, arguments); try { push(); } catch (e) {} return r; }; } } catch (e) {}

  var css = document.createElement('style');
  css.textContent =
    '.pm-pop{position:fixed;z-index:2147483000;width:250px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;box-shadow:0 12px 40px rgba(16,24,40,.22);padding:14px;font:400 12px/1.5 -apple-system,system-ui,sans-serif;color:#222;display:none}'
    + '.pm-pop.show{display:block}.pm-pop h4{margin:0 0 8px;font-size:12px;font-weight:700}'
    + '.pm-pop .qr{width:190px;height:190px;margin:2px auto 8px;display:block;background:#f4f4f5;border-radius:8px}'
    + '.pm-pop .url{word-break:break-all;background:#f4f4f5;border-radius:7px;padding:6px 8px;font-size:11px;color:#333;margin-bottom:8px}'
    + '.pm-pop .row{display:flex;gap:6px;align-items:center;margin-top:8px}'
    + '.pm-pop button{flex:1;border:1px solid rgba(0,0,0,.1);background:#fff;border-radius:8px;padding:7px;font:600 12px/1 inherit;cursor:pointer}'
    + '.pm-pop button.pri{background:' + ACCENT.btn + ';color:#fff;border-color:' + ACCENT.btn + '}'
    + '.pm-pop .st{font-size:11px;color:#666;margin-top:8px;min-height:15px}.pm-pop .err{color:#c0392b}'
    + '.pm-pop .pm-prompt{display:none;width:100%;margin-top:8px;border:1px dashed rgba(' + ACCENT.a + ',.5);background:' + ACCENT.diffBg + ';color:' + ACCENT.fg + ';border-radius:8px;padding:8px;font:600 11px/1.35 inherit;cursor:pointer;text-align:center}.pm-pop .pm-prompt.show{display:block}'
    + '.pm-banner{display:none;gap:6px;align-items:center;justify-content:center;font:600 11px/1.35 -apple-system,system-ui,sans-serif;color:' + ACCENT.fg + ';background:linear-gradient(90deg,rgba(' + ACCENT.a + ',.12),rgba(' + ACCENT.b + ',.16));border-top:1px solid rgba(' + ACCENT.a + ',.28);border-bottom:1px solid rgba(' + ACCENT.a + ',.28);padding:7px 12px;text-align:center}'
    + '.pm-banner b{font-weight:800}'
    + 'html.phone-mode .pm-banner{display:flex}'
    + 'html.phone-mode ' + (C.panelSel || '#panel') + '{box-shadow:0 0 0 2px rgba(' + ACCENT.a + ',.5),0 14px 40px rgba(16,24,40,.22)}'
    + 'html.phone-mode ' + (C.fontRowSel || '.txt-row') + '.mb-override>label{color:' + ACCENT.fg + ';font-weight:600}'
    + 'html.phone-mode ' + (C.fontRowSel || '.txt-row') + '.mb-override>label::before{content:"● ";color:' + ACCENT.dot + ';font-size:8px;vertical-align:middle}'
    + 'html.phone-mode ' + (C.fontRowSel || '.txt-row') + ' .mb-diff{border-color:' + ACCENT.dot + '!important;background:' + ACCENT.diffBg + ';color:' + ACCENT.fg + ';font-weight:600}';
  document.head.appendChild(css);

  /* トリガー: ヘッダーのボタン(あれば)／無ければ右下FAB */
  var trigger = C.headBtnSel ? document.querySelector(C.headBtnSel) : null;
  if (trigger) { trigger.hidden = false; }
  else { trigger = document.createElement('div'); trigger.textContent = '📱'; trigger.title = 'スマホモード'; trigger.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;width:44px;height:44px;border-radius:50%;border:1px solid rgba(0,0,0,.08);background:#fff;box-shadow:0 6px 20px rgba(16,24,40,.18);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center'; document.body.appendChild(trigger); }
  function setBtnText(on) { if (!trigger) return; if (trigger.tagName === 'BUTTON') trigger.textContent = on ? '📱 スマホモード中' : '📱 スマホモード'; }

  var pop = document.createElement('div'); pop.className = 'pm-pop';
  pop.innerHTML = '<h4>📱 スマホモード（実機プレビュー）</h4><img class="qr" alt="QR"><div class="url">読み込み中…</div><div class="st"></div>'
    + '<button id="pmPrompt" class="pm-prompt">📋 起動プロンプトをコピー（Claudeに貼る）</button>'
    + '<div class="row"><button id="pmCopy">URLコピー</button><button class="pri" id="pmStop">スマホモード終了</button></div>';
  document.body.appendChild(pop);
  var banner = document.createElement('div'); banner.className = 'pm-banner'; banner.innerHTML = '📱 <b>スマホモード</b>：この画面の調整が、同期中のスマホ実機に反映されます';
  var bref = C.bannerBeforeSel && document.querySelector(C.bannerBeforeSel);
  if (bref && bref.parentNode) bref.parentNode.insertBefore(banner, bref); else document.body.appendChild(banner);
  var qrImg = pop.querySelector('.qr'), urlEl = pop.querySelector('.url'), stEl = pop.querySelector('.st'),
      copyBtn = pop.querySelector('#pmCopy'), stopBtn = pop.querySelector('#pmStop'), promptBtn = pop.querySelector('#pmPrompt');
  var phoneUrl = '', statusT = null;
  var START_PROMPT = C.startPrompt || 'スマホモード（実機ライブ同期）の中継サーバが起動していないようです。起動してください。\n\ncd settings/tune-panel/phone-mode && (test -d node_modules || npm install) && node server.mjs';

  function refreshStatus() {
    fetch(SYNC + '/ip').then(function (r) { return r.json(); }).then(function (j) {
      phoneUrl = j.phoneUrl; urlEl.textContent = phoneUrl; urlEl.classList.remove('err');
      qrImg.src = SYNC + '/qr?t=' + Date.now(); stEl.classList.remove('err'); promptBtn.classList.remove('show');
      stEl.textContent = window.__phoneModeOn ? ('同期ON ・ つないでいるスマホ ' + (j.clients || 0) + '台') : ('スマホでこのQRを読むと同期プレビューが開きます');
    }).catch(function () {
      urlEl.textContent = '同期サーバが起動していません'; urlEl.classList.add('err'); qrImg.removeAttribute('src');
      stEl.classList.add('err'); stEl.textContent = 'このボタンでプロンプトをコピーして Claude に貼ると起動できます↓'; promptBtn.classList.add('show');
    });
  }
  function positionPop() {
    if (pop.__dragged) return;   /* 手で動かした後は自動配置しない */
    var pw = pop.offsetWidth || 250, ph = pop.offsetHeight || 320, pad = 12, left, top;
    /* パネルに重ならないよう、パネルの反対側に出す(左端なら右・右端なら左) */
    var panel = (C.panelSel && document.querySelector(C.panelSel)) || (trigger && trigger.closest && trigger.closest('.tools'));
    var pr = panel ? panel.getBoundingClientRect() : (trigger ? trigger.getBoundingClientRect() : null);
    if (pr) {
      var mid = pr.left + pr.width / 2;
      left = (mid < window.innerWidth / 2) ? (pr.right + pad) : (pr.left - pw - pad);
      if (left + pw > window.innerWidth - pad) left = pr.left - pw - pad;
      if (left < pad) left = pr.right + pad;
      top = pr.top;
    } else { left = window.innerWidth - pw - pad; top = pad; }
    left = Math.max(pad, Math.min(left, window.innerWidth - pw - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - ph - pad));   /* 必ず画面内に */
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  function showPop() { pop.__dragged = false; pop.classList.add('show'); positionPop(); requestAnimationFrame(positionPop); refreshStatus(); clearInterval(statusT); statusT = setInterval(refreshStatus, 3000); window.addEventListener('resize', positionPop); }
  /* QRポップアップを見出しでドラッグ移動 */
  (function () { var h = pop.querySelector('h4'); if (!h) return; h.style.cursor = 'move'; h.style.userSelect = 'none'; var sx, sy, sl, st, drag = false;
    h.addEventListener('pointerdown', function (e) { drag = true; pop.__dragged = true; sx = e.clientX; sy = e.clientY; var r = pop.getBoundingClientRect(); sl = r.left; st = r.top; try { h.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    h.addEventListener('pointermove', function (e) { if (!drag) return; var pad = 6, nl = sl + (e.clientX - sx), nt = st + (e.clientY - sy); nl = Math.max(pad, Math.min(nl, window.innerWidth - pop.offsetWidth - pad)); nt = Math.max(pad, Math.min(nt, window.innerHeight - pop.offsetHeight - pad)); pop.style.left = nl + 'px'; pop.style.top = nt + 'px'; });
    var end = function (e) { drag = false; try { h.releasePointerCapture(e.pointerId); } catch (x) {} }; h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  })();
  function hidePop() { pop.classList.remove('show'); clearInterval(statusT); window.removeEventListener('resize', positionPop); }

  /* ---- レスポンシブ値(モバイルCSSで上書きされる文字プロパティ)をオレンジで ---- */
  var _rules = null;
  function collectMobileFontRules() {
    var FONT = ['font-size', 'font-weight', 'line-height', 'letter-spacing'], out = [];
    function scan(rules, mob) { for (var i = 0; i < rules.length; i++) { var r = rules[i];
      if (r.type === 4 && r.media) { var mm = (r.media.mediaText || '').match(/max-width:\s*(\d+)px/); scan(r.cssRules || [], mob || !!(mm && +mm[1] <= 640)); }
      else if (r.type === 1 && r.selectorText) { var sel = r.selectorText; if (!(mob || /html\.mb\b/.test(sel))) continue; var pr = FONT.filter(function (q) { return r.style.getPropertyValue(q); }); if (pr.length) out.push({ sel: sel.replace(/html\.mb\b\s*/g, '').replace(/html:not\(\.mb\)\b\s*/g, ''), props: pr }); } } }
    for (var k = 0; k < document.styleSheets.length; k++) { try { scan(document.styleSheets[k].cssRules || [], false); } catch (e) {} }
    return out;
  }
  function markMbOverrides() {
    if (!document.documentElement.classList.contains('phone-mode') || !C.fontRowSel || !C.rowElOf) return;
    if (!_rules) _rules = collectMobileFontRules();
    var rows = document.querySelectorAll(C.fontRowSel);
    for (var i = 0; i < rows.length; i++) { var row = rows[i], sel = C.rowElOf(row), el = null;
      try { el = sel ? document.querySelector(sel) : null; } catch (e) {}
      var props = {}; if (el) for (var j = 0; j < _rules.length; j++) { try { if (el.matches(_rules[j].sel)) _rules[j].props.forEach(function (q) { props[q] = 1; }); } catch (e) {} }
      row.classList.toggle('mb-override', Object.keys(props).length > 0);
      var inp = row.querySelectorAll('[data-prop]'); for (var m = 0; m < inp.length; m++) inp[m].classList.toggle('mb-diff', !!props[inp[m].dataset.prop]);
    }
  }
  window.__phoneMarkMb = markMbOverrides;

  function setActive(on) {
    window.__phoneModeOn = !!on;
    try { document.documentElement.classList.toggle('phone-mode', !!on); } catch (e) {}
    if (trigger && trigger.classList) trigger.classList.toggle('on', !!on);
    setBtnText(on);
    if (on) { setTimeout(markMbOverrides, 60); push(); } else { var r = document.querySelectorAll('.mb-override,.mb-diff'); for (var i = 0; i < r.length; i++) { r[i].classList.remove('mb-override'); r[i].classList.remove('mb-diff'); } }
  }
  trigger.addEventListener('click', function (e) { e.stopPropagation();
    if (!window.__phoneModeOn) { setActive(true); showPop(); }
    else if (pop.classList.contains('show')) hidePop(); else showPop();
  });
  trigger.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  stopBtn.addEventListener('click', function () { setActive(false); hidePop(); });
  copyBtn.addEventListener('click', function () { if (!phoneUrl) return; try { navigator.clipboard.writeText(phoneUrl); copyBtn.textContent = 'コピーしました'; setTimeout(function () { copyBtn.textContent = 'URLコピー'; }, 1200); } catch (e) {} });
  promptBtn.addEventListener('click', function () { try { navigator.clipboard.writeText(START_PROMPT); promptBtn.textContent = '✅ コピーしました（Claudeに貼ってください）'; setTimeout(function () { promptBtn.textContent = '📋 起動プロンプトをコピー（Claudeに貼る）'; }, 2000); } catch (e) {} });
})();
