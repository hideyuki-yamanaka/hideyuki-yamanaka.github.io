const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  await p.evaluate(() => (window.TunePanel.instances||[]).forEach(pn=>{pn.el.style.display='';pn.el.classList.remove('closed');}));
  const open = async () => p.evaluate(() => {
    const el = window.TunePanel.instances[0].el;
    const tab=[...el.querySelectorAll('.tp-tab')].find(t=>t.textContent.includes('トップ')); if(tab) tab.click();
    el.querySelectorAll('.tp-cat.closed .tp-cat-head, .tp-sec.closed .tp-sec-head, .tp-grp.closed .tp-grp-head, .tp-grp-title').forEach(h=>h.click());
  });
  await open(); await p.waitForTimeout(700); await open(); await p.waitForTimeout(700);
  const rows = () => p.evaluate(() => {
    const el=window.TunePanel.instances[0].el;
    return [...el.querySelectorAll('*')].map(n=>(n.childElementCount===0?n.textContent:'')).filter(t=>t&&/縦横比|流れる速さ/.test(t)).map(t=>t.trim());
  });
  const pills = () => p.evaluate(() => {
    const el=window.TunePanel.instances[0].el;
    const t=[...el.querySelectorAll('.tp-pills-title')].find(x=>x.textContent.includes('レイアウトの案'));
    if(!t) return [];
    const row=t.parentElement.querySelector('.tp-pills:not(.tp-favrow)');
    return [...row.querySelectorAll('.tp-pill:not(.tp-var-back)')].map(b=>b.textContent.replace('⋯','').trim());
  });
  console.log('体験の案:', (await pills()).join(' / '));
  console.log('いま出ている項目:', JSON.stringify(await rows()));
  // 「案5」＝内部34（3Dカルーセル）をクリック
  const clicked = await p.evaluate(() => {
    const el=window.TunePanel.instances[0].el;
    const t=[...el.querySelectorAll('.tp-pills-title')].find(x=>x.textContent.includes('レイアウトの案'));
    const row=t.parentElement.querySelector('.tp-pills:not(.tp-favrow)');
    const bs=[...row.querySelectorAll('.tp-pill:not(.tp-var-back)')];
    const target=bs[bs.length-1]; target.click(); return target.textContent.replace('⋯','').trim();
  });
  await p.waitForTimeout(900); await open(); await p.waitForTimeout(600);
  console.log(`「${clicked}」を押したあと:`, JSON.stringify(await rows()));
  // 案2（＝内部31 流れる文字）をクリック
  const c2 = await p.evaluate(() => {
    const el=window.TunePanel.instances[0].el;
    const t=[...el.querySelectorAll('.tp-pills-title')].find(x=>x.textContent.includes('レイアウトの案'));
    const row=t.parentElement.querySelector('.tp-pills:not(.tp-favrow)');
    const bs=[...row.querySelectorAll('.tp-pill:not(.tp-var-back)')];
    bs[1].click(); return bs[1].textContent.replace('⋯','').trim();
  });
  await p.waitForTimeout(900); await open(); await p.waitForTimeout(600);
  console.log(`「${c2}」を押したあと:`, JSON.stringify(await rows()));
  console.log('err:', errs.length?errs:'なし');
  await b.close();
})();
