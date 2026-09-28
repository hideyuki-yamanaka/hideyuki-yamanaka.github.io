/* main.js — 画面のつなぎ込み（指の操作・道具バー・調整パネル・毎フレームの流れ）
   操作（さわるモード）: 何も無い所からなぞる＝切る／果物を押しっぱなし＝へこむ／
   すぐ離す＝ぷにっ／押したまま動かす＝つかんで移動（離すと投げられる）
   きるモード: どこからなぞっても切る */
import { TAU } from './geom.js';
import { World } from './softbody.js';
import { FRUITS, START_ORDER, TRAY_ORDER, spawnFruit } from './fruits.js';
import { Renderer } from './render.js';
import { Effects } from './effects.js';
import { Sound } from './audio.js';

/* 調整パネルで触れる値（初期値はすべて仮置き） */
const DEFAULTS = {
  look: { variant: 'jelly' },
  base: { size: 88, count: 6, wall: 16 },
  fx: { opacity: 84, gloss: 1, rim: 1, refract: 1.08, sugar: 1, table: '#F3EFE9', shadow: 1, caustic: 1, juice: 1 },
  motion: { hz: 3.4, keep: 1, stretch: 0.5, press: 1, poke: 1, follow: 8, pinch: 0.45, slide: 1, tiltX: 0, tiltY: 0, split: 1 },
  other: { sound: 1, volume: 1, vibrate: 1 }
};
/* 案ごとの最初の値 */
const LOOK_VALUES = {
  gummy: {
    'fx.opacity': 100, 'fx.gloss': 0.8, 'fx.rim': 0.8, 'fx.caustic': 0, 'fx.shadow': 1.2,
    'motion.hz': 4.6, 'motion.keep': 0.45, 'motion.stretch': 0.3, 'motion.press': 0.8, 'motion.poke': 0.8
  },
  clear: {
    'fx.opacity': 20, 'fx.gloss': 1.2, 'fx.caustic': 0.7,
    'motion.hz': 2.8, 'motion.keep': 1.4, 'motion.stretch': 0.6
  }
};

const params = structuredClone(DEFAULTS);
const $ = s => document.querySelector(s);
const canvas = $('#stage');
const R = new Renderer(canvas);
const world = new World();
const fx = new Effects();
const snd = new Sound();

let sceneLook = params.look.variant;
let mode = 'touch';
const ptrs = new Map();
const trails = [];

function physics() {
  const m = params.motion;
  const w = TAU * Math.max(0.3, m.hz), f = TAU * Math.max(0.5, m.follow);
  return {
    k: w * w,
    wobbleDamp: 2.2 / Math.max(0.05, m.keep),
    stretch: Math.min(0.95, Math.max(0, m.stretch)),
    friction: 3.2 / Math.max(0.05, m.slide),
    followK: f * f, followC: 2 * 0.85 * f,
    pinch: Math.min(1, Math.max(0, m.pinch)),
    gx: m.tiltX * 900, gy: m.tiltY * 900,
    press: m.press, poke: m.poke, split: m.split
  };
}
let P = physics();

function vibrate(ms) {
  if (params.other.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* 何もしない */ } }
}

