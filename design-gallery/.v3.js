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
      const ry = Math.round(Math.atan2(m.m31, m.m33) * 180 / Math.PI); // CSS の rotateY
      return { slot: i, rotateY: ry,
               左: Math.round(r.x - mid), 右: Math.round(r.right - mid), 幅: Math.round(r.width) };
    });
  });
  const C = d[0], R45 = d.find(x=>x.rotateY===45), L45 = d.find(x=>x.rotateY===-45),
        R135 = d.find(x=>x.rotateY===135), L135 = d.find(x=>x.rotateY===-135), B = d.find(x=>Math.abs(x.rotateY)===180);
  console.log('スロット\trotateY\t左\t右\t幅');
  d.forEach(r => console.log(`${r.slot}\t${r.rotateY}\t${r.左}\t${r.右}\t${r.幅}`));
  const W = C.幅;
  console.log('\n■ 参考1との比率くらべ（W = 中央カード幅 =', W, 'px）');
  console.log(`  中央カード       : ${C.左}〜${C.右}（幅 ${W}）`);
  console.log(`  右の±45°カード  : ${R45.左}〜${R45.右} → 中央との間隔 ${R45.左 - C.右}px = ${((R45.左-C.右)/W).toFixed(3)}W  ／ 参考1は 0.303W`);
  console.log(`  右の翼(±135°)   : ${R135.左}〜${R135.右} → 中央の縁からのはみ出し ${R135.右 - C.右}px = ${((R135.右-C.右)/W).toFixed(3)}W  ／ 参考1は 0.169W`);
  console.log(`  左右の対称       : 左±45° ${L45.左}〜${L45.右} ／ 左翼 ${L135.左}〜${L135.右}`);
  console.log(`  180°のカード     : ${B.左}〜${B.右}（幅 ${B.幅}）→ 中央(±${W/2})の後ろに ${Math.abs(B.左) < W/2 ? '完全に隠れる' : 'はみ出す'}`);
  console.log('\nerr:', errs.length ? errs : 'なし');
  await p.screenshot({ path: SS + 'fix-12-pc.png' });
  await b.close();
})();
