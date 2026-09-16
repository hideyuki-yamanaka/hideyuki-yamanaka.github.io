const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,110)));
  await p.addInitScript(() => localStorage.setItem('tp:abashiri-spot-detail-tune:v11', JSON.stringify({ detail: { pattern: 3, headSize: 26, bodySize: 15 } })));
  await p.goto('http://localhost:3095/spot/notoro', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.waitForTimeout(1200);
  console.log('scroll\t導入写真の不透明度\t記事の不透明度\t切り取り\t両方見える?');
  for (const f of [0, 0.3, 0.55, 0.65, 0.75, 0.9, 1.2]) {
    await p.evaluate(fr => { const el = document.querySelector('main'); el.scrollTo({ top: el.clientHeight * fr }); }, f);
    await p.waitForTimeout(900);
    const d = await p.evaluate(() => {
      const hero = document.querySelector('main > div.relative > div.sticky > div');
      const body = [...document.querySelectorAll('main > div')].find(x => x.className.includes('-mt-'));
      const ho = hero ? parseFloat(getComputedStyle(hero).opacity) : 0;
      const bo = body ? parseFloat(getComputedStyle(body).opacity) : 0;
      return { ho: ho.toFixed(2), bo: bo.toFixed(2), clip: hero ? getComputedStyle(hero).clipPath : '-',
               both: ho > 0.2 && bo > 0.2 };
    });
    console.log(`${f}\t${d.ho}\t\t${d.bo}\t\t${d.clip.slice(0,34)}\t${d.both ? '△重なり' : 'OK'}`);
    if ([0, 0.65, 1.2].includes(f)) await p.screenshot({ path: SS + `v2b-${f}.png` });
  }
  console.log('err:', errs.length ? errs : 'なし');
  await b.close();
})();
