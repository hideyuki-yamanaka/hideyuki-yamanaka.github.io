/* 調整パネル（tune-panel.js v2）の自動検査
 *
 *   node settings/tune-panel/test/check.mjs
 *
 * ・見本ページ（demo/index.html）を小さな静的サーバーで配信し、Playwright の Chromium で実際に触って確かめる
 * ・結果は「項目／結果／測った値」の表で出す。1つでも ❌ があれば終了コード 1
 * ・スクショは test/shots/ に保存する（PC 1440×900・スマホ 390×844）
 * ・Playwright は design-gallery のものを借りる（このフォルダには入れない）
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');                     /* settings/tune-panel */
const SHOTS = path.join(HERE, 'shots');
const PW_CANDIDATES = [
  path.resolve(ROOT, '../../design-gallery/node_modules/playwright/index.mjs'),
  '/Users/hideyuki/Developer/Claude Code/design-gallery/node_modules/playwright/index.mjs'
];
const pwPath = PW_CANDIDATES.find(p => fs.existsSync(p));
if (!pwPath) { console.error('Playwright が見つかりません（design-gallery/node_modules/playwright）'); process.exit(2); }
const { chromium } = await import(pwPath);
fs.mkdirSync(SHOTS, { recursive: true });

/* ---------- 小さな静的サーバー ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.normalize(path.join(ROOT, p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const URL0 = `http://localhost:${PORT}/demo/index.html`;

const browser = await chromium.launch();
const results = [];
const rec = (name, ok, measured) => { results.push({ name, ok: !!ok, measured: String(measured) }); console.log((ok ? '✅' : '❌') + ' ' + name + ' — ' + measured); };
const pageErrors = [];

async function newPage(w = 1440, h = 900, ctx) {
  const context = ctx || await browser.newContext({ viewport: { width: w, height: h }, acceptDownloads: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
  return { context, page };
}
async function open(page, url = URL0) {
  await page.goto(url);
  await page.waitForFunction(() => window.TunePanel && TunePanel.instances.length > 0);
  await page.waitForTimeout(120);
}
/* 右下の透明な四角を押してパネルを出す */
async function showPanel(page) {
  const vp = page.viewportSize();
  await page.mouse.click(vp.width - 6, vp.height - 6);
  await page.waitForTimeout(250);
}
const P = 'TunePanel.instances[0]';
async function tab(page, name) { await page.click(`.tp-tab[data-tab="${name}"]`); await page.waitForTimeout(120); }
async function val(page, key) { return page.evaluate(([k]) => TunePanel.instances[0].value(k), [key]); }
async function pc(page, p) { return page.evaluate(([pp]) => TunePanel.utils.getPath(TunePanel.instances[0].params, pp), [p]); }
async function sig(page) { return page.evaluate(() => window.__demoSig()); }
/* スライダーを動かす（input → change。離した時の扱いまで通す） */
async function setSlider(page, key, v) {
  return page.evaluate(([k, x]) => {
    const inp = document.querySelector(`.tp-item[data-key="${k}"] input[type=range]`);
    if (!inp) return null;
    inp.value = x;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return { value: +inp.value, min: +inp.min, max: +inp.max };
  }, [key, v]);
}
/* 数値を直接打ち込む（右の値を押す → 入力 → Enter） */
async function typeValue(page, key, v) {
  await page.click(`.tp-item[data-key="${key}"] .tp-val`);
  await page.fill(`.tp-item[data-key="${key}"] .tp-num`, String(v));
  await page.press(`.tp-item[data-key="${key}"] .tp-num`, 'Enter');
  await page.waitForTimeout(60);
}
async function pickVariant(page, pillPath, value) {
  await page.click(`.tp-item[data-key="${pillPath}"] .tp-pill[data-value="${value}"]`, { position: { x: 6, y: 6 } });
  await page.waitForTimeout(120);
}
async function pillMenu(page, pillPath, value, entryStartsWith) {
  const pill = page.locator(`.tp-item[data-key="${pillPath}"] .tp-pill[data-value="${value}"]`).first();
  await pill.hover();
  await pill.locator('.tp-pill-x').click();
  await page.waitForSelector('.tp-pmenu');
  const btn = page.locator('.tp-pmenu button', { hasText: entryStartsWith }).first();
  await btn.click();
  await page.waitForTimeout(120);
}
async function lsDump(page) { return page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; }); }
/* ヒデさんに見せる画像なので、出現の動き（ぼかし→くっきり）が終わってから、動きを止めた状態で撮る */
async function shot(page, name) {
  await page.waitForTimeout(1800);
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))).catch(() => {});
  for (const f of page.frames()) { try { await f.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); } catch (e) {} }
  await page.screenshot({ path: path.join(SHOTS, name), animations: 'disabled' });
}
async function saved(page) { return page.evaluate(() => { try { return JSON.parse(localStorage.getItem('tp:tp-demo:v1')); } catch (e) { return null; } }); }

