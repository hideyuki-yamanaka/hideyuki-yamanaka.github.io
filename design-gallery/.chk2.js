const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3095/mock/carousels', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.mouse.move(5, 5);
  await p.waitForTimeout(1800);
  const d = await p.evaluate(() => {
    const host = document.querySelectorAll('[role="group"]')[0];
    const a = host.querySelector('a');
    const info = a.querySelector('div');
    const inner = info.querySelector('div');
    return { 情報の外: getComputedStyle(info).opacity, 情報の中: getComputedStyle(inner).opacity,
             クラス: info.className.slice(0,120) };
  });
  console.log(JSON.stringify(d, null, 1));
  await b.close();
})();
