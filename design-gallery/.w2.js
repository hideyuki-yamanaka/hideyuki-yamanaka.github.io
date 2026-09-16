const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0,200)));
  p.on('console', m => { if (m.type()==='error' || m.type()==='warning') console.log(m.type()+':', m.text().slice(0,200)); });
  await p.addInitScript(() => localStorage.setItem('tp:abashiri-top-tune:v37', JSON.stringify({ events: { pattern: 35, tailPad: 0 } })));
  await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1300);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.evaluate(() => { const sc = document.querySelector('[data-abashiri-scroller]'); sc.scrollTo({ top: sc.scrollHeight * 0.86 }); });
  await p.waitForTimeout(2500);
  console.log('canvas:', await p.evaluate(() => document.querySelectorAll('canvas').length));
  console.log('three の色定数:', await p.evaluate(async () => {
    try { const T = await import('/_next/static/chunks/node_modules_three_build_three_core_js.js').catch(()=>null); return 'n/a'; } catch(e){ return String(e).slice(0,80); }
  }));
  await b.close();
})();
