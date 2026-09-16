const { chromium } = require('playwright');
const PATS = [1,31,32,33,34];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const bad = [];
  for (const n of PATS) {
    const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,100)));
    await p.addInitScript(v => localStorage.setItem('tp:abashiri-top-tune:v39', JSON.stringify({ events: { pattern: v, tailPad: 0, cardRatio: 0, peelSpeed: 22 } })), n);
    await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    const off = await p.$('text=OFF'); if (off) await off.click();
    await p.waitForTimeout(1000);
    let over = 0, ft = false;
    for (const f of [0.5, 0.7, 0.85, 0.99]) {
      await p.evaluate(fr => { const sc = document.querySelector('[data-abashiri-scroller]'); sc.scrollTo({ top: sc.scrollHeight * fr }); }, f);
      await p.waitForTimeout(1000);
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
  console.log(bad.length ? '❌ ' + JSON.stringify(bad) : '✅ 体験 全5案 OK（横はみ出し0px・フッター表示・JSエラーなし）');
  await b.close();
})();
