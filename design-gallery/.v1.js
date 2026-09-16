const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,160)));
  await p.goto('http://localhost:3095/mock/carousels', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  const d = await p.evaluate(() => {
    const host = document.querySelectorAll('[role="group"]')[0];
    const cards = [...host.querySelectorAll('[style*="preserve-3d"] > div')];
    const rows = cards.map((c, i) => {
      const cs = getComputedStyle(c);
      const r = c.getBoundingClientRect();
      const front = c.querySelector('a');
      const fcs = front ? getComputedStyle(front) : null;
      return { i, transform: cs.transform.slice(0, 90),
               親opacity: cs.opacity, 親filter: cs.filter,
               表opacity: fcs ? fcs.opacity : '-',
               画面x: Math.round(r.x), 幅: Math.round(r.width), 高: Math.round(r.height),
               見えてる: r.width > 2 && r.right > 0 && r.x < innerWidth };
    });
    const st = host.querySelector('[style*="preserve-3d"]');
    return { perspective: getComputedStyle(host).perspective, stage: getComputedStyle(st).transformStyle,
             zIndex使用: cards.some(c => getComputedStyle(c).zIndex !== 'auto'),
             rows };
  });
  console.log('perspective:', d.perspective, '／ transform-style:', d.stage, '／ z-index を使っているか:', d.zIndex使用);
  console.log('\nスロット\ttransform\t\t\t\t\t親opacity\t表opacity\t画面x\t幅\t見えてる');
  d.rows.forEach(r => console.log(`${r.i}\t${r.transform.padEnd(46)}\t${r.親opacity}\t\t${r.表opacity}\t\t${r.画面x}\t${r.幅}\t${r.見えてる}`));
  console.log('\nerr:', errs.length ? errs : 'なし');
  await p.screenshot({ path: SS + 'fix-12-pc.png' });
  await b.close();
})();