/* ---------- 置き場所 ---------- */
function freeRect() {
  const w = params.base.wall, phone = innerWidth <= 600;
  return { x0: w + 8, x1: innerWidth - w - 8, y0: w + (phone ? 72 : 24), y1: innerHeight - w - (phone ? 84 : 104) };
}
function findSpot(rad, placed, r) {
  let best = null, bestScore = -Infinity;
  const cy = (r.y0 + r.y1) / 2, cx = (r.x0 + r.x1) / 2;
  for (let t = 0; t < 180; t++) {
    const x = r.x0 + rad + Math.random() * Math.max(1, r.x1 - r.x0 - 2 * rad);
    const y = r.y0 + rad + Math.random() * Math.max(1, r.y1 - r.y0 - 2 * rad);
    let md = 80;
    for (const q of placed) md = Math.min(md, Math.hypot(q.x - x, q.y - y) - q.r - rad);
    const score = md - Math.hypot(x - cx, y - cy) / Math.max(innerWidth, innerHeight) * 90;
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  return best || { x: cx, y: cy };
}

function resetScene() {
  world.clear(); fx.clear();
  for (const [id, st] of ptrs) if (st.kind !== 'knife') ptrs.delete(id);
  sceneLook = params.look.variant;
  const S = params.base.size, n = Math.max(1, Math.round(params.base.count));
  const r = freeRect(), placed = [];
  for (let i = 0; i < n; i++) {
    const key = START_ORDER[i % START_ORDER.length];
    const rad = S * FRUITS[key].scale * 1.08;
    const p = findSpot(rad, placed, r);
    placed.push({ x: p.x, y: p.y, r: rad });
    const b = spawnFruit(key, S, sceneLook, p.x, p.y, (Math.random() - 0.5) * 0.9);
    b.z = 200 + i * 80;
    world.add(b);
  }
  refreshThumbs();
}

function addFruit(key) {
  if (world.bodies.length >= 90) return;
  const placed = world.bodies.map(b => ({ x: b.cx, y: b.cy, r: b.size }));
  const rad = params.base.size * FRUITS[key].scale * 1.08;
  const p = findSpot(rad, placed, freeRect());
  const b = spawnFruit(key, params.base.size, sceneLook, p.x, p.y, (Math.random() - 0.5) * 0.9);
  b.z = 320;
  world.add(b);
  snd.pop();
}

/* ---------- 世界からの知らせ ---------- */
world.on.cut = info => {
  const b = info.body;
  fx.juice(info.ax, info.ay, info.bx, info.by, b.fruit.pal.juice, params.fx.juice, b.size);
  snd.cut();
  vibrate(12);
  for (const [id, st] of ptrs) {
    if (st.b !== b) continue;
    const kid = info.kids.find(k => k.contains(st.x, st.y));
    if (!kid) { ptrs.delete(id); continue; }
    st.b = kid;
    if (st.kind === 'hold') world.pressStart(kid, st.x, st.y, P);
    else if (st.kind === 'drag') { st.g = world.grabStart(kid, st.x, st.y, P); kid.zHold = 14; }
  }
};
world.on.land = (b, hit) => {
  if (hit > 160) snd.land(b.size, Math.min(1, hit / 1400));
};

/* ---------- 指の操作 ---------- */
const KNIFE_CURSOR = 'url("data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
  '<g transform="rotate(-45 16 16)"><path d="M16 2c3 4 3.5 10 3 16h-6c0-7 .5-12 3-16z" fill="#fff" stroke="#2B2622" stroke-width="1.5" stroke-linejoin="round"/>' +
  '<rect x="13" y="18" width="6" height="11" rx="2" fill="#2B2622"/></g></svg>') + '") 6 6, crosshair';

function updateCursor(x, y) {
  let c;
  if ([...ptrs.values()].some(s => s.kind === 'drag')) c = 'grabbing';
  else if (mode === 'knife') c = KNIFE_CURSOR;
  else c = world.pick(x, y) ? 'grab' : KNIFE_CURSOR;
  if (canvas.style.cursor !== c) canvas.style.cursor = c;
}

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  snd.unlock();
  closeTray();
  const x = e.clientX, y = e.clientY, t = performance.now();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 何もしない */ }
  const b = mode === 'touch' ? world.pick(x, y) : null;
  if (b) {
    world.toFront(b);
    world.pressStart(b, x, y, P);
    ptrs.set(e.pointerId, { kind: 'hold', b, x0: x, y0: y, x, y, t0: t, lt: t, vx: 0, vy: 0 });
    vibrate(6);
  } else {
    const tr = { pts: [{ x, y, t }], live: true };
    trails.push(tr);
    const g = { kind: 'knife', sx: x, sy: y, lx: x, ly: y, x, y, inside: new Map(), tr };
    for (const body of world.bodies) if (body.contains(x, y)) g.inside.set(body, { x, y, started: true });
    ptrs.set(e.pointerId, g);
  }
  updateCursor(x, y);
});

