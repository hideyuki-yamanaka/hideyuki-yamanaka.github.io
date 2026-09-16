const { chromium } = require('playwright');
const SS = '/private/tmp/claude-501/-Users-hideyuki-Developer-Claude-Code/b77777cc-0d00-43f7-9f80-860cad65a96f/scratchpad/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,160)));
  await p.goto('http://localhost:3095/mock/carousels', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  const d = await p.evaluate(() => {
    const host = document.querySelectorAll('[role="group"]')[0];
    const stage = host.querySelector(':scope > div');
    const cards = [...stage.children];
    const mid = innerWidth / 2;
    return cards.map((c, i) => {
      const r = c.getBoundingClientRect();
      const m = new DOMMatrix(getComputedStyle(c).transform);
      // rotateY を matrix3d から復元
      const ry = Math.round(Math.atan2(-m.m31, m.m33) * 180 / Math.PI);
      const front = c.querySelector('a');
      const back = c.querySelector('[aria-hidden]');
      const fv = front ? getComputedStyle(front).backfaceVisibility : '-';
      return { slot: i, rotateY: ry,
               左: Math.round(r.x - mid), 右: Math.round(r.right - mid), 幅: Math.round(r.width),
               表backface: fv,
               親opacity: getComputedStyle(c).opacity };
    });
  });
  console.log('スロット\trotateY\t左(中央基準)\t右\t幅\t裏面隠し\t親opacity');
  d.forEach(r => console.log(`${r.slot}\t${r.rotateY}\t${r.左}\t\t${r.右}\t${r.幅}\t${r.表backface}\t${r.親opacity}`));
  const center = d[0];
  console.log('\n■ 参考1との比率くらべ（中央カード幅 =', center.幅, 'px）');
  const side = d.find(x => x.rotateY === 45);
  const wing = d.find(x => x.rotateY === 135 || x.rotateY === -135);
  if (side) console.log('  右の傾きカード: 左端', side.左, '／ 中央カードの縁', center.右, '→ 間隔', side.左 - center.右, 'px');
  if (wing) console.log('  翼（±135°）: 右端', wing.右, '／ 中央カードの縁', center.右, '→ はみ出し', wing.右 - center.右, 'px');
  console.log('\nerr:', errs.length ? errs : 'なし');
  await p.screenshot({ path: SS + 'fix-12-pc.png' });
  await b.close();
})();
