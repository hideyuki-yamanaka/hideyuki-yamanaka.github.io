const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  for (const [tag, w, h] of [['pc', 1440, 1000], ['sp', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,140)));
    await p.goto('http://localhost:3095/mock/carousels', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    const off = await p.$('text=OFF'); if (off) await off.click();
    await p.waitForTimeout(2600);
    // 案12
    const g = await p.$$('[role="group"]');
    const r1 = await g[0].boundingBox();
    await p.evaluate(y => window.scrollTo({ top: y }), Math.max(0, r1.y - 60));
    await p.waitForTimeout(1200);
    await p.screenshot({ path: SS + `fx-12-${tag}.png` });
    // 案13
    const r2 = await g[1].boundingBox();
    await p.evaluate(y => window.scrollTo({ top: y }), Math.max(0, r2.y - 60));
    await p.waitForTimeout(2000);
    await p.screenshot({ path: SS + `fx-13-${tag}.png` });
    console.log(tag, 'err:', errs.length ? errs : 'なし', '／ canvas:', await p.evaluate(() => document.querySelectorAll('canvas').length));
    await ctx.close();
  }
  await b.close();
})();
