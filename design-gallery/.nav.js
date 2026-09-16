const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,110)));
  await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.waitForTimeout(1500);
  console.log('ナビの項目:', await p.evaluate(() => [...document.querySelectorAll('nav a, nav button')].map(e=>e.textContent.trim())));
  await p.evaluate(() => {
    window.__s = [];
    const sc = document.querySelector('[data-abashiri-scroller]');
    const st = document.querySelector('[data-abashiri-stage]');
    const t0 = performance.now();
    const f = () => {
      window.__s.push([Math.round(performance.now()-t0), Math.round(sc.scrollTop), st ? (st.style.filter||'-') : 'noStage']);
      if (performance.now()-t0 < 2800) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('nav a, nav button')].find(e => e.textContent.trim() === 'グルメ');
    el.click();
  });
  await p.waitForTimeout(3200);
  const s = await p.evaluate(() => window.__s);
  console.log('\n時刻ms\tスクロール\tブラー');
  for (let i = 0; i < s.length; i += Math.ceil(s.length/14)) console.log('  ' + s[i].join('\t'));
  console.log('  最後: ' + s[s.length-1].join('\t'));
  const maxBlur = s.map(r => parseFloat((r[2].match(/blur\(([\d.]+)/)||[0,0])[1])).reduce((a,b)=>Math.max(a,b),0);
  const moved = s[s.length-1][1] - s[0][1];
  const frames = s.length;
  console.log(`\n動いた量: ${moved}px ／ ブラー最大: ${maxBlur}px ／ 実効fps: ${(frames/2.8).toFixed(0)} ／ 最後のブラー: "${s[s.length-1][2]}"`);
  console.log('err:', errs.length ? errs : 'なし');
  await b.close();
})();
