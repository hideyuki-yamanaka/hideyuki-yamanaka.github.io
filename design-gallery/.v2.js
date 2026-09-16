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
  console.log('■ 案2（全画面スタート → いまのデザイン）');
  for (const f of [0, 0.5, 1.0, 1.6, 2.4]) {
    await p.evaluate(fr => { const el = document.querySelector('main'); el.scrollTo({ top: el.clientHeight * fr }); }, f);
    await p.waitForTimeout(1100);
    const d = await p.evaluate(() => {
      const hero = document.querySelector('main > div.relative > div.sticky > img');
      const body = [...document.querySelectorAll('main > div')].find(d => d.className.includes('-mt-'));
      const txt = document.querySelector('h1');
      const r = txt ? txt.getBoundingClientRect() : null;
      return {
        写真の切り取り: hero ? getComputedStyle(hero).clipPath : 'なし',
        記事の不透明度: body ? getComputedStyle(body).opacity : '-',
        タイトルが読めるか: !!(r && body && parseFloat(getComputedStyle(body).opacity) > 0.35 && r.top < innerHeight && r.bottom > 0),
        横: (() => { const el = document.querySelector('main'); return Math.max(el.scrollWidth - el.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth); })(),
      };
    });
    console.log('  scroll', f, JSON.stringify(d));
    await p.screenshot({ path: SS + `v2-${f}.png` });
  }
  console.log('  err:', errs.length ? errs : 'なし');
  await b.close();
})();
