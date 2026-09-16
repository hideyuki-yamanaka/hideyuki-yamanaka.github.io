const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,120)));
  await p.addInitScript(() => localStorage.setItem('tp:abashiri-top-tune:v37', JSON.stringify({ events: { pattern: 35, tailPad: 0 } })));
  await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1300);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const sc = document.querySelector('[data-abashiri-scroller]'); sc.scrollTo({ top: sc.scrollHeight * 0.86 }); });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: SS + 'webgl-fix.png' });
  // ドラッグしてみる
  const box = await p.$('canvas');
  const r = await box.boundingBox();
  await p.mouse.move(r.x + r.width * 0.6, r.y + r.height / 2);
  await p.mouse.down();
  for (let i = 0; i < 12; i++) { await p.mouse.move(r.x + r.width * 0.6 - i * 30, r.y + r.height / 2); await p.waitForTimeout(30); }
  await p.mouse.up();
  await p.waitForTimeout(1600);
  await p.screenshot({ path: SS + 'webgl-drag.png' });
  console.log('err:', errs.length ? errs : 'なし');
  await b.close();
})();
