const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
const open = async (p, pat) => {
  await p.addInitScript(v => localStorage.setItem('tp:abashiri-spot-detail-tune:v11', JSON.stringify({ detail: { pattern: v, headSize: 26, bodySize: 15 } })), pat);
  await p.goto('http://localhost:3095/spot/notoro', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.waitForTimeout(1000);
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });

  // 案35（レール）：印と行の中心が合っているか＋文字が拡大するか
  let ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  let p = await ctx.newPage();
  const e1 = []; p.on('pageerror', e => e1.push(String(e).slice(0,100)));
  await open(p, 35);
  console.log('■ 案35「印がレールを滑る」');
  for (const f of [0.9, 2.0, 3.2]) {
    await p.evaluate(fr => { const el = document.querySelector('main'); el.scrollTo({ top: el.clientHeight * fr }); }, f);
    await p.waitForTimeout(1400);
    const d = await p.evaluate(() => {
      const nav = document.querySelector('nav');
      const dot = nav.querySelector('span[style*="top"]') || nav.querySelectorAll(':scope > span')[1];
      const btns = [...nav.querySelectorAll('button')];
      const dr = dot.getBoundingClientRect();
      const dy = dr.top + dr.height / 2;
      let best = null, bi = -1;
      btns.forEach((bt, i) => {
        const r = bt.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const gap = Math.abs(c - dy);
        if (best === null || gap < best) { best = gap; bi = i; }
      });
      const span = btns[bi].querySelector('span:last-child');
      return {
        いちばん近い行: btns[bi].textContent.trim().slice(0, 12),
        印と行の中心のズレ: Math.round(best * 10) / 10,
        その行の拡大: getComputedStyle(span).transform,
        他の行の拡大: getComputedStyle(btns[(bi + 1) % btns.length].querySelector('span:last-child')).transform,
      };
    });
    console.log('  scroll', f, JSON.stringify(d));
    await p.screenshot({ path: SS + `fix-35-${f}.png` });
  }
  console.log('  err:', e1.length ? e1 : 'なし');
  await ctx.close();

  // 案39（見出しをうんと離す）：間の実寸
  ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  p = await ctx.newPage();
  await open(p, 39);
  const gap = await p.evaluate(() => {
    const secs = [...document.querySelectorAll('[data-sec]')];
    const s0 = secs[0];
    const h = s0.querySelector('h3'), pp = s0.querySelector('p');
    return { 見出しの下端: Math.round(h.getBoundingClientRect().bottom), 本文の上端: Math.round(pp.getBoundingClientRect().top),
             間: Math.round(pp.getBoundingClientRect().top - h.getBoundingClientRect().bottom) };
  });
  console.log('\n■ 案39「見出しをうんと離す」の間:', JSON.stringify(gap), '（画面982pxに対して', Math.round(gap.間/982*100) + '%）');
  await ctx.close();

  // 罫線：おすすめポイントの上に線が無いか（目次案で確認）
  ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  p = await ctx.newPage();
  await open(p, 32);
  await p.evaluate(() => { const el = document.querySelector('main'); el.scrollTo({ top: el.scrollHeight * 0.55 }); });
  await p.waitForTimeout(1500);
  const rule = await p.evaluate(() => {
    const find = (t) => [...document.querySelectorAll('h2')].find(h => h.textContent.includes(t))?.closest('section');
    const g = (t) => { const s = find(t); return s ? getComputedStyle(s).borderTopWidth + ' / ' + getComputedStyle(s).paddingTop : '見つからず'; };
    return { おすすめポイント: g('おすすめポイント'), 基本情報: g('基本情報'), 周辺マップ: g('周辺マップ') };
  });
  console.log('\n■ 上の罫線（borderTop / paddingTop）:', JSON.stringify(rule, null, 1));
  await b.close();
})();
