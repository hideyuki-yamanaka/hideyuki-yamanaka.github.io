/* 調整パネルの見た目の確かめ（RULES 6-15・2026-09-28）
 *
 *   node anyflow/v5/tools/checks/panel-look-check.mjs [URL]      （URL の既定は http://localhost:8778/）
 *
 * ① 地の色: パネル本体・見出しの帯・タブの帯・中身の地が、同じ不透明の白か（半透明・ぼかしは不合格）
 * ② 先頭の線: どのタブでも、タブの帯のすぐ下（中身の一番上）に区切り線が無いか
 *    区切り線＝上だけに線がある箱（左右にも線がある箱は「カード」の外枠なので数えない）
 * ③ 区切り線が「間」には残っているか（実績の 2つ目の案の見出し「ピクトグラム」の上）
 * ④ カテゴリのカードを押すと畳めて、もう一度で開くか（2026-09-29 夜 追加）
 * 1つでも ❌ があれば終了コード 1
 */
import { chromium } from '/Users/hideyuki/Developer/Claude Code/design-gallery/node_modules/playwright/index.mjs';
const URL = process.argv[2] || 'http://localhost:8778/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
/* パネルを出して開く(隠しモード・たたんだ状態から) */
await p.evaluate(() => {
  const t = document.querySelector('.tools'); if (t) t.classList.remove('tools-hidden');
  const pn = document.querySelector('.tools .panel.closed');
  if (pn) { const tg = [...pn.querySelectorAll('*')].find(x => /^[▼▲]$/.test((x.textContent || '').trim()) && x.children.length === 0); if (tg) tg.click(); else pn.classList.remove('closed'); }
});
await p.waitForTimeout(600);
const rows = [];
/* ① 地の色 */
const bands = await p.evaluate(() => {
  const panel = document.querySelector('.tools .panel'), r = panel.getBoundingClientRect();
  const eff = (x, y) => { let e = document.elementFromPoint(x, y); const hit = []; while (e && e !== document.body) { const c = getComputedStyle(e); if (c.backgroundColor !== 'rgba(0, 0, 0, 0)' || (c.backdropFilter && c.backdropFilter !== 'none')) hit.push({ bg: c.backgroundColor, blur: c.backdropFilter || 'none' }); if (e === panel) break; e = e.parentElement; } return hit[0] || { bg: '-', blur: '-' }; };
  const tabs = document.querySelector('.tools .pan-tabs').getBoundingClientRect();
  return { 本体: { bg: getComputedStyle(panel).backgroundColor, blur: getComputedStyle(panel).backdropFilter || 'none' }, 見出し: eff(r.left + 20, r.top + 20), タブ: eff(r.left + r.width / 2, tabs.top + tabs.height / 2), 中身: eff(r.left + r.width / 2, tabs.bottom + 120) };
});
const bgSet = new Set(Object.values(bands).map(x => x.bg));
const opaque = [...bgSet].every(c => /^rgb\(/.test(c));
const noBlur = Object.values(bands).every(x => x.blur === 'none' || x.blur === '-');
rows.push(['① 地の色が1色で不透明・ぼかし無し', bgSet.size === 1 && opaque && noBlur, Object.entries(bands).map(([k, v]) => `${k}=${v.bg}${v.blur !== 'none' ? '・ぼかし ' + v.blur : ''}`).join(' ／ ')]);
/* ② 各タブの先頭に区切り線が無いか */
const tabNames = await p.evaluate(() => [...document.querySelectorAll('.tools .pan-tabs > *')].map(x => x.textContent.trim()).filter(Boolean));
const topLines = [];
for (const t of tabNames) {
  const hit = await p.evaluate(t => {
    const btn = [...document.querySelectorAll('.tools .pan-tabs > *')].find(x => x.textContent.trim() === t); if (btn) btn.click();
    const sc = document.querySelector('.tools .panel-body'); if (sc) sc.scrollTop = 0;
    const tabsB = document.querySelector('.tools .pan-tabs').getBoundingClientRect().bottom;
    const out = [];
    for (const e of document.querySelectorAll('.tools .panel *')) {
      if (e.closest('.pan-tabs')) continue;
      let q = e, shown = true; while (q && !q.classList.contains('panel')) { if (getComputedStyle(q).display === 'none') { shown = false; break; } q = q.parentElement; } if (!shown) continue;
      const c = getComputedStyle(e), r = e.getBoundingClientRect(); if (r.width < 150) continue;
      const lone = parseFloat(c.borderTopWidth) > 0 && c.borderTopStyle !== 'none' && !(parseFloat(c.borderLeftWidth) > 0);   /* 上だけの線＝区切り線(カードの外枠は数えない) */
      if (lone && r.top - tabsB > -2 && r.top - tabsB < 40) out.push(`${e.tagName.toLowerCase()}.${String(e.className).split(' ').filter(Boolean).slice(0, 3).join('.')}`);
    }
    return out;
  }, t);
  if (hit.length) topLines.push(`${t}: ${hit.join(', ')}`);
}
rows.push(['② どのタブも先頭に区切り線が無い', topLines.length === 0, topLines.length ? topLines.join(' ／ ') : `${tabNames.length}タブとも無し`]);
/* ③ 間の区切り線は残っている(実績の「ピクトグラム」) */
const mid = await p.evaluate(() => { const v = [...document.querySelectorAll('.tools .vs-section')].find(x => /ピクトグラム/.test((x.querySelector('.cat-section-head') || {}).textContent || '')); return v ? getComputedStyle(v).borderTopWidth : '-'; });
rows.push(['③ 案の見出しと見出しの間の線は残る（実績の「ピクトグラム」の上）', mid === '1px', `上線 ${mid}`]);
/* ④ カテゴリのカードを押すと畳めるか(2026-09-29 夜: 余白の直しの並べ方が「畳んだ時は隠す」を上書きして、印は付くのに中身が隠れなかった) */
const acc = await p.evaluate(async () => { const tb = [...document.querySelectorAll('.tools .pan-tabs > *')].find(x => x.textContent.trim() === 'コンバージョン'); if (tb) tb.click(); await new Promise(r => setTimeout(r, 150));
  const c = document.querySelector('.tools .cat.tab-on .cat-section:not(.cs-variation)'); const bd = c.querySelector(':scope > .cat-section-body'); const shown = () => getComputedStyle(bd).display !== 'none';
  const s0 = shown(); c.querySelector('.cs-chev, .cat-section-head').click(); await new Promise(r => setTimeout(r, 150)); const s1 = shown(); c.querySelector('.cat-section-head').click(); await new Promise(r => setTimeout(r, 150)); const s2 = shown();
  return { s0, s1, s2 }; });
rows.push(['④ カテゴリのカードを押すと畳める・もう一度で開く', acc.s0 && !acc.s1 && acc.s2, `初め ${acc.s0 ? '開' : '閉'} → 押す ${acc.s1 ? '開' : '閉'} → もう一度 ${acc.s2 ? '開' : '閉'}`]);
rows.push(['ページのエラーが出ない', errs.length === 0, `${errs.length} 件`]);
console.log(`調整パネルの見た目の確かめ（${URL}）\n\n| 項目 | 結果 | 測った値 |\n|---|---|---|`);
rows.forEach(([n, ok, v]) => console.log(`| ${n} | ${ok ? '✅' : '❌'} | ${v} |`));
const ng = rows.filter(r => !r[1]).length;
console.log(`\n合計 ${rows.length} 項目: ✅ ${rows.length - ng} ・ ❌ ${ng}`);
await b.close();
process.exit(ng ? 1 : 0);
