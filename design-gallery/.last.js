const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });

  // ① 詳細 案1（内部1）：見出しが消えないか
  for (const [tag, pat] of [['v1', 1], ['v3', 3]]) {
    const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,100)));
    await p.addInitScript(v => localStorage.setItem('tp:abashiri-spot-detail-tune:v11', JSON.stringify({ detail: { pattern: v, headSize: 26, bodySize: 15 } })), pat);
    await p.goto('http://localhost:3095/spot/notoro', { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const off = await p.$('text=OFF'); if (off) await off.click();
    await p.waitForTimeout(1000);
    const shots = [];
    for (const f of [0, 0.35, 0.8, 1.4]) {
      await p.evaluate(fr => { const el = document.querySelector('main'); el.scrollTo({ top: el.clientHeight * fr }); }, f);
      await p.waitForTimeout(900);
      const d = await p.evaluate(() => {
        const el = document.querySelector('main');
        const h1 = document.querySelector('h1');
        const cs = h1 ? getComputedStyle(h1) : null;
        const img = el.querySelector('img');
        return {
          見出しの文字: h1 ? h1.textContent.trim().slice(0,10) : '-',
          見出しの不透明度: cs ? cs.opacity : '-',
          見出しが見えるか: h1 ? (h1.getBoundingClientRect().top < innerHeight && h1.getBoundingClientRect().bottom > 0 && cs.opacity !== '0') : false,
          写真のclip: img ? getComputedStyle(img).clipPath : '-',
          横: Math.max(el.scrollWidth - el.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      });
      shots.push({ f, ...d });
      await p.screenshot({ path: SS + `${tag}-${f}.png` });
    }
    console.log('■ 詳細', tag);
    shots.forEach(s => console.log('  scroll', s.f, JSON.stringify(s)));
    console.log('  err:', errs.length ? errs : 'なし');
    await ctx.close();
  }

  // ② ヘッダーのアンカー：ゆっくり動くか＋ブラーが掛かるか
  const ctx = await b.newContext({ viewport: { width: 1512, height: 982 } });
  const p = await ctx.newPage();
  const e2 = []; p.on('pageerror', e => e2.push(String(e).slice(0,100)));
  await p.goto('http://localhost:3095/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const off = await p.$('text=OFF'); if (off) await off.click();
  await p.waitForTimeout(1200);
  const samples = [];
  await p.evaluate(() => {
    window.__s = [];
    const sc = document.querySelector('[data-abashiri-scroller]');
    const st = document.querySelector('[data-abashiri-stage]');
    const t0 = performance.now();
    const f = () => {
      window.__s.push([Math.round(performance.now() - t0), Math.round(sc.scrollTop), st.style.filter || '-']);
      if (performance.now() - t0 < 2600) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await p.click('text=体験');
  await p.waitForTimeout(3000);
  const s = await p.evaluate(() => window.__s);
  console.log('\n■ ヘッダー「体験」を押した時（時刻ms / スクロール位置 / ブラー）');
  for (let i = 0; i < s.length; i += Math.ceil(s.length / 12)) console.log('  ', s[i].join('\t'));
  console.log('  最後:', s[s.length-1].join('\t'));
  console.log('  フレーム数:', s.length, '／ 2.6秒 →', (s.length/2.6).toFixed(0), 'fps');
  console.log('  err:', e2.length ? e2 : 'なし');
  await p.screenshot({ path: SS + 'nav-after.png' });
  await b.close();
})();
