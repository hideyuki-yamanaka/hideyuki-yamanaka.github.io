const { chromium } = require('playwright');
const PATS = [1,2,3,4,9,11,16,21,22,23,24,25,29,30,31,32,33,34,35];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const bad = [];
  for (const n of PATS) {
    const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,100)));
    await p.addInitScript(v => localStorage.setItem('tp:abashiri-top-tune:v37', JSON.stringify({ events: { pattern: v, tailPad: 0 } })), n);
    await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1100);
    const off = await p.$('text=OFF'); if (off) await off.click();
    await p.waitForTimeout(900);
    let over = 0, ft = false;
    for (const f of [0.6, 0.78, 0.9, 0.99]) {
      await p.evaluate(fr => { const sc = document.querySelector('[data-abashiri-scroller]'); sc.scrollTo({ top: sc.scrollHeight * fr }); }, f);
      await p.waitForTimeout(950);
      const d = await p.evaluate(() => {
        const sc = document.querySelector('[data-abashiri-scroller]');
        return { o: Math.max(sc.scrollWidth - sc.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth),
                 ft: document.body.innerText.includes('ぼーっと疑似体験') };
      });
      over = Math.max(over, d.o); ft = ft || d.ft;
    }
    if (over !== 0 || !ft || errs.length) bad.push({ n, over, ft, err: errs[0] || '' });
    await ctx.close();
  }
  console.log('検査:', PATS.length, '案');
  console.log(bad.length ? '❌ ' + JSON.stringify(bad) : '✅ 全19案 OK（横はみ出し0px・フッター表示・JSエラーなし）');
  await b.close();
})();