canvas.addEventListener('pointermove', e => {
  const st = ptrs.get(e.pointerId);
  const x = e.clientX, y = e.clientY, t = performance.now();
  if (!st) { if (e.pointerType === 'mouse') updateCursor(x, y); return; }
  if (st.kind === 'hold') {
    if (!world.bodies.includes(st.b)) { ptrs.delete(e.pointerId); return; }
    world.pressMove(st.b, x, y);
    if (Math.hypot(x - st.x0, y - st.y0) > 10) {
      world.pressEnd(st.b, false, P, true);
      st.kind = 'drag';
      st.g = world.grabStart(st.b, st.x0, st.y0, P);
      st.b.zHold = 14;
      updateCursor(x, y);
    }
  }
  if (st.kind === 'drag') {
    const dt = Math.max(4, t - st.lt) / 1000;
    st.vx = st.vx * 0.5 + (x - st.x) / dt * 0.5;
    st.vy = st.vy * 0.5 + (y - st.y) / dt * 0.5;
    st.g.tx = x; st.g.ty = y; st.g.tvx = st.vx; st.g.tvy = st.vy;
  } else if (st.kind === 'knife') {
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const list = evs.length ? evs : [e];
    for (const ce of list) {
      const cx = ce.clientX, cy = ce.clientY;
      if (Math.hypot(cx - st.lx, cy - st.ly) < 0.5) continue;
      world.knife(st, st.lx, st.ly, cx, cy);
      st.lx = cx; st.ly = cy;
      st.tr.pts.push({ x: cx, y: cy, t });
    }
  }
  st.x = x; st.y = y; st.lt = t;
});

function endPointer(e) {
  const st = ptrs.get(e.pointerId);
  if (!st) return;
  ptrs.delete(e.pointerId);
  const t = performance.now();
  if (st.kind === 'hold' && world.bodies.includes(st.b)) {
    const quick = t - st.t0 < 260;
    const depth = world.pressEnd(st.b, quick, P);
    if (quick) snd.poke(st.b.size, 0.8 + 0.4 * depth);
    else snd.wobble(st.b.size, 0.5 + 0.5 * depth);
    vibrate(quick ? 8 : 14);
  } else if (st.kind === 'drag') {
    world.grabEnd(st.g);
    if (world.bodies.includes(st.b)) st.b.zHold = null;
  } else if (st.kind === 'knife') {
    st.tr.live = false;
  }
  updateCursor(e.clientX, e.clientY);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- 道具バー ---------- */
function setMode(m) {
  mode = m;
  for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === m));
}
for (const b of document.querySelectorAll('[data-mode]')) b.addEventListener('click', () => setMode(b.dataset.mode));

const tray = $('#tray'), addBtn = $('#addBtn');
function closeTray() { tray.hidden = true; addBtn.setAttribute('aria-expanded', 'false'); }
addBtn.addEventListener('click', () => {
  const open = tray.hidden;
  tray.hidden = !open;
  addBtn.setAttribute('aria-expanded', String(open));
  if (open) refreshThumbs();
});
function buildTray() {
  tray.innerHTML = '';
  const d = Math.min(2, window.devicePixelRatio || 1);
  for (const key of TRAY_ORDER) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tray-btn';
    btn.dataset.key = key;
    const cv = document.createElement('canvas');
    cv.width = 48 * d; cv.height = 48 * d;
    const label = document.createElement('span');
    label.textContent = FRUITS[key].name;
    btn.append(cv, label);
    btn.addEventListener('click', () => addFruit(key));
    tray.append(btn);
  }
}
function refreshThumbs() {
  if (tray.hidden) return;
  for (const btn of tray.querySelectorAll('.tray-btn')) {
    const key = btn.dataset.key, S = 18 / Math.max(0.75, FRUITS[key].scale);
    const b = spawnFruit(key, S, sceneLook, 24, 24, 0);
    R.thumb(btn.querySelector('canvas'), b, sceneLook, params.fx);
  }
}
$('#shakeBtn').addEventListener('click', () => { snd.unlock(); world.shake(); R.shakeT = 1; snd.shake(); vibrate(20); });
$('#resetBtn').addEventListener('click', () => { snd.unlock(); resetScene(); });
const soundBtn = $('#soundBtn');
function updateSoundBtn() {
  const on = !!params.other.sound;
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', on ? '音を消す' : '音を出す');
}
soundBtn.addEventListener('click', () => {
  snd.unlock();
  params.other.sound = params.other.sound ? 0 : 1;
  if (panel) panel.sync();
  updateSoundBtn();
});
document.addEventListener('pointerdown', e => {
  if (!tray.hidden && !tray.contains(e.target) && !addBtn.contains(e.target)) closeTray();
});

