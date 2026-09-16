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
  await p.evaluate(() => {
    window.__s = [];
    const sc = document.querySelector('[data-abashiri-scroller]');
    const st = document.querySelector('[data-abashiri-stage]');
    const t0 = performance.now();
    const f = () => {
      window.__s.push([Math.round(performance.now()-t0), Math.round(sc.scrollTop), st.style.filter||'-', st.style.opacity||'-']);
      if (performance.now()-t0 < 1800) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await p.evaluate(() => [...document.querySelectorAll('nav a, nav button')].find(e => e.textContent.trim()==='グルメ').click());
  await p.waitForTimeout(2200);
  const s = await p.evaluate(() => window.__s);
  console.log('時刻ms\tスクロール\tブラー\t\t不透明度');
  for (let i = 0; i < s.length; i += Math.ceil(s.length/16)) console.log('  ' + s[i].join('\t'));
  console.log('  最後: ' + s[s.length-1].join('\t'));
  // 途中で位置が動いた回数（=移動が見えたフレーム）を数える
  let moves = 0, shown = 0;
  for (let i = 1; i < s.length; i++) {
    if (s[i][1] !== s[i-1][1]) {
      moves++;
      const op = parseFloat(s[i][3]); // 覆われている時は 0.12 付近
      if (!Number.isFinite(op) || op > 0.5) shown++;
    }
  }
  console.log(`\nスクロール位置が変わったフレーム: ${moves}（うち【幕が薄くて移動が見えた】フレーム: ${shown}）`);
  console.log('err:', errs.length ? errs : 'なし');
  await b.close();
})();
