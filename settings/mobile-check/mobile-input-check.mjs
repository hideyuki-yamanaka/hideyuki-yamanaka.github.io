#!/usr/bin/env node
/*
 * mobile-input-check.mjs — スマホの入力まわりの検査（ルール集 RULES.md 5-3）
 *
 * iPhone の大きさで手元の画面を開き、キーボードが出た状態を作って、初歩的な落とし穴を一覧にする。何も書き換えない。
 *   🔴 キーボードの裏に隠れる … 画面に貼りついた所（下から出るシート・下のボタンなど）の入力欄やボタンが、キーボードを出すと見えなくなる
 *   🔴 iPhone が勝手に拡大する … 入力欄の文字が 16px 未満（触ると画面が拡大されたままになる）
 *   🟡 キーボードの種類 … 電話・メール・郵便番号らしい欄なのに、合うキーボードが出ない
 *   参考 押しにくい … 押せる物が 44px 四方より小さい
 *
 *   node settings/mobile-check/mobile-input-check.mjs <URL> [--step "click:編集"] [--step "wait:800"] [--step "js:<コード>"]
 *     --step は書いた順に行う（画面を開いてから、シートを出すまでの操作）。click: は文字が一致する物を押す
 *     --shot 画像.png（最初に測った入力欄でキーボードを出した所を撮る）／--kb 336（キーボードの高さ）
 *     --no-lift（比べる用：キーボードが出たことを画面に知らせない＝見えている範囲に合わせていない作りと同じ見え方）
 *   終わりのコード: 🔴 が1つでもあれば 1
 *
 * キーボードの作り方：iPhone はキーボードが出ても画面の大きさは変えず、「見えている範囲（visualViewport）」だけを縮める。
 *   その動きをまねて visualViewport を縮め、灰色の帯をキーボードの代わりに置く。
 *   画面に貼りついていない入力欄は iPhone が自分でスクロールして見せるので、貼りついた所（fixed・sticky）の中だけを測る。
 * Playwright は design-gallery のものを借りる。
 * 【2026-10-30】家庭訪問アプリで、項目を足す入力欄がキーボードの裏に隠れていた。ヒデさん「そういった初歩的なミスに関しては、
 *   事前に解決することをメモリに記憶しておいて。どうやって対処するかを考えて」→ 作る時に先回りで測るための道具として作った
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pw = createRequire(import.meta.url)(path.join(here, '../../design-gallery/node_modules/playwright'));

/* ---------------- 引数 ---------------- */
const argv = process.argv.slice(2);
let url = '', shot = '', KB = 336, noLift = false;
const steps = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--step') steps.push(argv[++i]);
  else if (a === '--shot') shot = argv[++i];
  else if (a === '--kb') KB = Number(argv[++i]);
  else if (a === '--no-lift') noLift = true;
  else if (!a.startsWith('--')) url = a;
}
if (!url) {
  console.log('使い方: node settings/mobile-check/mobile-input-check.mjs <URL> [--step "click:編集"] [--shot 画像.png]');
  process.exit(2);
}

