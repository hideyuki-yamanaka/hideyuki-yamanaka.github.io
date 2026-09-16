const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,140)));
  await p.addInitScript(() => localStorage.setItem('tp:abashiri-top-tune:v37', JSON.stringify({ events: { pattern: 35, tailPad: 0 } })));
  await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1300);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.waitForTimeout(800);
  // 体験セクションが真ん中に来るところへ
  await p.evaluate(() => {
    const sc = document.querySelector('[data-abashiri-scroller]');
    const ev = document.querySelector('#events');
    sc.scrollTo({ top: ev.offsetTop - 60 });
  });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: SS + 'webgl-a.png' });
  const r = await p.evaluate(() => { const c = document.querySelector('canvas'); const b = c.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  console.log('canvas:', JSON.stringify(r));
  await p.mouse.move(r.x + r.w * 0.55, r.y + r.h / 2);
  await p.mouse.down();
  for (let i = 1; i <= 14; i++) { await p.mouse.move(r.x + r.w * 0.55 - i * 26, r.y + r.h / 2); await p.waitForTimeout(25); }
  await p.mouse.up();
  await p.waitForTimeout(1800);
  await p.screenshot({ path: SS + 'webgl-b.png' });
  console.log('err:', errs.length ? errs : 'なし');
  await b.close();
})();
