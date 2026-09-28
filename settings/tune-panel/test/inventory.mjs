/* 調整パネルの全項目を「タブ／カテゴリ／見出し／小見出し／名前／案ごとの持ち主」で書き出す（ルール集 6-13 の検査）
   使い方:
     node settings/tune-panel/test/inventory.mjs http://localhost:3095/ http://localhost:3095/spot/notoro > 前.json
     （直す）
     node settings/tune-panel/test/inventory.mjs http://localhost:3095/ http://localhost:3095/spot/notoro > 後.json
     node settings/tune-panel/test/inventory.mjs --compare 前.json 後.json
   ・使い捨てのブラウザで開く（保存値・「デフォルトに設定」には触らない）
   ・ページを開いた後に確認のモーダル（OFF ボタンなど）があれば押し、右下の角を押してパネルを出す */
import fs from 'node:fs';
const GL = { variation: 'バリエーション', basic: '基本', font: 'フォント', fxtex: 'エフェクト＆テクスチャ', anim: 'アニメーション', other: 'その他' };
const args = process.argv.slice(2);
if (args[0] === '--compare') {
  const B = JSON.parse(fs.readFileSync(args[1], 'utf8')), A = JSON.parse(fs.readFileSync(args[2], 'utf8'));
  const key = r => r.url + '|' + (r.key || r.label);
  const mb = new Map(B.map(r => [key(r), r])), ma = new Map(A.map(r => [key(r), r]));
  const lost = [...mb.keys()].filter(k => !ma.has(k)), added = [...ma.keys()].filter(k => !mb.has(k));
  const moved = [], owner = [];
  for (const [k, a] of ma) { const b = mb.get(k); if (!b) continue; if (a.cat !== b.cat) moved.push(`${a.key || a.label}: ${b.cat} → ${a.cat}`); if (a.owner !== b.owner) owner.push(`${a.key || a.label}: ${b.owner || '（なし）'} → ${a.owner || '（なし）'}`); }
  console.log(`前 ${B.length} 項目 ／ 後 ${A.length} 項目`);
  console.log(`消えた物 ${lost.length}${lost.length ? '：' + lost.join('、') : ''}`);
  console.log(`増えた物 ${added.length}${added.length ? '：' + added.join('、') : ''}`);
  console.log(`カテゴリが変わった物 ${moved.length}${moved.length ? '\n  ' + moved.join('\n  ') : ''}`);
  console.log(`案ごとの持ち主が変わった物 ${owner.length}${owner.length ? '\n  ' + owner.join('\n  ') : ''}`);
  process.exit(lost.length || owner.length ? 1 : 0);
}
const pwPath = new URL('../../../design-gallery/node_modules/playwright/index.mjs', import.meta.url).pathname;
const { chromium } = await import(pwPath);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const rows = [];
for (const url of args) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(2000);
  const off = page.getByRole('button', { name: 'OFF', exact: true });
  if (await off.count()) await off.first().click();
  await page.waitForTimeout(800);
  await page.mouse.click(1440 - 20, 900 - 20);
  await page.waitForTimeout(800);
  const got = await page.evaluate(({ url, GL }) => {
    const P = window.TunePanel && window.TunePanel.instances[0];
    if (!P) return [];
    const accByKey = {}; P._accs.forEach(a => { accByKey[a.key] = a; });
    return [...P.el.querySelectorAll('.tp-item')].map(it => {
      const pane = it.closest('.tp-pane'), cs = it.closest('.tp-cs'), sec = it.closest('.tp-sec'), deep = it.closest('.tp-deep') || it.closest('.tp-subg');
      const key = it.dataset.key || '', a = accByKey[key];
      const label = ((it.querySelector('.tp-row > label') || it.querySelector('.tp-var-lab') || it.querySelector('button') || {}).textContent || '').trim();
      return { url, tab: pane ? pane.dataset.tab : '', cat: cs ? (GL[cs.dataset.grp] || cs.dataset.grp) : '（カテゴリ外）',
        sec: sec ? (sec.dataset.title || '') : '', sub: deep ? ((deep.querySelector('.tp-deep-head, .tp-subg-lab') || {}).textContent || '') : '',
        label, kind: it.dataset.kind || '', key, owner: a && a.owner ? a.owner.id : '' };
    });
  }, { url, GL });
  rows.push(...got);
  await page.close();
}
await browser.close();
console.log(JSON.stringify(rows, null, 1));