/* ---------- 調整パネル ---------- */
let panel = null;
if (window.TunePanel) {
  panel = TunePanel.create({
    title: '調整パネル', storageKey: 'jelly-fruits', version: 1,
    params, defaults: DEFAULTS,
    schema: [
      { cat: 'ゼリー', items: [
        { pills: 'ゼリーの案', path: 'look.variant', options: [
          { name: 'ぷるぷるゼリー', value: 'jelly', desc: '透けてツヤツヤのゼリー。床に色つきの光が落ちる。' },
          { name: 'もちもちグミ', value: 'gummy', desc: '透けないグミ。砂糖をまぶしたマットな手ざわりで、揺れは短め。', values: LOOK_VALUES.gummy },
          { name: '果物入り寒天', value: 'clear', desc: '透明なゼリーの中に果物。後ろの方眼がゆがんで見える。', values: LOOK_VALUES.clear }
        ]},
        { sub: '果物', grp: 'basic', items: [
          { slider: '大きさ', path: 'base.size', min: 32, max: 176, step: 4, fmt: 'px', spDefault: 64, hint: '果物の大きさの基準（オレンジの半径）。手を離すと並べ直します。' },
          { slider: 'はじめの数', path: 'base.count', min: 1, max: 12, step: 1, fmt: 'int', hint: '最初にお皿へ落ちてくる果物の数。手を離すと並べ直します。' }
        ]},
        { sub: 'お皿', grp: 'basic', items: [
          { slider: 'パディング', path: 'base.wall', min: 0, max: 64, step: 4, fmt: 'px', hint: '画面のふちから、果物が当たって跳ね返る壁までの余白。' }
        ]},
        { sub: 'ゼリー', grp: 'fxtex', items: [
          { slider: '不透明度', path: 'fx.opacity', min: 0, max: 100, step: 1, unit: '%', clamp: true, hint: 'ゼリーの濃さ。下げると後ろのテーブルが透けて見える。寒天の案では、ゼリーの色みの濃さ。' },
          { slider: 'ツヤ', path: 'fx.gloss', min: 0, max: 2, step: 0.05, fmt: 'x', hint: '左上から当たる光の照り返しの強さ。' },
          { slider: 'ふちの影', path: 'fx.rim', min: 0, max: 2, step: 0.05, fmt: 'x', hint: 'ふちほど色が濃く見える、厚みの影の強さ。' },
          { slider: '屈折', path: 'fx.refract', min: 1, max: 1.3, step: 0.01, fmt: 'x', only: 'clear', hint: '透明なゼリー越しに、後ろの方眼が大きくゆがんで見える量。1 でゆがまない。' },
          { slider: '砂糖の濃さ', path: 'fx.sugar', min: 0, max: 1, step: 0.05, fmt: 'x', clamp: true, only: 'gummy', hint: 'グミにまぶした砂糖つぶの濃さ。0 で砂糖なし。' }
        ]},
        { sub: 'テーブル', grp: 'fxtex', items: [
          { color: '色', path: 'fx.table', hint: 'お皿（テーブル）の色。' },
          { slider: '影の濃さ', path: 'fx.shadow', min: 0, max: 2, step: 0.05, fmt: 'x', hint: '果物の下に落ちる影の濃さ。' },
          { slider: '色の光', path: 'fx.caustic', min: 0, max: 2, step: 0.05, fmt: 'x', hint: '透けたゼリーを通って床に落ちる、色つきの光の濃さ。グミの案では出ない。' }
        ]},
        { sub: '果汁', grp: 'fxtex', items: [
          { slider: '量', path: 'fx.juice', min: 0, max: 2, step: 0.05, fmt: 'x', hint: '切った時に飛び散る果汁の量。0 で飛ばない。' }
        ]},
        { sub: 'ぷるぷる', grp: 'anim', items: [
          { slider: '速さ', path: 'motion.hz', min: 0.5, max: 8, step: 0.1, unit: 'Hz', hint: '1秒に何回ぷるぷる揺れるか。上げるとかため、下げるとやわらかい。' },
          { slider: '続く長さ', path: 'motion.keep', min: 0.1, max: 3, step: 0.05, fmt: 'x', hint: '揺れが止まるまでの長さ。上げるといつまでも揺れる。' },
          { slider: '伸びやすさ', path: 'motion.stretch', min: 0, max: 0.95, step: 0.05, fmt: 'n2', clamp: true, hint: '全体がむにっと伸び縮みする量。0 だと形を保ったまま揺れる。' }
        ]},
        { sub: '押した時', grp: 'anim', items: [
          { slider: 'へこみ', path: 'motion.press', min: 0, max: 2, step: 0.05, fmt: 'x', hint: '押しっぱなしにした時に、つぶれて広がる量。' },
          { slider: 'ぷにっの強さ', path: 'motion.poke', min: 0, max: 2, step: 0.05, fmt: 'x', hint: 'タップしてすぐ離した時と、落ちて着地した時にはねる強さ。' }
        ]},
        { sub: 'つかんだ時', grp: 'anim', items: [
          { slider: '追従', path: 'motion.follow', min: 1, max: 16, step: 0.5, unit: 'Hz', hint: '指にどれだけ速くついてくるか。下げるとふんわり遅れてついてくる。' },
          { slider: 'つまんだ所の伸び', path: 'motion.pinch', min: 0, max: 1, step: 0.05, fmt: 'n2', clamp: true, hint: '速く動かした時に、つまんだ所だけ引っぱられて伸びる量。' }
        ]},
        { sub: 'テーブル', grp: 'anim', items: [
          { slider: 'すべりやすさ', path: 'motion.slide', min: 0.1, max: 3, step: 0.05, fmt: 'x', hint: '投げた時にどこまですべるか。上げると氷の上のようにすべる。' },
          { slider: '傾き X', path: 'motion.tiltX', min: -1, max: 1, step: 0.05, fmt: 'n2', signed: true, hint: 'テーブルを傾けて、果物を転がす。＋で右へ。' },
          { slider: '傾き Y', path: 'motion.tiltY', min: -1, max: 1, step: 0.05, fmt: 'n2', signed: true, hint: 'テーブルを傾けて、果物を転がす。＋で下へ。' }
        ]},
        { sub: '切った時', grp: 'anim', items: [
          { slider: '離れ方', path: 'motion.split', min: 0, max: 2, step: 0.05, fmt: 'x', hint: '切ったかけらが、切り口から離れる勢いと、ぷるんと揺れる強さ。' }
        ]},
        { sub: '音', grp: 'other', items: [
          { toggle: '鳴らす', path: 'other.sound', shared: true, hint: '効果音を鳴らすかどうか（右上のボタンと同じ）。' },
          { slider: '音量', path: 'other.volume', min: 0, max: 2, step: 0.05, fmt: 'x', shared: true, hint: '効果音の大きさ。' },
          { toggle: '振動', path: 'other.vibrate', shared: true, hint: 'スマホ（Android）で、さわった時に短く震わせるかどうか。' }
        ]}
      ]}
    ],
    onSettle: info => {
      updateSoundBtn();
      if (!info) return;
      if (info.variant || info.remote || info.imported) { resetScene(); return; }
      if (info.path === 'base.size' || info.path === 'base.count' || (info.reset && !info.path)) resetScene();
    }
  });
}