try {
  /* ============ 1. 隠しモード・見た目の寸法・下のボタン ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    const hidden0 = await page.evaluate(() => TunePanel.instances[0].el.classList.contains('tp-hide'));
    const hot = await page.evaluate(() => { const r = document.querySelector('.tp-hot').getBoundingClientRect(); return { w: r.width, h: r.height, right: innerWidth - r.right, bottom: innerHeight - r.bottom }; });
    await showPanel(page);
    const shown = await page.evaluate(() => !TunePanel.instances[0].el.classList.contains('tp-hide') && !TunePanel.instances[0].el.classList.contains('closed'));
    await page.reload(); await page.waitForTimeout(200);
    const hidden1 = await page.evaluate(() => TunePanel.instances[0].el.classList.contains('tp-hide'));
    rec('リロードするとパネルは隠れている（右下の四角で出す）', hidden0 && shown && hidden1,
      `開いた直後=${hidden0 ? '隠れている' : '出ている'} / 右下を押す=${shown ? '開いた状態で出た' : '×'} / リロード後=${hidden1 ? '隠れている' : '出ている'}`);
    rec('隠しボックスは右下 100px 角（PC）', hot.w === 100 && hot.h === 100 && hot.right === 0 && hot.bottom === 0, `${hot.w}×${hot.h}px・右端から${hot.right}px・下端から${hot.bottom}px`);

    await showPanel(page);
    const look = await page.evaluate(() => {
      const p = TunePanel.instances[0], cs = getComputedStyle(p.el), r = p.el.getBoundingClientRect();
      const tabOn = getComputedStyle(document.querySelector('.tp-tab.on'));
      const card = getComputedStyle(document.querySelector('.tp-pane.on .tp-cs.card'));
      const lab = document.querySelector('.tp-pane.on .tp-row > label').getBoundingClientRect();
      const v = document.querySelector('.tp-pane.on .tp-val').getBoundingClientRect();
      const title = document.querySelector('.tp-title').firstChild.textContent;
      return {
        w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, border: cs.borderTopColor, radius: cs.borderTopLeftRadius, font: cs.fontSize,
        blur: cs.backdropFilter || cs.webkitBackdropFilter, title, tabBorder: tabOn.borderBottomStyle + ' ' + tabOn.borderBottomColor, tabWeight: tabOn.fontWeight,
        cardBg: card.backgroundColor, cardBorder: card.borderTopColor, cardRadius: card.borderTopLeftRadius, labW: Math.round(lab.width), valW: Math.round(v.width),
        left: Math.round(r.left), midY: Math.round(r.top + r.height / 2), vh: innerHeight
      };
    });
    const lookOk = look.w === 450 && look.h === 520 && look.bg === 'rgba(255, 255, 255, 0.92)' && look.border === 'rgb(236, 236, 236)' && look.radius === '8px'
      && look.font === '11px' && /blur\(12px\)/.test(look.blur) && look.title === '調整パネル' && look.cardBg === 'rgb(248, 249, 251)' && look.cardBorder === 'rgb(228, 231, 235)'
      && look.cardRadius === '10px' && look.labW === 100 && look.valW === 48 && look.tabBorder === 'solid rgb(17, 17, 17)' && look.tabWeight === '700';
    rec('見た目の寸法（AnyFlow V5 の値）', lookOk,
      `外寸 ${look.w}×${look.h} / 地 ${look.bg} / 枠 ${look.border} / 角丸 ${look.radius} / 文字 ${look.font} / ${look.blur} / タイトル「${look.title}」/ タブ下線 ${look.tabBorder}・太さ${look.tabWeight} / カード ${look.cardBg}・${look.cardBorder}・${look.cardRadius} / 項目名 ${look.labW}px・値 ${look.valW}px`);
    rec('出る位置は画面の左・上下中央（既定）', look.left === 24 && Math.abs(look.midY - look.vh / 2) <= 1, `左 ${look.left}px・パネルの中心 ${look.midY}px（画面の中心 ${look.vh / 2}px）`);

    const foot = await page.evaluate(() => ({ btns: [...document.querySelectorAll('.tp-btns button')].map(b => b.textContent), note: document.querySelector('.tp-savenote').textContent, primaryBg: getComputedStyle(document.querySelector('.tp-btns button.primary')).backgroundColor }));
    const NOTE = '調整は自動でこのブラウザに保存されます（リロード・ブラウザを閉じてもOK）。本番サイトに反映したい時は「設定書き出し」を押して、出てきたファイルをClaudeに渡してください。';
    rec('下のボタン3つと注意書き（文言そのまま）', foot.btns.join('/') === 'デフォルトに設定/設定書き出し/バリエーション削除' && foot.note === NOTE && foot.primaryBg === 'rgb(9, 9, 9)',
      `ボタン「${foot.btns.join('」「')}」・1つ目の地 ${foot.primaryBg}・注意書き ${foot.note === NOTE ? '一致' : '不一致:' + foot.note}`);

    /* 設定書き出し（JSON のダウンロード）とバリエーション削除（コピー） */
    const dlP = page.waitForEvent('download');
    await page.click('.tp-btns button:nth-child(2)');
    const dl = await dlP;
    const dlPath = await dl.path();
    const dlJson = JSON.parse(fs.readFileSync(dlPath, 'utf8'));
    await page.click('.tp-btns button:nth-child(3)');
    await page.waitForTimeout(200);
    const purge = await page.evaluate(() => TunePanel.instances[0]._lastPurgeText || '');
    rec('設定書き出し＝JSONファイル／バリエーション削除＝【完全削除の依頼】をコピー', dl.suggestedFilename() === 'tp-demo-settings.json' && typeof dlJson.__params === 'string' && purge.startsWith('【完全削除の依頼】'),
      `ファイル名 ${dl.suggestedFilename()}・中身のキー ${Object.keys(dlJson).length}個（__params ${typeof dlJson.__params === 'string' ? 'あり' : 'なし'}）／コピー文の頭「${purge.slice(0, 10)}」`);

    /* 項目としてのボタン */
    await tab(page, '全体');
    const r0 = await page.evaluate(() => window.__replays);
    await page.click('.tp-pane.on .tp-btnrow button');
    const r1 = await page.evaluate(() => window.__replays);
    rec('項目のボタン（もう一度再生）が押せる', r1 === r0 + 1, `押す前 ${r0} 回 → 押した後 ${r1} 回`);

    /* カテゴリ順の自動並べ替え */
    const orders = await page.evaluate(() => TunePanel.instances[0]._tabs.map(t => ({ t: t.title, g: [...t.pane.querySelectorAll(':scope > .tp-cs')].map(c => c.dataset.grp), vs: [...t.pane.querySelectorAll(':scope > .tp-vs')].map(v => v.dataset.title + '(' + [...v.querySelectorAll('.tp-cs')].map(c => c.dataset.grp).join(',') + ')') })));
    const ORDER = ['variation', 'basic', 'font', 'fxtex', 'anim', 'other'];
    const sorted = orders.every(o => o.g.every((g, i) => i === 0 || ORDER.indexOf(o.g[i - 1]) < ORDER.indexOf(g)));
    const kvOrder = orders.find(o => o.t === 'キービジュアル').g.join('→');
    rec('カテゴリ順の自動並べ替え（書いた順はばらばら）', sorted && kvOrder === 'variation→basic→font→fxtex→anim→other',
      orders.map(o => `${o.t}: ${o.g.join('→')}${o.vs.length ? '＋' + o.vs.join('＋') : ''}`).join(' ／ ') + '（キービジュアルは アニメ→基本→エフェクト→フォント の順に書いた）');

    /* 見出しの判定：言葉から（出現→アニメ・コピー→中の項目からフォント など） */
    const judged = await page.evaluate(() => [...document.querySelectorAll('.tp-pane[data-tab="キービジュアル"] .tp-cs')].map(c => c.dataset.grp + ':' + [...c.querySelectorAll('.tp-sec-head > span:first-child')].map(s => s.textContent).join('/')).join(' '));
    rec('grp の印が無い見出しは言葉と中の項目名から振り分け', /anim:出現/.test(judged) && /font:コピー/.test(judged) && /basic:コピーの位置/.test(judged) && /fxtex:グラフィック/.test(judged), judged);

    /* subgroup の範囲 */
    await tab(page, '実績');
    const subg = await page.evaluate(() => {
      const g = document.querySelector('.tp-pane.on .tp-subg[data-title="枠線"]');
      const inside = [...g.querySelectorAll('.tp-item')].map(e => e.dataset.key);
      const sh = document.querySelector('.tp-item[data-key="res.shadow"]');
      return { inside, shadowInside: g.contains(sh), shadowParent: sh.parentElement.className, label: g.querySelector('.tp-subg-lab').textContent };
    });
    rec('subgroup の範囲の外の項目が中に入らない', subg.inside.join(',') === 'res.border.color,res.border.width,res.border.opacity' && !subg.shadowInside,
      `「${subg.label}」の中: ${subg.inside.join('・')}／「影の強さ」は ${subg.shadowInside ? '中（×）' : '外（' + subg.shadowParent + '）'}`);
    const deep = await page.evaluate(() => { const d = document.querySelector('.tp-pane.on .tp-deep[data-title="角"]'); const h = d.querySelector('.tp-deep-head'); const cs = getComputedStyle(h); return { keys: [...d.querySelectorAll('.tp-item')].map(e => e.dataset.key), size: cs.fontSize, color: cs.color, borderLeft: getComputedStyle(d).borderLeftWidth }; });
    rec('旧来の { sub, deep:true } も動く（左の縦線なし）', deep.keys.join(',') === 'res.radius' && deep.borderLeft === '0px', `中身 ${deep.keys.join('・')}・見出し ${deep.size} ${deep.color}・左の線 ${deep.borderLeft}`);

    /* when の見出しは中の項目ごと隠れる */
    await tab(page, '全体');
    const whenState = async () => page.evaluate(() => {
      const s = document.querySelector('.tp-pane.on .tp-sec[data-title="グリッドの細かさ"]');
      const vis = k => { const e = document.querySelector(`.tp-item[data-key="${k}"]`); return !!(e && e.offsetParent); };
      return { sec: !!s.offsetParent, cell: vis('site.gridCell'), op: vis('site.gridOpacity') };
    });
    const w0 = await whenState();
    await page.click('.tp-item[data-key="site.grid"] .tp-seg button[data-value="true"]');
    await page.waitForTimeout(80);
    const w1 = await whenState();
    await page.click('.tp-item[data-key="site.grid"] .tp-seg button[data-value="false"]');
    await page.waitForTimeout(80);
    const w2 = await whenState();
    rec('when の見出しの中の項目が一緒に隠れる', !w0.sec && !w0.cell && !w0.op && w1.sec && w1.cell && w1.op && !w2.sec && !w2.cell && !w2.op,
      `グリッド「しない」: 見出し${w0.sec ? '出' : '隠'}・マス${w0.cell ? '出' : '隠'}・濃さ${w0.op ? '出' : '隠'} → 「する」: ${w1.sec ? '出' : '隠'}/${w1.cell ? '出' : '隠'}/${w1.op ? '出' : '隠'} → 「しない」: ${w2.sec ? '出' : '隠'}/${w2.cell ? '出' : '隠'}/${w2.op ? '出' : '隠'}`);

    /* PC のスクショ（キービジュアルのタブ） */
    await tab(page, 'キービジュアル');
    await shot(page, 'pc.png');
    await context.close();
  }

  /* ============ 2. 全部のつまみを動かすと値と画面が変わる（PC） ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    const tested = {}, fails = [];
    let nVal = 0, nSig = 0, n = 0;
    const tryRow = async (key, kind) => {
      const before = await sig(page), v0 = await val(page, key);
      let ok = true;
      if (kind === 'slider') {
        const rng = await page.evaluate(([k]) => { const i = document.querySelector(`.tp-item[data-key="${k}"] input[type=range]`); return { min: +i.min, max: +i.max, step: +i.step, v: +i.value }; }, [key]);
        const mid = (rng.min + rng.max) / 2, target = rng.v <= mid ? rng.min + (rng.max - rng.min) * 0.8 : rng.min + (rng.max - rng.min) * 0.2;
        await setSlider(page, key, Math.round(target / rng.step) * rng.step);
      } else if (kind === 'seg' || kind === 'toggle') {
        await page.click(`.tp-item[data-key="${key}"] .tp-seg button:not(.on)`);
      } else if (kind === 'chips') {
        await page.click(`.tp-item[data-kind="chips"] .tp-chip[data-key="${key}"]`);
      } else if (kind === 'color') {
        await page.evaluate(([k]) => { const i = document.querySelector(`.tp-item[data-key="${k}"] input[type=color]`); i.value = i.value === '#ff3366' ? '#33aa66' : '#ff3366'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [key]);
      } else if (kind === 'text') {
        await page.evaluate(([k]) => { const i = document.querySelector(`.tp-item[data-key="${k}"] input[type=text]`); i.value = i.value + '（テスト）'; i.dispatchEvent(new Event('input', { bubbles: true })); }, [key]);
      } else ok = false;
      await page.waitForTimeout(40);
      const after = await sig(page), v1 = await val(page, key);
      const vc = JSON.stringify(v0) !== JSON.stringify(v1), sc = before !== after;
      n++; if (vc) nVal++; if (sc) nSig++;
      if (!(vc && sc && ok)) fails.push(`${key}(値${vc ? '○' : '×'}画面${sc ? '○' : '×'})`);
      tested[key] = true;
    };
    const visibleRows = async () => page.evaluate(() => [...document.querySelectorAll('.tp-pane.on .tp-item[data-kind]')].filter(e => e.offsetParent).flatMap(e => e.dataset.kind === 'chips' ? [...e.querySelectorAll('.tp-chip')].map(c => ({ key: c.dataset.key, kind: 'chips' })) : [{ key: e.dataset.key, kind: e.dataset.kind }]));
    const sweep = async () => { for (let guard = 0; guard < 6; guard++) { const rows = (await visibleRows()).filter(r => r.kind !== 'pills' && !tested[r.key]); if (!rows.length) break; for (const r of rows) await tryRow(r.key, r.kind); } };
    let nPill = 0, nPillOk = 0;
    for (const t of ['全体', 'キービジュアル', '実績']) {
      await tab(page, t);
      await sweep();
      const ctls = await page.evaluate(() => [...document.querySelectorAll('.tp-pane.on .tp-item[data-kind="pills"]')].map(e => ({ key: e.dataset.key, vals: [...e.querySelectorAll('.tp-pill:not(.back)')].map(b => b.dataset.value) })));
      for (const c of ctls) {
        for (const v of c.vals) {
          const cur = await val(page, c.key);
          if (String(cur) === v) continue;
          const b0 = await sig(page);
          await pickVariant(page, c.key, v);
          const b1 = await sig(page), now = await val(page, c.key);
          nPill++; if (b0 !== b1 && String(now) === v) nPillOk++; else fails.push(`${c.key}=${v}`);
          await sweep();   /* その案だけのつまみが出たら、それも動かす */
        }
      }
    }
    rec('全部のつまみを動かすと値と画面が変わる（PC）', fails.length === 0 && nVal === n && nSig === n && nPill === nPillOk,
      `つまみ ${n} 本: 値が変わった ${nVal}・画面が変わった ${nSig}／案ピル ${nPill} 回: 切り替わった ${nPillOk}${fails.length ? '／だめ: ' + fails.join(' ') : ''}`);
    await context.close();
  }

  /* ============ 3. 案ごとの独立 ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, 'キービジュアル');
    await typeValue(page, 'kv.copyX', 88);
    const a1 = await val(page, 'kv.copyX');
    await pickVariant(page, 'kv.variant', 'strong');
    const b1 = await val(page, 'kv.copyX'), bSize = await val(page, 'kv.copySize');
    await typeValue(page, 'kv.copyX', -40);
    await pickVariant(page, 'kv.variant', 'normal');
    const a2 = await val(page, 'kv.copyX'), aSize = await val(page, 'kv.copySize');
    await pickVariant(page, 'kv.variant', 'strong');
    const b2 = await val(page, 'kv.copyX');
    await pickVariant(page, 'kv.variant', 'minimal');
    const c1 = await val(page, 'kv.copyX'), cAlign = await val(page, 'kv.align');
    const shared0 = await val(page, 'kv.copy');
    rec('案Aで動かした値が案Bに出ない（案ごとに独立）', a1 === 88 && b1 === 0 && a2 === 88 && b2 === -40 && c1 === 0 && bSize === 72 && aSize === 56 && cAlign === 'center',
      `ノーマルで位置X=88 → 強調に切替 ${b1}（強調の文字サイズ ${bSize}＝案の最初の値）→ 強調で-40 → ノーマルへ ${a2}（文字サイズ ${aSize}）→ 強調へ ${b2} → ミニマル ${c1}（揃え ${cAlign}）`);
    /* shared:true は全案共通 */
    await page.evaluate(() => { const i = document.querySelector('.tp-item[data-key="kv.copy"] input'); i.value = '共通の文言'; i.dispatchEvent(new Event('input', { bubbles: true })); });
    await pickVariant(page, 'kv.variant', 'normal');
    const shared1 = await val(page, 'kv.copy');
    rec('shared:true の項目は全案共通', shared1 === '共通の文言', `ミニマルで「共通の文言」に変更 → ノーマルでも「${shared1}」（変更前は「${shared0}」）`);

    /* 案だけのつまみ：その案を選んでいる時だけ出る */
    const onlyVis = async () => page.evaluate(() => { const s = document.querySelector('.tp-pane.on .tp-sec[data-title="強調の光"]'); return !!(s && s.offsetParent); });
    const o0 = await onlyVis();
    await pickVariant(page, 'kv.variant', 'strong');
    const o1 = await onlyVis();
    await pickVariant(page, 'kv.variant', 'minimal');
    const o2 = await onlyVis();
    rec('案だけのつまみは、その案を選んでいる時だけ出る', !o0 && o1 && !o2, `ノーマル=${o0 ? '出' : '隠'}・強調=${o1 ? '出' : '隠'}・ミニマル=${o2 ? '出' : '隠'}（パネルは作り直さず部分だけ出し入れ）`);
    await context.close();
  }

  /* ============ 4. 切り替えより上の行の位置が動かない ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, 'キービジュアル');
    const tops = async sels => page.evaluate(ss => ss.map(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top * 10) / 10 : null; }), sels);
    const SELS_KV = ['.tp-tabs', '.tp-pane.on .tp-cs.var > .tp-cs-head', '.tp-item[data-key="kv.variant"]'];
    const k0 = await tops(SELS_KV);
    await pickVariant(page, 'kv.variant', 'strong');
    const k1 = await tops(SELS_KV);
    await pickVariant(page, 'kv.variant', 'minimal');
    const k2 = await tops(SELS_KV);
    /* 実績：ピクトグラムの案ピルより上の行（演出の大見出し・カードの行）を測る。下までスクロールした状態（押し戻されやすい）でも試す */
    await tab(page, '実績');
    const SELS_RES = ['.tp-item[data-key="res.cardGap"]', '.tp-vs[data-title="演出"] > .tp-vs-head', '.tp-item[data-key="res.fxDelay"]', '.tp-vs[data-title="ピクトグラム"] > .tp-vs-head', '.tp-item[data-key="res.picto"]'];
    await page.evaluate(() => { const b = TunePanel.instances[0].body, t = document.querySelector('.tp-item[data-key="res.picto"]'); b.scrollTop = t.offsetTop - 140; });
    await page.waitForTimeout(60);
    const r0 = await tops(SELS_RES);
    await pickVariant(page, 'res.picto', 'fill');
    const r1 = await tops(SELS_RES);
    await page.evaluate(() => { const b = TunePanel.instances[0].body; b.scrollTop = b.scrollHeight; });
    await page.waitForTimeout(60);
    const SELS_BOTTOM = ['.tp-vs[data-title="ピクトグラム"] > .tp-vs-head', '.tp-item[data-key="res.picto"]'];
    const r2 = await tops(SELS_BOTTOM);
    await pickVariant(page, 'res.picto', 'line');
    const r3 = await tops(SELS_BOTTOM);
    const same = (a, b) => a.every((x, i) => x !== null && Math.abs(x - b[i]) < 0.6);
    rec('切り替えた時に切り替えより上の行の位置が動かない（座標を測る）', same(k0, k1) && same(k0, k2) && same(r0, r1) && same(r2, r3),
      `キービジュアル（タブ・見出し・案ピルの上端）: ${k0.join('/')} → 強調 ${k1.join('/')} → ミニマル ${k2.join('/')}px ／ 実績（5行）: ${r0.join('/')} → 塗り ${r1.join('/')}px ／ いちばん下まで送った状態: ${r2.join('/')} → 線 ${r3.join('/')}px`);
    await context.close();
  }

  /* ============ 5. スライダーの範囲（AnyFlow 式） ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, 'キービジュアル');
    const rng = async k => page.evaluate(([kk]) => { const i = document.querySelector(`.tp-item[data-key="${kk}"] input[type=range]`); return { min: +i.min, max: +i.max, v: +i.value }; }, [k]);
    const s0 = await rng('kv.copySize');
    await setSlider(page, 'kv.copySize', s0.max);
    const s1 = await rng('kv.copySize');
    const centered = Math.abs((s1.v - s1.min) / (s1.max - s1.min) - 0.5) < 0.2;
    const x0 = await rng('kv.copyX');
    rec('スライダーは「いまの値が真ん中」の範囲で始まり、端で離すと取り直す', s0.min < 56 && s0.max > 56 && Math.abs((56 - s0.min) / (s0.max - s0.min) - 0.5) < 0.05 && s1.max > s0.max && centered && x0.min === -200 && x0.max === 200,
      `文字サイズ（既定56）: 範囲 ${s0.min}〜${s0.max} → 右端 ${s0.max} で離す → ${s1.min}〜${s1.max}（値 ${s1.v} は ${(((s1.v - s1.min) / (s1.max - s1.min)) * 100).toFixed(0)}% の位置）／位置X（signed・0）: ${x0.min}〜${x0.max}`);
    await page.evaluate(() => { TunePanel.instances[0].params.kv.copySize = 300; TunePanel.instances[0].sync(); });
    const s2 = await rng('kv.copySize');
    await pickVariant(page, 'kv.variant', 'strong');
    await page.evaluate(() => { TunePanel.instances[0].params.kv.gfxBlur = 70; TunePanel.instances[0].sync(); });
    const b2 = await rng('kv.gfxBlur');
    rec('外から値が変わって範囲外でも追いつく', s2.max >= 300 && s2.v === 300 && b2.max >= 70 && b2.v === 70, `文字サイズを外から300に → 範囲 ${s2.min}〜${s2.max}・つまみ ${s2.v}／ブラーを70に → ${b2.min}〜${b2.max}・つまみ ${b2.v}`);
    const op = await rng('kv.gfxOpacity');
    rec('clamp:true の項目は書いた範囲のまま（不透明度 0〜100%）', op.min === 0 && op.max === 100, `不透明度の範囲 ${op.min}〜${op.max}`);
    await context.close();
  }

  /* ============ 6. 自動保存・リロード2回・ドラッグ中は書かない ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, '全体');
    await typeValue(page, 'site.pad', 88);
    await page.waitForTimeout(250);   /* ボタンの色の切り替え（0.18秒）が終わってから読む */
    const btnDirty = await page.evaluate(() => { const b = document.querySelector('.tp-btns button.primary'); return b.textContent + '|' + getComputedStyle(b).backgroundColor; });
    await page.waitForTimeout(100);
    const at03 = (await saved(page) || { site: {} }).site.pad;
    await page.waitForTimeout(650);
    const at10 = (await saved(page) || { site: {} }).site.pad;
    const btnSaved = await page.evaluate(() => document.querySelector('.tp-btns button.primary').textContent);
    await page.reload(); await page.waitForTimeout(150);
    const rl1 = await pc(page, 'site.pad');
    await page.reload(); await page.waitForTimeout(150);
    const rl2 = await pc(page, 'site.pad');
    rec('手が止まって0.8秒後に自動保存され、リロード2回しても残る', at03 !== 88 && at10 === 88 && rl1 === 88 && rl2 === 88 && /（未保存）\|rgb\(255, 93, 151\)/.test(btnDirty) && btnSaved === 'デフォルトに設定',
      `触って0.35秒後の保存値 ${at03}・1.0秒後 ${at10}・ボタン「${btnDirty.split('|')[0]}」(${btnDirty.split('|')[1]}) → 保存後「${btnSaved}」・リロード1回目 ${rl1}・2回目 ${rl2}`);

    /* ドラッグの途中では書かない */
    await showPanel(page);
    await tab(page, '全体');
    const box = await page.locator('.tp-item[data-key="site.bodySize"] input[type=range]').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    for (let i = 0; i < 12; i++) { await page.mouse.move(box.x + box.width / 2 + 4 + i * 3, y); await page.waitForTimeout(100); }
    await page.waitForTimeout(1000);   /* 押したまま 1 秒止める */
    const midDrag = (await saved(page)).site.bodySize, nowVal = await pc(page, 'site.bodySize');
    await page.mouse.up();
    await page.waitForTimeout(1100);
    const afterUp = (await saved(page)).site.bodySize;
    rec('ドラッグの途中では保存しない（離してから保存）', midDrag === 15 && nowVal !== 15 && afterUp === nowVal, `押したまま1秒止めた時の保存値 ${midDrag}（画面の値 ${nowVal}）→ 離して1.1秒後 ${afterUp}`);

    /* 保存値を先に入れてからリロード2回（案ごとの項目も） */
    const { context: c2, page: p2 } = await newPage();
    await open(p2);
    await p2.evaluate(() => {
      const s = JSON.parse(JSON.stringify(TunePanel.instances[0].defaults));
      s.site.pad = 77; s.kv.copyX = 33; s.kv.variant = 'strong'; s.kv.copySize = 81;
      localStorage.clear();
      localStorage.setItem('tp:tp-demo:v1', JSON.stringify(s));
    });
    await p2.reload(); await p2.waitForTimeout(150);
    const q1 = [await pc(p2, 'site.pad'), await pc(p2, 'kv.copyX'), await pc(p2, 'kv.variant'), await pc(p2, 'kv.copySize')];
    await p2.reload(); await p2.waitForTimeout(150);
    const q2 = [await pc(p2, 'site.pad'), await pc(p2, 'kv.copyX'), await pc(p2, 'kv.variant'), await pc(p2, 'kv.copySize')];
    const stored = await saved(p2);
    rec('保存値を先に入れてからリロード2回しても値が残る', q1.join() === '77,33,strong,81' && q2.join() === '77,33,strong,81' && stored.site.pad === 77,
      `入れた値 パディング77・位置X33・案=強調・文字サイズ81 → 1回目 ${q1.join('/')} → 2回目 ${q2.join('/')}`);
    await c2.close();

    /* 行の ↺ はページを開いた時の値へ */
    await tab(page, 'キービジュアル');
    await typeValue(page, 'kv.copyY', 50);
    await page.waitForTimeout(1000);
    await page.reload(); await page.waitForTimeout(150);
    await showPanel(page);
    await tab(page, 'キービジュアル');
    const st0 = await val(page, 'kv.copyY');
    await typeValue(page, 'kv.copyY', 120);
    const st1 = await val(page, 'kv.copyY');
    await page.click('.tp-item[data-key="kv.copyY"] .tp-rst');
    const st2 = await val(page, 'kv.copyY');
    rec('行の ↺ はページを開いた時の値に戻る', st0 === 50 && st1 === 120 && st2 === 50, `開いた時 ${st0} → 120 に変更 → ↺ で ${st2}（既定値は 0）`);

    /* まとまりの ↺ */
    await typeValue(page, 'kv.copyX', 60);
    await typeValue(page, 'kv.copyY', -30);
    await page.click('.tp-sec[data-title="コピーの位置"] .tp-gbtn');
    const g1 = [await val(page, 'kv.copyX'), await val(page, 'kv.copyY')];
    const gtxt = await page.evaluate(() => document.querySelector('.tp-sec[data-title="コピーの位置"] .tp-gbtn').textContent);
    const noBtn = await page.evaluate(() => [...document.querySelectorAll('.tp-sec')].filter(s => s.querySelector('.tp-sec-head') && !s.querySelector('.tp-gbtn')).map(s => s.dataset.title));
    rec('まとまりの ↺（中をまとめて戻す・「✓ 戻しました」）', g1[0] === 0 && g1[1] === 50 && gtxt === '✓ 戻しました', `位置X 60・位置Y -30 → ↺ で ${g1[0]}・${g1[1]}（開いた時の値）／ボタン「${gtxt}」／戻す物が無くて ↺ を出さない見出し: ${noBtn.length ? noBtn.join('・') : 'なし'}`);
    await context.close();
  }

  /* ============ 7. PC/スマホの独立・青い印・スマホモードの ↺・スマホ枠 ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, 'キービジュアル');
    await typeValue(page, 'kv.copySize', 60);
    await page.click('.tp-phone-btn');
    await page.waitForTimeout(200);
    const phoneOn = await page.evaluate(() => ({ html: document.documentElement.classList.contains('phone-mode'), panel: TunePanel.instances[0].el.classList.contains('tp-phone'), banner: getComputedStyle(document.querySelector('.tp-banner')).display, btn: document.querySelector('.tp-phone-btn').textContent, frame: !!document.querySelector('.tp-pp.on'), head: getComputedStyle(document.querySelector('.tp-head')).backgroundImage.slice(0, 15), save: document.querySelector('.tp-btns button.primary').textContent }));
    const inherit = await val(page, 'kv.copySize');
    const mark0 = await page.evaluate(() => document.querySelector('.tp-item[data-key="kv.copySize"] .tp-row').classList.contains('tp-mb'));
    await typeValue(page, 'kv.copySize', 28);
    const spV = await val(page, 'kv.copySize'), pcV = await pc(page, 'kv.copySize');
    const mark = await page.evaluate(() => { const r = document.querySelector('.tp-item[data-key="kv.copySize"] .tp-row'), l = r.querySelector('label'); return { on: r.classList.contains('tp-mb'), color: getComputedStyle(l).color, dot: getComputedStyle(l, '::before').content, bg: getComputedStyle(r).backgroundColor, bl: getComputedStyle(r).borderLeftWidth }; });
    /* 同じ値でも触った瞬間に印が付く */
    const lh0 = await val(page, 'kv.copyLh');
    await setSlider(page, 'kv.copyLh', lh0);
    const markSame = await page.evaluate(() => document.querySelector('.tp-item[data-key="kv.copyLh"] .tp-row').classList.contains('tp-mb'));
    rec('スマホモード（見出しの1押し・帯・青っぽい見出し・スマホ枠）', phoneOn.html && phoneOn.panel && phoneOn.banner === 'flex' && phoneOn.btn === '📱 スマホモード中' && phoneOn.frame && /gradient/.test(phoneOn.head) && phoneOn.save.startsWith('スマホのデフォルトに設定'),
      `html.phone-mode=${phoneOn.html}・帯=${phoneOn.banner}・ボタン「${phoneOn.btn}」・見出しの地=${phoneOn.head}…・390×844の枠=${phoneOn.frame ? 'あり' : 'なし'}・保存ボタン「${phoneOn.save}」`);
    rec('スマホで上書きした行に青い印（青い文字＋●・左の帯や背景なし・同じ値でも付く）', !mark0 && mark.on && mark.color === 'rgb(11, 75, 214)' && /●/.test(mark.dot) && mark.bg === 'rgba(0, 0, 0, 0)' && mark.bl === '0px' && markSame,
      `触る前=${mark0 ? '印あり' : '印なし'}（PCの値 ${inherit} を引き継ぎ）→ 30 に変更で印=${mark.on}・文字色 ${mark.color}・印 ${mark.dot}・背景 ${mark.bg}・左の線 ${mark.bl}／同じ値で触った行間=${markSame ? '印が付いた' : '付かない'}`);
    await page.click('.tp-phone-btn');   /* スマホモードを抜ける */
    await page.waitForTimeout(150);
    const backPC = await val(page, 'kv.copySize');
    await typeValue(page, 'kv.copySize', 64);
    await page.click('.tp-phone-btn');
    await page.waitForTimeout(150);
    const spKept = await val(page, 'kv.copySize');
    rec('PCで動かした値がスマホで上書きした項目に出ない・スマホの値がPCに出ない', spV === 28 && pcV === 60 && backPC === 60 && spKept === 28,
      `スマホモードで30 → PCの値は ${pcV} のまま → PCに戻ると ${backPC} → PCで64に変更 → スマホモードでは ${spKept}`);
    /* スマホモードの ↺ は上書きだけ外す */
    await page.click('.tp-item[data-key="kv.copySize"] .tp-rst');
    const afterRst = await val(page, 'kv.copySize'), pcAfter = await pc(page, 'kv.copySize');
    const mbHas = await page.evaluate(() => Object.prototype.hasOwnProperty.call(TunePanel.instances[0]._mb, 'kv.copySize'));
    const markOff = await page.evaluate(() => document.querySelector('.tp-item[data-key="kv.copySize"] .tp-row').classList.contains('tp-mb'));
    rec('スマホモードの ↺ はスマホの上書きだけ外す（PCの値は触らない）', afterRst === 64 && pcAfter === 64 && !mbHas && !markOff, `↺ の後: 表示 ${afterRst}（PCの値を引き継ぐ）・PCの値 ${pcAfter}・スマホの上書き ${mbHas ? '残った' : '外れた'}・印 ${markOff ? 'あり' : 'なし'}`);
    /* PC専用・スマホ専用のつまみ */
    const vis = async k => page.evaluate(([kk]) => { const e = document.querySelector(`.tp-item[data-key="${kk}"]`); return !!(e && e.offsetParent); }, [k]);
    const pm = [await vis('kv.gfxZ'), await vis('kv.spTop')];
    await page.click('.tp-phone-btn'); await page.waitForTimeout(120);
    const pp = [await vis('kv.gfxZ'), await vis('kv.spTop')];
    rec('PC専用のつまみはスマホモード中に隠れ、スマホ専用はPCで隠れる', !pm[0] && pm[1] && pp[0] && !pp[1], `スマホモード: 位置Z=${pm[0] ? '出' : '隠'}・ギャップ（スマホ）=${pm[1] ? '出' : '隠'}／PC: 位置Z=${pp[0] ? '出' : '隠'}・ギャップ（スマホ）=${pp[1] ? '出' : '隠'}`);

    /* 案 × スマホの掛け合わせ：強調のスマホだけ行間を変える */
    await page.click('.tp-phone-btn'); await page.waitForTimeout(120);
    await pickVariant(page, 'kv.variant', 'strong');
    await typeValue(page, 'kv.copyLh', 1.8);
    await pickVariant(page, 'kv.variant', 'normal');
    const nSp = await val(page, 'kv.copyLh');
    await pickVariant(page, 'kv.variant', 'strong');
    const sSp = await val(page, 'kv.copyLh');
    await page.click('.tp-phone-btn'); await page.waitForTimeout(120);
    const sPc = await val(page, 'kv.copyLh');
    rec('案 × スマホの掛け合わせも独立（強調のスマホだけ行間 1.8）', sSp === 1.8 && nSp !== 1.8 && sPc !== 1.8, `強調のスマホ ${sSp}・ノーマルのスマホ ${nSp}・強調のPC ${sPc}`);
    await pickVariant(page, 'kv.variant', 'normal');
    await page.click('.tp-phone-btn'); await page.waitForTimeout(600);
    await typeValue(page, 'kv.copyX', 24);      /* スマホだけの値を2つ入れて、青い印が写るようにする */
    await typeValue(page, 'kv.gfxSize', 260);
    await page.evaluate(() => { TunePanel.instances[0].body.scrollTop = 0; });
    await shot(page, 'pc-phone-mode.png');
    await page.click('.tp-phone-btn'); await page.waitForTimeout(150);

    /* 全部のつまみ（スマホモード）：値はスマホの入れ物だけに入り、スマホ枠の画面が変わる */
    await page.click('.tp-phone-btn'); await page.waitForTimeout(300);
    const frame = () => page.frames().find(f => /tp-preview=1/.test(f.url()));
    await page.waitForFunction(() => { const f = document.querySelector('.tp-pp iframe'); return f && f.contentWindow && f.contentWindow.__demoSig; }, null, { timeout: 8000 });
    const fsig = async () => frame().evaluate(() => window.__demoSig());
    const tested = {}, fails = [];
    let n = 0, nOk = 0;
    const tryRow = async (key, kind) => {
      const before = await fsig(), pcBefore = await page.evaluate(([k]) => JSON.stringify(TunePanel.utils.getPath(TunePanel.instances[0].params, k)), [key]);
      if (kind === 'slider') {
        const rng = await page.evaluate(([k]) => { const i = document.querySelector(`.tp-item[data-key="${k}"] input[type=range]`); return { min: +i.min, max: +i.max, step: +i.step, v: +i.value }; }, [key]);
        const mid = (rng.min + rng.max) / 2, target = rng.v <= mid ? rng.min + (rng.max - rng.min) * 0.8 : rng.min + (rng.max - rng.min) * 0.2;
        await setSlider(page, key, Math.round(target / rng.step) * rng.step);
      } else if (kind === 'seg' || kind === 'toggle') await page.click(`.tp-item[data-key="${key}"] .tp-seg button:not(.on)`);
      else if (kind === 'chips') await page.click(`.tp-item[data-kind="chips"] .tp-chip[data-key="${key}"]`);
      else if (kind === 'color') await page.evaluate(([k]) => { const i = document.querySelector(`.tp-item[data-key="${k}"] input[type=color]`); i.value = i.value === '#ff3366' ? '#33aa66' : '#ff3366'; i.dispatchEvent(new Event('input', { bubbles: true })); }, [key]);
      else if (kind === 'text') await page.evaluate(([k]) => { const i = document.querySelector(`.tp-item[data-key="${k}"] input[type=text]`); i.value = i.value + '（スマホ）'; i.dispatchEvent(new Event('input', { bubbles: true })); }, [key]);
      let changed = false;
      for (let i = 0; i < 30 && !changed; i++) { await page.waitForTimeout(60); changed = (await fsig()) !== before; }
      const pcAfter = await page.evaluate(([k]) => JSON.stringify(TunePanel.utils.getPath(TunePanel.instances[0].params, k)), [key]);
      const inMb = await page.evaluate(([k]) => Object.prototype.hasOwnProperty.call(TunePanel.instances[0]._mb, k), [key]);
      n++;
      if (changed && pcAfter === pcBefore && inMb) nOk++; else fails.push(`${key}(枠${changed ? '○' : '×'}PC${pcAfter === pcBefore ? '不変' : '変化'}入れ物${inMb ? '○' : '×'})`);
      tested[key] = true;
    };
    for (const t of ['全体', 'キービジュアル', '実績']) {
      await tab(page, t);
      for (let g = 0; g < 6; g++) {
        const rows = (await page.evaluate(() => [...document.querySelectorAll('.tp-pane.on .tp-item[data-kind]')].filter(e => e.offsetParent).flatMap(e => e.dataset.kind === 'chips' ? [...e.querySelectorAll('.tp-chip')].map(c => ({ key: c.dataset.key, kind: 'chips' })) : [{ key: e.dataset.key, kind: e.dataset.kind }]))).filter(r => r.kind !== 'pills' && !tested[r.key]);
        if (!rows.length) break;
        for (const r of rows) await tryRow(r.key, r.kind);
      }
    }
    rec('全部のつまみを動かすと値と画面が変わる（スマホモード：スマホの入れ物だけ・枠の画面が変わる）', fails.length === 0 && n > 0, `つまみ ${n} 本: 枠の画面が変わり・PCの値は不変・スマホの入れ物に入った ${nOk}${fails.length ? '／だめ: ' + fails.join(' ') : ''}`);
    await context.close();
  }

  /* ============ 8. 案ピル：★・上書き→解除・削除→戻す・1案で欄を隠す・最後の1案は消せない ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, 'キービジュアル');
    const labels = async () => page.evaluate(() => ({ main: [...document.querySelectorAll('.tp-item[data-key="kv.variant"] .tp-pills:not(.tp-favrow) .tp-pill:not(.back)')].map(b => b.dataset.label), fav: [...document.querySelectorAll('.tp-item[data-key="kv.variant"] .tp-favrow .tp-pill')].map(b => b.dataset.label), favHead: !document.querySelector('.tp-item[data-key="kv.variant"] .tp-favhead').hidden, back: (document.querySelector('.tp-item[data-key="kv.variant"] .tp-pill.back') || {}).textContent || '' }));
    const l0 = await labels();
    const pillColor = await page.evaluate(() => getComputedStyle(document.querySelector('.tp-item[data-key="kv.variant"] .tp-pill.on')).backgroundColor);
    await pillMenu(page, 'kv.variant', 'minimal', '★ お気に入りにピン留め');
    const l1 = await labels();
    await pillMenu(page, 'kv.variant', 'minimal', '★ ピン留めを解除');
    const l2 = await labels();
    rec('★ ピン留めは上の別の段（★1）・解除で元の位置', l0.main.join(',') === '1 ノーマル,2 強調,3 ミニマル' && l1.fav.join(',') === '★1 ミニマル' && l1.favHead && l1.main.join(',') === '1 ノーマル,2 強調' && l2.main.join(',') === l0.main.join(',') && !l2.favHead && pillColor === 'rgb(14, 187, 255)',
      `最初: ${l0.main.join('・')}（選択中の色 ${pillColor}）→ ★: 上の段「${l1.fav.join('・')}」・下の段 ${l1.main.join('・')} → 解除: ${l2.main.join('・')}`);

    await typeValue(page, 'kv.copyX', 70);
    await pillMenu(page, 'kv.variant', 'strong', '⤓ いまの設定で上書き');
    await pickVariant(page, 'kv.variant', 'strong');
    const ov1 = [await val(page, 'kv.copyX'), await val(page, 'kv.copySize')];
    const menuHas = async () => { const pill = page.locator('.tp-item[data-key="kv.variant"] .tp-pill[data-value="strong"]').first(); await pill.hover(); await pill.locator('.tp-pill-x').click(); await page.waitForSelector('.tp-pmenu'); const t = await page.evaluate(() => [...document.querySelectorAll('.tp-pmenu button')].map(b => b.textContent)); await page.keyboard.press('Escape'); await page.mouse.click(700, 880); return t; };
    const m1 = await menuHas();
    await pillMenu(page, 'kv.variant', 'strong', '↺ 上書きを解除');
    const ov2 = [await val(page, 'kv.copyX'), await val(page, 'kv.copySize')];
    const m2 = await menuHas();
    rec('⤓ いまの設定で上書き → ↺ 上書きを解除（コードの最初の値へ）', ov1[0] === 70 && ov1[1] === 56 && m1.some(t => t.startsWith('↺ 上書きを解除')) && ov2[0] === 0 && ov2[1] === 72 && !m2.some(t => t.startsWith('↺ 上書きを解除')),
      `ノーマルで位置X=70 → 強調を⤓上書き → 強調を選ぶと 位置X ${ov1[0]}・文字サイズ ${ov1[1]} → 解除で ${ov2[0]}・${ov2[1]}（強調の最初の値）／メニュー: ${m1.join(' ')}`);

    /* 削除 → 戻す */
    await pillMenu(page, 'kv.variant', 'minimal', '🗑 削除');
    const modal = await page.evaluate(() => (document.querySelector('.tp-mdl h4') || {}).textContent);
    await page.click('.tp-mdl-btns button.danger');
    await page.waitForTimeout(120);
    const d1 = await labels();
    await page.click('.tp-item[data-key="kv.variant"] .tp-pill.back');
    await page.click('.tp-mdl-li button');
    await page.waitForTimeout(150);
    const d2 = await labels();
    rec('削除（確認つき）→「↺ 消した案を戻す (n)」→ 戻す（番号は見えている順に振り直す）', modal === '削除しますか？' && d1.main.join(',') === '1 ノーマル,2 強調' && d1.back === '↺ 消した案を戻す (1)' && d2.main.join(',') === '1 ノーマル,2 強調,3 ミニマル' && !d2.back,
      `確認「${modal}」→ 削除後 ${d1.main.join('・')}＋「${d1.back}」→ 戻した後 ${d2.main.join('・')}`);

    /* 選んでいた案を消したら残りの先頭へ／1案だけ残ったら「↺ 消した案を戻す」だけ残す（2026-09-27 ヒデさん）／最後の1案は消せない */
    await pickVariant(page, 'kv.variant', 'minimal');
    await pillMenu(page, 'kv.variant', 'minimal', '🗑 削除');
    await page.click('.tp-mdl-btns button.danger');
    await page.waitForTimeout(150);
    const selAfterDel = await val(page, 'kv.variant');
    await pillMenu(page, 'kv.variant', 'strong', '🗑 削除');
    await page.click('.tp-mdl-btns button.danger');
    await page.waitForTimeout(200);
    const one = await page.evaluate(() => { const it = document.querySelector('.tp-item[data-key="kv.variant"]'); const back = it.querySelector('.tp-pill.back'); return { row: !!it.offsetParent, cat: !!document.querySelector('.tp-pane.on .tp-cs.var').offsetParent, sel: TunePanel.instances[0].params.kv.variant, back: back && back.offsetParent ? back.textContent : '', pills: [...it.querySelectorAll('.tp-pill:not(.back)')].filter(b => b.offsetParent).length }; });
    const lastTry = await page.evaluate(() => { const p = TunePanel.instances[0], c = p._ctlById('kv.variant'); const r = p._deleteVariant(c, 'normal', 'ノーマル', { noConfirm: true }); return { r, hidden: c.st().hidden.slice(), modal: (document.querySelector('.tp-mdl h4') || {}).textContent }; });
    rec('1案だけ残ったら「↺ 消した案を戻す」だけ残す（ピルは隠す）・最後の1案は消せない・選んでいた案を消したら先頭へ', selAfterDel === 'normal' && one.row && one.cat && one.back === '↺ 消した案を戻す (2)' && one.pills === 0 && one.sel === 'normal' && lastTry.r === false && lastTry.modal === '削除できません' && lastTry.hidden.length === 2,
      `ミニマルを選んで削除 → 選択は「${selAfterDel}」／強調も削除 → 見えているピル ${one.pills} 個・戻すボタン「${one.back || 'なし'}」・「バリエーション」見出し ${one.cat ? '出' : '隠'}・既定=${one.sel}／最後の1案を消そうとすると「${lastTry.modal}」・隠した案 ${lastTry.hidden.length} 件のまま`);
    await context.close();
  }

  /* ============ 9. 移動・大きさ変更・開閉・上へ持ち上げる ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    const rect = async () => page.evaluate(() => { const r = TunePanel.instances[0].el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), closed: TunePanel.instances[0].el.classList.contains('closed') }; });
    const r0 = await rect();
    await page.mouse.move(r0.x + 120, r0.y + 20); await page.mouse.down(); await page.mouse.move(r0.x + 170, r0.y + 60, { steps: 5 }); await page.mouse.up();
    await page.waitForTimeout(100);
    const r1 = await rect();
    /* 中身の何も無い所（カードの見出しの横）でも動かせる */
    const emptyPt = await page.evaluate(() => { const s = document.querySelector('.tp-pane.on .tp-sec-head'); const r = s.getBoundingClientRect(); return { x: r.left + r.width * 0.6, y: r.top + r.height / 2 }; });
    await page.mouse.move(emptyPt.x, emptyPt.y); await page.mouse.down(); await page.mouse.move(emptyPt.x + 30, emptyPt.y + 10, { steps: 4 }); await page.mouse.up();
    await page.waitForTimeout(100);
    const r2 = await rect();
    await page.click('.tp-title');
    await page.waitForTimeout(100);
    const r3 = await rect();
    await page.click('.tp-title');
    await page.waitForTimeout(100);
    const r4 = await rect();
    rec('見出しの帯か中身の何も無い所をつかんで移動・押すと開閉（動かした時は開閉しない）', r1.x === r0.x + 50 && r1.y === r0.y + 40 && !r1.closed && r2.x === r1.x + 30 && r3.closed && r3.h < 60 && !r4.closed && r4.h === 520,
      `帯を(+50,+40)ドラッグ → 位置 ${r0.x},${r0.y} → ${r1.x},${r1.y}（開閉しない: ${r1.closed ? '閉じた' : '開いたまま'}）／何も無い所を(+30,+10) → ${r2.x},${r2.y}／押す → 高さ ${r3.h}（閉）→ もう一度 ${r4.h}（開）`);
    /* 4辺の大きさ変更 */
    const zr = await page.evaluate(() => { const r = document.querySelector('.tp-z-r').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(zr.x, zr.y); await page.mouse.down(); await page.mouse.move(zr.x + 60, zr.y, { steps: 4 }); await page.mouse.up();
    const zt = await page.evaluate(() => { const r = document.querySelector('.tp-z-t').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(zt.x, zt.y); await page.mouse.down(); await page.mouse.move(zt.x, zt.y - 40, { steps: 4 }); await page.mouse.up();
    const r5 = await rect();
    rec('右下の角＋4辺で大きさ変更', r5.w === 510 && r5.h === 560, `右の辺を+60 → 幅 ${r5.w}px／上の辺を-40 → 高さ ${r5.h}px（resize:both も有効）`);
    /* 閉じた状態で下の方へ動かしてから開く → 上へ持ち上げる */
    await page.click('.tp-title'); await page.waitForTimeout(80);
    const rc = await rect();
    await page.mouse.move(rc.x + 150, rc.y + 20); await page.mouse.down(); await page.mouse.move(rc.x + 150, 820, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(80);
    const rLow = await rect();
    await page.click('.tp-title'); await page.waitForTimeout(150);
    const rOpen = await rect();
    rec('開いた時に下へ入りきらなければ上へ持ち上げる', rOpen.y + rOpen.h <= 900 - 8 + 1 && rOpen.y < rLow.y, `閉じたまま下端近く（上端 ${rLow.y}px）へ → 開く → 上端 ${rOpen.y}px・下端 ${rOpen.y + rOpen.h}px（画面 900px）`);
    await context.close();
  }

  /* ============ 10. スマホ（幅390px）：見るだけ・どこにも保存しない・シート ============ */
  {
    /* PC で「強調」の PC 値と、スマホの上書きを作っておく */
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const { page } = await newPage(1440, 900, context);
    await open(page);
    await showPanel(page);
    await tab(page, 'キービジュアル');
    await pickVariant(page, 'kv.variant', 'strong');
    await typeValue(page, 'kv.copySize', 80);
    await page.click('.tp-phone-btn'); await page.waitForTimeout(120);
    await typeValue(page, 'kv.copySize', 36);
    await typeValue(page, 'kv.spTop', 40);
    await page.click('.tp-btns button.primary');
    await page.waitForTimeout(200);
    await page.close();

    const sp = await context.newPage();
    sp.on('pageerror', e => pageErrors.push(e.message));
    await sp.setViewportSize({ width: 390, height: 844 });
    const before = await (async () => { await sp.goto('about:blank'); return null; })();
    await open(sp);
    const ls0 = await lsDump(sp), ss0 = await sp.evaluate(() => JSON.stringify(sessionStorage));
    const applied = await sp.evaluate(() => ({ size: TunePanel.instances[0].params.kv.copySize, v: TunePanel.instances[0].params.kv.variant, spTop: TunePanel.instances[0].params.kv.spTop, css: getComputedStyle(document.querySelector('.kv-copy h1')).fontSize }));
    rec('スマホ実機は起動時に「案の値 → スマホ用の値」の順で当てる', applied.v === 'strong' && applied.size === 36 && applied.spTop === 40, `案=${applied.v}・文字サイズ ${applied.size}（PCの強調は80・スマホの上書き33）・ギャップ（スマホ）${applied.spTop}・画面の見出し ${applied.css}`);
    const hot = await sp.evaluate(() => { const r = document.querySelector('.tp-hot').getBoundingClientRect(); return r.width + '×' + r.height; });
    await showPanel(sp);
    const sheet = await sp.evaluate(() => { const p = TunePanel.instances[0], r = p.el.getBoundingClientRect(); return { cls: p.el.classList.contains('tp-sheet'), top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), vis: Math.round(innerHeight - r.top), grip: getComputedStyle(p.grip).display, phoneBtn: p.phoneBtn.hidden, zoom: getComputedStyle(p.body).zoom, radius: getComputedStyle(p.el).borderTopLeftRadius }; });
    const grip = await sp.evaluate(() => { const r = TunePanel.instances[0].grip.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await sp.mouse.move(grip.x, grip.y); await sp.mouse.down(); await sp.mouse.move(grip.x, grip.y - 300, { steps: 6 }); await sp.mouse.up();
    await sp.waitForTimeout(450);
    const opened = await sp.evaluate(() => { const p = TunePanel.instances[0], r = p.el.getBoundingClientRect(); return { open: p.el.classList.contains('open'), top: Math.round(r.top) }; });
    await shot(sp, 'sp.png');
    /* いろいろ触る：つまみ・案の切り替え・下のボタン */
    await tab(sp, 'キービジュアル');
    await setSlider(sp, 'kv.copyX', 40);
    await setSlider(sp, 'kv.gfxSize', 200);
    await pickVariant(sp, 'kv.variant', 'minimal');
    await tab(sp, '全体');
    await sp.click('.tp-item[data-key="site.grid"] .tp-seg button[data-value="true"]');
    await sp.evaluate(() => { const b = [...document.querySelectorAll('.tp-btns button')]; b.forEach(x => { if (x.textContent !== '設定書き出し') x.click(); }); });
    await sp.evaluate(() => { const c = document.querySelector('.tp-pane.on .tp-cs.card .tp-cs-head'); c.click(); });
    await sp.waitForTimeout(1500);
    const ls1 = await lsDump(sp), ss1 = await sp.evaluate(() => JSON.stringify(sessionStorage));
    const sameLS = JSON.stringify(ls0) === JSON.stringify(ls1);
    rec('幅390pxではどこにも保存しない（触っても localStorage が1文字も変わらない）', sameLS && ss0 === ss1,
      `保存の中身 ${Object.keys(ls0).length} 件 → 触った後 ${Object.keys(ls1).length} 件・中身 ${sameLS ? '完全に同じ' : '変わった'}／sessionStorage ${ss0 === ss1 ? '同じ' : '変わった'}`);
    /* 下へスワイプしてしまう */
    const grip2 = await sp.evaluate(() => { const r = TunePanel.instances[0].grip.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await sp.mouse.move(grip2.x, grip2.y); await sp.mouse.down(); await sp.mouse.move(grip2.x, grip2.y + 260, { steps: 5 }); await sp.mouse.up();
    await sp.waitForTimeout(400);
    const peek2 = await sp.evaluate(() => { const p = TunePanel.instances[0], r = p.el.getBoundingClientRect(); return { open: p.el.classList.contains('open'), vis: Math.round(innerHeight - r.top) }; });
    await shot(sp, 'sp-peek.png');
    const grip3 = await sp.evaluate(() => { const r = TunePanel.instances[0].grip.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await sp.mouse.move(grip3.x, grip3.y); await sp.mouse.down(); await sp.mouse.move(grip3.x, grip3.y + 120, { steps: 4 }); await sp.mouse.up();
    await sp.waitForTimeout(400);
    const hidden = await sp.evaluate(() => TunePanel.instances[0].el.classList.contains('tp-hide'));
    rec('スマホは画面下からせり上がるシート（見出しだけ／画面の半分／しまう）', sheet.cls && sheet.w === 390 && sheet.vis < 80 && sheet.grip === 'flex' && opened.open && opened.top < sheet.top && !peek2.open && peek2.vis < 80 && hidden && hot === '72×72' && sheet.phoneBtn && sheet.zoom === '0.9',
      `出した直後: 幅 ${sheet.w}px・角丸 ${sheet.radius}・見えている高さ ${sheet.vis}px（見出しだけ）→ 上へスワイプ: 上端 ${opened.top}px（画面の半分）→ 下へ: 見えている ${peek2.vis}px → さらに下へ: ${hidden ? 'しまった' : '残った'}／中身の縮尺 ${sheet.zoom}／隠しボックス ${hot}px／スマホモードのボタン ${sheet.phoneBtn ? '出さない' : '出る'}`);
    await context.close();
  }

  /* ============ 11. PC⇄スマホの境目をまたいだら開き直す（その直前も保存しない） ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, '全体');
    await page.evaluate(() => { window.__mark = 'before'; });
    await typeValue(page, 'site.pad', 104);   /* 保存待ち（PC の値）のまま境目をまたぐ */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => !window.__mark, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    const reloaded = await page.evaluate(() => !window.__mark);
    const s1 = await saved(page);
    const isSheet = await page.evaluate(() => TunePanel.instances[0].el.classList.contains('tp-sheet'));
    await page.evaluate(() => { const p = TunePanel.instances[0]; p.params.site.pad = 12; p.sync(); });
    await page.waitForTimeout(1000);
    const s2 = await saved(page);
    rec('PC⇄スマホの境目をまたいだら開き直す（PC の保存待ちは PC のうちに保存・スマホ側は保存しない）', reloaded && s1.site.pad === 104 && isSheet && s2.site.pad === 104,
      `1440→390 に縮める → 開き直した=${reloaded}・保存値 パディング ${s1.site.pad}・シート表示=${isSheet}・スマホ側で値を変えても保存値は ${s2.site.pad}`);
    await context.close();
  }

  /* ============ 12. phone-mode.client.js とつなぐ（QR・実機への反映） ============
     中継サーバ（phone-mode/server.mjs）の代わりに、同じ受け口を持つ小さな代役を立てて確かめる */
  {
    const pushes = [];
    const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const relay = http.createServer((req, res) => {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Cache-Control': 'no-store' };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/ip') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ phoneUrl: `http://192.168.0.2:${PORT}/demo/index.html?live=phone`, clients: 1 })); return; }
      if (u.pathname === '/qr') { res.writeHead(200, { ...cors, 'Content-Type': 'image/png' }); res.end(PNG1); return; }
      if (u.pathname === '/push') { let b = ''; req.on('data', c => b += c); req.on('end', () => { pushes.push(b); res.writeHead(200, cors); res.end('ok'); }); return; }
      res.writeHead(404, cors); res.end();
    });
    await new Promise(r => relay.listen(0, '127.0.0.1', r));
    const RPORT = relay.address().port;
    const { context, page } = await newPage();
    await open(page);
    await page.evaluate(([rp]) => { window.PHONE_MODE_CONFIG = TunePanel.instances[0].phoneModeConfig({ syncPort: rp }); }, [RPORT]);
    await page.addScriptTag({ url: '/phone-mode/phone-mode.client.js' });
    await showPanel(page);
    await tab(page, 'キービジュアル');
    await page.click('.tp-phone-btn');
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({ on: document.documentElement.classList.contains('phone-mode'), panel: TunePanel.instances[0].el.classList.contains('tp-phone'), pop: !!document.querySelector('.pm-pop.show'), qr: (document.querySelector('.pm-pop .qr') || {}).src || '', url: (document.querySelector('.pm-pop .url') || {}).textContent, client: !!window.__phoneModeOn, dupBanner: getComputedStyle(document.querySelector('.pm-banner')).display, keys: JSON.stringify(window.PHONE_MODE_CONFIG.storageKeys) }));
    const n0 = pushes.length;
    await typeValue(page, 'kv.copySize', 40);
    await page.waitForTimeout(600);
    const last = pushes.length ? JSON.parse(pushes[pushes.length - 1]) : null;
    const mb = last && last.store && last.store['tp:tp-demo:v1:mb'] ? JSON.parse(last.store['tp:tp-demo:v1:mb']) : {};
    await page.click('.tp-phone-btn');   /* 2回目はQRの窓だけ閉じる（モードは続く） */
    await page.waitForTimeout(150);
    const second = await page.evaluate(() => ({ on: document.documentElement.classList.contains('phone-mode'), pop: !!document.querySelector('.pm-pop.show') }));
    await page.click('.tp-phone-btn');
    await page.waitForTimeout(150);
    await page.click('#pmStop');
    await page.waitForTimeout(200);
    const off = await page.evaluate(() => ({ on: document.documentElement.classList.contains('phone-mode'), panel: TunePanel.instances[0].el.classList.contains('tp-phone'), frame: !!document.querySelector('.tp-pp.on') }));
    rec('phone-mode.client.js があれば見出しのボタンから QR と実機への反映につながる', st.on && st.panel && st.pop && /\/qr/.test(st.qr) && st.client && st.dupBanner === 'none' && pushes.length > n0 && mb['kv.copySize'] === 40 && second.on && !second.pop && !off.on && !off.panel && !off.frame,
      `ボタン1押し → スマホモード=${st.on}・QRの窓=${st.pop ? '出た' : '出ない'}（${st.url}）・二重の帯=${st.dupBanner}／スマホモードで文字サイズ41 → 中継へ送信 ${pushes.length - n0} 回・送った中身のスマホ値 ${mb['kv.copySize']}／2回目の押下 → QRだけ閉じた=${!second.pop}（モード継続=${second.on}）／「スマホモード終了」→ ${off.on ? '続く' : '終わった'}・枠 ${off.frame ? '残る' : '消えた'}／送る保存キー ${st.keys}`);
    await context.close();
    relay.close();
  }

  /* ============ 13. 旧来の書き方・壊れた保存値でも事故らない ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await page.evaluate(() => {
      localStorage.setItem('tp:tp-demo:v1', '{壊れたJSON');
      localStorage.setItem('tp:tp-demo:v1:mb', JSON.stringify({ 'kv.copySize': 'あ', 'nai.key': 5, 'kv.align': 'right', 'site.pad': 30 }));
      localStorage.setItem('tp:tp-demo:variants', JSON.stringify({ hidden: { 'kv.variant': ['nai', 'minimal'], 'nai.pill': ['x'] }, fav: 'x', ov: { 'kv.variant': { strong: { copyX: 9 } } } }));
      localStorage.setItem('tp:tp-demo:v0', '{"old":1}');
    });
    await page.reload(); await page.waitForTimeout(200);
    const res = await page.evaluate(() => { const p = TunePanel.instances[0]; const h = p._vs.hidden; return { pad: p.params.site.pad, mb: JSON.stringify(p._mb), hidden: JSON.stringify(h['kv.variant']), stray: Object.keys(h).filter(k => !p._ctlById(k)), ov: JSON.stringify((p._vs.ov['kv.variant'] || {}).strong || null), v0: localStorage.getItem('tp:tp-demo:v0'), panelOk: p._tabs.length === 3 }; });
    rec('壊れた保存値・知らないキー・型違い・無くなった選択肢は捨てて既定値へ／古い版は掃除', res.pad === 64 && res.mb === '{"site.pad":30}' && res.hidden === '["minimal"]' && !res.stray.length && res.v0 === null && res.panelOk,
      `パディング ${res.pad}（壊れたJSON→既定）・スマホの上書き ${res.mb}（型違い・知らないキー・無い選択肢を捨てた）・隠した案 ${res.hidden}（無い案・無い欄は捨てた）・形の違う控え→${res.ov}・v0 の保存 ${res.v0 === null ? '消えた' : '残った'}`);
    /* 旧オプション（autoCenter・search・saveMode）を渡しても動く */
    const legacy = await page.evaluate(() => {
      const prm = { a: { x: 10, on: true } };
      const p = TunePanel.create({ params: prm, storageKey: 'tp-legacy', autoCenter: true, search: true, saveMode: 'button', tabs: true, startClosed: true, secret: false, position: { right: 20, bottom: 20 },
        schema: [{ cat: '旧', items: [{ sub: '見出し' }, { slider: 'X', path: 'a.x', min: 0, max: 100, step: 1, unit: 'ms' }, { toggle: 'オン', path: 'a.on' }, { note: '補足' }] }] });
      const i = p.el.querySelector('input[type=range]');
      const out = { min: +i.min, max: +i.max, val: p.el.querySelector('.tp-val').textContent, search: !!p.el.querySelector('input[type=search]'), closed: p.el.classList.contains('closed'), shown: !p.el.classList.contains('tp-hide'), right: getComputedStyle(p.el).right };
      p.destroy();
      return out;
    });
    rec('旧オプション（autoCenter・search・saveMode・unit）を渡しても事故らない', legacy.min === 0 && legacy.max === 20 && legacy.val === '10ms' && !legacy.search && legacy.closed && legacy.shown && legacy.right === '20px',
      `autoCenter:true でも範囲は ${legacy.min}〜${legacy.max}（いまの値10が真ん中）・unit:'ms' の表示「${legacy.val}」・検索欄 ${legacy.search ? 'あり' : 'なし'}・startClosed=${legacy.closed}・secret:false で常時表示=${legacy.shown}・position 右 ${legacy.right}`);
    await context.close();
  }

  /* ============ 14. 細かい見た目と操作（行の形・かたまりの間・補足文・ピルの吹き出し・タブ・箱の開閉の記憶） ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, 'キービジュアル');
    const d = await page.evaluate(() => {
      const q = s => document.querySelector(s), cs = (e, pe) => getComputedStyle(e, pe);
      const rows = [...document.querySelectorAll('.tp-row')];
      const segItem = q('.tp-item[data-key="kv.align"]'), xItem = q('.tp-item[data-key="kv.copyX"]'), yItem = q('.tp-item[data-key="kv.copyY"]');
      const h2 = q('.tp-pane.on .tp-sec-head'), varHead = q('.tp-pane.on .tp-cs.var > .tp-cs-head');
      const lab = q('.tp-item[data-key="kv.copyX"] label');
      const pill = q('.tp-item[data-key="kv.variant"] .tp-pill[data-value="strong"]');
      const segOn = q('.tp-item[data-key="kv.align"] .tp-seg button.on');
      return {
        rowsWithRst: rows.filter(r => r.querySelector('.tp-rst')).length, rows: rows.length,
        gapSegToSlider: cs(xItem).marginTop, gapSliderToSlider: cs(yItem).marginTop, gapFirst: cs(segItem).marginTop,
        h2: cs(h2).fontSize + '/' + cs(h2).fontWeight, varHead: varHead.textContent + '|' + cs(q('.tp-pane.on .tp-cs.var')).backgroundColor,
        hintsShown: [...document.querySelectorAll('.tp-hint,.tp-note')].filter(e => e.offsetParent).length, labTitle: lab.title,
        pillTitle: pill.title, desc: !!q('.tp-desc'), segOn: cs(segOn).backgroundColor,
        tools: document.querySelectorAll('.tp-item-tools,[draggable="true"]').length, emoji: [...document.querySelectorAll('.tp-tab,.tp-cs-head,.tp-sec-head span:first-child')].filter(e => /\p{Extended_Pictographic}/u.test(e.textContent)).length
      };
    });
    rec('1行の形（全部の行に↺）・違う種類の前は9px・H2は12px太字・バリエーションは装飾なし', d.rowsWithRst === d.rows && d.gapSegToSlider === '9px' && d.gapSliderToSlider === '0px' && d.gapFirst === '0px' && d.h2 === '12px/600' && d.varHead === 'バリエーション|rgba(0, 0, 0, 0)' && d.emoji === 0,
      `↺ のある行 ${d.rowsWithRst}/${d.rows}・2〜3択→つまみの間 ${d.gapSegToSlider}・つまみ→つまみ ${d.gapSliderToSlider}・H2 ${d.h2}・「${d.varHead.split('|')[0]}」の地 ${d.varHead.split('|')[1]}・タブや見出しの絵文字 ${d.emoji}`);
    rec('補足文は画面に出さず項目名の吹き出し・案の説明はピルの吹き出し（元の ID も）', d.hintsShown === 0 && /0＝いまの位置/.test(d.labTitle) && /大きいコピーと光るグラフィック/.test(d.pillTitle) && /（ID strong）/.test(d.pillTitle) && !d.desc && d.tools === 0 && d.segOn === 'rgb(9, 9, 9)',
      `画面に出ている補足文 ${d.hintsShown}・項目名の吹き出し「${d.labTitle}」・ピルの吹き出し「${d.pillTitle}」・2〜3択の選択色 ${d.segOn}・項目の削除/並び替えの道具 ${d.tools}`);
    await tab(page, '実績');
    const cur = await page.evaluate(() => [...document.querySelectorAll('.tp-item[data-key="res.fx"] .tp-pill:not(.back)')].map(b => b.dataset.label + (b.querySelector('.tp-pill-x') ? '(⋯)' : '')));
    rec('「現行」は先頭・番号なし（⋯ から消せる）', cur[0] === 'フェード(⋯)' && cur[1] === '1 スライド(⋯)' && cur[2] === '2 ズーム(⋯)', cur.join('・'));
    /* カテゴリの箱の開閉とタブを覚える（リロード後も） */
    await page.click('.tp-pane.on .tp-cs.card[data-grp="basic"] > .tp-cs-head');
    const closed1 = await page.evaluate(() => document.querySelector('.tp-pane.on .tp-cs.card[data-grp="basic"]').classList.contains('closed'));
    await page.waitForTimeout(100);
    await page.reload(); await page.waitForTimeout(150);
    await showPanel(page);
    const after = await page.evaluate(() => ({ tab: TunePanel.instances[0]._activeTab, closed: document.querySelector('.tp-pane.on .tp-cs.card[data-grp="basic"]').classList.contains('closed'), others: [...document.querySelectorAll('.tp-pane.on .tp-cs.card')].filter(c => !c.classList.contains('closed')).map(c => c.dataset.grp) }));
    rec('カテゴリの箱は既定で全部開く・押すと閉じる・選んだタブと開閉はリロード後も覚える', closed1 && after.tab === '実績' && after.closed && after.others.length >= 1,
      `基本を押す → 閉じた=${closed1} → リロードして出す: タブ「${after.tab}」・基本 ${after.closed ? '閉じたまま' : '開いた'}・ほかの箱 ${after.others.join('・')} は開いたまま`);
    /* 案の控え（隠した案・★・上書き）は本体の設定と別の入れ物 */
    await pillMenu(page, 'res.picto', 'fill', '★ お気に入りにピン留め');
    await page.waitForTimeout(1000);
    const store = await page.evaluate(() => ({ main: Object.keys(JSON.parse(localStorage.getItem('tp:tp-demo:v1')) || {}), vars: JSON.parse(localStorage.getItem('tp:tp-demo:variants')) }));
    rec('案の控え（隠した案・★・上書き）は本体の設定と別の入れ物に保存', !store.main.some(k => /hidden|fav|ov|gfx/.test(k)) && store.vars && store.vars.fav['res.picto'].includes('fill') && store.vars.ov['kv.variant'],
      `本体 tp:tp-demo:v1 のキー ${store.main.join('・')}／tp:tp-demo:variants に ★ ${JSON.stringify(store.vars.fav['res.picto'])}・控え ${Object.keys(store.vars.ov).join('・')}`);
    await context.close();
  }

  /* ============ 15. タブがはみ出る時・見出しの ↺ の出し分け・✏️ 編集のつなぎ口・スマホモードのボタンを出さない設定 ============ */
  {
    const { context, page } = await newPage();
    await page.goto(`http://localhost:${PORT}/demo/index.html?tp-none=1`);
    await page.waitForFunction(() => window.TunePanel && TunePanel.instances.length > 0);
    const r = await page.evaluate(async () => {
      const edits = [];
      const prm = { a: { x: 10 } };
      const cats = ['全体', 'キービジュアル（いちばん上）', 'ビジョン', '実績', '開発者体験', '導入事例', 'お問い合わせ', 'メニュー'].map((t, i) => ({ cat: t, items: [{ sub: '見出し' + i }, { slider: '値', path: 'a.x', min: 0, max: 20, step: 1 }, { sub: '説明だけ' }, { note: 'この見出しには戻す値が無い' }, { button: '押す', onClick: () => {} }] }));
      const p = TunePanel.create({ params: prm, storageKey: 'tp-many', secret: false, phone: false, onEdit: on => edits.push(on), position: { left: 700, top: 40 }, size: { w: 300, h: 400 }, schema: cats });
      await new Promise(res => setTimeout(res, 50));
      const bar = p._tabBar, tabs = [...bar.querySelectorAll('.tp-tab')];
      const oneRow = new Set(tabs.map(t => Math.round(t.getBoundingClientRect().top))).size === 1;
      const over = bar.scrollWidth > bar.clientWidth;
      tabs[6].click();
      await new Promise(res => setTimeout(res, 700));
      const centered = Math.abs((tabs[6].getBoundingClientRect().left + tabs[6].getBoundingClientRect().width / 2) - (bar.getBoundingClientRect().left + bar.clientWidth / 2)) < 30 || bar.scrollLeft >= bar.scrollWidth - bar.clientWidth - 1;
      const label = tabs[1].textContent;
      bar.scrollLeft = 10; bar.dispatchEvent(new Event('scroll'));
      const scrolling = bar.classList.contains('is-scrolling');
      const top0 = bar.getBoundingClientRect().top;
      p.body.scrollTop = 200;
      await new Promise(res => setTimeout(res, 50));
      const sticky = Math.abs(bar.getBoundingClientRect().top - top0) < 1;
      const noBtn = [...p.el.querySelectorAll('.tp-pane.on .tp-sec')].map(s => (s.dataset.title || '') + ':' + (s.querySelector('.tp-gbtn') ? '↺' : 'なし'));
      p.editBtn.click();
      const editOn = p.editBtn.classList.contains('on');
      p.hide();
      const out = { oneRow, over, centered, label, scrolling, sticky, noBtn, phoneHidden: p.phoneBtn.hidden, editShown: !p.editBtn.hidden, editOn, edits: edits.join(','), editOff: !p.editBtn.classList.contains('on') };
      p.destroy();
      return out;
    });
    rec('タブは横1列・はみ出たら横スクロール・選んだタブは真ん中へ・貼りつく・バーは動かしている間だけ', r.oneRow && r.over && r.centered && r.label === 'キービジュアル' && r.scrolling && r.sticky,
      `8タブ: 1列=${r.oneRow}・はみ出し=${r.over}・7つ目を押す → 真ん中へ=${r.centered}・タブ名「${r.label}」（（…）は吹き出しへ）・スクロール中の印=${r.scrolling}・中身を送っても貼りつく=${r.sticky}`);
    rec('戻す値の無い見出しには ↺ を出さない', r.noBtn.join(',') === '見出し6:↺,説明だけ:なし', r.noBtn.join(' ／ '));
    rec('✏️ 編集は onEdit を渡した時だけ出る（隠すと編集も終わる）・phone:false でスマホモードのボタンを出さない', r.editShown && r.editOn && r.edits === 'true,false' && r.editOff && r.phoneHidden,
      `✏️ 編集 表示=${r.editShown}・押す→${r.editOn ? '編集中' : '×'}・隠す→ onEdit(${r.edits})・スマホモードのボタン ${r.phoneHidden ? '出さない' : '出る'}`);
    await context.close();
  }

  /* ============ 16. 名前だけ・見出しだけを残さない（1案で欄を隠す時は名前の行も・中身が全部隠れた見出しは見出しごと） ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    await tab(page, '全体');
    const st = () => page.evaluate(() => {
      const vis = e => !!(e && e.offsetParent);
      const row = document.querySelector('.tp-item[data-key="site.font"]');
      const lab = row.querySelector('.tp-var-lab');
      const sec = document.querySelector('.tp-pane.on .tp-sec[data-title="見出し"]');
      const card = sec.closest('.tp-cs');
      const back = row.querySelector('.tp-pill.back');
      return { row: vis(row), lab: vis(lab), labText: lab.textContent, sec: vis(sec), card: vis(card), sel: TunePanel.instances[0].params.site.font, back: vis(back) ? back.textContent : '', pills: [...row.querySelectorAll('.tp-pill:not(.back)')].filter(vis).length };
    });
    const f0 = await st();
    await pillMenu(page, 'site.font', 'mincho', '🗑 削除'); await page.click('.tp-mdl-btns button.danger'); await page.waitForTimeout(120);
    const f1 = await st();
    await pillMenu(page, 'site.font', 'round', '🗑 削除'); await page.click('.tp-mdl-btns button.danger'); await page.waitForTimeout(200);
    const f2 = await st();
    await page.evaluate(() => TunePanel.instances[0].restoreVariants('site.font'));
    await page.waitForTimeout(100);
    const f3 = await st();
    rec('1案だけ残ったら、名前の行（書体）とピルは隠れて「↺ 消した案を戻す」だけ残る・戻すと全部戻る', f0.row && f0.lab && f0.sec && f1.row && f2.row && !f2.lab && f2.pills === 0 && f2.back === '↺ 消した案を戻す (2)' && f2.sec && f2.card && f2.sel === 'gothic' && f3.row && f3.lab && f3.sec && !f3.back,
      `3案: 欄=${f0.row ? '出' : '隠'}・名前「${f0.labText}」=${f0.lab ? '出' : '隠'}・見出し=${f0.sec ? '出' : '隠'} → 2案: 欄=${f1.row ? '出' : '隠'} → 1案: ピル=${f2.pills}個・名前=${f2.lab ? '出' : '隠'}・戻すボタン「${f2.back || 'なし'}」・見出し「見出し」=${f2.sec ? '出' : '隠'}・フォントの箱=${f2.card ? '出（本文があるので）' : '隠'}・選択=${f2.sel} → restoreVariants で戻す: 欄=${f3.row ? '出' : '隠'}・名前=${f3.lab ? '出' : '隠'}・見出し=${f3.sec ? '出' : '隠'}`);

    const solo = await page.evaluate(async () => {
      const prm = { a: { v: 'x', n: 1 } };
      const p = TunePanel.create({ params: prm, storageKey: 'tp-solo', secret: false, phone: false, position: { left: 700, top: 40 }, size: { w: 300, h: 400 },
        schema: [{ cat: 'テスト', items: [{ sub: 'ひとつ' }, { pills: '案', path: 'a.v', options: [{ name: 'エックス', value: 'x' }] }, { sub: 'ほか' }, { slider: '数', path: 'a.n', min: 0, max: 2, step: 0.1 }] }] });
      await new Promise(r => setTimeout(r, 80));
      const vis = e => !!(e && e.offsetParent);
      const row = p.el.querySelector('.tp-item[data-key="a.v"]');
      const out = { row: vis(row), sec: vis(p.el.querySelector('.tp-sec[data-title="ひとつ"]')), other: vis(p.el.querySelector('.tp-sec[data-title="ほか"]')) };
      p.destroy();
      return out;
    });
    rec('消した案が無い1案（コードに1つしか無い）は、今までどおり欄も見出しも隠れる', !solo.row && !solo.sec && solo.other,
      `1つしか無い案の欄=${solo.row ? '出' : '隠'}・その見出し=${solo.sec ? '出' : '隠'}・となりの見出し=${solo.other ? '出' : '隠'}`);

    const g = () => page.evaluate(() => {
      const vis = e => !!(e && e.offsetParent);
      const sec = document.querySelector('.tp-pane.on .tp-sec[data-title="グリッドの線"]');
      const sg = sec.querySelector('.tp-subg[data-title="線"]');
      return { sec: vis(sec), subg: vis(sg), mark: sec.classList.contains('tp-off') + '/' + sg.classList.contains('tp-off'), c: vis(document.querySelector('.tp-item[data-key="site.gridColor"]')), w: vis(document.querySelector('.tp-item[data-key="site.gridWidth"]')) };
    });
    const g0 = await g();
    await page.click('.tp-item[data-key="site.grid"] .tp-seg button[data-value="true"]'); await page.waitForTimeout(80);
    const g1 = await g();
    await page.click('.tp-item[data-key="site.grid"] .tp-seg button[data-value="false"]'); await page.waitForTimeout(80);
    const g2 = await g();
    rec('中身が全部 when で隠れた まとまり・見出しは見出しごと隠れる・中身が戻ると戻る', !g0.sec && !g0.subg && !g0.c && !g0.w && g1.sec && g1.subg && g1.c && g1.w && !g2.sec && !g2.subg,
      `グリッド「しない」: 見出し「グリッドの線」=${g0.sec ? '出' : '隠'}・まとまり「線」=${g0.subg ? '出' : '隠'}（部品の印 ${g0.mark}）→「する」: ${g1.sec ? '出' : '隠'}/${g1.subg ? '出' : '隠'}・色=${g1.c ? '出' : '隠'}・太さ=${g1.w ? '出' : '隠'} →「しない」: ${g2.sec ? '出' : '隠'}/${g2.subg ? '出' : '隠'}`);

    /* カテゴリのカードとタブも、中身が全部隠れたら隠れる。作る人が自分で隠した部品には印を付けない */
    const r = await page.evaluate(async () => {
      const prm = { a: { x: 1, on: false, w: 2, c: '#ff0000', f: 'g' } };
      const p = TunePanel.create({ params: prm, storageKey: 'tp-empty', secret: false, phone: false, position: { left: 700, top: 30 }, schema: [
        { cat: 'A', items: [{ sub: '見出し', grp: 'basic' }, { toggle: '表示', path: 'a.on' }] },
        { cat: 'B', items: [
          { sub: '線', grp: 'fxtex' }, { subgroup: '枠', items: [{ slider: '太さ', path: 'a.w', min: 0, max: 8, step: 0.5, when: q => q.a.on }, { color: '色', path: 'a.c', when: q => q.a.on }] },
          { sub: '書体', grp: 'font' }, { pills: '書体', path: 'a.f', options: [['ゴシック', 'g'], ['明朝', 'm']] },
          { sub: '自前の部品', grp: 'other' }, { custom: el => { const d = document.createElement('div'); d.textContent = '自前'; d.style.display = 'none'; d.id = 'authorHidden'; el.appendChild(d); } }
        ]},
        { cat: 'C', items: [{ sub: 'Cの見出し', grp: 'anim', when: q => q.a.on }, { slider: '値', path: 'a.x', min: 0, max: 4, step: 1 }] }
      ]});
      /* 画面に出ているかではなく「部品が出す側にしているか」で見る（空になったタブは隠れて別のタブへ移るため） */
      const vis = e => !!e && !e.closest('.tp-off');
      const pane = t => p.el.querySelector(`.tp-pane[data-tab="${t}"]`);
      const card = (t, g) => pane(t).querySelector(`.tp-cs[data-grp="${g}"]`);
      const tabBtn = t => p.el.querySelector(`.tp-tab[data-tab="${t}"]`);
      p._showTab('B');
      const s0 = { fx: vis(card('B', 'fxtex')), font: vis(card('B', 'font')), other: vis(card('B', 'other')), tabC: !tabBtn('C').hidden, authorMark: document.getElementById('authorHidden').classList.contains('tp-off'), authorDisp: document.getElementById('authorHidden').style.display };
      p._deleteVariant(p._ctlById('a.f'), 'm', '明朝', { noConfirm: true });
      await new Promise(res => setTimeout(res, 30));
      /* 1案＋消した案あり → 「↺ 消した案を戻す」が残るので、カードもタブも残る（2026-09-27 ヒデさん） */
      const fontRow = pane('B').querySelector('.tp-item[data-key="a.f"]');
      const s1 = { font: vis(card('B', 'font')), back: (fontRow.querySelector('.tp-pill.back') || {}).textContent || '', tabB: !tabBtn('B').hidden, active: p._activeTab };
      prm.a.on = true; p.sync();
      document.getElementById('authorHidden').style.display = ''; p.sync();
      const s2 = { fx: vis(card('B', 'fxtex')), other: vis(card('B', 'other')), tabC: !tabBtn('C').hidden, tabB: !tabBtn('B').hidden };
      /* 見ているタブの中身が全部隠れたら、そのタブは隠れて別のタブへ移る */
      p._showTab('C'); prm.a.on = false; p.sync();
      await new Promise(res => setTimeout(res, 30));
      const sC = { tabC: !tabBtn('C').hidden, active: p._activeTab };
      p.restoreVariants('a.f');
      const s3 = { font: vis(card('B', 'font')), pills: fontRow.querySelectorAll('.tp-pill:not(.back)').length };
      p.destroy();
      return { s0, s1, s2, sC, s3 };
    });
    rec('中身が全部隠れたカテゴリのカードとタブも隠れる・作る人が自分で隠した部品には印を付けない', !r.s0.fx && r.s0.font && !r.s0.other && !r.s0.tabC && !r.s0.authorMark && r.s0.authorDisp === 'none' && r.s1.font && r.s1.back === '↺ 消した案を戻す (1)' && r.s1.tabB && r.s1.active === 'B' && r.s2.fx && r.s2.other && r.s2.tabC && r.s2.tabB && !r.sC.tabC && r.sC.active !== 'C' && r.s3.font && r.s3.pills === 2,
      `when で空のカード「エフェクト」=${r.s0.fx ? '出' : '隠'}・中身を自分で隠した custom だけのカード「その他」=${r.s0.other ? '出' : '隠'}（その部品に部品の印=${r.s0.authorMark}・display=${r.s0.authorDisp} のまま）・中身が全部隠れたタブC=${r.s0.tabC ? '出' : '隠'} → 1案でカード「フォント」=${r.s1.font ? '出' : '隠'}（戻すボタン「${r.s1.back}」が残るのでタブB=${r.s1.tabB ? '出' : '隠'}・見ているタブ ${r.s1.active}）→ 条件を満たす: エフェクト=${r.s2.fx ? '出' : '隠'}・その他=${r.s2.other ? '出' : '隠'}・タブC=${r.s2.tabC ? '出' : '隠'} → タブCを見ている時に中身が全部隠れる: タブC=${r.sC.tabC ? '出' : '隠'}・見ているタブは ${r.sC.active} へ → 案を戻す: フォント=${r.s3.font ? '出' : '隠'}・ピル ${r.s3.pills} 個`);
    await context.close();
  }
  /* ============ 17. デザインの数値の決まり（ルール集 4-7）：余白・サイズ・角丸・文字サイズのつまみは4と8の倍数に止まる ============ */
  {
    const { context, page } = await newPage();
    await open(page);
    await showPanel(page);
    const setv = async (tabName, key, v) => {
      await tab(page, tabName);
      return page.evaluate(([k, v]) => {
        const inp = document.querySelector(`.tp-pane.on .tp-item[data-key="${k}"] input[type=range]`);
        if (!inp) return 'なし';
        inp.value = v;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        return k.split('.').reduce((o, x) => o && o[x], TunePanel.instances[0].params);
      }, [key, v]);
    };
    const r = {
      gap14: await setv('実績', 'res.cardGap', 14), pad10: await setv('実績', 'res.cardPad', 10), pad6: await setv('実績', 'res.cardPad', 6),
      rad5: await setv('実績', 'res.radius', 5), bw05: await setv('実績', 'res.border.width', 0.5),
      fs15: await setv('キービジュアル', 'kv.copySize', 15), fs14: await setv('キービジュアル', 'kv.copySize', 14), x14: await setv('キービジュアル', 'kv.copyX', 14),
      gw: await setv('全体', 'site.gridWidth', 1.5),
    };
    rec('つまみはデザインの数値の決まり（4-7）に止まる：余白・サイズ・角丸・文字サイズは4の倍数（10px以下は2刻み・文字は14と18も可）。位置・線幅は止めない',
      r.gap14 === 16 && r.pad10 === 10 && r.pad6 === 6 && r.rad5 === 6 && r.bw05 === 0.5 && r.fs15 === 16 && r.fs14 === 14 && r.x14 === 14 && (r.gw === 1.5 || r.gw === 'なし'),
      `ギャップ 14→${r.gap14}・パディング 10→${r.pad10}・6→${r.pad6}・角丸 5→${r.rad5}・枠線の太さ 0.5→${r.bw05}・方眼の線の太さ 1.5→${r.gw}・文字サイズ 15→${r.fs15}・14→${r.fs14}・位置X 14→${r.x14}`);
    /* 名前から種類を見分ける（2026-09-28：「本文サイズ」「bodySize」が大きさ扱いになり、14・18 が寄ってしまっていた） */
    const kinds = await page.evaluate(() => {
      const k = (slider, path) => TunePanel.utils.gridKindOf({ slider, path, unit: 'px' });
      return {
        body: k('本文サイズ', 'dt.body'), bodySize: k('', 'detail.bodySize'), head: k('見出しの大きさ', 'dt.head'), label: k('ラベル', 'nav.labelSize'),
        headGap: k('見出しの下の余白', 'dt.headGap'), bodyW: k('本文の幅', 'dt.bodyWidth'), icon: k('アイコンの大きさ', 'nav.iconSize'), titleR: k('タイトルの角丸', 'card.titleRadius'),
        font: k('文字サイズ', 'kv.copySize'), snap14: TunePanel.utils.snapGrid(14, 'fontSize'), snap18: TunePanel.utils.snapGrid(18, 'fontSize'),
      };
    });
    rec('つまみの名前から種類を見分ける：本文・見出し・ラベルは文字（14・18 のまま）、余白・幅・角丸・アイコンはそれぞれの決まり',
      kinds.body === 'fontSize' && kinds.bodySize === 'fontSize' && kinds.head === 'fontSize' && kinds.label === 'fontSize' && kinds.headGap === 'spacing' &&
      kinds.bodyW === 'size' && kinds.icon === 'size' && kinds.titleR === 'radius' && kinds.font === 'fontSize' && kinds.snap14 === 14 && kinds.snap18 === 18,
      Object.entries(kinds).map(([a, b]) => a + '=' + b).join('・'));
    await context.close();
  }
} catch (e) {
  console.error(e);
  rec('検査の実行', false, '途中で止まった: ' + (e && e.message ? e.message.split('\n')[0] : e));
}

rec('ページのエラー（console.error・例外）が出ない', pageErrors.length === 0, pageErrors.length ? pageErrors.slice(0, 5).join(' / ') : '0 件');

await browser.close();
server.close();

/* ---------- 表で出す ---------- */
const ok = results.filter(r => r.ok).length;
console.log('\n| 項目 | 結果 | 測った値 |\n|---|---|---|');
results.forEach(r => console.log(`| ${r.name} | ${r.ok ? '✅' : '❌'} | ${r.measured.replace(/\|/g, '｜')} |`));
console.log(`\n合計 ${results.length} 項目: ✅ ${ok} ・ ❌ ${results.length - ok}`);
fs.writeFileSync(path.join(HERE, 'last-result.json'), JSON.stringify({ at: new Date().toISOString(), ok, total: results.length, results }, null, 1));
process.exit(ok === results.length ? 0 : 1);
