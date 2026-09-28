import { chromium } from '/Users/hideyuki/Developer/Claude Code/design-gallery/node_modules/playwright/index.mjs';
const URL = process.argv[2];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
async function glide(p, to) { let cur = await p.evaluate(() => scrollY); const st = to > cur ? 80 : -80; while (Math.abs(to - cur) > 80) { cur += st; await p.evaluate(v => window.scrollTo(0, v), cur); await p.waitForTimeout(14); } await p.evaluate(v => window.scrollTo(0, v), to); }
/* PC */
{ const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
  const R = await p.evaluate(() => { const r = document.getElementById('results').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
  const row = [];
  for (const k of [0, .2, .4, .6, .8, 1]) { await glide(p, Math.round(R.top + k * (R.h - 900))); await p.waitForTimeout(450);
    row.push(await p.evaluate(k => { const res = document.getElementById('results'), cs = getComputedStyle(res.querySelector('.res2')); const bw = res.querySelector('.r2v-big-w'); const f = res.querySelector('.r2v-fig'), t = res.querySelector('.r2v-text');
      return `進み${k}: 大文字${bw ? Math.round(bw.getBoundingClientRect().height) : '-'}px 縦線${(+cs.getPropertyValue('--rfx-vline') || 0).toFixed(2)} 横線${(+cs.getPropertyValue('--rfx-hr') || 0).toFixed(2)} 図${(+getComputedStyle(f).opacity).toFixed(2)} 文${(+getComputedStyle(t).opacity).toFixed(2)}`; }, k)); }
  const D = await p.evaluate(() => { const r = document.getElementById('dev').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, pin: document.getElementById('dev').classList.contains('dev-pin') }; });
  await glide(p, Math.round(D.top - 900)); await p.waitForTimeout(300);
  const tops = []; let y = D.top - 900; while (y < D.top + D.h - 450) { y += 60; await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(40); tops.push(await p.evaluate(() => Math.round(document.querySelector('#devBlock1 .dev-blk-in > *').getBoundingClientRect().top))); }
  let still = 0; for (let i = 1; i < tops.length; i++) if (Math.abs(tops[i] - tops[i - 1]) < 2 && tops[i] > -200 && tops[i] < 900) still++;
  const b1 = await p.evaluate(() => document.getElementById('devBlock1').getBoundingClientRect().top + scrollY); await glide(p, Math.round(b1)); await p.waitForTimeout(600);
  const m = () => p.evaluate(() => { const x = document.querySelector('.dev1-mock'); return x ? x.innerText.length + x.innerText.slice(-30) : '-'; }); const m1 = await m(); await p.waitForTimeout(1800); const m2 = await m();
  console.log(`【PC 1440×900】実績: ${row.join(' ／ ')}`);
  console.log(`【PC】開発者体験: 止まる指定=${D.pin ? 'あり' : 'なし'} ／ 見出しが止まった回数 ${still}/${tops.length} ／ ①モックが動く=${m1 !== m2} ／ エラー${errs.length}件 ${errs.slice(0, 2).join(' / ')}`); }
/* スマホ */
for (const [w, h] of [[390, 844]]) { const q = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })).newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
  await q.goto(URL, { waitUntil: 'networkidle' }); await q.waitForTimeout(1800);
  const H = await q.evaluate(() => document.documentElement.scrollHeight); let cur = 0; while (cur < H) { cur += 150; await q.evaluate(v => window.scrollTo(0, v), cur); await q.waitForTimeout(12); }
  const y = await q.evaluate(() => document.getElementById('results').getBoundingClientRect().top + scrollY); await q.evaluate(v => window.scrollTo(0, v), y); await q.waitForTimeout(900);
  const r = await q.evaluate(() => { const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-cell')) || 44; const mod = v => ((v % cell) + cell) % cell;
    return ['#resHrTop', '#results .res2-vline', '#resHr'].map(s => { const el = document.querySelector(s); if (!el || getComputedStyle(el).display === 'none') return '-'; const mm = mod(el.getBoundingClientRect().top + scrollY); return Math.min(mm, cell - mm).toFixed(1) + 'px'; }).join('・'); });
  console.log(`【スマホ ${w}×${h}】区切り線と方眼の差 ${r} ／ ページの高さ ${H}px ／ エラー${e2.length}件 ${e2.slice(0, 2).join(' / ')}`); }
await b.close();