/* ---------------- 画面の中で動かす物 ---------------- */
/* キーボードの代わり（iPhone と同じく、見えている範囲だけを縮める） */
function fakeKeyboard({ noLift }) {
  const ev = new EventTarget();
  const vv = {
    width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1,
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
  window.__kb = (h) => {
    vv.height = innerHeight - h;
    if (!noLift) ev.dispatchEvent(new Event('resize'));
    let k = document.getElementById('__fakekb');
    if (!h) { if (k) k.remove(); return; }
    if (!k) { k = document.createElement('div'); k.id = '__fakekb'; document.body.appendChild(k); }
    k.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${h}px;background:rgba(80,80,80,.92);z-index:2147483647;color:#fff;font:14px sans-serif;display:flex;align-items:center;justify-content:center;pointer-events:none`;
    k.textContent = 'キーボード（ここは隠れる）';
  };
}

/* 入力欄を集めて、名前・文字の大きさ・種類・貼りついているかを返す */
function collectFields() {
  const vis = (el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight;
  };
  const SKIP = /^(hidden|checkbox|radio|file|range|color|submit|button|reset|image)$/;
  const pinned = (el) => { for (let a = el; a && a !== document.documentElement; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
  const short = (t) => (t || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  /* 欄の名前：aria-label → label → 同じ行の短い文字 → placeholder */
  const nameOf = (el) => {
    const own = el.getAttribute('aria-label') || (el.labels && el.labels[0] && el.labels[0].textContent);
    if (own) return short(own);
    let row = el.parentElement;
    for (let d = 0; row && d < 4; d++, row = row.parentElement) {
      const leaf = [...row.querySelectorAll('*')].find((x) => x.childElementCount === 0 && !el.contains(x) && !x.contains(el) && x.tagName !== 'OPTION' && /\S/.test(x.textContent) && x.textContent.trim().length <= 12);
      if (leaf) return short(leaf.textContent);
    }
    return short(el.placeholder || el.name || el.tagName.toLowerCase());
  };
  return [...document.querySelectorAll('input, textarea, select, [contenteditable="true"]')]
    .filter((el) => !(el.tagName === 'INPUT' && SKIP.test(el.type)) && vis(el))
    .map((el, i) => {
      el.dataset.micI = String(i);
      return {
        i, name: nameOf(el), tag: el.tagName.toLowerCase(), type: el.type || '', inputmode: el.inputMode || '',
        fs: parseFloat(getComputedStyle(el).fontSize), pinned: pinned(el),
        hint: [el.getAttribute('aria-label'), el.placeholder, el.name, el.id, nameOf(el)].filter(Boolean).join(' '),
      };
    });
}

/* 貼りついた入れ物の中の、押せる物の位置 */
function buttonsInHost(i) {
  const el = document.querySelector(`[data-mic-i="${i}"]`);
  let host = el;
  while (host && host !== document.documentElement && !['fixed', 'sticky'].includes(getComputedStyle(host).position)) host = host.parentElement;
  if (!host || host === document.documentElement) return [];
  return [...host.querySelectorAll('button, [role="button"], a[href], input[type="submit"]')]
    .map((b, k) => { b.dataset.micB = `${i}-${k}`; const r = b.getBoundingClientRect(); return { id: `${i}-${k}`, name: (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16), top: Math.round(r.top), bottom: Math.round(r.bottom), w: r.width, h: r.height }; })
    .filter((b) => b.w > 0 && b.h > 0);
}

/* ---------------- 本体 ---------------- */
const browser = await pw.chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(fakeKeyboard, { noLift });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

for (const s of steps) {
  const [kind, ...rest] = s.split(':');
  const val = rest.join(':');
  if (kind === 'wait') { await p.waitForTimeout(Number(val)); continue; }
  if (kind === 'js') { await p.evaluate(val); await p.waitForTimeout(500); continue; }
  if (kind === 'click') {
    /* 押す前に画面の真ん中へ出し、スクロールが止まってから押す（画面が動くと閉じる一覧があるため） */
    const found = await p.evaluate((t) => {
      const ok = (x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden'; };
      const cand = [...document.querySelectorAll('button, a, [role="button"], label, [tabindex]')].filter((x) => ok(x) && x.textContent.replace(/\s+/g, ' ').trim() === t);
      const el = cand[0] || [...document.querySelectorAll('*')].find((x) => x.childElementCount === 0 && ok(x) && x.textContent.trim() === t);
      if (!el) return false;
      el.dataset.micClick = '1';
      el.scrollIntoView({ block: 'center' });
      return true;
    }, val);
    if (!found) { console.log(`⚠️ 押す物が見つかりません: 「${val}」`); await browser.close(); process.exit(2); }
    await p.waitForTimeout(700);
    await p.evaluate(() => { const el = document.querySelector('[data-mic-click]'); el.removeAttribute('data-mic-click'); el.click(); });
    await p.waitForTimeout(700);
    continue;
  }
  console.log(`⚠️ 分からない操作です: ${s}`); await browser.close(); process.exit(2);
}

const meta = await p.evaluate(() => (document.querySelector('meta[name="viewport"]') || {}).content || '');
const noZoom = /maximum-scale\s*=\s*1(\.0)?\b/.test(meta);
const fields = await p.evaluate(collectFields);
const rows = [];   /* { lv:'🔴'|'🟡'|'参考', what, where, detail } */

/* 文字の大きさ・キーボードの種類 */
for (const f of fields) {
  if (f.tag !== 'select' && f.fs < 16) rows.push({ lv: noZoom ? '🟡' : '🔴', what: 'iPhone が勝手に拡大する', where: f.name, detail: `入力欄の文字 ${f.fs}px（16px 以上に）${noZoom ? '・拡大は止めてあるが、拡大できない画面になっている' : ''}` });
  const kb = f.type === 'tel' || f.inputmode === 'tel' ? 'tel' : f.type === 'email' || f.inputmode === 'email' ? 'email' : /numeric|decimal/.test(f.inputmode) || f.type === 'number' ? 'num' : '';
  if (/電話|TEL|携帯|phone/i.test(f.hint) && kb !== 'tel') rows.push({ lv: '🟡', what: 'キーボードの種類', where: f.name, detail: '電話の欄 → type="tel"' });
  else if (/メール|mail/i.test(f.hint) && kb !== 'email') rows.push({ lv: '🟡', what: 'キーボードの種類', where: f.name, detail: 'メールの欄 → type="email"' });
  else if (/郵便|〒|zip|postal/i.test(f.hint) && !kb) rows.push({ lv: '🟡', what: 'キーボードの種類', where: f.name, detail: '郵便番号の欄 → inputmode="numeric"' });
}

/* キーボードの裏に隠れないか（貼りついた所の中の入力欄だけ） */
let shotDone = false;
for (const f of fields.filter((x) => x.pinned)) {
  await p.evaluate((i) => document.querySelector(`[data-mic-i="${i}"]`).focus({ preventScroll: true }), f.i);
  const before = await p.evaluate(buttonsInHost, f.i);
  await p.evaluate((h) => window.__kb(h), KB);
  await p.waitForTimeout(450);
  const r = await p.evaluate(({ i, kb }) => {
    const el = document.querySelector(`[data-mic-i="${i}"]`), rr = el.getBoundingClientRect();
    return { kbTop: innerHeight - kb, bottom: Math.round(rr.bottom), focused: document.activeElement === el };
  }, { i: f.i, kb: KB });
  const after = await p.evaluate(buttonsInHost, f.i);
  if (r.bottom > r.kbTop + 1) rows.push({ lv: '🔴', what: 'キーボードの裏に隠れる', where: f.name, detail: `入力欄の下 ${r.bottom}px ＞ キーボードの上 ${r.kbTop}px` });
  for (const b of after) {
    const was = before.find((x) => x.id === b.id);
    if (was && was.bottom <= 844 && b.bottom > r.kbTop + 1) rows.push({ lv: '🔴', what: 'キーボードの裏に隠れる', where: `${f.name} のボタン「${b.name}」`, detail: `ボタンの下 ${b.bottom}px ＞ キーボードの上 ${r.kbTop}px` });
  }
  if (shot && !shotDone) { await p.screenshot({ path: shot }); shotDone = true; }
  await p.evaluate(() => { window.__kb(0); if (document.activeElement) document.activeElement.blur(); });
  await p.waitForTimeout(300);
}
if (shot && !shotDone) await p.screenshot({ path: shot });

/* 押しにくい（参考） */
const small = await p.evaluate(() => [...document.querySelectorAll('button, a[href], [role="button"]')]
  .map((b) => { const r = b.getBoundingClientRect(); return { name: (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(b).visibility !== 'hidden' }; })
  .filter((b) => b.vis && (b.w < 44 || b.h < 44)));
for (const b of small.slice(0, 8)) rows.push({ lv: '参考', what: '押しにくい', where: b.name || '（名前なし）', detail: `${b.w}×${b.h}px（44px 四方より小さい）` });
if (small.length > 8) rows.push({ lv: '参考', what: '押しにくい', where: `ほか ${small.length - 8} 個`, detail: '' });

/* ---------------- 結果 ---------------- */
const red = rows.filter((x) => x.lv === '🔴').length, yellow = rows.filter((x) => x.lv === '🟡').length;
console.log(`\nスマホの入力まわりの検査 … ${url}${steps.length ? `（操作: ${steps.join(' → ')}）` : ''}${noLift ? '（比べる用: --no-lift）' : ''}`);
console.log(`入力欄 ${fields.length} 個（うち画面に貼りついた所 ${fields.filter((x) => x.pinned).length} 個）・キーボードの高さ ${KB}px`);
if (!rows.length) console.log('✅ 落とし穴は見つかりませんでした');
else {
  console.log('\n| 判定 | 落とし穴 | 場所 | 中身 |\n|---|---|---|---|');
  for (const x of rows) console.log(`| ${x.lv} | ${x.what} | ${x.where} | ${x.detail} |`);
}
console.log(`\n🔴 ${red} 件・🟡 ${yellow} 件${shot ? `・撮った画像: ${shot}` : ''}`);
if (errors.length) console.log(`⚠️ 画面のエラー: ${errors.slice(0, 3).join(' / ')}`);
await browser.close();
process.exit(red ? 1 : 0);
