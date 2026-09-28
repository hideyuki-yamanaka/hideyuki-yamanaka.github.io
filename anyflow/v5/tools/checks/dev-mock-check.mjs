// 開発者体験のモック: 比率・大きさ・コードの行が枠で切れていないか(8秒間なんども数えて一番悪い値)
import { chromium } from '/Users/hideyuki/Developer/Claude Code/design-gallery/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const sizes = (process.argv[2] || '1440x900,1024x768,768x1024,601x900,430x932,390x844,360x800').split(',').map(s => s.split('x').map(Number));
for (const [w, h] of sizes) {
  const mob = w <= 600;
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8778/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1600);
  const out = [];
  for (const [nm, blk, sel] of [['①', 'devBlock1', '#devMock1'], ['②', 'devBlock2', '.dev2-stack']]) {
    const y = await p.evaluate(b => { const r = document.getElementById(b).getBoundingClientRect(); return Math.round(r.top + scrollY + r.height / 2 - innerHeight / 2); }, blk);
    let cur = await p.evaluate(() => scrollY); while (Math.abs(y - cur) > 150) { cur += y > cur ? 150 : -150; await p.evaluate(v => window.scrollTo(0, v), cur); await p.waitForTimeout(10); } await p.evaluate(v => window.scrollTo(0, v), y);
    let worst = { lines: 0, cut: 0, wide: 0 }, box = '';
    for (let i = 0; i < 8; i++) { await p.waitForTimeout(1000);
      const r = await p.evaluate(sel => { const root = document.querySelector(sel); if (!root) return null; const q = root.getBoundingClientRect();
        const panel = sel === '#devMock1' ? root : [...root.querySelectorAll('.dm-panel')].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
        const pr = panel.getBoundingClientRect(); let lines = 0, cut = 0, wide = 0;
        panel.querySelectorAll('.dm-line').forEach(l => { const c = getComputedStyle(l); if (c.display === 'none') return; const lr = l.getBoundingClientRect(); if (lr.height < 1) return; lines++;
          let clip = l.parentElement; while (clip && clip !== panel && getComputedStyle(clip).overflow === 'visible') clip = clip.parentElement; const cr = (clip || panel).getBoundingClientRect();
          if (lr.bottom > cr.bottom + 0.5 || lr.bottom > pr.bottom + 0.5) cut++; if (l.scrollWidth > l.clientWidth + 1) wide++; });
        return { box: `${Math.round(pr.width)}×${Math.round(pr.height)}(比${(pr.width / pr.height).toFixed(3)})`, lines, cut, wide }; }, sel);
      if (!r) break; box = r.box; if (r.lines > worst.lines) worst.lines = r.lines; if (r.cut > worst.cut) worst.cut = r.cut; if (r.wide > worst.wide) worst.wide = r.wide; }
    out.push(`${nm} ${box} 行${worst.lines} 下で切れた行${worst.cut} 横にはみ出た行${worst.wide}`);
  }
  const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 ? '⚠️横スクロールあり' : '横スクロールなし');
  console.log(`${String(w).padStart(4)}×${h}: ${out.join(' ／ ')} ／ ${hs} ／ エラー${errs.length}`);
  await p.close();
}
await b.close();
