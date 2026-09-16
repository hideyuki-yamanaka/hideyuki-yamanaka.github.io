const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  await p.evaluate(() => (window.TunePanel.instances||[]).forEach(pn=>{pn.el.style.display='';pn.el.classList.remove('closed');}));
  await p.waitForTimeout(500);
  const open = async () => p.evaluate(() => {
    const el = window.TunePanel.instances[0].el;
    const tab = [...el.querySelectorAll('.tp-tab')].find(t=>t.textContent.includes('トップ'));
    if (tab) tab.click();
    el.querySelectorAll('.tp-cat.closed .tp-cat-head, .tp-sec.closed .tp-sec-head, .tp-grp.closed .tp-grp-head, .tp-grp-title').forEach(h=>h.click());
  });
  await open(); await p.waitForTimeout(700); await open(); await p.waitForTimeout(700);
  const rows = () => p.evaluate(() => {
    const el = window.TunePanel.instances[0].el;
    return [...el.querySelectorAll('*')].map(n => (n.childElementCount===0? n.textContent : '')).filter(t=>t && /縦横比|流れる速さ|下の余白/.test(t)).map(t=>t.trim());
  });
  const setPat = async (v) => p.evaluate(vv => {
    const pn = window.TunePanel.instances[0];
    pn.params.events.pattern = vv; pn.rebuild();
  }, v);
  console.log('案\t体験セクションに出ている項目');
  for (const v of [1, 31, 32, 33, 34]) {
    await setPat(v); await p.waitForTimeout(400); await open(); await p.waitForTimeout(500);
    console.log(`案${v}\t${JSON.stringify(await rows())}`);
  }
  console.log('err:', errs.length?errs:'なし');
  await b.close();
})();
