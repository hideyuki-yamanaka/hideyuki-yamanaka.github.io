// 「①②で一旦止まる」をONにした時も、モックが比率そのまま・画面の高さに収まるか
import { chromium } from '/Users/hideyuki/Developer/Claude Code/design-gallery/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
for (const [w, h] of [[1440, 900], [1280, 760], [1024, 600]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8778/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.evaluate(() => { localStorage.setItem('anyflow-dev-nostop-20260927', '1'); params.sections.dev.pinStops = 'on'; save(); });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const out = [];
  for (const [nm, blk, sel] of [['①', 'devBlock1', '#devMock1'], ['②', 'devBlock2', '.dev2-stack']]) {
    const y = await p.evaluate(b => Math.round(document.getElementById(b).getBoundingClientRect().top + scrollY + 40), blk);
    let cur = 0; while (cur < y) { cur = Math.min(y, cur + 150); await p.evaluate(v => window.scrollTo(0, v), cur); await p.waitForTimeout(10); } await p.waitForTimeout(900);
    out.push(await p.evaluate(([sel, nm]) => { const root = document.querySelector(sel); const el = sel === '#devMock1' ? root : [...root.querySelectorAll('.dm-panel')].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
      const r = el.getBoundingClientRect(), hd = el.closest('.dev-block').querySelector('.dev-center').getBoundingClientRect();
      return `${nm} ${Math.round(r.width)}×${Math.round(r.height)}(比${(r.width / r.height).toFixed(3)}) 見出しの上${Math.round(hd.top)}px モックの下${Math.round(r.bottom)}px/画面${innerHeight}px ${r.bottom <= innerHeight + 0.5 && hd.top >= -0.5 ? '収まる' : '⚠️はみ出す'}`; }, [sel, nm]));
  }
  const pin = await p.evaluate(() => document.getElementById('dev').classList.contains('dev-pin'));
  console.log(`${w}×${h}（止まる=${pin ? 'ON' : 'OFF'}）: ${out.join(' ／ ')} ／ エラー${errs.length}`);
  await p.close();
}
await b.close();
