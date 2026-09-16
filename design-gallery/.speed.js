const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  // ① 一定速度か：一気に飛ばした時と、じわじわ送った時で流れる速さが同じか
  for (const [label, speed] of [['既定 22%/秒', 22], ['ゆっくり 8%/秒', 8]]) {
    const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
    const p = await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
    await p.addInitScript(v => localStorage.setItem('tp:abashiri-top-tune:v39', JSON.stringify({ events: { pattern: 31, tailPad: 0, cardRatio: 0, peelSpeed: v } })), speed);
    await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1300);
    const off = await p.$('text=OFF'); if (off) await off.click();
    await p.waitForTimeout(1000);
    const base = await p.evaluate(() => { const sc=document.querySelector('[data-abashiri-scroller]'); const ev=document.querySelector('#events');
      let t=0,el=ev; while(el&&el!==sc){t+=el.offsetTop;el=el.offsetParent;} return {top:t,h:ev.offsetHeight,vh:sc.clientHeight}; });
    // 一気に最後まで飛ばす
    await p.evaluate(y=>{const sc=document.querySelector('[data-abashiri-scroller]');sc.scrollTo({top:y});}, base.top + (base.h-base.vh)*0.99);
    const xs=[];
    for (let i=0;i<10;i++){ await p.waitForTimeout(500);
      xs.push(await p.evaluate(() => { const ev=document.querySelector('#events');
        const c=[...ev.querySelectorAll('.group')].filter(e=>e.querySelector('img'));
        return c.map(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return Math.round(m.m41);}); })); }
    const moved = xs.map(a=>a.filter(v=>v>10).length);
    console.log(`■ ${label}：一気に最後まで飛ばしたあと、0.5秒ごとの「動き出した枚数」`);
    console.log('   ', moved.join(' → '));
    const last = xs[xs.length-1];
    console.log('    最後のx:', JSON.stringify(last), 'err:', errs.length?errs:'なし');
    await ctx.close();
  }
  // ② 縦横比のつまみが案によって出入りするか
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => (window.TunePanel.instances||[]).forEach(pn=>{pn.el.style.display='';pn.el.classList.remove('closed');}));
  await p.waitForTimeout(600);
  const rows = async () => p.evaluate(() => {
    const el = window.TunePanel.instances[0].el;
    return [...el.querySelectorAll('.tp-row, .tp-grp-title')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).filter(t=>/縦横比|流れる速さ/.test(t));
  });
  const setPat = async (v) => p.evaluate(vv => {
    const pn = window.TunePanel.instances[0];
    pn.params.events.pattern = vv; pn.rebuild();
    if (pn.cfg.onChange) pn.cfg.onChange({ path: 'events.pattern' });
  }, v);
  console.log('\n■ 案ごとに出る項目');
  for (const v of [1, 31, 32, 33, 34]) { await setPat(v); await p.waitForTimeout(500);
    console.log(`  案${v}: ${JSON.stringify(await rows())}`); }
  await b.close();
})();
