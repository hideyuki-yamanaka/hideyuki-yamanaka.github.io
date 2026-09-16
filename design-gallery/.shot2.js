const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  for (const [tag, w, h] of [['pc', 1440, 1000], ['sp', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,140)));
    await p.goto('http://localhost:3095/mock/carousels', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    const off = await p.$('text=OFF'); if (off) await off.click();
    await p.mouse.move(3, 3);
    await p.waitForTimeout(2600);
    await p.screenshot({ path: SS + `fx-12-${tag}.png` });
    await p.evaluate(() => document.querySelectorAll('[role="group"]')[1].scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(2600);
    await p.screenshot({ path: SS + `fx-13-${tag}.png` });
    const m = await p.evaluate(() => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { canvas: Math.round(r.width) + 'x' + Math.round(r.height), 横: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    console.log(tag, JSON.stringify(m), 'err:', errs.length ? errs : 'なし');
    await ctx.close();
  }
  await b.close();
})();