/* ---------- 画面の大きさ ---------- */
function resize() {
  R.resize(innerWidth, innerHeight, Math.min(2, window.devicePixelRatio || 1));
  world.W = innerWidth; world.H = innerHeight;
}
addEventListener('resize', resize);

/* ---------- 毎フレーム ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  P = physics();
  world.wall = params.base.wall;
  world.bottomSafe = innerWidth <= 600 ? 76 : 96;   /* 道具バーの下に果物が隠れないように */
  R.setTable(params.fx.table);
  snd.set(!!params.other.sound, params.other.volume);
  if (params.look.variant !== sceneLook) resetScene();
  for (const st of ptrs.values()) {
    if (st.kind === 'drag' && now - st.lt > 40) { st.vx *= 0.8; st.vy *= 0.8; st.g.tvx = st.vx; st.g.tvy = st.vy; }
  }
  world.step(dt, P);
  fx.update(dt);
  if (R.shakeT > 0) R.shakeT = Math.max(0, R.shakeT - dt * 3);
  for (let i = trails.length - 1; i >= 0; i--) {
    const tr = trails[i], lp = tr.pts[tr.pts.length - 1];
    if (tr.pts.length > 64) tr.pts.splice(0, tr.pts.length - 64);
    if (!tr.live && (!lp || now - lp.t > 220)) trails.splice(i, 1);
  }
  const incisions = [];
  for (const st of ptrs.values()) {
    if (st.kind !== 'knife') continue;
    for (const [b, ent] of st.inside) incisions.push({ b, ax: ent.x, ay: ent.y, bx: st.lx, by: st.ly });
  }
  R.render(world, fx, sceneLook, params.fx, now, { trails, incisions });
  requestAnimationFrame(loop);
}

resize();
buildTray();
updateSoundBtn();
resetScene();
requestAnimationFrame(loop);

/* 確認用（ブラウザのコンソールから触れる） */
window.__jelly = { world, params, resetScene, addFruit, setMode, R };
