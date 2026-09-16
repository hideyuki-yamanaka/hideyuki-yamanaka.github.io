const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  for (const [vn, w, h] of [['pc',1512,982],['sp',375,812]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,110)));
    await p.addInitScript(() => localStorage.setItem('tp:abashiri-spot-detail-tune:v11', JSON.stringify({ detail: { pattern: 3, headSize: 26, bodySize: 15 } })));
    await p.goto('http://localhost:3095/spot/notoro', { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const off = await p.$('text=OFF'); if (off) await off.click();
    await p.waitForTimeout(1200);
    let over = 0;
    for (const f of [0, 0.85, 0.92, 1.4, 2.5]) {
      await p.evaluate(fr => { const el = document.querySelector('main'); el.scrollTo({ top: el.clientHeight * fr }); }, f);
      await p.waitForTimeout(900);
      over = Math.max(over, await p.evaluate(() => { const el = document.querySelector('main'); return Math.max(el.scrollWidth - el.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); }));
      if (vn === 'pc' && [0, 0.92, 1.4].includes(f)) await p.screenshot({ path: SS + `v2c-${f}.png` });
    }
    console.log(vn, '横はみ出し', over, 'err:', errs.length ? errs : 'なし');
    await ctx.close();
  }
  await b.close();
})();
