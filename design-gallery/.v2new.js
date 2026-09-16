const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,140)));
  await p.addInitScript(() => localStorage.setItem('tp:abashiri-spot-detail-tune:v14', JSON.stringify({ detail: { pattern: 3, headSize: 26, bodySize: 15 } })));
  await p.goto('http://localhost:3095/spot/notoro', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.mouse.move(3,3);
  await p.waitForTimeout(1500);
  console.log('進み\t写真の枠(px)\t\t\t記事の空き枠\t\t\t重なり\t記事が見えるか');
  for (const f of [0, 0.3, 0.6, 0.9, 1.1, 1.6]) {
    await p.evaluate(fr => { const el=document.querySelector('main'); el.scrollTo({top: el.clientHeight*fr}); }, f);
    await p.waitForTimeout(900);
    const d = await p.evaluate(() => {
      const m=document.querySelector('main');
      const stage=[...m.children].find(c=>c.className.includes('pointer-events-none'));
      const hero=stage?stage.querySelector('.absolute.z-30'):null;
      const slot=[...m.querySelectorAll('div')].find(d2=>d2.className.includes('sm:h-[560px]'));
      const hr=hero?hero.getBoundingClientRect():null;
      const sr=slot?slot.getBoundingClientRect():null;
      const h1=m.querySelector('h1');
      const hv=h1?h1.getBoundingClientRect():null;
      const z=hero?getComputedStyle(hero).zIndex:'-';
      return { hero: hr?`${Math.round(hr.x)},${Math.round(hr.y)} ${Math.round(hr.width)}x${Math.round(hr.height)}`:'なし',
               slot: sr?`${Math.round(sr.x)},${Math.round(sr.y)} ${Math.round(sr.width)}x${Math.round(sr.height)}`:'なし',
               一致: hr&&sr? Math.round(Math.abs(hr.x-sr.x)+Math.abs(hr.y-sr.y)+Math.abs(hr.width-sr.width)+Math.abs(hr.height-sr.height)) : '-',
               タイトルが見える: !!(hv && hv.top<982 && hv.bottom>0),
               z, 見えてる: hero?getComputedStyle(hero).visibility:'-' };
    });
    console.log(`${f}\t${d.hero}\t${d.slot}\t${d.一致}\t${d.タイトルが見える}\tz=${d.z} ${d.見えてる}`);
    if ([0,0.6,1.1].includes(f)) await p.screenshot({ path: SS+`v2new-${f}.png` });
  }
  console.log('err:', errs.length?errs:'なし');
  await b.close();
})();
