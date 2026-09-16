const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
const PATS = [31,32,33,34,35];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const rows = [];
  for (const n of PATS) {
    const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,130)));
    const cons = []; p.on('console', m => { if (m.type()==='error') cons.push(m.text().slice(0,110)); });
    await p.addInitScript(v => localStorage.setItem('tp:abashiri-top-tune:v37', JSON.stringify({ events: { pattern: v, tailPad: 0 } })), n);
    await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1300);
    const off = await p.$('text=OFF'); if (off) await off.click();
    await p.waitForTimeout(1200);
    let over = 0, shot = false;
    for (const f of [0.62, 0.78, 0.9, 0.98]) {
      await p.evaluate(fr => { const sc = document.querySelector('[data-abashiri-scroller]'); sc.scrollTo({ top: sc.scrollHeight * fr }); }, f);
      await p.waitForTimeout(1300);
      const d = await p.evaluate(() => {
        const sc = document.querySelector('[data-abashiri-scroller]');
        const sec = document.querySelector('#events');
        const r = sec ? sec.getBoundingClientRect() : null;
        return { o: Math.max(sc.scrollWidth - sc.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth),
                 mid: r ? (r.top < 300 && r.bottom > 700) : false,
                 canvas: document.querySelectorAll('#events canvas').length };
      });
      over = Math.max(over, d.o);
      if (d.mid && !shot) { shot = true; await p.screenshot({ path: SS + `kvr-${n}.png` }); }
      if (n === 35) rows.push({ canvas: d.canvas });
    }
    rows.push({ n, over, err: errs[0] || '', cons: cons[0] || '' });
    await ctx.close();
  }
  rows.filter(r=>r.n).forEach(r => console.log('案' + r.n, '\t横', r.over, '\tエラー', r.err || '-', r.cons ? ('／console: ' + r.cons) : ''));
  const c = rows.filter(r=>r.canvas !== undefined).map(r=>r.canvas);
  if (c.length) console.log('案35 の canvas 数:', c.join(','));
  await b.close();
})();
