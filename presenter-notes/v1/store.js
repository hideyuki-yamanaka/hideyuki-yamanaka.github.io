/* presenter-notes v1 — 共有ヘルパー
 * 3ウィンドウ（設定/発表/カンペ）が localStorage と BroadcastChannel で会話する。
 * localStorage … 設定・複数デッキ（プレゼン）の原稿を保存（本体）
 * BroadcastChannel … 「今このページに来た」等をリアルタイムに飛ばす
 *
 * ■ 何がどこに紐づくか（重要）
 *  - client-id … アカウント（=OAuthアプリ）に1回。どのFigmaプロトでも永久に使い回す。デッキ非依存。
 *  - デッキ（プレゼン）… { name, url(Figmaプロト), scripts(原稿) } を何個でも保存し、切り替えて使う。
 *    → 新しいプレゼンは「デッキを足してURLを貼る」だけ。Figma側の設定はもう触らない。
 */
/* 自動更新（チラつきなし）
 *  - 見た目(CSS)の変更 … リロードせずその場で差し替え。画面は一切消えない
 *  - それ以外の変更   … ウィンドウが裏に回っている間に静かに適用（見えている時は待つ）
 *  - 共有スライド      … window.PN_NO_RELOAD = true を立てて一切リロードしない（発表中の事故防止）
 *  - 入力中            … 書きかけを失わないよう保留 */
(function liveUpdate() {
  let known = null;      // 最後に確認したバージョン
  let pending = false;   // 反映待ち（リロードが要る変更）

  function swapCss(v) {  // CSSだけ入れ替える＝再描画のみでチラつかない
    document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
      const href = l.getAttribute('href') || '';
      if (!href || /^https?:/i.test(href)) return;      // 外部フォント等はそのまま
      l.setAttribute('href', href.split('?')[0] + '?v=' + v);
    });
  }

  async function check() {
    try {
      const r = await fetch('version.txt?_=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const v = (await r.text()).trim();
      if (known === null) { known = v; return; }
      if (v !== known) { known = v; pending = true; swapCss(v); }   // 見た目は即反映
      if (!pending) return;
      if (window.PN_NO_RELOAD) return;                  // 共有スライドはリロードしない
      const t = document.activeElement && document.activeElement.tagName;
      if (t === 'TEXTAREA' || t === 'INPUT') return;    // 入力中は待つ
      if (!document.hidden) return;                     // 見えている間は待つ（チラつき防止）
      try { sessionStorage.setItem('pn_autoreload', '1'); } catch (e) {}
      pending = false;
      location.reload();
    } catch (e) {}
  }
  check();
  setInterval(check, 4000);
})();

window.PN = (function () {
  const CHANNEL = 'presenter-notes-v1';
  const K_FONT = 'pn_font';       // カンペの文字サイズ(px)   … 全体設定
  const K_CID = 'pn_client_id';   // Figma OAuthアプリの client-id … 全体設定（デッキ非依存）
  const K_TOKEN = 'pn_figma_token'; // Figma 個人アクセストークン（サムネイル画像取得用・任意）
  const K_NOTION_TOKEN = 'pn_notion_token'; // Notion 連携トークン（バックアップ用・任意）
  const K_DECKS = 'pn_decks';     // { activeId, order:[id...], decks:{ id:{name,url,scripts} } }
  // 旧バージョンのキー（1組だけ持っていた時代）。読み込んでデッキへ移行する。
  const K_OLD_URL = 'pn_url';
  const K_OLD_SCRIPTS = 'pn_scripts';

  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel(CHANNEL) : null;

  // nodeId の表記ゆれ（"15242-316" と "15242:316"）を ":" 表記に統一する
  function normId(id) { return String(id || '').replace(/-/g, ':').trim(); }
  function uid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function emptyScripts() { return { order: [], cards: {} }; }

  function post(msg) { if (bc) bc.postMessage(msg); }
  function onMessage(fn) { if (bc) bc.addEventListener('message', (e) => fn(e.data)); }

  // ---- 全体設定 ----
  function getClientId() { return (localStorage.getItem(K_CID) || '').trim(); }
  function setClientId(v) { localStorage.setItem(K_CID, (v || '').trim()); }
  function getFigmaToken() { return (localStorage.getItem(K_TOKEN) || '').trim(); }
  function setFigmaToken(v) { localStorage.setItem(K_TOKEN, (v || '').trim()); }
  function getNotionToken() { return (localStorage.getItem(K_NOTION_TOKEN) || '').trim(); }
  function setNotionToken(v) { localStorage.setItem(K_NOTION_TOKEN, (v || '').trim()); }
  // Notion バックアップ先ページはプレゼン（デッキ）ごとに持つ
  function getNotionPage() { return (getActiveDeck().notionPage || '').trim(); }
  function setNotionPage(v) { const d = loadDecks(); d.decks[d.activeId].notionPage = (v || '').trim(); saveDecks(d); }
  function getFont() { return parseInt(localStorage.getItem(K_FONT) || '18', 10); }
  function setFont(px) { localStorage.setItem(K_FONT, String(px)); }

  // ---- デッキ（プレゼン）本体 ----
  function loadDecks() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(K_DECKS)); } catch (e) {}
    if (!d || !d.decks || !Array.isArray(d.order) || !d.order.length) {
      d = migrateOrInit();
    }
    // 壊れ対策：activeId が無ければ先頭
    if (!d.decks[d.activeId]) d.activeId = d.order[0];
    return d;
  }
  function saveDecks(d) { localStorage.setItem(K_DECKS, JSON.stringify(d)); }

  // 旧データ（pn_url / pn_scripts）があればデッキ1へ移行。無ければ空デッキ1個で開始。
  function migrateOrInit() {
    const oldUrl = localStorage.getItem(K_OLD_URL) || '';
    let oldScripts = emptyScripts();
    try {
      const s = JSON.parse(localStorage.getItem(K_OLD_SCRIPTS));
      if (s && Array.isArray(s.order) && s.cards) oldScripts = s;
    } catch (e) {}
    const id = uid();
    const d = { activeId: id, order: [id], decks: {} };
    d.decks[id] = { name: 'プレゼン1', url: oldUrl, scripts: oldScripts };
    saveDecks(d);
    // 旧キーは役目を終えたので掃除（残っても害はないが混乱の元）
    try { localStorage.removeItem(K_OLD_URL); localStorage.removeItem(K_OLD_SCRIPTS); } catch (e) {}
    return d;
  }

  function listDecks() { const d = loadDecks(); return d.order.map((id) => ({ id, name: d.decks[id].name })); }
  function getActiveDeckId() { return loadDecks().activeId; }
  function getActiveDeck() { const d = loadDecks(); const id = d.activeId; return Object.assign({ id }, d.decks[id]); }

  function setActiveDeckId(id) {
    const d = loadDecks();
    if (!d.decks[id]) return;
    // 【重要】同じプレゼンを開き直しただけの時は放送しない。
    // deck-changed は発表タブのリロードとカンペの初期化を引き起こすので、
    // 発表中にエディターを開くと再生中の画面が1枚目に戻ってしまう。
    const same = (d.activeId === id);
    d.activeId = id; saveDecks(d);
    if (!same) post({ type: 'deck-changed', deckId: id });
  }
  function createDeck(name) {
    const d = loadDecks();
    const id = uid();
    d.decks[id] = { name: name || ('プレゼン' + (d.order.length + 1)), url: '', scripts: emptyScripts() };
    d.order.push(id);
    d.activeId = id;
    saveDecks(d);
    post({ type: 'deck-changed', deckId: id });
    return id;
  }
  function renameDeck(id, name) {
    const d = loadDecks();
    if (d.decks[id]) { d.decks[id].name = name || d.decks[id].name; saveDecks(d); post({ type: 'decks-updated' }); }
  }
  function deleteDeck(id) {
    const d = loadDecks();
    if (!d.decks[id]) return;
    delete d.decks[id];
    d.order = d.order.filter((x) => x !== id);
    if (!d.order.length) { // 最後の1個を消したら空デッキを作る
      const nid = uid(); d.decks[nid] = { name: 'プレゼン1', url: '', scripts: emptyScripts() }; d.order = [nid]; d.activeId = nid;
    } else if (id === d.activeId) {
      d.activeId = d.order[0];
    }
    saveDecks(d);
    post({ type: 'deck-changed', deckId: d.activeId });
  }

  // ---- アクティブなデッキに対する読み書き（present/notes はこれ経由で正しいデッキを見る）----
  function getUrl() { return getActiveDeck().url || ''; }
  function setUrl(v) {
    const d = loadDecks(); d.decks[d.activeId].url = v || ''; saveDecks(d);
  }
  function loadScripts() {
    const s = getActiveDeck().scripts;
    return (s && Array.isArray(s.order) && s.cards) ? s : emptyScripts();
  }
  function saveScripts(s) {
    const d = loadDecks(); d.decks[d.activeId].scripts = s; saveDecks(d);
  }

  // 新しい nodeId を来た順に登録（無ければ足す）。返り値は 1始まりのページ番号。
  function ensureCard(rawId) {
    const id = normId(rawId);
    if (!id) return -1;
    const s = loadScripts();
    if (!s.order.includes(id)) {
      s.order.push(id);
      s.cards[id] = s.cards[id] || { label: '', script: '' };
      saveScripts(s);
      post({ type: 'scripts-updated' });
    }
    return s.order.indexOf(id) + 1;
  }

  // ---- 軽量モード：スライド画像をローカル(IndexedDB)に保存し、回線が切れても表示できるようにする ----
  const K_LIGHT = 'pn_light';
  function isLightMode() { return localStorage.getItem(K_LIGHT) === '1'; }
  function setLightMode(v) { localStorage.setItem(K_LIGHT, v ? '1' : '0'); }

  let _dbPromise = null;
  function _db() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('pn-slides', 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('img'); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return _dbPromise;
  }
  async function putImg(deckId, nodeId, blob) {
    const db = await _db();
    return new Promise((res, rej) => {
      const tx = db.transaction('img', 'readwrite');
      tx.objectStore('img').put(blob, deckId + '|' + nodeId);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  }
  async function getImg(deckId, nodeId) {
    const db = await _db();
    return new Promise((res) => {
      const tx = db.transaction('img', 'readonly');
      const r = tx.objectStore('img').get(deckId + '|' + nodeId);
      r.onsuccess = () => res(r.result || null); r.onerror = () => res(null);
    });
  }
  async function countImg(deckId, nodeIds) {
    let n = 0; for (const id of nodeIds) { if (await getImg(deckId, id)) n++; } return n;
  }

  return {
    CHANNEL, normId,
    getClientId, setClientId,
    getFigmaToken, setFigmaToken,
    getNotionToken, setNotionToken, getNotionPage, setNotionPage,
    isLightMode, setLightMode, putImg, getImg, countImg,
    getFont, setFont,
    // デッキ
    listDecks, getActiveDeck, getActiveDeckId, setActiveDeckId,
    createDeck, renameDeck, deleteDeck,
    // アクティブデッキへの読み書き
    getUrl, setUrl, loadScripts, saveScripts, ensureCard,
    post, onMessage,
  };
})();
