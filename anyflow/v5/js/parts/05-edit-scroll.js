
/* ===== ④網でつながる の頂点編集 (2026-08-28 ヒデさん指定) =====
   「グラフィックを編集」に入っている間、メッシュのノードに丸いつまみを出して
   ドラッグで位置を決められる。置いた座標は params.conv.mesh.pts に入り、
   プリセットにも保存される。
   ⚠️ ケージ(球殻)は3Dの並びなので、この編集の対象外(平面の3種だけ)。 */
const meshHandles = (() => {
  let svg = null, on = false, drag = null, dots = [];
  function host() {
    if (svg) return svg;
    const orbit = document.querySelector('.orbit');
    if (!orbit) return null;
    svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 915.483 630');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:10;overflow:visible;';
    orbit.appendChild(svg);
    return svg;
  }
  function toLocal(e) {
    const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(m.inverse());
  }
  /* いま出ている位置を、そのまま「手で置いた座標」として取り込む */
  function seed() {
    const M = params.conv.mesh;
    const n = Math.max(3, Math.round(M.nodes));
    if (M.pts && M.pts.length === n) return;
    const src = (convMesh && convMesh.pos && convMesh.pos.length === n) ? convMesh.pos : null;
    if (!src) return;
    M.pts = src.map(p => ({ x: +p.x.toFixed(1), y: +p.y.toFixed(1) }));
  }
  function build() {
    const el = host(); if (!el) return;
    el.innerHTML = ''; dots = [];
    const M = params.conv.mesh;
    const n = Math.max(3, Math.round(M.nodes));
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('r', '9');
      c.setAttribute('fill', 'rgba(13,153,255,0.18)');
      c.setAttribute('stroke', '#0D99FF');
      c.setAttribute('stroke-width', '1.5');
      c.style.cursor = 'grab';
      c.style.pointerEvents = 'all';
      c.addEventListener('pointerdown', ev => {
        ev.stopPropagation(); ev.preventDefault();
        seed();
        drag = { i, start: toLocal(ev), base: { ...params.conv.mesh.pts[i] } };
        c.setPointerCapture(ev.pointerId); c.style.cursor = 'grabbing';
      });
      el.appendChild(c); dots.push(c);
    }
    place();
  }
  function place() {
    if (!on || !convMesh || !convMesh.pos) return;
    for (let i = 0; i < dots.length; i++) {
      const p = convMesh.pos[i];
      if (!p) { dots[i].setAttribute('opacity', '0'); continue; }
      dots[i].setAttribute('opacity', '1');
      dots[i].setAttribute('cx', p.x); dots[i].setAttribute('cy', p.y);
    }
  }
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = toLocal(e), M = params.conv.mesh;
    if (!M.pts || !M.pts[drag.i]) return;
    M.pts[drag.i].x = +(drag.base.x + (p.x - drag.start.x)).toFixed(1);
    M.pts[drag.i].y = +(drag.base.y + (p.y - drag.start.y)).toFixed(1);
    markDirty(); renderFrame(); place();
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    dots[drag.i] && (dots[drag.i].style.cursor = 'grab');
    drag = null;
  });
  return {
    get on() { return on; },
    /* この案で頂点編集が使えるか (平面の3種だけ) */
    get usable() {
      return params.kvDesign === 'planet' && params.converge === 'mesh'
        && (params.conv.mesh.style || 'organic') !== 'cage';
    },
    set(v) {
      on = !!v && this.usable;
      const el = host(); if (!el) return;
      el.style.display = on ? '' : 'none';
      if (on) build();   /* 座標の取り込みは掴んだ瞬間だけ(下の pointerdown) */
      renderFrame();
      if (on) place();
    },
    place,
    /* 自動配置へ戻す */
    reset() { params.conv.mesh.pts = null; markDirty(); renderFrame(); if (on) build(); },
  };
})();

/* ===== 編集モードのバー ＋ 元に戻す(⌘Z) / やり直し(⌘⇧Z) (2026-08-27 ヒデさん指定) =====
   編集モードに入ると、キービジュアルの右上にバーが出て
   「保存 / やめる / 編集前に戻す / 元に戻す / やり直し」ができる。
   Figma と同じく ⌘Z(Ctrl+Z) で1つ前へ、⌘⇧Z(Ctrl+Shift+Z) でやり直し。 */
const editHistory = (() => {
  let stack = [], idx = -1, entry = null;   /* entry = 編集に入った時の状態(編集前に戻す用) */
  const snap = () => JSON.stringify({
    o: params.orbits.outer, i: params.orbits.inner, p: params.planet,
  });
  function restore(json) {
    if (!json) return;
    const d = JSON.parse(json);
    Object.assign(params.orbits.outer, d.o);
    Object.assign(params.orbits.inner, d.i);
    Object.assign(params.planet, d.p);
    markDirty();
    renderFrame();
    if (editHandles.on) editHandles.place();
    if (typeof syncPanelRows === 'function') syncPanelRows();
    if (typeof editHandles.refresh === 'function') editHandles.refresh();
  }
  return {
    /* 編集モードに入った時 */
    begin() { entry = snap(); stack = [entry]; idx = 0; },
    /* 1操作(ドラッグや数値入力)が終わったら積む */
    push() {
      const now = snap();
      if (stack[idx] === now) return;          /* 変化なしなら積まない */
      stack = stack.slice(0, idx + 1);
      stack.push(now);
      if (stack.length > 60) stack.shift();    /* 持ちすぎない */
      idx = stack.length - 1;
    },
    undo() { if (idx > 0) { idx--; restore(stack[idx]); return true; } return false; },
    redo() { if (idx < stack.length - 1) { idx++; restore(stack[idx]); return true; } return false; },
    /* 編集に入る前の状態へ全部戻す */
    revert() { if (entry) { restore(entry); stack = [entry]; idx = 0; } },
    get canUndo() { return idx > 0; },
    get canRedo() { return idx < stack.length - 1; },
  };
})();

/* 画面上の編集バー */
const editBar = (() => {
  let el = null, btns = {};
  function ensure() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'edit-bar';
    const mk = (key, label, title, cls) => {
      const b = document.createElement('button');
      b.className = 'eb-btn' + (cls ? ' ' + cls : '');
      b.textContent = label;
      b.title = title;
      el.appendChild(b);
      btns[key] = b;
      return b;
    };
    mk('undo', '↶', '元に戻す（⌘Z）').onclick = () => { editHistory.undo(); sync(); };
    mk('redo', '↷', 'やり直し（⌘⇧Z）').onclick = () => { editHistory.redo(); sync(); };
    const sep0 = document.createElement('span');
    sep0.className = 'eb-sep';
    el.appendChild(sep0);
    /* 【2026-09-17 大掃除・ヒデさん指定】「🪐 軌道を裏へ」ボタンは削除(メッシュ案では輪が出ないので無意味だった) */
    const sep = document.createElement('span');
    sep.className = 'eb-sep';
    el.appendChild(sep);
    mk('revert', '↺ 編集前に戻す', '編集モードに入る前の形へ全部戻す').onclick = () => {
      editHistory.revert(); sync();
    };
    mk('cancel', 'やめる', '保存せずに編集モードを抜ける').onclick = () => {
      editHistory.revert();
      editHandles.set(false);
      if (typeof siteEdit !== 'undefined') siteEdit.set(false);   /* 2026-08-29: html.site-edit を同期(自由回転の表示を戻す) */
      if (typeof textTools !== 'undefined') textTools.set(false);
      if (typeof buildPanel === 'function') buildPanel();
    };
    mk('save', '保存', 'いまの形で保存して編集モードを抜ける', 'primary').onclick = () => {
      save(); dirty = false; if (syncSaveBtn) syncSaveBtn();
      btns.save.textContent = '✓ 保存しました';
      setTimeout(() => {
        btns.save.textContent = '保存';
        editHandles.set(false);
        if (typeof siteEdit !== 'undefined') siteEdit.set(false);   /* 2026-08-29: html.site-edit を同期(自由回転の表示を戻す) */
        if (typeof textTools !== 'undefined') textTools.set(false);
        if (typeof buildPanel === 'function') buildPanel();
      }, 700);
    };
    document.body.appendChild(el);
    return el;
  }
  function sync() {
    if (!el) return;
    btns.undo.disabled = !editHistory.canUndo;
    btns.redo.disabled = !editHistory.canRedo;
    /* (「軌道を裏へ」ボタンは 2026-09-17 に削除) */
  }
  return {
    show() { ensure(); el.style.display = 'flex'; sync(); },
    hide() { if (el) el.style.display = 'none'; },
    sync,
  };
})();

/* キーボード: ⌘Z / ⌘⇧Z (Windows は Ctrl) */
window.addEventListener('keydown', (e) => {
  if (!editHandles.on) return;
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || e.key.toLowerCase() !== 'z') return;
  const t = e.target;
  /* 数値入力欄の中では、その欄の取り消しを優先する */
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  e.preventDefault();
  if (e.shiftKey) editHistory.redo(); else editHistory.undo();
  editBar.sync();
});

/* 軌道SVG(奥/手前の楕円・クリップ・グラデ)へジオメトリを反映 */
const orbitSvgEls = {
  outer: {
    ells: [document.getElementById('ellOuterB'), document.getElementById('ellOuterF')],
    clip: document.getElementById('clipOuterRect'),
    grads: [document.getElementById('gOuterB'), document.getElementById('gOuterF')],
  },
  inner: {
    ells: [document.getElementById('ellInnerB'), document.getElementById('ellInnerF')],
    clip: document.getElementById('clipInnerRect'),
    grads: [document.getElementById('gInnerB'), document.getElementById('gInnerF')],
  },
};

function updateOrbitSvg(geoms) {
  for (const key of ['outer', 'inner']) {
    const g = geoms[key], els = orbitSvgEls[key];
    const tr = `rotate(${g.rot} ${g.cx} ${g.cy})`;
    for (const el of els.ells) {
      el.setAttribute('cx', g.cx); el.setAttribute('cy', g.cy);
      el.setAttribute('rx', g.rx); el.setAttribute('ry', g.ry);
      el.setAttribute('transform', tr);
    }
    /* 【2026-08-28 ヒデさん指定】「裏に回す」= 前面レイヤー(ellXxxF)を隠す。
       奥のフル楕円(ellXxxB)だけが残り、惑星が重なる所を隠す → 土星の輪のように回り込む。 */
    if (els.ells[1]) els.ells[1].style.display = params.orbits[key].behind ? 'none' : '';
    els.clip.setAttribute('x', -(g.rx + 24));
    els.clip.setAttribute('width', (g.rx + 24) * 2);
    els.clip.setAttribute('height', g.ry + 26);
    els.clip.setAttribute('transform', `translate(${g.cx} ${g.cy}) rotate(${g.rot})`);
    for (const gr of els.grads) {
      gr.setAttribute('x1', g.cx); gr.setAttribute('x2', g.cx);
      gr.setAttribute('y1', g.cy - g.ry); gr.setAttribute('y2', g.cy + g.ry);
    }
  }
}

/* 遅延後になめらかに加速するための実効経過時間 */
function effectiveTime(t, delay, ramp) {
  const pt = t - delay;
  if (pt <= 0) return 0;
  if (ramp <= 0 || pt >= ramp) return pt - ramp / 2;
  return (pt * pt) / (2 * ramp);
}

/* 緩急: 速度 v(t) = 1 + amp*sin(2πt/period + φ) を積分した実効時間 */
function warpTime(t, amp, period, phaseDeg) {
  if (amp <= 0 || period <= 0) return t;
  const w = 2 * Math.PI / period;
  const ph = phaseDeg * Math.PI / 180;
  return t - (amp / w) * (Math.cos(w * t + ph) - Math.cos(ph));
}

let elapsed = 0;      // 再生中のみ進む累積時間
let frameSeq = 0;     // フレーム番号。矩形キャッシュの寿命管理に使う
let lastTs = null;
let frameCount = 0, frameErrCount = 0;   /* 【2026-09-01】__anim.health() 診断用 */
let frameDt = 1 / 60; // 直近フレームの実時間 (スクロール慣性補間用・一時停止中も進む)
/* スクロールの向き (-1=上へ / 1=下へ / 0=止まっている)。逆再生の開始判定に使う */
let scrollDir = 0, lastScrollY = 0;

/* ドットの現在角度(deg): 緩急ゆらぎつきの周回 */
function patternDeg(d, i, p) {
  /* ドットの周回を止める案では、進む量を 0 にして最初の位置に留める(2026-08-27 ヒデさん指定) */
  const move = (typeof convDotMoves === 'function' && convOn()) ? convDotMoves() : true;
  const base = move ? (360 / params.duration * params.globalSpeed * params.direction) : 0;
  const et = effectiveTime(elapsed, p.delay, params.ramp);
  /* 【2026-08-19】「①きっちり等間隔」の時は、7個ぜんぶ同じ位相で走らせる。
     位相がドットごとに違うと、等間隔に置いても走るうちに間隔が開閉する
     (実測: 外側は 120° のはずが 101°〜151° まで開閉していた) */
  const phase = (params.dotGap || 1) === 1 ? DOT_PULSE_PHASE : p.pulsePhase;
  const wt = warpTime(et, params.pulse.amp, params.pulse.period, phase);
  /* 【2026-08-27】ドット1粒ずつの不規則さ。周期の違う波を重ねて、繰り返しに見えない揺れを作る */
  const rnd = (params.conv && params.conv.dotRandom) || 0;
  let jitter = 0;
  if (rnd !== 0 && move) {
    const sd = i * 2.399;
    jitter = (Math.sin(elapsed * (0.53 + (i % 3) * 0.17) + sd) * 0.6
            + Math.sin(elapsed * (0.91 + (i % 5) * 0.13) + sd * 1.7) * 0.4) * rnd * 26;
  }
  /* 手前で速く・奥でゆっくり (パネルの「回り方の緩急」) */
  return orbitEase(d.angle + p.offset + base * p.speed * wt + jitter);
}

let _kvPrevVis = true;   /* 【2026-09-22】KVグラフィックが前フレーム画面内だったか(復帰時の dt リセット判定) */
function renderFrame() {
  frameSeq++;   /* このフレームぶんの矩形キャッシュを新しくする */
  /* resize イベントを取りこぼす環境があるので、寸法が変わっていたら組み直す
     (fit() の準備が済むまでは呼ばない) */
  if (fitReady && window.innerWidth > 0 &&
      (window.innerWidth !== lastFitW || window.innerHeight !== lastFitH)) fit();
  /* 【2026-09-22 ヒデさん依頼・軽量化】KVグラフィック(WebGLのsphere描画＋軌道SVG＋ドット毎フレームsetAttribute＋net3d物理)は
     重い。ヒーローが画面外(vision以降=実績・開発者体験・お問い合わせ)では丸ごと省く＝SPの発熱/カクつきの主因を断つ。
     時間(elapsed)駆動なので、戻ってきたら即正しい状態に復帰。積算(convGlow/charge)の dt 飛びだけ convLastT リセットで吸収。
     ビジョンのメッシュ(vfDome)・お問い合わせ(cvCanvas)は既に各自で画面外ゲート済み。 */
  if (typeof sphereCanvas !== 'undefined' && sphereCanvas) {
    const _kr = rectOf(sphereCanvas), _vh = window.innerHeight || 0;
    const _kvVis = !(_kr.bottom < -120 || _kr.top > _vh + 120);
    if (!_kvVis) { _kvPrevVis = false; updateSections(); if (editHandles.on) editHandles.place(); return; }
    if (!_kvPrevVis) { convLastT = elapsed; _kvPrevVis = true; }   /* 画面内へ復帰: dt をリセットしてグロー等の飛びを防ぐ */
  }
  const geoms = { outer: orbitGeom('outer'), inner: orbitGeom('inner') };
  convFrame(geoms);   /* 惑星への集約アニメ (①②④⑩)。geoms・convDotF/A を書き換える */
  /* 輪の表示オンオフ(パネル) × reelの吸収の濃さを合成して書く (2026-08-26 ヒデさん指定) */
  /* 「軌道の代わり」になる案は、選んでいる間は輪もドットも自動で隠す。
     ⑦降着円盤 / ⑫メッシュ = 輪もドットも / ⑬ドットの軌道 = 線だけ消してドットは自前で描く */
  const cvNow = convOn() ? params.converge : null;
  /* 【2026-08-27 ヒデさん指定】③(粒の渦)でも、軌道オブジェクトを出せるようにした(既定は出さない)。
     出す時は、共通の「外の輪 / 内の輪 / ドット」のスイッチに従う。 */
  const accreShowsOrbit = cvNow === 'accre' && !!(params.conv.accre && params.conv.accre.showOrbit);
  const hideAll = (cvNow === 'accre' && !accreShowsOrbit) || cvNow === 'mesh' || cvNow === 'beads';
  const cShowO = !hideAll && (!params.conv || params.conv.showOuter !== false);
  const cShowI = !hideAll && (!params.conv || params.conv.showInner !== false);
  const cShowD = !hideAll && (!params.conv || params.conv.showDots !== false);
  applyRingAlpha('outer', (cShowO ? 1 : 0) * convReelA.outer.b, (cShowO ? 1 : 0) * convReelA.outer.f);
  applyRingAlpha('inner', (cShowI ? 1 : 0) * convReelA.inner.b, (cShowI ? 1 : 0) * convReelA.inner.f);
  applyRingStyle('outer', convReelA.outer.w, convReelA.outer.dash, convReelA.outer.color, convReelA.outer.cap);
  applyRingStyle('inner', convReelA.inner.w, convReelA.inner.dash, convReelA.inner.color, convReelA.inner.cap);
  applyRingBlur('outer', convReelA.outer.blur, convReelA.outer.fx, convReelA.outer.dashOff);
  applyRingBlur('inner', convReelA.inner.blur, convReelA.inner.fx, convReelA.inner.dashOff);
  updateOrbitSvg(geoms);
  /* 【2026-08-28 ヒデさん指定】複数軌道シェイプ(アトム型など)がオンなら、通常の2本とドットは隠す */
  const shapeOn = convDrawShape();
  if (shapeOn) {
    applyRingAlpha('outer', 0, 0); applyRingAlpha('inner', 0, 0);
    if (params.orbits.outer.behind !== undefined) { /* 何もしない: 裏フラグはシェイプ時は無効 */ }
  } else { convHideShape(); }
  DOTS.forEach((d, i) => {
    const p = params.dots[i];
    const deg = patternDeg(d, i, p) + convDotSpin[i];   /* 収縮中の回転アップ(①) */
    const cf = convDotF[i];
    const pos = posOn(cf === 1 ? geoms[d.ellipse] : convGeom(geoms[d.ellipse], cf), deg);
    const els = dotEls[i];
    [els.back, els.front].forEach(el => {
      el.setAttribute('cx', pos.x);
      el.setAttribute('cy', pos.y);
    });
    /* 出現度合いが変わった時だけ、半径と濃さを書き換える。
       ドット非表示(パネル)と、所属する輪が非表示の時はドットも消す */
    const dotShow = (!shapeOn) && cShowD && (d.ellipse === 'outer' ? cShowO : cShowI) ? 1 : 0;
    const gRef = geoms[d.ellipse];
    const dk = dotK[i] * convDotA[i] * dotShow * convDotK(pos.y, gRef.cy, gRef.ry);
    if (els.k !== dk) {
      els.k = dk;
      /* 【2026-08-28 ヒデさん指定】カンプ準拠: 大きさ(奥行き)は dk で変えるが、
         濃さは【取り込みの消え際(convDotA)と表示ON/OFFだけ】に連動させる。
         奥のドットや粒サイズのばらつきで薄くならない(=基本は不透過)。 */
      const rr = (BASE_DOT_R * dk).toFixed(3), op = Math.min(1, convDotA[i] * dotShow).toFixed(3);
      [els.back, els.front].forEach(el => { el.setAttribute('r', rr); el.setAttribute('opacity', op); });
    }
    els.front.style.display = pos.front ? '' : 'none';
    els.back.style.display = pos.front ? 'none' : '';
  });
  kvRepro.update(geoms, shapeOn);   /* 自由回転オン時=軌道を疑似3Dで再投影(惑星は動かさない) */
  net3d.update();                    /* ネットワーク3D案(周回のみ)＝3軌道をテーパー＋物理で描く。kvReproの後に上書き */
  applySway();
  renderSphere();
  updateSections();
  if (editHandles.on) editHandles.place();   /* 直接編集の操作点を図形に追従させる */
}

/* ゆらぎ: グラフィック全体(軌道・惑星)へのゆるい動き */
const swayEls = {
  orbit: document.querySelector('.orbit'),
  svgs: [...document.querySelectorAll('.orbit svg')],
  layerBack: document.querySelector('.orbit .layer-back'),
  layerFront: document.querySelector('.orbit .layer-front'),
  sphere: document.getElementById('sphere'),
};

function applySway() {
  const t = elapsed;
  let orbit = '', svg = '', sph = '';
  switch (SWAYS[(params.sway || 1) - 1].id) {
    case 'seesaw': /* ゆらぎ: 全体がゆっくり動く。①収縮ループ中は固定(ヒデさん指定) */
      if (!(params.kvDesign === 'planet' && params.converge === 'reel')) {
        /* 【2026-08-30 ヒデさん指定】揺らぎの動きを選べるように:
           tilt=傾き(従来±3°) / h=左右 / v=上下 / diag=斜め。強さは共通の swayAmp。 */
        const swA = (params.swayAmp == null ? 1 : params.swayAmp);
        const swS = Math.sin(t * 0.4) * swA;
        switch (params.swayDir || 'tilt') {
          case 'h':    orbit = `translateX(${(swS * 14).toFixed(2)}px)`; break;
          case 'v':    orbit = `translateY(${(swS * 12).toFixed(2)}px)`; break;
          case 'diag': orbit = `translate(${(swS * 10).toFixed(2)}px, ${(swS * 8).toFixed(2)}px)`; break;
          default:     orbit = `rotate(${(swS * 3).toFixed(3)}deg)`;
        }
      }
      break;
    /* cross は orbitGeom() 側で軌道の角度に効かせる */
  }
  /* KVグラフィック全体の位置ずらし (調整パネル) をゆらぎの上に合成 */
  const kv = params.kv;
  /* スマホは軌道グループごと縮小して画面幅に収める (原点は mb 用CSSで左上にしてある)。
     【2026-09-09 カンプ node16534:22139 準拠】メッシュが枠(y81→409/328px)をほぼ埋め、惑星が
     その中心(≒y248)に来るよう拡大。0.44ではメッシュが小さくコピーとの間に空白が出ていた。 */
  /* 【2026-09-09 ヒデさん指定「メッシュ＋惑星をほんの少し小さく」】0.565→0.53。
     中央合わせは margin-left = −(915.483×scale)/2 を JS で同期。コピーとの間隔は .headline top で別途拡大。 */
  const KV_MB_SCALE = 0.53;
  const ob = isMobile ? ` scale(${KV_MB_SCALE})` : '';
  if (isMobile) swayEls.orbit.style.marginLeft = (-(915.483 * KV_MB_SCALE) / 2 - 4.9).toFixed(1) + 'px';   /* 【2026-09-23 ヒデさん指摘】SPでメッシュ(ケージ＋惑星)が画面中央より約+4.9px右にズレていた(設計フレーム915.483の中心と、実際のケージ描画中心がズレているため)。実測に基づき左へ4.9px補正して中央に。実測: 惑星中心199.9→195 */
  /* 【2026-09-09 ヒデさん指定】静的モバイル: ゆらぎ(sway)も止める＝KVグラフィックが揺れて動くのを解消。 */
  const swayOrbit = isMobile ? '' : orbit;
  swayEls.orbit.style.transformStyle = '';
  /* 【2026-09-09 ヒデさん指摘「メッシュが右にずれている」】スマホは横オフセット gx(PC用=17px)を使わず、
     .orbit の margin-left(−幅/2 = −238px) だけで画面中央に置く(実測: gx込みだと箱の中心が 232px で
     画面中央 195px より 37px 右だった)。gy はカンプの上端 y81 に合わせた値として残す。 */
  const gx = isMobile ? 0 : kv.gx;
  /* 【2026-09-17 大掃除】旧フォントテスト「調整版」のグラフィック味付け(1.21倍・右へ148/下へ184)を PC の基本値として焼き込み。
     値は Figma 17547:21430 の球の見た目(中心/直径)に実測で合わせたもの。スマホは 9/9 のSPトレース値のまま(仮置き: SPカンプ未確認)。
     ⚠️ .orbit にはビジョンの惑星図(.pf-wrap)は入っていない(兄弟)ので、ここを変えてもビジョンの図は動かない(実測で確認済み)。 */
  const KV_GFX = isMobile ? { scale: 1, dx: 0, dy: 0 } : (params.kvGfx || { scale: 1.21, dx: 148, dy: 184 });   /* 【2026-09-18】案(KV_VARIANTS)で入れ替わる */
  swayEls.orbit.style.transform = `translate(${gx + KV_GFX.dx + (KV_GFX.ox || 0)}px, ${kv.gy + KV_GFX.dy + (KV_GFX.oy || 0) + ((params.kv && params.kv.gfxY) || 0)}px)${ob} ${swayOrbit} scale(${KV_GFX.scale * (1 + (KV_GFX.oz || 0) / 100)})`.trim();   /* ox/oy/oz=【2026-09-19】XYZのずらし / gfxY=【2026-09-20】グラフィック↔コピーの距離(縦・PC/SP独立)。モバイルでも効く */
  swayEls.svgs.forEach(s => s.style.transform = isMobile ? '' : svg);
  /* 惑星の位置・サイズ (パネル設定) を ゆらぎ の上に合成。惑星は固定(回転させない) */
  const pl = params.planet;
  const plFlat = pl.flat == null ? 1 : pl.flat;
  const plT = (pl.dx || pl.dy || pl.scale !== 1 || plFlat !== 1)
    ? ` translate(${pl.dx}px, ${pl.dy}px) scale(${pl.scale}, ${pl.scale * plFlat})` : '';
  /* 静的モバイル: 惑星のゆらぎ(sph)は止める。位置はメッシュ中心のまま(以前の translateY(40px) は
     「惑星だけ下がって見える」原因だったので撤回。カンプの惑星中心 y246 はメッシュごと下げて合わせる) */
  swayEls.sphere.style.transform = ((isMobile ? '' : sph) + plT).trim();
}

/* ================= スクロール連動セクション ================= */
/* ステージの設計幅 (フィル時に画面幅へ広がる)。fit() で更新される。
   ※ renderFrame() より前に宣言しておくこと (後だと初回呼び出しで参照エラーになる) */
let stageW = 1440, stagePinW = 1440;
/* 設計フレーム。スマホ(<=780px)では 390×780 に切り替わる */
const MOBILE_MAX = 600;   /* 【2026-09-09 ヒデさん指定】スマホ/タブレットの境界。780→600 に下げ、タブレット(iPad mini縦768含む)は
                             デスクトップ層(自動縮小・834/1024で綺麗)へ寄せる。スマホ設計(≤430)は不変。CSS @media も同値。 */
let DW = 1440, DH = 921, isMobile = false;
let lastFitW = 0, lastFitH = 0, fitReady = false;
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutC = t => 1 - Math.pow(1 - t, 3);
/* ゆったり上質な減速 (quint)。CSS の cubic-bezier(.22,1,.36,1) と同じカーブで、
   参考36サイトの実測でいちばん多かった標準。出現系はぜんぶこれを使う */
const easeOutQ = t => 1 - Math.pow(1 - t, 5);
/* 動きの共通トークン(秒)。CSS の --t-fast / --t-in / --t-big と同じ値 */
const T_FAST = 0.25, T_IN = 0.8, T_BIG = 1.3;
/* 慣性で滑って止まる (行き過ぎない臨界減衰)。「ぬるっと」した上質さ担当 */
const SLICK_K = 5.2, SLICK_N = 1 - Math.exp(-SLICK_K) * (1 + SLICK_K);
const easeSlick = t => (1 - Math.exp(-SLICK_K * t) * (1 + SLICK_K * t)) / SLICK_N;

/* 進捗 p のうち区間 [a,b] を 0→1 に切り出す (イージング付き) */
function seg(p, a, b, ez) { return (ez || easeIO)(clamp01((p - a) / (b - a))); }

const SECS = {
  vision: document.getElementById('vision'),
  results: document.getElementById('results'),
  dev: document.getElementById('dev'),
  cases: document.getElementById('cases'),
};
/* 【2026-08-29 ヒデさん指定】Vision だけ固定追従(ピン留め)をやめる。
   実績・事例は従来どおりピン留めのまま。Vision は「入場した瞬間に時間で自動再生」＋
   updateVision が持つ登場(Our Vision→本文マスク→グラフィックのブラー→右のブラー)で見せる。
   グラフィックの回転アニメは保持。 */
const VIS_NOPIN = true;
/* 【2026-08-29 ヒデさん指定】実績→開発者体験の「スムーズフェード」= 実績も固定追従なし＋
   背景を自然にクロスフェード＋黒オブジェクトなし。'smooth' のとき true。 */
function resSmooth() { return !(params.patterns && params.patterns.resTrans === 'black'); }   /* 既定=smooth。明示的にblackの時だけ黒オブジェクト */
/* 【2026-08-29 ヒデさん指定】導入事例(cases)も固定追従なし。
   従来はピン用に 200×driveLen=最大600vh の長い尺があり「余分にスクロールできる」状態だった。
   固定追従なし＝1画面(100vh)で普通に流し、入場で自動再生する。 */
const CASES_NOPIN = true;

/* ピン留めセクションのスクロール進捗 0〜1 */
const progOverride = {};   // デバッグ用: __anim.setProgress で固定できる
/* ⚠️ getBoundingClientRect は呼ぶたびにブラウザがレイアウトを計算し直す(reflow)。
   同じフレーム内では結果が変わらないので、1フレーム1回だけ測って使い回す */
let rectFrame = -1;
const rectCache = new Map();
function rectOf(el) {
  if (rectFrame !== frameSeq) { rectCache.clear(); rectFrame = frameSeq; }
  let r = rectCache.get(el);
  if (!r) { r = el.getBoundingClientRect(); rectCache.set(el, r); }
  return r;
}

function pinP(sec) {
  const r = rectOf(sec);
  const vh = window.innerHeight || 1;
  const total = r.height - vh;
  if (total <= 0) return 0;
  return clamp01(-r.top / total);
}
/* ===== 所定の位置で止めて、再生し終わったら進む (2026-08-14 採用) =====
   各セクションは【固定位置に着いたら1本の映像として自動再生される】。
   再生中はスクロールを止め、終わったら解放する。
     ・見せたい所で必ず最後まで見てもらえる
     ・手の速さで再生が早送りにならない
   ⚠️ 閉じ込め防止: 再生中に強くスクロールし続けると残りを早送りして解放する。
   ⚠️ スマホは Lenis がタッチを握っていない(syncTouch:false)ので止められない。
      その場合は「時間で再生されるが、スクロールは通る」動作になる。 */
const secPlay = {};
let scrollLocked = false, lockPush = 0;

/* ===== 章立て再生 (2026-08-14) =====
   セクションを複数の章に分け、【章を再生 → 終わったら解放 → スクロールすると次の章】。
   chapters = [{ from, to, sec, at }]
     from/to = その章で描く進捗の範囲 / sec = 再生秒数 / at = 次の章を解放するスクロール量
   ⚠️ 章と章の間はロックを外す。ここでスクロールできないと「進めない」体験になる。 */

/* 【2026-08-15 バグ修正】再生を始めてよいか。
   ⚠️ 以前は「進捗 > 0.002」だけだった。スクロールで通り過ぎたあとリプレイで時計が巻き戻ると、
      進捗が 1 に近いままなのに「開始できる」と判定され、位置合わせの scrollTo が
      ユーザーをセクションの頭へ引き戻していた（＝2つの価値の後にまたビジョンへ戻るループ）。
      固定区間の頭の方にいる時だけ開始する。 */
function canPlay(p) { return p > 0.0005 && p < 0.35; }

/* canStart になったら再生開始。戻り値は再生位置(秒)。-1 = まだ始まっていない。
   ⚠️ 勢いよくスクロールすると、セクションが行き過ぎた位置でロックされて
      「そこで固まった」ように見えていた。所定の位置(上端0)から6px以上ずれていたら、
      まずそこへ寄せてから再生を始める。 */
function playT(key, total, canStart, sec, pNow) {
  /* 固定追従なし: セクションの高さが 100vh なので pinP の分母が 0 になり、
     pinP が常に 0 ＝ 再生開始の判定が永久に成立しなかった（真っ白の原因）。
     画面を6割占めたら時間で再生する。寄せ(snap)もロックもしない */
  if (params.pin === 'off') {
    const st = secPlay[key] || (secPlay[key] = { t0: null, done: false, skip: 0, snapT: 0, snapTried: false });
    /* 【2026-09-09 ヒデさん指定】スマホは「出現は1回だけ・以後は最終状態で固定」。スクロールで上下しても
       巻き戻さない(=ヒデさん指摘『巻き戻ってしまった感じ』の解消)。入場は画面を6割占めた時に1回再生。 */
    if (isMobile) {
      if (st.done) return total;
      if (st.t0 === null) { if (clamp01(preP(sec)) < 0.6) return -1; st.t0 = elapsed; }
      const t = elapsed - st.t0 + st.skip;
      if (t >= total) { st.done = true; return total; }
      return t;
    }
    /* 【2026-08-18 ヒデさん指定】(PC)画面より下へ戻ったら巻き戻す。
       こうしないと「一度通り過ぎたら、戻ってきても終わった状態のまま」になる */
    if (rectOf(sec).top > (window.innerHeight || 1)) { st.t0 = null; st.done = false; st.skip = 0; }
    if (st.t0 === null) {
      if (clamp01(preP(sec)) < 0.6) return -1;
      st.t0 = elapsed;
    }
    const t = elapsed - st.t0 + st.skip;
    if (t >= total) st.done = true;
    return Math.min(t, total);
  }
  /* スクロール駆動: 位置がそのまま再生位置になる。
     手を止めれば絵も止まり、上へ戻せばそのまま巻き戻る（逆再生の実装が要らない）
     ⚠️【2026-08-18 指定】実績だけは例外。スクロールに連動させず、ビューポート中央に来た段階で時間再生する。
     ⚠️【2026-08-25 ヒデさん指定】導入事例(cases)も同じく時間再生（ビューポートに入ったら自動再生）。 */
  if (params.drive === 'scroll' && key !== 'results' && key !== 'cases' && key !== 'vision') {
    const raw = (pNow == null ? pinP(sec) : pNow);
    /* ⚠️【2026-08-19 バグ修正】この関数の約束は「まだ再生していない＝マイナスを返す」。
       スクロール駆動だけ 0 を返していたため、呼び出し側の `t < 0`（未再生）判定が
       すり抜けて【再生位置 0 の状態】として扱われていた。
       実害: キービジュアルのドット6個が消えた。軌道の SVG は KV と Our Vision で
       使い回しているので、ビジョンの「ドットが1つずつ出る」処理(dotK)が
       A=0 で「まだ1個も出ていない＝半径0」を書き込み、KV のドットまで消していた。
       (固定あり × スクロール駆動 の組み合わせでのみ発生。他の3通りは -1 が返っていた) */
    if (raw <= 0) return -1;
    return total * clamp01(raw / Math.max(0.1, params.sections.common.driveWin));
  }
  const st = secPlay[key] || (secPlay[key] = { t0: null, done: false, skip: 0, snapT: 0, snapTried: false });
  /* 見終わったあとは、スクロール位置で行ったり来たりできる（上へ戻せば逆再生） */
  /* 【2026-08-18 指定】時間で再生する方は逆再生しない（不自然になるため）。
     巻き戻したい場合はスクロール駆動に切り替える */
  if (st.done) return total;
  /* ⚠️ 下までスクロールしてから戻ってくると、時計は巻き戻っているのに
     まだ再生開始位置に着いていない＝「何も出ていない空のセクション」が見えてしまう。
     セクションの奥にいる間は【完成した状態】を見せておき、頭に着いたら流し直す */
  if (!st.done && st.t0 === null && pNow != null && pNow > 0.35) return total;
  if (!st.done && st.t0 === null && (canStart || st.snapTried)) {
    /* もう頭の近くにいる時は、寄せずにその場で流し始める。
       （上から戻ってきた時に寄せ直すと、引っぱられて気持ち悪いため） */
    if (pNow != null && pNow < 0.12) { st.t0 = elapsed; return 0; }
    const off = sec ? rectOf(sec).top : 0;
    if (Math.abs(off) > innerHeight) return -1;   /* 遠すぎる時は待つ(頭へ引き戻さない) */
    /* 【2026-08-26 スナップ撤去】lenis.scrollTo(lock:true) の掴み直しが「ガタガタ・戻れない」の
       主因（replay で再入のたびに掴む）。中身は sticky で常にピン位置に居るので、
       掴まずその場で流し始める。1ビューポート以内に来たら再生開始。 */
    st.t0 = elapsed;
  }
  if (st.t0 === null) return -1;
  const t = elapsed - st.t0 + st.skip;
  if (t >= total) st.done = true;
  return Math.min(t, total);
}

/* ===== 見終わったあとの「行ったり来たり」 (2026-08-18 指定) =====
   一度最後まで見たセクションは、スクロール位置で再生位置が決まるようにする。
   下へ動かせば進み、上へ戻せば巻き戻る＝逆再生。固定(sticky)はそのままなので、
   上下どちらへ動いても絵が飛ばず、なめらかにつながる。
   ⚠️ 初回だけは今までどおり「時間で流れる映像」。2回目以降がスクラブになる */
function anyPlaying() {
  /* スクロール駆動と固定なしの時は、そもそも止めない。
     ただしスクロール駆動でも実績だけは時間再生なので、その間は止める */
  if (params.pin === 'off') return null;
  if ((params.scrollHold || 'lock') === 'smooth') return null;   /* 固定追従なしは一切止めない(scrollHold 最優先) */
  if (params.drive === 'scroll') {
    /* ⚠️【2026-08-26 精査・喧嘩の解消】以前は「実績だけ」を止めていたが、playT では
       【実績と導入事例の両方が時間再生】(3029行の除外リストと同じ)。導入事例は止められないのに
       clampScroll の maxY では制限され、喧嘩でガタついていた。playT と一致させ両方止める。 */
    for (const k of ['results', 'cases']) {
      const s = secPlay[k];
      if (s && s.t0 !== null && !s.done) return k;
    }
    return null;
  }
  for (const k in secPlay) { const s = secPlay[k]; if (s.t0 !== null && !s.done) return k; }
  /* 章の間 (t0 === null) はロックしない = スクロールで次へ進める */
  return null;
}
function updateScrollLock() {
  const hold = params.scrollHold || 'lock';
  /* smooth: そもそもロックしない(自由スクロール) */
  if (hold === 'smooth') {
    if (scrollLocked) { scrollLocked = false; if (lenis) lenis.start(); }
    return;
  }
  const key = anyPlaying();
  /* lock: 慣性も止めて完全固定 / soft: scrollLocked は立てる(早送り用)が lenis は止めない(スクロールは通す) */
  if (key && !scrollLocked) { scrollLocked = true; lockPush = 0; if (lenis && hold === 'lock') lenis.stop(); }
  else if (!key && scrollLocked) { scrollLocked = false; if (lenis) lenis.start(); }
}

/* ===== スクロールの押し戻し (2026-08-18 バグ修正) =====
   ⚠️ lenis.stop() だけでは素のスクロールが素通りする。
      実測: 固定中に激しくホイールを回すと 1069px 動き、セクションが画面外へ抜けた。
      「下の方に進めてしまう」バグの正体がこれ。

   対処: 入力の種類（ホイール・指・キー・スクロールバー・慣性）に関係なく効かせるため、
        位置そのものを毎フレーム押し戻す。
        許すのは【ピン区間の終わりまで】。そこまでなら固定は保たれているので破綻しない。
        再生が終わったセクションは対象外なので、見終わったあとは自由に進める。 */
/* ===== 現象の記録 (2026-08-18 作り直し) =====
   ⚠️ 最初は「こういう状態になったら記録する」という条件付きにしたが、
      実機で現象が起きているのに1件も記録されなかった＝条件の想定が間違っていた。
      条件を当てるのをやめて【直近4秒ぶんを無条件で記録】する。
      現象が出た直後に __anim.diag() を打てば、その瞬間の推移が丸ごと取れる。 */
const DIAG_MAX = 240;                 /* 約4秒ぶん */
const diagRing = [];
function diagWatch() {
  const vh = window.innerHeight || 1, vw = window.innerWidth || 1;
  const row = { y: Math.round(window.scrollY || 0), vh };
  for (const k of ['results', 'dev', 'cases']) {
    const el = SECS[k]; if (!el) continue;
    const r = rectOf(el);
    const vp = el.querySelector('.pin-vp');
    row[k] = Math.round(r.top) + '/' + Math.round(r.bottom) + (vp ? ':' + Math.round(rectOf(vp).bottom) : '');
  }
  row.fin = +devFin.toFixed(2);
  row.drive = params.drive === 'scroll' ? 'S' : 'T';
  const t = caseEls && caseEls.title;
  row.title = t ? +(parseFloat(getComputedStyle(t).opacity) || 0).toFixed(2) : null;
  const st = secPlay.dev || {};
  row.dev_st = (st.t0 == null ? '-' : 'P') + (st.done ? 'D' : '') + (st.started ? 'S' : '') + (st.ch != null ? st.ch : '');
  /* 画面の下寄りに何が描かれているかを記録する（空っぽかどうかの決め手） */
  const e = document.elementFromPoint(Math.round(vw / 2), Math.round(vh * 0.78));
  row.at78 = e ? String(e.id || e.className || e.tagName).slice(0, 18) : 'なし';
  diagRing.push(row);
  if (diagRing.length > DIAG_MAX) diagRing.shift();
}

/* ===== 固定追従なしモードの縦積みレイアウト (2026-08-18 指定) =====
   貼りつけ前提の演出（移動・拡大・章送り）をやめ、ブロックを縦に積んで
   「画面に入ったらブラーで出現」だけにする。
   ⚠️ 要素は複製せず【移動】する。id が変わらないのでアニメ側のコードはそのまま動く。
      章①のモックだけは、章②のカードと共有できないので静止した複製を置く。 */
let npState = null, npMock = null;
function buildNoPin(on) {
  if (on === !!npState) return;
  if (on) {
    npState = [];
    const mk = (sec, ids, extra) => {
      const vp = document.createElement('div');
      vp.className = 'pin-vp np-vp';
      const stg = document.createElement('div');
      stg.className = 'pin-stage';
      vp.appendChild(stg);
      sec.insertBefore(vp, sec.firstElementChild);
      const moved = [];
      for (const id of ids) {
        const n = document.getElementById(id);
        if (!n) continue;
        moved.push({ node: n, parent: n.parentNode, next: n.nextSibling });
        stg.appendChild(n);
      }
      if (extra) extra(stg);
      npState.push({ vp, moved });
    };
    /* Our Vision: 上のブロックにキーメッセージ、下のブロックに軌道＋2つの価値 */
    mk(SECS.vision, ['visLabel', 'visL1', 'visL2']);
    /* 開発者体験: 上のブロックに章①の見出し＋静止モック、下のブロックに章② */
    mk(SECS.dev, ['devH1'], stg => {
      /* 章①はエディタ画面なので、その状態で写しを取る */
      dmBuildScreen('editor');
      const src = document.querySelector('#devMock .dm-panel');
      if (!src) return;
      const box = document.createElement('div');
      box.className = 'np-mock';
      const cp = src.cloneNode(true);
      /* id が重複すると本物の取得が壊れるので落とす。参照は class で拾い直す */
      cp.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      cp.classList.remove('is-term', 'is-sdk', 'is-blank');
      box.appendChild(cp);
      stg.appendChild(box);
      /* この写しにも本物と同じアニメを流す（2026-08-18 ヒデさん指定）。
         ブロックが画面に入った時が起点。出ていったら巻き戻して流し直す */
      npMock = { box, vp: stg.parentElement, refs: dmRefs(cp), t0: null };
    });
  } else {
    npState.forEach(b => {
      b.moved.forEach(m => m.parent.insertBefore(m.node, m.next));
      b.vp.remove();
    });
    npState = null; npMock = null;
  }
}

/* 固定なしモードの見え方。updateXxx のあとに走って上書きする。
   ・ブロック単位で「画面に入ったらブラーで出現」
   ・キーメッセージと章①の見出しは、本来の演出だと消えてしまうので出したままにする */
function npReveal(el) {
  const r = rectOf(el), vh = window.innerHeight || 1;
  return easeOutQ(clamp01((vh - r.top) / (vh * 0.62)));
}
/* 【2026-08-18 ヒデさん指定】固定追従なしでは、サイト全体で
   「そのブロックが画面に入った瞬間」を起点にアニメを流す。
   ページ全体で1つの時計を回すと、スクロールが少し遅れただけで
   着いた時にはもう終わっている（実際にそうなっていた）。
   画面から出たら巻き戻すので、戻ってくるとまた頭から流れる。
   戻り値: 入ってからの秒数。まだ入っていなければ -1 */
const npClocks = {};
function npBlockT(key, el) {
  if (!el) return -1;
  const st = npClocks[key] || (npClocks[key] = { t0: null });
  if (npReveal(el) > 0.35) { if (st.t0 === null) st.t0 = elapsed; }
  else st.t0 = null;
  return st.t0 === null ? -1 : elapsed - st.t0;
}
function renderNoPin() {
  if (!npState) return;
  /* ここは直接 style に代入している（setStyle を通していない）。
     2026-08-18 時点では「setStyle のキャッシュが誤認して空振りする」ための回避策だったが、
     2026-08-19 に setStyle 側を直した（直接書き換えられたら検知して書き直す）ので、
     いまはどちらでも動く。書き換える必要が出たら setStyle に寄せてよい。 */
  document.querySelectorAll('.np-vp, html.nopin .pin-vp').forEach(vp => {
    const stg = vp.querySelector('.pin-stage');
    if (!stg) return;
    /* 【2026-09-19 ヒデさん依頼】導入事例は板ごとのブラーをやめる(見出しは intro、罫線は q、カードは1枚ずつ自分で出る) */
    if (vp.parentElement && vp.parentElement.id === 'cases') { stg.style.opacity = '1'; stg.style.filter = ''; return; }
    const k = npReveal(vp);
    stg.style.opacity = k.toFixed(3);
    stg.style.filter = k >= 1 ? '' : `blur(${((1 - k) * 14).toFixed(2)}px)`;
  });
  /* 割らずに置いたままにする要素（ブロック側のブラーで出す）。
     子要素にも個別に opacity / transform が入るので、中まで戻すこと */
  for (const id of ['visLabel', 'visL1', 'visL2', 'devH1', 'devH2']) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.transform = 'none';
    el.style.opacity = '1';
    el.style.filter = '';
    el.querySelectorAll('*').forEach(c => {
      c.style.opacity = '1';
      c.style.transform = 'none';
      c.style.filter = '';
      c.style.clipPath = 'none';
    });
  }
  /* 実績の暗幕は使わない（重ねが無いので暗転させる必要がない）。
     これを消さないと実績のブロックが真っ暗になる */
  if (resEls && resEls.dark) resEls.dark.style.opacity = '0';
  /* 実績の中身も出したままにする。
     ⚠️ 再生前の状態で el.style.opacity = 0 が直接入るのに対し、出現側は setStyle
        （キャッシュ付き）で書くため、噛み合わずに 0 のまま残ることがある */
  if (resEls) for (const el of [resEls.hl1, resEls.stats, resEls.vals, resEls.hr, resEls.head]) {
    if (!el) continue;
    el.style.opacity = '1';
    el.style.filter = '';
    el.style.transform = 'none';
  }
  /* 開発者体験の「白へ戻す」板も使わない（ブロックが独立しているため） */
  if (devBg2) devBg2.style.opacity = '0';
  /* 見出しは renderNoPin で出したままにしているので、あたり判定も戻す
     （devHeading が透明時に pointerEvents:none を入れるため） */
  if (devEls && devEls.h1) devEls.h1.style.pointerEvents = '';
  /* 章①のモック（写し）: ブロックが画面に入ったら自動で流す（2026-08-18 ヒデさん指定） */
  if (npMock && npMock.refs.lines.length) {
    const vis = npReveal(npMock.vp);
    if (vis > 0.35) {
      if (npMock.t0 === null) npMock.t0 = elapsed;
      npMock.refs.panel.classList.remove('is-blank');
      devMockContent('anim', elapsed - npMock.t0, 'editor', npMock.refs);
    } else {
      npMock.t0 = null;
      devMockContent('empty', 0, 'editor', npMock.refs);
    }
  }
}

function forceScroll(y) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true, lock: true });
  else window.scrollTo(0, y);
}

/* ===== スクロールの固定 (2026-08-18 作り直し) =====
   ⚠️ macOS のトラックパッドは、慣性で流れている間 wheel イベントが cancelable:false になり、
      preventDefault が一切効かない。「操作を止める」方式では原理的に止まらない。
      （Playwright の合成ホイールでは preventDefault が効くため、テストで再現しなかった）

   なので「位置そのものを毎フレーム戻す」方式にする。
   誰がどうスクロールを動かしても、次のフレームで元の位置へ戻るので必ず止まる。 */
function clampScroll() {
  /* 【2026-08-26】スクロール固定の強さ 3パターン。
     smooth = 押し戻さない(自由スクロール) / soft = ゆるく引き戻す(ラバーバンド) / lock = 従来の強制固定 */
  const hold = params.scrollHold || 'lock';
  if (hold === 'smooth') return;
  /* ⚠️ 固定追従なし(pin=off)の時も押し戻さない（従来仕様）。 */
  if (params.pin === 'off') return;
  /* ① 「止めるべきセクション」だけ位置を固定する。
     ⚠️【2026-08-26 精査・“固定の喧嘩”を解消】以前は再生中の全セクションを位置強制していたが、
        anyPlaying()（ホイールをブロックする判定）は drive='scroll' では【実績だけ】を対象にしている。
        全セクションを位置強制すると、ホイールが通るセクション(ビジョン等)で「動く→戻される」の
        ガタつきになる（サイト全体の固定と個別の固定が食い違う）。clampScroll も anyPlaying() と
        一致させ、止める対象だけ固定する。 */
  const lockKey = anyPlaying();
  if (lockKey && secPlay[lockKey] && secPlay[lockKey].t0 !== null && !secPlay[lockKey].done) {
    const st = secPlay[lockKey];
    if (st.lockY == null) st.lockY = Math.round(window.scrollY || window.pageYOffset || 0);
    const y = window.scrollY || window.pageYOffset || 0;
    if (Math.abs(y - st.lockY) > 1) {
      if (hold === 'soft') forceScroll(y + (st.lockY - y) * 0.12);   /* ラバーバンド(ハードスナップしない) */
      else forceScroll(st.lockY);                                     /* lock=従来の強制 */
    }
    return;
  }
  /* ② 再生していない時は記録を捨てる。
        「まだ終わっていないセクション」からは、ピン区間の終わりより下へ行かせない
        （章と章の間は、次の章へ送るために動けるようにしておく） */
  let maxY = Infinity;
  for (const k in secPlay) {
    const st = secPlay[k], el = SECS[k];
    if (!el) continue;
    st.lockY = null;
    if (st.done) continue;
    if (st.t0 === null && !st.started) continue;
    const pinRange = el.offsetHeight - (window.innerHeight || 1);
    /* 章の間は「次の章が始まる位置の少し先」まで。区間の終わりまで行かせない */
    const lim = st.nextAt != null
      ? el.offsetTop + Math.min(1, st.nextAt + 0.06) * pinRange
      : el.offsetTop + pinRange;
    maxY = Math.min(maxY, lim);
  }
  /* ③ 開発者体験は「暗転が終わりきるまで」ピン区間から下へ抜けさせない。
        これが無いと、黒→白の途中でセクションがスライドし始めて、
        暗い面の下に何も無い帯が見える（2026-08-18 ヒデさん報告の症状） */
  /* ⚠️ 再生がまだ終わっていない間は ② が既に止めている。
     ここで止めるのは【再生は終わったが暗転がまだ】の区間だけ。
     条件を広げると、暗転が始まらないまま永久に止まって先へ進めなくなる
     （2026-08-18 に実際に発生。1190x844 で最下部へ行けなくなった） */
  const devEl = SECS.dev;
  if (devEl && secPlay.dev && secPlay.dev.done && devFin < 0.999) {
    maxY = Math.min(maxY, devEl.offsetTop + devEl.offsetHeight - (window.innerHeight || 1));
  }
  if (!isFinite(maxY)) return;
  const y = window.scrollY || window.pageYOffset || 0;
  if (y > maxY + 1) {
    if (hold === 'soft') forceScroll(y + (maxY - y) * 0.12);   /* soft はゆるく引き戻す */
    else forceScroll(maxY);
  }
}


/* ロック中は操作そのものも無効化する（押し戻しだけだと、いったん動いてから戻るのでガタつく）。
   ⚠️ 調整パネルの中で回した時は通す */
const LOCK_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
const inPanel = t => !!(t && t.closest && t.closest('.tools'));
/* 入力ブロックは 'lock'(完全固定)モードだけ。'soft'/'smooth' はスクロールを通す */
const hardLock = () => (params.scrollHold || 'lock') === 'lock';
window.addEventListener('wheel', e => {
  if (scrollLocked && hardLock() && !inPanel(e.target)) e.preventDefault();
}, { passive: false });
window.addEventListener('touchmove', e => {
  if (scrollLocked && hardLock() && !inPanel(e.target)) e.preventDefault();
}, { passive: false });
window.addEventListener('keydown', e => {
  if (scrollLocked && hardLock() && LOCK_KEYS.has(e.key) && !inPanel(e.target)) e.preventDefault();
}, { passive: false });
/* 再生中にホイールを回すと早送りする(閉じ込め防止)。
   ⚠️ 以前は「残りを一気に飛ばす」実装で、開発者体験だと最終フレーム＝白背景に
      いきなりワープして【途中から突然真っ白になる】バグになっていた。
      いまは回している間だけ最大4倍速になる。飛ばずに早く流れるだけ。 */
window.addEventListener('wheel', e => {
  if (scrollLocked) lockPush += Math.abs(e.deltaY);
}, { passive: true });
function fastForward() {
  const cm = params.sections.common;
  lockPush *= Math.exp(-frameDt * 2.5);          // 手を止めると数百msで元の速さへ戻る
  const key = anyPlaying();
  if (!key) { lockPush = 0; return; }
  /* 【2026-08-18 指定】勢いよく回すと極端な早送りになるのを抑える。
     上限を下げ、効きはじめもゆるやかにした (以前は最大4倍速・立ち上がりも急だった) */
  const boost = Math.min(cm.ffMax, lockPush / cm.ffGain);
  if (boost > 0.02) secPlay[key].skip += frameDt * boost;
}

/* ===== (旧) スクロール＝きっかけ / 再生＝時間 =====
   スクロール位置は「ここまで再生してよい」という【上限】だけを決める。
   実際に絵を進めるのは時間なので、手の速さで再生スピードが変わらない。
     ・勢いよく回す → 上限だけ先に飛ぶ。絵は等速で追いかける = 早送りにならない
     ・少し回す     → 上限が少し進む。そのぶんを再生して待つ = 見せたい所で見てもらえる
     ・止める       → 上限まで再生して止まる。続きはスクロールで解放する
   ⚠️ 以前やった「進捗そのものに速度上限をかける」方式とは別物。
      あれはスクロールしても画面が動かず“のっそり”して不採用になった。 */
const storyP = {};

/* セクションが画面下から入ってきた割合 0〜1（0=画面下端に到達 / 1=画面いっぱいに来て固定開始）。
   ⚠️ sticky の仕組み上、前のセクションの固定が外れてから次のセクションが固定され始めるまでに
   ちょうど1画面ぶんのスクロールが必ず挟まる。そこで何も起きないと「無駄なスクロール」に見えるので、
   この助走区間のうちに次のセクションの出だしを見せるために使う */
function preP(sec) {
  const r = rectOf(sec);
  const vh = window.innerHeight || 1;
  return clamp01((vh - r.top) / vh);
}

/* ブラー出現の共通適用 (KVの reveal と同じ質感: ブラー6-8px + 浮き上がり) */
/* rv に「パネルで動かせる位置ずらし(ox, oy)」を足したもの。
   出現時の translateY(dy) と足し合わせて1つの transform にする */
function rvAt(el, k, blur, dy, ox, oy) {
  setStyle(el, 'opacity', k.toFixed(3));
  setStyle(el, 'pointerEvents', k < 0.02 ? 'none' : '');
  setStyle(el, 'filter', k >= 1 ? '' : `blur(${((1 - k) * (blur == null ? 8 : blur)).toFixed(2)}px)`);
  const y = (k >= 1 ? 0 : (1 - k) * (dy || 0)) + (oy || 0);
  setStyle(el, 'transform', `translate(${(ox || 0).toFixed(2)}px, ${y.toFixed(2)}px)`);
}
/* ⚠️ style への書き込みは、値が同じでも毎回「描き直し」の対象になる。
   毎フレーム同じ値を入れ続けると無駄な再描画が積み上がるので、
   前回と違う時だけ書き込む。 */
/* 同じ値を毎フレーム書き込まないためのキャッシュ付き style 設定。
   ⚠️【2026-08-19 バグ修正】「前回頼まれた値」だけを覚えていたので、
      どこかが el.style.opacity = 0 のように【直接】書き換えると
      キャッシュだけが古い値のまま残り、次に同じ値を頼まれても
      「もうその値です」と判断して書き込まず、画面が戻らなくなっていた。
      実害: スクロール駆動＋固定追従で、実績の画像・数字・本文が
            一度消えたあと二度と出てこない（ヒデさん報告）。
      対策: 「頼まれた値」に加えて【前回書いたあと DOM に入っていた値】も覚えておき、
            それが変わっていたら誰かが直接書いたとみなして書き直す。
      ※ ブラウザは "1.000" を "1" に正規化するので、書いた後の値を控えること */
function setStyle(el, prop, v) {
  if (el['_s_' + prop] === v && el.style[prop] === el['_r_' + prop]) return;
  el['_s_' + prop] = v;
  el.style[prop] = v;
  el['_r_' + prop] = el.style[prop];
}

function rv(el, k, blur, dy) {
  setStyle(el, 'opacity', k.toFixed(3));
  /* ⚠️ 透明でも「クリック・文字選択」は受け取ってしまう。
     見えていない要素が上に重なると、下の文字がドラッグで選べなくなる。
     消えている間はあたり判定も切る */
  setStyle(el, 'pointerEvents', k < 0.02 ? 'none' : '');
  setStyle(el, 'filter', k >= 1 ? '' : `blur(${((1 - k) * (blur == null ? 8 : blur)).toFixed(2)}px)`);
  /* dy を渡した時だけ transform を触る。0や未指定なら要素本来の transform
     (.pf-title の translateX(-50%) など) を壊さない */
  if (dy) setStyle(el, 'transform', k >= 1 ? '' : `translateY(${((1 - k) * dy).toFixed(2)}px)`);
}

/* ---------- Vision: Platform図のジオメトリ (Figma SVG書き出しから) ---------- */
const PF_ELL = [
  { cx: 363.464, cy: 333.499, rx: 473.816, ry: 158.868, rot: -23.3266 },
  { cx: 363.463, cy: 333.522, rx: 473.816, ry: 158.868, rot: -5.36549 },
];
/* 停止角度はカンプのドット位置から楕円式で逆算 */
/* 【2026-08-31 ヒデさん指定・カンプ15900:38423】停止角度をカンプのドット位置から逆算して更新。
   実行エンジン 72.9→69.8 / ワークフロー 47.1→44.5。他は前カンプと同位置(実測一致)。 */
const PF_DOTS = [
  { ell: 0, deg: 263.7, color: '#0E4497' },
  { ell: 0, deg: 117.8, color: '#0EBBFF' },
  { ell: 0, deg: 69.8,  color: '#000' },
  { ell: 0, deg: 44.5,  color: '#FF5D97' },
  { ell: 0, deg: -30.6, color: '#0EBBFF' },
  { ell: 1, deg: 205.4, color: '#FF5D97' },
];
/* 役割ラベルは【ドットからの相対位置】で持つ (カンプ 14693:28351 実測)。
   dot = PF_DOTS の番号 / dx,dy = ドット中心からラベル枠左上までのズレ。
   ⚠️ 以前はカンプの絶対座標を直接書いていたため、
     ・ドットの停止角度を直す
     ・カンプが更新される
     ・軌道の拡大率が変わる
   のどれが起きてもラベルだけ取り残されてズレた（実際に2回踏んだ）。
   ドット基準にしておけば、ドットが動いてもラベルは必ず付いてくる。
   ※ カンプのドットは楕円の線から最大7.5pxほど手でずらして置かれているが、
      ラベルはドット基準なので、そのズレの影響を受けない。
   center:true は中央そろえ (カンプが -translate-x-1/2)。 */
/* 【2026-08-31 ヒデさん指定・カンプ15900:38423】ラベル文言と位置を更新:
   監査→SDK/CLI / 権限→実行エンジン(位置も) / 認証基盤→認証ウィザード / ワークフローの相対位置を実測値に */
const PF_LABELS = [
  { text: 'コネクタ',         dot: 0, dx: -26.30, dy:  18.33 },
  { text: 'SDK/CLI',          dot: 1, dx: -15.61, dy:  13.38 },
  { text: '実行エンジン',     dot: 2, dx: -35.69, dy:  18.31 },
  { text: 'ワークフロー',     dot: 3, dx: -12.69, dy:  16.31 },
  { text: '認証ウィザード',   dot: 4, dx:   0.00, dy: -37.89, center: true },
];
/* ⚠️ 光の楕円を足したので、querySelectorAll('ellipse') で拾うと本数が合わなくなる。
   必ず id で取ること (実際にここで壊れた) */
const pfEllEls = [document.getElementById('pfEll0'), document.getElementById('pfEll1')];
/* 【2026-09-01 ヒデさん指定・4回直らなかった色ズレの根治(実測で確定)】
   真因: グラデ軸はviewBox座標に固定なのに、楕円は画面幅(kFill)で大きさ・位置が変わる。
   1440幅では「青ベタ+上部で白 / ピンクベタ+上部中央で白」(=ヒデさんの希望の色味)になるが、
   1920幅では楕円が大きくなり軸の遷移帯を広く横切って、反対色まで混入していた(実測: 270°にピンク/水色)。
   対策: 「1440×900の最終状態での楕円と軸の関係」を楕円ローカル座標として固定し、
   軸も楕円と同じ変換(mapX/mapY)で毎フレーム動かす。どの画面幅でも1440と同じ当たり方になる。
   ローカル座標の値は 1440実測(sc=1.02333, tx=-11.0, ty=141.0)から逆算した。 */
const pfGradEls = [document.getElementById('pfG0'), document.getElementById('pfG1')];
/* 【2026-09-01 ヒデさん指定】グラデ軸・色をパネル調整可能に。設定の取得(古い保存には無いのでDEFAULTSから複製) */
function pfGradCfg(key) {
  const vis = params.sections.vision;
  if (!vis.pfGrad) vis.pfGrad = JSON.parse(JSON.stringify(DEFAULTS.sections.vision.pfGrad));
  if (!vis.pfGrad[key]) vis.pfGrad[key] = JSON.parse(JSON.stringify(DEFAULTS.sections.vision.pfGrad[key]));
  return vis.pfGrad[key];
}
/* 色ストップ(offset/色)をSVGへ反映。起動時とパネル変更時だけ呼ぶ(軸は毎フレーム追従) */
function applyPfGradStops() {
  ['g0', 'g1'].forEach((key, gi) => {
    const g = pfGradEls[gi]; if (!g) return;
    const cfg = pfGradCfg(key);
    const w = Math.min(100, Math.max(0, cfg.white)) / 100;
    const half = Math.max(0, cfg.wSpan) / 200;
    const offs = [0, Math.max(0, w - half), w, Math.min(1, w + half), 1];
    const cols = [cfg.c1, cfg.c2, '#ffffff', cfg.c3, cfg.c4];
    const stops = g.querySelectorAll('stop');
    for (let i = 0; i < 5 && i < stops.length; i++) {
      stops[i].setAttribute('offset', offs[i].toFixed(4));
      stops[i].setAttribute('stop-color', cols[i]);
    }
  });
}
function pfDotPos(d, deg) {
  const e = PF_ELL[d.ell];
  const t = deg * Math.PI / 180, r = e.rot * Math.PI / 180;
  const lx = e.rx * Math.cos(t), ly = e.ry * Math.sin(t);
  return { x: e.cx + lx * Math.cos(r) - ly * Math.sin(r), y: e.cy + lx * Math.sin(r) + ly * Math.cos(r) };
}

const visEls = {
  label: document.getElementById('visLabel'),
  l1: document.getElementById('visL1'),
  l2: document.getElementById('visL2'),
  pfWrap: document.getElementById('pfWrap'),   /* 旧図(2026-09-19 削除・null) */
  vfWrap: document.getElementById('vfWrap'),   /* 【2026-09-19】SVG 書き出しの図 */
  pfTitle: document.getElementById('pfTitle'),
  pfSub: document.getElementById('pfSub'),
  pfTexts: document.getElementById('pfTexts'),
  valP1: document.getElementById('valP1'),
  valP2: document.getElementById('valP2'),
  dots: [], names: [], chars: [[], []],
};
(function buildPfDots() {
  const root = document.getElementById('pfDots');
  const textRoot = document.getElementById('pfTexts');
  if (!root || !textRoot) return;   /* 【2026-09-19】図を SVG 書き出しに差し替えたので旧ドット/役割名の DOM は無い */
  PF_DOTS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'pf-dot';
    el.style.background = d.color;
    el.style.opacity = 0;
    root.appendChild(el);
    visEls.dots.push(el);
  });
  PF_LABELS.forEach(l => {
    const nm = document.createElement('div');
    nm.className = 'pf-name rv';
    nm.textContent = l.text;
    /* 担当ドットの「停止位置」を計算して、そこからの相対で置く。
       .pf-texts は軌道と同じ translate+scale が掛かるので、
       ここはローカル座標のままでよい (拡大しても関係が崩れない) */
    const d = PF_DOTS[l.dot];
    const at = pfDotPos(d, d.deg);
    nm.style.left = (at.x + l.dx).toFixed(2) + 'px';
    nm.style.top = (at.y + l.dy).toFixed(2) + 'px';
    if (l.center) nm.classList.add('is-center');
    textRoot.appendChild(nm);
    visEls.names.push(nm);
  });
})();

/* 見出しの文字を1文字ずつ span に分解 (案C 文字カスケード用) */
/* 【2026-08-29 ヒデさん指定】メッセージの中の「強み」を強調アニメの対象にする。
   文字カスケード(マスク登場)はそのまま活かしつつ、「強み」の2文字だけ .vl-strong で包んで
   強調エフェクト(発光・チカチカ 等 10案)を当てられるようにする。 */
const visStrongEls = [];   // 「強み」を包む .vl-strong 要素(l1/l2 ぶん)
/* 【2026-09-09 カンプSP node16534:22143】スマホのメッセージは「データをつなぐことが、」/「強みになる時代へ。」の
   2行を明示改行。幅任せだと iPhone(402px)では「強みになる」の後で折れてカンプと違った。
   isMobile は fit() より前なので、CSS の @media と同じ matchMedia で判定する。 */
const VIS_MB_BREAK = !!(window.matchMedia && window.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches);
/* 【2026-09-20 ヒデさん依頼】ビジョンのバリエーション。
   default=現状(1行・visL1に全文/visL2は空・中央) / strong=強調案(2行・visL1「データをつなぐことが、」/visL2「強みになる時代へ」・左揃え・大きめ) */
const VIS_TEXT = {
  default: ['データをつなぐことが、強みになる時代へ。', ''],
  strong:  ['データをつなぐことが、', '強みになる時代へ'],
};
/* 【2026-09-20 ヒデさん依頼】バリエーションのUIは他パネルと同じ「ピル型(varRowX)」で統一。案の定義はこの配列 */
const VIS_EMPH_VARIANTS = [
  { key: 'default', name: 'デフォルト', fixed: true, tip: '現状(1行・中央そろえ)。' },
  { key: 'strong',  name: '強調',       fixed: true, tip: '2行(データをつなぐことが、／強みになる時代へ)・左揃え・文字+20px・見出しの左をKVコピー基準に・1行目→2行目のマスク出現。' },
];
function visEmphMode() { const v = params.sections && params.sections.vision; return (v && v.emph === 'strong') ? 'strong' : 'default'; }
function rebuildVisChars(mode) {
  const src = VIS_TEXT[mode] || VIS_TEXT.default;
  visStrongEls.length = 0;
  [visEls.l1, visEls.l2].forEach((line, i) => {
    const inner = line.firstElementChild;
    inner.innerHTML = '';
    visEls.chars[i].length = 0;
    const text = src[i] || '';
    const strongStart = text.indexOf('強み');
    const naguStart = text.indexOf('つなぐ');   /* 【2026-08-29 ヒデさん指定】「つなぐ」に常時グラデ揺らぎ */
    let strongWrap = null, naguWrap = null;
    [...text].forEach((ch, idx) => {
      const s = document.createElement('span');
      s.className = 'vl-ch';
      s.textContent = ch;
      visEls.chars[i].push(s);
      const isStrong = strongStart >= 0 && idx >= strongStart && idx < strongStart + 2;
      const isNagu = naguStart >= 0 && idx >= naguStart && idx < naguStart + 3;
      if (VIS_MB_BREAK && mode !== 'strong' && ch === '、') {   /* SP は '、' で改行(strong は既に2要素なので不要) */
        inner.appendChild(s);
        const br = document.createElement('br');
        br.className = 'vl-br-mb';
        inner.appendChild(br);
        return;
      }
      if (isStrong) {
        if (!strongWrap) {
          strongWrap = document.createElement('span');
          strongWrap.className = 'vl-strong';
          inner.appendChild(strongWrap);
          visStrongEls.push(strongWrap);
        }
        strongWrap.appendChild(s);
      } else if (isNagu) {
        if (!naguWrap) {
          naguWrap = document.createElement('span');
          naguWrap.className = 'vl-nagu';
          inner.appendChild(naguWrap);
        }
        naguWrap.appendChild(s);
      } else {
        inner.appendChild(s);
      }
    });
  });
}
/* 強調案の見出し(Our Vision＋メッセージ)を「画面左端から120px」に置く。
   .pin-stage は幅1440・左寄せ scale(--sp) なので、CSS left:120px だと
   画面幅により右にずれる(1512px で実測170px)。画面左120px = ステージ左端 + CSS-left×スケール
   なので、CSS-left = (120 − ステージ左端) ÷ スケール を逆算して --vis-emph-left に入れる。
   ⚠️ PC のみ(SP はメッシュ横並びで別配置)。ウィンドウ幅が変わったら resize で呼び直す。 */
function applyVisEmphLeft() {
  try {
    const sec = document.getElementById('vision'); if (!sec) return;
    const isMb = (typeof isMobile !== 'undefined' && isMobile);
    if (visEmphMode() !== 'strong' || isMb) { sec.style.removeProperty('--vis-emph-left'); return; }
    const stage = sec.querySelector('.pin-stage'); if (!stage) return;
    let sc = 1;
    try { const m = new DOMMatrixReadOnly(getComputedStyle(stage).transform); if (m.a) sc = m.a; } catch (e) {}
    if (!sc) sc = 1;
    const sl = stage.getBoundingClientRect().left;   // ステージ左端の画面X(横は translateY/リビールに影響されない)
    const cssLeft = (120 - sl) / sc;
    sec.style.setProperty('--vis-emph-left', cssLeft.toFixed(1) + 'px');
  } catch (e) {}
}
function applyVisEmph() {
  const mode = visEmphMode();
  try { const sec = document.getElementById('vision'); if (sec) sec.classList.toggle('vis-emph', mode === 'strong'); } catch (e) {}
  rebuildVisChars(mode);
  try { if (typeof applyVisBelow === 'function') applyVisBelow(); } catch (e) {}   /* 強調案の下コンテンツ間隔(+100)を反映 */
  try { if (typeof textTools !== 'undefined' && textTools.applyAll) textTools.applyAll(); } catch (e) {}   /* 2行目にも太さ等を当て直す */
  try { applyVisEmphLeft(); } catch (e) {}   /* 見出しを画面左120pxへ(幅依存の逆算) */
}
applyVisEmph();   /* 初期化(起動時のモードで組む) */


/* ビジョンのフェーズ境界: 調整パネルの値から組み立てる (絵コンテ準拠)
   コマ順: OurVisonブラー出現 → 1行ずつ下からトリミング出現 → 1行目から左へスライド →
   ミニ楕円ブラー出現 → 上下に分かれてブラーで消える → 楕円が左下へ移動＋実寸へ拡大 →
   ドットがくるくる(時間駆動・約1秒) → Platform文字 → ドット停止＋役割名 → 2つの価値 →
   スクロールで Point 01 → Point 02 */
/* ビジョンは「セクションがピン留めされたら自動再生」。
   Our Vison → 1行ずつ文字 → 左へスライド → 軌道グラフィック出現 までが自動。
   そこから “ワンスクロール” で文字が上下に分かれて消え、軌道が左下へ移動して実寸になる。 */
let visAutoT0 = null;    // 自動シーケンスの開始時刻
let visT = -1;           // 実際に進んだ再生位置(秒)。時間とスクロールの速い方で進み、戻らない
/* 自動パート(5.275) + 軌道が左下へ(2.0) + ドット周回して停止(4+2.5)
   + そこから Platform〜2つの価値のチェーン(約3.5) をぜんぶ含む長さ。
   ⚠️ 短いとドットが回りっぱなしになったり、文字が出切らない（両方踏んだ） */
/* 尺は updateVision 内で時間割から自動計算する (visTotal) */
/* ===== ドットの回り方 (2026-08-15) =====
   「最初はスピーディーに回って、止まる頃に徐々に減速して止まる」
   減速中の角速度を v0×(1-u)^n としている。n が大きいほど
   「はじめにグッと落ちて、最後は長く尾を引く」止まり方になる。
   fast = 回っている間の速さの倍率。 */
/* ===== 軌道が出て左下へ動く時の見せ方 =====
   pos = 位置のカーブ / scl = 大きさのカーブ / durK = 移動時間の倍率 */
const VIS_MOVES = [
  { id: 'sync',  name: '①動きと拡大を同時に', durK: 1.00, posE: 'slick', sclE: 'io',    desc: '動き出すのと同時に、じわじわ大きくなる。' },
  { id: 'late',  name: '②先に動いて後で拡大', durK: 1.15, posE: 'slick', sclE: 'late',  desc: 'まず位置が決まり、着く頃に大きくなる。文字が読みやすい。' },
  { id: 'early', name: '③先に拡大して後で動く', durK: 1.15, posE: 'late', sclE: 'early', desc: '先に大きくなってから、ゆっくり定位置へ流れていく。' },
];
let visAutoDone = false; // 自動パートが終わったか
let visMoveT0 = null;    // ワンスクロールで左下へ動き出した時刻

function updateVision(p) {
  const c = params.sections.vision;
  const B = c.blur;
  /* 【2026-08-18 ヒデさん指定】固定追従なしの時は
     「後ろから拡大 → 左下へ移動」をやめ、最初から所定の位置（左下・実寸）で組み上がった
     状態にする。出現はブロックごとのブラー（renderNoPin）に任せる。
     ドットだけは止まらずに回り続ける */
  const noPin = params.pin === 'off' || VIS_NOPIN;   /* 2026-08-29: Vision は常に no-pin */

  /* ⚠️ 2026-08-14 まで、このセクションは【全部が時間駆動】だった。
     つまりピン留めされている1.6画面ぶん、いくらスクロールしても進捗が1ミリも動かず、
     「所定の位置に来たのに何度もスクロールしないと先へ進めない」状態になっていた。
     いまは実績と同じく【時間でも進む／スクロールでも進む、速い方を採用】。
     止まっていても勝手に再生され、スクロールした分はちゃんと先へ進む。
     max で持つので巻き戻りもしない (リプレイなし) */
  const pre = progOverride.visionPre != null ? progOverride.visionPre : preP(SECS.vision);
  /* 【出だしだけ自動、あとは全部スクロール】(2026-08-14 ヒデさん選択)
       ・セクションが画面に入ったら、まず「Our Vison」と1行目までを時間で出す (VIS_AUTO_HEAD 秒)
       ・そこから先 (2行目 → 上下に分かれる → 軌道が出る → 左下へ → 2つの価値) は
         ピン中のスクロール量だけで進む。手を止めれば絵も止まる
       ・max で持つので巻き戻らない (スクロールで戻っても終わった状態のまま) */
  /* 2026-08-14: 画面に顔を出した瞬間だと早すぎるとの指摘。
     セクションがビューポートの中央まで来てから開始する (pre = 0.5) */
  /* 近づいてくる間に「Our Vison」と1行目だけ出す(乗り換え区間を空にしないため)。
     本編はセクションが所定の位置(固定)に着いてから、1本の映像として自動再生 */
  /* --- 時間割 (秒) を先に全部出す。尺 visTotal もここから計算する --- */
  const l1At = c.line1At;
  const l2At = c.line1At + c.line2Gap;
  const splitAt = l2At + c.revealDur + c.splitGap;
  /* 軌道がブラーで出る = ドットも回りはじめる。
     【2026-08-29 ヒデさん指定】no-pin は「メッセージが出たらすぐ」グラフィックをブラー出現させる
     (メッセージの登場が終わった直後 +0.35秒)。そのあと Point1 → Point2 の順。 */
  /* 【2026-08-30 ヒデさん指定・修正】グラフィックは「メッセージのマスクが出きった終点」と同時にブラー出現。
     マスクは easeOut で終盤じわっと漸近するため、時計上の完了(revealDur)まで待つと見た目に0.2〜0.3秒の
     「もう止まってるのに待つ」間が出る(実測)。見た目の終点=revealDurの85%時点に合わせる。
     npGap=そこからの追加の間(既定0=出きったと同時)。 */
  /* 2026-08-31 ヒデさん指定: グラフィックの出始めをさらに早く(マスク85%→70%時点から) */
  const miniAt = noPin ? (l1At + c.revealDur * (c.npFireK != null ? c.npFireK : 0.70) + (c.npGap != null ? c.npGap : 0)) : (splitAt + c.splitDur * c.miniGap);
  /* 【2026-08-15】以前は「軌道が出きってから左下へ移動」だったので待ちが長かった。
     いま は 出はじめ(moveLead 割)で もう動き出す ＝ 濃くなりながら同時に左下へ流れる */
  const autoEnd = miniAt + c.miniDur * c.moveLead;
  const brake = Math.max(0.3, c.spinBrake);
  /* ドットの時計 S は miniAt 起点。移動が終わってからさらに spinHold 秒たっぷり回してから減速 */
  const brakeStart = (autoEnd - miniAt) + c.moveDur + c.spinHold;
  const namesEnd = brakeStart + brake + 0.1 + (PF_LABELS.length - 1) * 0.14 + T_IN;
  const visTotal = miniAt + namesEnd + 0.2;

  /* 【2026-08-15】開始は「セクションがビューポート中央に来てから」。
     ⚠️ 以前は近づいてくる途中(preP >= 0.5 = 画面に半分入った時点)から
        「Our Vision」と1行目を先出ししていたため、中央に来る前に始まって早く感じた。
        いまは他のセクションと同じく【固定(ピン)された瞬間＝ステージが画面の上下中央に
        収まった瞬間】に再生を始める */
  let A = playT('vision', visTotal, canPlay(p), SECS.vision, p);
  /* 【2026-09-08 ヒデさん指定】静的モバイル: 時間再生を止め、最初から最終状態(メッセージ/図/ポイント
     すべて表示・ドットの回転も停止後)で固定する。A を十分先へ送るとすべての reveal が完了し、
     pat2 の回転も停止状態(pat2K=1)になる。スクロールで動かない。 */
  /* 【2026-09-09 ヒデさん指定】ビジョンの入場(マスク出現→軌道→Point01/02)は PC と同じ時間再生に戻す */

  if (A >= autoEnd && !visAutoDone) visAutoDone = true;

  /* 【2026-08-30 ヒデさん指定】メッセージの「強み」強調は【グラデ揺らぎ(live)】で確定。
     str-live は CSS の常時アニメ(紺⇄ピンクのグラデがゆっくり流れる)。他の案とパネルは削除した。
     ⚠️ 旧 str-go(overflow:visible) は付けない。付けると .vis-line の overflow:hidden が無効になり、
        「下からマスクで出てくる」表現が丸ごと消えていた(実際に起きた)。グラデははみ出さないので不要。 */
  for (const el of [visEls.l1, visEls.l2]) {
    if (!el) continue;
    el.classList.add('str-live');
  }

  /* --- 自動パートが終わったら、続けて軌道が左下へ (同じ時計で動かす) --- */
  const mvT = A < 0 ? -1 : A - autoEnd;
  const S = A < 0 ? -1 : A - miniAt;   /* ドットの時計 */
  /* ⚠️ easeIO は出だしが遅いので、濃くなり終わってからやっと動き出すように見えていた。
     easeSlick はすっと動き出して最後だけ静かに止まるので「濃くなりながら同時に移動」になる */
  /* 位置と拡大は別のカーブにする。同じにすると出だしで一気に大きくなってしまう。
     カーブの組み合わせは調整パネル「軌道の出方」で3パターンから選べる */
  const MP = VIS_MOVES[(params.visMove || 1) - 1];
  const mvRaw = mvT < 0 ? 0 : clamp01(mvT / (c.moveDur * MP.durK));
  const curve = (id, x) => id === 'slick' ? easeSlick(x)
    : id === 'io'   ? easeIO(x)
    : id === 'late' ? easeIO(clamp01((x - 0.28) / 0.72))       /* 後半で動く */
    : id === 'early'? easeOutQ(clamp01(x / 0.62))              /* 前半で終わる */
    : x;
  const mv  = noPin ? 1 : curve(MP.posE, mvRaw);
  const mvS = noPin ? 1 : curve(MP.sclE, mvRaw);
  const ex = noPin ? 0 : (mvT < 0 ? 0 : easeIO(clamp01(mvT / (c.moveDur * 0.6))));
  /* 【2026-08-15】上下に分かれたあと、その場で静止せずに
     「慣性が効いたようにふわーっと」流れ続けながら消える。
     spT = 分かれ始めてからの秒数。drift は指数で減速するので、離れるほど遅くなる */
  const spT = A < 0 ? -1 : A - splitAt;
  const drift = spT <= 0 ? 0 : (1 - Math.exp(-spT / 1.15)) * c.driftAmt;
  const vanish = spT <= 0 ? 0 : easeIO(clamp01((spT - c.splitDur * c.vanishAt) / c.vanishDur));

  /* 上下に分かれる進み具合(既定 splitAmt=0 なので視覚的な分割は起きない)。
     Our Vison / 2行は、これと入れ替わりでその場ブラーで消える */
  const spK = easeOutQ(clamp01((A - splitAt) / c.splitDur));
  /* 【2026-08-25 ヒデさん指定】「Our Vision」は必ずブラーで登場・退場（VIS_REVEALS に依存しない） */
  const blurOnlyLbl = true;
  /* 【2026-08-15】「Our Vison」は上の行が上下に分かれる時にぶつかるので、
     分かれ始める labelOutLead 秒前からブラーで先に消しておく */
  const lblOut = A < 0 ? 0
    : easeIO(clamp01((A - (splitAt - c.labelOutLead)) / Math.max(0.1, c.labelOutDur)));
  /* 【2026-08-25 指定】Our Vision は「先に消える」のをやめ、メッセージ(2行)と同じ
     タイミング(=軌道が左下へ移動し始める ex)で一緒に消す。 */
  /* 【2026-08-26 ヒデさん指定】Our Vision の文字はブラーなし＝フェードのみで出す(blur=0) */
  rv(visEls.label, easeOutQ(clamp01((A - c.labelAt) / c.labelDur)) * (1 - ex),
     0, 0);

  /* 見出し2行: 左寄せで下からトリミング出現(マスク) → その場でブラーで消える (上下分割は廃止) */
  [[visEls.l1, l1At, -1, 0], [visEls.l2, l2At, 1, 1]].forEach(([el, at, dir, idx]) => {
    /* 1文字ずつわずかな時間差で立ち上がる (参考サイトの SplitText と同じ考え方)。
       行の箱は overflow:hidden なので、下から出てくる所はちゃんとマスクされる */
    const raw0 = clamp01((A - at) / c.revealDur);
    const k = easeOutQ(raw0);
    const inner = el.firstElementChild;
    const chars = visEls.chars[idx];
    const n = chars.length;
    const lag = c.charLag;                 // 1文字ぶんの遅れ (行全体の何割か)
    const perChar = lag > 0 && n > 1;

    /* 行まるごと出す場合は内側の箱を動かす。1文字ずつの場合は下の forEach で文字を動かす */
    /* 【2026-08-25 ヒデさん指定】2行は必ず「下から立ち上がるマスク」で登場（overflow:hidden で下からトリミング）。
       rise=下から立ち上がる / blur=その場ブラー のうち rise 固定にする（VIS_REVEALS に依存しない） */
    const blurOnly = false;
    if (perChar) {
      inner.style.transform = ''; inner.style.filter = ''; inner.style.opacity = '';
      const spanIn = Math.max(0.2, 1 - lag);
      chars.forEach((sp, ci) => {
        const ki = easeOutQ(clamp01((raw0 - (ci / (n - 1)) * lag) / spanIn));
        sp.style.transform = blurOnly ? '' : `translateY(${((1 - ki) * 108).toFixed(2)}%)`;
        sp.style.opacity = blurOnly ? ki.toFixed(3) : '';
        sp.style.filter = '';   /* 2026-08-26: ブラーなし(下からのマスクのみで出す) */
      });
    } else {
      inner.style.transform = blurOnly ? '' : `translateY(${((1 - k) * 108).toFixed(2)}%)`;
      inner.style.opacity = blurOnly ? k.toFixed(3) : '';
      inner.style.filter = '';   /* 2026-08-26: ブラーなし */
      if (chars[0] && (chars[0].style.transform || chars[0].style.opacity)) {
        chars.forEach(sp => { sp.style.transform = ''; sp.style.filter = ''; sp.style.opacity = ''; });
      }
    }
    /* 【2026-08-25 指定】メッセージは分割(split/vanish)では消さず、軌道が移動し始めるタイミング(ex)で消す */
    const gone = ex;
    el.style.opacity = ((k > 0 ? 1 : 0) * (1 - gone)).toFixed(3);
    el.style.filter = '';   /* 2026-08-26 ヒデさん指定: 退場もブラーなし(フェードのみ) */
    /* 上下に開く → 止まらずに慣性で流れ続けながら消える */
    const dy = dir * (spK * c.splitAmt + drift);
    el.style.transform = `translate(0px, ${dy.toFixed(2)}px)`;
  });

  /* 軌道グラフィック: 上下に分かれた文字の間に小さくブラー出現(自動) → ワンスクロールで左下へ＋実寸。
     CSSのscaleで拡大するとラスタライズ済みの絵が引き伸ばされて粗くなるため、
     楕円の座標・半径・ドット位置を毎フレーム計算して SVG に反映する (常にシャープ) */
  const mi = easeOutQ(clamp01((A - miniAt) / c.miniDur));  /* no-pinでも時間クロックAで出す=入場前は0(真っ白)→入場でブラー登場 */
  /* 【2026-08-17 指定】ドットは軌道が出たあと、1つずつ順に出てくる。
     以前は軌道が出た時点でもう6個そろっていた。
     ⚠️ A<0（まだ再生していない）ときは 1 に戻す。KV でも同じ SVG を使っているため */
  for (let i = 0; i < dotK.length; i++) {
    dotK[i] = (noPin || A < 0) ? 1
      : easeOutQ(clamp01((A - (miniAt + c.dotsInAt + i * c.dotsInStagger)) / Math.max(0.01, c.dotsInDur)));
  }
  /* 画面幅に合わせて軌道も拡大する。縦にはみ出さない範囲で頭打ちにする */
  /* 【2026-09-09 カンプSP node16534:22627 準拠】スマホの軌道図はデスクトップ版のちょうど 0.488 倍
     (Platform 50px→24.397px / 役割名 14→6.831 / サブ 16→7.807 / 楕円 462×155 / ドット 13.4→6.5)。
     楕円(rx,ry)・文字(.pf-texts の scale)・ドット(scale) はすべて sc で一様に縮むので、
     この1値だけで図全体がカンプ寸法になる。以前は幅基準(390/900=0.43)で図を縮めつつ
     文字だけ CSS で 100px 等に膨らませていたため、カンプと全く違う見た目になっていた。 */
  /* 【2026-09-19 ヒデさん依頼】図は SVG 書き出し(#vfWrap)。グラフィック発火(miniAt)から miniDur でブラー出現するだけ。
     旧図の 楕円の座標計算(kFill/sc/tx/ty)・グラデ軸の追従・ドットの周回(pat2/easeDrive)・Platform 文字 は削除 */
  if (visEls.vfWrap) { rv(visEls.vfWrap, mi, B); vfDraw(elapsed); }   /* 2026-09-19: ドームは毎フレーム描く(ゆっくり回転) */

  /* 【2026-08-29 ヒデさん指定】no-pin は時間再生。グラフィックが出きった時点(miniAt+miniDur)を起点に、そこからディレイで Point01 → Point02 を1つずつ出す。
     【2026-09-19】Platform 文字・役割名・ドット停止後の処理は図の差し替えで削除 */
  const C = noPin ? (A < 0 ? -99 : A - (miniAt + c.miniDur)) : (mvT < 0 ? -99 : mvT - c.moveDur);
  /* ⚠️【2026-08-27】この横ズレは PC(1440座標系)で位置を合わせるためのもの。スマホは 390 の座標系で CSS 側が左右24pxに収めているので効かせない */
  const offX = isMobile ? 0 : 1;
  const P_IN = (c.npPointDur != null ? c.npPointDur : 0.8);   /* 2026-08-31: ポイントの出現時間(パネル) */
  rvAt(visEls.valP1, easeOutQ(clamp01((C - (c.npP1 != null ? c.npP1 : 0.95)) / P_IN)), B, 12, c.p1X * offX, c.p1Y);
  rvAt(visEls.valP2, easeOutQ(clamp01((C - (c.npP2 != null ? c.npP2 : 1.35)) / P_IN)), B, 12, c.p2X * offX, c.p2Y);
}

/* ---------- 実績: 画面に入ったらカウント開始 (時間駆動) ---------- */
const resEls = {
  head: document.getElementById('resHead'),
  hl1: document.getElementById('resHl1'),     // 「事業の推進力を、」フェードイン
  typed: document.getElementById('resTyped'), // 「Anyflow」だけタイピング
  caret: document.getElementById('resCaret'),
  suffix: document.getElementById('resSuffix'), // 「が支えます。」は静的表示(見出し1行目と一緒に出す)
  hl2: document.getElementById('resHl2'),
  slot: document.getElementById('resSlot'),
  ghost: document.getElementById('resGhost'),   // Anyflow の幅を確保＋下線プレースホルダ
  stats: document.getElementById('resStats'), // 3数値グループ
  vals: document.getElementById('resVals'),   // 2つの価値
  hr: document.getElementById('resHr'),       // 区切り線
  dark: document.getElementById('resDark'),
  grow: document.getElementById('resGrow'),
  cntMain: document.getElementById('cntMain'),
  cntSub1: document.getElementById('cntSub1'),
  cntSub2: document.getElementById('cntSub2'),
};
const RES_TYPE_TEXT = 'Anyflow';   /* 2026-08-30 ヒデさん指定: タイピングするのは「Anyflow」だけ。「が支えます。」は静的(resSuffix) */
/* 黒せり上がりで白反転させる「濃い文字」。色付きタグ(for Saas/for AI)は反転しない */
function resInvertEls() {
  return [resEls.hl1, resEls.typed, resEls.suffix,   // 2026-08-30: 「が支えます。」も反転(黒く残らないよう統一)
    ...SECS.results.querySelectorAll('.r2s b'),   // 数字ラベル(導入企業/連携実績/稼働率)
    ...SECS.results.querySelectorAll('.r2s span'),// 数字そのもの
    ...SECS.results.querySelectorAll('.r2v-h'),   // 価値の見出し
    ...SECS.results.querySelectorAll('.r2v-p')];  // 価値の本文
}
/* 【2026-09-08 ヒデさん指定】色付きタグ(for SaaS=ピンク / for AI=濃い青)も暗転で白へフェードさせる。
   濃い青は黒地で読めなくなるため。各ブランド色→白へ k(暗さ)で補間。どの暗転カーブ・どのピクト案でも同じ。 */
function resFadeTags(k) {
  const mix = base => `rgb(${Math.round(base[0] + (255 - base[0]) * k)},${Math.round(base[1] + (255 - base[1]) * k)},${Math.round(base[2] + (255 - base[2]) * k)})`;
  SECS.results.querySelectorAll('.r2v-tag-saas').forEach(el => el.style.color = mix([255, 93, 151]));   /* --brand-pink */
  SECS.results.querySelectorAll('.r2v-tag-ai').forEach(el => el.style.color = mix([14, 68, 151]));       /* --brand-blue-deep */
}
function resClearTags() { SECS.results.querySelectorAll('.r2v-tag').forEach(el => el.style.color = ''); }
let resT0 = null;
let resT = -1;   // 実際に進んだ再生位置(秒)。時間とスクロールの速い方で進み、戻らない

/* 数字の見せ方の変遷:
   ランダム演出 → カウントアップ → スロット → ブラー出現のみ (2026-08-15)
   → スロットを復活 (2026-08-17 指定・Counter Pro のような桁ごとのロール)。
   描画は下の renderSlots() が受け持つ。 */

/* 全部出そろうまでの秒数 (見出しのブラー出現 → 数字 → 下段 まで) */
/* ===== 実績の数字: 桁ごとに縦へ回るスロット =====
   数字は「0 から目的の数字まで、0〜9 を何周か流してから止まる」形で作る。
   桁ごとに少し遅らせて止めるので、左から順に確定していく。 */
const SLOT_TARGETS = [
  ['cntMain', '100+'], ['cntSub1', '20,000+'], ['cntSub2', '200+'],   /* 2026-08-31 カンプ15900:38712 の数値へ */
  ['cntSub3', 'No.1', { min1: true }],   /* 【2026-09-20 ヒデさん依頼】No. は固定・1 だけ 1〜9 でスロット回転 */
];
let slots = [];
let slotBuiltCycles = -1;
/* 数字がビューポートに入った時刻。null = まだ入っていない */
let slotT0 = null;
/* 【2026-09-08】スロット化前の実数字(100+ / 20,000+ / 200+)を控える。静的モバイルで戻す用。
   スクリプトは body 末尾なので DOM は既にあり、buildSlots より前に確定する。 */
const SLOT_ORIG = {
  main: (document.getElementById('cntMain') || {}).textContent,
  sub1: (document.getElementById('cntSub1') || {}).textContent,
  sub2: (document.getElementById('cntSub2') || {}).textContent,
  sub3: (document.getElementById('cntSub3') || {}).textContent,
};

function buildSlots() {
  /* 【2026-09-09 ヒデさん指定】スロットアニメはスマホでも PC と同じに再生する(固定表示は撤回) */
  const cy = Math.max(1, Math.round(params.sections.results.slotCycles));
  if (slotBuiltCycles === cy && slots.length) return;
  slotBuiltCycles = cy;
  slots = [];
  for (const [id, text, opt] of SLOT_TARGETS) {
    const host = document.getElementById(id);
    if (!host) continue;
    host.textContent = '';
    const wrap = document.createElement('i');
    wrap.className = 'slot';
    const reels = [];
    for (const ch of text) {
      if (ch >= '0' && ch <= '9') {
        const rl = document.createElement('i');
        rl.className = 'rl';
        const stp = document.createElement('i');
        stp.className = 'stp';
        /* cy 周ぶんの 0〜9 を並べ、最後に目的の数字を置く */
        const seq = [];
        const lo = (opt && opt.min1) ? 1 : 0;   /* 【2026-09-20】min1: 0 を飛ばし 1〜9 で回す(No.1 用) */
        for (let c = 0; c < cy; c++) for (let d = lo; d < 10; d++) seq.push(d);
        seq.push(Number(ch));
        for (const d of seq) {
          const em = document.createElement('em');
          em.textContent = String(d);
          stp.appendChild(em);
        }
        /* 【2026-09-19 ヒデさん依頼】案4「ドラム」用: 目的の数字の後ろにも次の数字を3つ置く(円筒の下側に見える)。ドラム以外では display:none */
        for (let x = 1; x <= 3; x++) { const em = document.createElement('em'); em.className = 'x'; em.textContent = String((Number(ch) + x) % 10); stp.appendChild(em); }
        rl.appendChild(stp);
        wrap.appendChild(rl);
        reels.push({ rl, stp, len: seq.length, ems: Array.from(stp.children) });
      } else {
        const fx = document.createElement('i');
        fx.className = 'fx';
        fx.textContent = ch;
        wrap.appendChild(fx);
      }
    }
    host.appendChild(wrap);
    slots.push({ host, reels });
  }
}

/* いちばん桁数の多い数字が止まりきるまでの秒数 */
function slotEnd() {
  const c = params.sections.results;
  let maxReels = 1;
  for (const s of slots) maxReels = Math.max(maxReels, s.reels.length);
  return c.slotAt + c.slotDur + (maxReels - 1) * c.slotStagger;
}

/* ts = 数字ブロックが出はじめてからの秒数。マイナスなら先頭(0)で待たせる */
/* 【2026-09-19 ヒデさん依頼「消え方をもっと自然に」】案4 ドラム(円筒): 数字を円筒の面に貼ったように、中心から離れるほど縦に縮み(cosθ)・薄くなる(cosθ^k)。
   帯(.stp)は動かさず、見えている数字(±88°)だけを translateY(R·sinθ − j) scaleY(cosθ) で置く。R = N/(2π) 文字分(N=ドラムの分割数) */
function slotDrumPose(re, e, c) {
  const N = Math.max(8, Math.round(c.slotDrumN || 12)), R = N / (2 * Math.PI), step = 360 / N, kf = (c.slotDrumFade != null ? c.slotDrumFade : 1.3);
  const f = (re.len - 1) * e; re.drum = true; if (re.stp.style.transform) re.stp.style.transform = '';
  const ems = re.ems || (re.ems = Array.from(re.stp.children));
  for (let j = 0; j < ems.length; j++) {
    const th = (j - f) * step, em = ems[j];
    if (Math.abs(th) >= 88) { if (em._v !== false) { em.style.visibility = 'hidden'; em._v = false; } continue; }
    const r = th * Math.PI / 180, cs = Math.cos(r);
    if (em._v !== true) { em.style.visibility = ''; em._v = true; }
    em.style.transform = 'translateY(' + (R * Math.sin(r) - j).toFixed(3) + 'em) scaleY(' + cs.toFixed(3) + ')';
    em.style.opacity = Math.pow(cs, kf).toFixed(3);
  }
}
function slotDrumClear(re) { (re.ems || []).forEach(em => { em.style.transform = ''; em.style.opacity = ''; em.style.visibility = ''; em._v = undefined; }); re.drum = false; }
function renderSlots(ts) {
  const c = params.sections.results;
  const drum = (typeof resSlotFxKey === 'function' && resSlotFxKey() === 'drum');
  for (let si = 0; si < slots.length; si++) {
    const s = slots[si];
    const tsi = Array.isArray(ts) ? (ts[si] != null ? ts[si] : -1) : ts;   /* 案28: 数値ごとの再生位置(配列) */
    s.reels.forEach((re, i) => {
      const k = clamp01((tsi - (c.slotAt + i * c.slotStagger)) / Math.max(0.01, c.slotDur));
      /* 緩急: 1 - (1-k)^n。n が大きいほど「最初は速く、最後はじりじり」になる。
         n=2 でゆるやか / n=5 が既定 / n=9 でかなり粘って止まる。
         ⚠️ easeSlick(臨界減衰) だと全体的に均一で、スロットらしい溜めが出なかった */
      const e = 1 - Math.pow(1 - k, Math.max(1, c.slotEase));
      if (drum) { slotDrumPose(re, e, c); }
      else { if (re.drum) slotDrumClear(re); setStyle(re.stp, 'transform', `translateY(${(-(re.len - 1) * e).toFixed(4)}em)`); }
      if (re.spin !== (k > 0 && k < 1)) { re.spin = (k > 0 && k < 1); re.rl.classList.toggle('spin', re.spin); }   /* 【2026-09-19】案2「ぼかして消える」用: 回っている桁に印 */
      /* ⚠️ 回転中のぼかしは入れない（2026-08-17 に「要らない」で確定）。
         数字はくっきりしたまま回して止める */
    });
  }
}

/* 見出しが出きるまで と 数字が回りきるまで の、遅い方 */
function resTotal() {
  const c = params.sections.results;
  const l1Dur = c.softDur * 0.6;
  const typeStart = c.typeAt + (c.typeGap != null ? c.typeGap : 0.55);
  const typeEnd = typeStart + RES_TYPE_TEXT.length * 0.06;
  const restEnd = typeStart + (c.restGap != null ? c.restGap : 0.1) + c.softDur * 0.8;
  return Math.max(typeEnd, restEnd, slotEnd() + 0.3) + 0.4;
}
/* 中央でピン留めされたら再生。出終わったらスクロールで下のセクションへ抜ける。
   ⚠️ 以前は「時間だけ」で進めていたので、ピンしている間にスクロールしても何も進まず、
      再生が終わってからさらに数画面スクロールしないと下へ抜けられなかった。
      いまは【時間でも進む／スクロールでも進む、速い方を採用】。止まっていても勝手に出てくるし、
      スクロールした分はちゃんと先へ進むので、無駄なスクロールが発生しない。
      max で持つので巻き戻りもしない (リプレイなし) */
let resInvertOn = false;   /* 白反転のインライン color を今かけているか(掃除用) */
let resGrinAnchor = null;  /* 黒オブジェクトを上げ始めるスクロール位置(リビール完了時にセット) */
let grinShown = 0;         /* 黒のせり上がりの“実際の表示量”(時間で目標へ追いつく＝ゆったり) */
let resBlackK = 0;         /* 黒がどれだけ覆ったか(0→1)。dev1 の出現ゲートに共有 */

/* ===== 【2026-09-14 ヒデさん指定・比較検証 v2】実績セクションの演出案 (Codex 1/4/5/6。7・9 は 2026-09-14 に削除) =====
   RESULTS-VISUAL-HANDOFF.md の方針(旧 MOTION-HANDOFF を上書き):
   ・現行(default)を正とし、案は「構図・文字サイズ・図の表示サイズ・列幅・余白・画面占有率・読む区間」だけを変える(CSS の #results.rfx-N)
   ・実績→開発者体験の暗転/白反転(devDarkK 連動)はそのまま。伸ばした尺の終端が既存の入口になる
   ・スクロール管理は frame()→updateResults(p) の既存ループに乗る(別リスナー/別ループは足さない)
   ・時間で出る演出(スロット/見出しのマスク)は「時間でも進む／スクロールでも進む、速い方を採用」(実績の既存方針)。
     案1 は面の移動がスクロール駆動なので、読む区間のスクロールでも進めないと回り切る前に面が流れる(2026-09-14 ヒデさん指摘「切れている」)
   ・スマホ(html.mb)は各案を縦積みで再現(CSS)。縦≤600px は固定案(1/5/6)も縦流れ
   仮置き: 尺(vh)・読む区間の配分は原本値。パネル「固定の長さ」で尺は可変。 */
const RES_FX = {
  default: { vh: 0 },
  '24-4': { vh: 240, mobileFlow: true },   // 【2026-09-17】案24 の要素移動版: ピクトを大きくズームさせずフェード＋移動で終点へ(絵柄が途中で変わって見えない)。CSS は rfx-24 共用
  '26': { vh: 620 },   /* 2026-09-15: 560→620(読む区間を確保) */                     // 数字が大きく→上段の終点→線が伸びる→下段がブラーで→横スクロール(絵コンテ Figma 17283:23622)
  /* 【2026-09-26 整理】完全削除した案(4〜41 のうち 24-4/26 以外)は定義ごと削除 */
};
const RES_FX_KEYS = ['24-4', '26'];
function resFxKey() { const v = params.patterns && params.patterns.resFx; if (RES_FX[v] && !(typeof variantRemovedKey === 'function' && variantRemovedKey('resFx', v))) return v; return (Object.keys(RES_FX).find(k => !variantRemovedKey('resFx', k)) || '24-4'); }   /* 【2026-09-20】既定24-5・フォールバックdefault も完全削除したため、生存案(24-4/26)の先頭へ落とす */
function resFxActive() { return resFxKey(); }   /* SP でも案を出す(MD 6章)。SP の配置は CSS の html.mb #results.rfx-N */
function resFxShort() { return isMobile && (innerHeight || 0) <= 600; }   /* 縦が短い端末: 固定をやめて縦流れ(原本の @media(max-height:600px) 相当) */
function resFxFlowMode(k) { const c = RES_FX[k] || {}; return !!(c.flow || (isMobile && c.mobileFlow) || (resFxShort() && c.vh)); }
function resFxVh(k) {
  const base = RES_FX[k] ? RES_FX[k].vh : 0;
  if (!base) return 0;
  const o = (params.sections && params.sections.results && params.sections.results.rfxVh) || {};
  return o[k] != null ? o[k] : base;
}
/* faceT0: 案1 の SaaS/AI 面ごとの出現クロック(面が着いた時刻)。faceHi/tHi/slotHi: 「速い方を採用」の高水位(巻き戻さない) */
const resFxSt = { key: 'default', faceT0: [null, null], faceHi: [0, 0], tHi: 0, slotHi: 0, valOff: [null, null], chars: [], charsOrig: [], big: [], numDy: 0, headDy: 0, figD: null, statD: null, gate24: false, sents: [], sentsOrig: [], rings: [], slotArr: [-1, -1, -1] };
function resFxEls() {
  const S = SECS.results, q = s => S.querySelector(s), qa = s => [...S.querySelectorAll(s)];
  return { res2: q('.res2'), track: q('.r2v-track'), top: q('.res2-top'), r2v: qa('.r2v'), fig: qa('.r2v-fig'),
    g: qa('.r2v-graphic'), tx: qa('.r2v-text'), hli: qa('.r2v-hli'), tag: qa('.r2v-tag'), p: qa('.r2v-p'), r2s: qa('.r2s') };
}
/* 案が書いたインライン style を掃除(案の切替時)。base(rv)が毎フレーム書く要素は base が上書きするので触らない */
function resFxClear() {
  const E = resFxEls();
  const wipe = (el, props) => { if (el) props.forEach(pr => setStyle(el, pr, '')); };
  wipe(E.res2, ['transform']);
  wipe(E.track, ['transform']);
  wipe(E.top, ['opacity', 'transform', 'pointerEvents']);
  E.r2v.forEach(el => { wipe(el, ['opacity', 'transform', 'pointerEvents']); el.style.removeProperty('--rfx-link'); });
  E.fig.forEach(el => wipe(el, ['transform', 'opacity', 'filter', 'pointerEvents']));
  E.g.forEach(el => wipe(el, ['transform']));
  E.tx.forEach(el => wipe(el, ['opacity', 'transform', 'clipPath', 'pointerEvents']));
  E.hli.forEach(el => wipe(el, ['transform', 'opacity', 'filter']));
  E.tag.forEach(el => wipe(el, ['opacity', 'transform', 'filter', 'fontSize']));   /* fontSize: 案38 のラベル拡大 */
  [...SECS.results.querySelectorAll('.r2v-h')].forEach(el => wipe(el, ['opacity', 'transform']));   /* 案38 */
  E.p.forEach(el => wipe(el, ['opacity', 'transform', 'clipPath', 'filter']));
  E.tx.forEach(el => el.style.removeProperty('--rfx-guide'));
  E.r2s.forEach(el => wipe(el, ['opacity', 'pointerEvents', 'transform']));
  resFxSt.statD = null;
  wipe(resEls.stats, ['borderBottomColor']);
  wipe(resEls.stats, ['transform']);
  wipe(resEls.vals, ['transform']);
  wipe(resEls.hr, ['transform']);
  wipe(resEls.head, ['opacity', 'transform', 'pointerEvents']);
  wipe(resEls.hl1, ['transform']); wipe(resEls.hl2, ['transform']);   /* 案22 の行ごとの寄せ */
  resFxSt.numDy = 0; resFxSt.headDy = 0;
  SECS.results.style.removeProperty('--rfx-line');
  SECS.results.style.removeProperty('--rfx-tag-ink');
  resFxSt.faceT0 = [null, null]; resFxSt.faceHi = [0, 0]; resFxSt.tHi = 0; resFxSt.slotHi = 0;
  resFxSt.valOff = [null, null]; valTOv.saas = null; valTOv.ai = null;   /* 案14 のピクト時計の上書きを解除 */
  resFxRemoveBig();     /* 案20/24 の大見出しを消す */
  resFxSt.figD = null; resFxSt.gate24 = false;
  if (E.res2) { E.res2.style.removeProperty('--rfx-vline'); E.res2.style.removeProperty('--rfx-hr'); }
  { const st = rfxStage(); if (st) setStyle(st, 'marginBottom', ''); }
}
function applyResFx() {
  const k = resFxActive();
  if (resFxSt.key !== k) { resFxClear(); resFxSt.key = k; }
  const flow = resFxFlowMode(k);
  RES_FX_KEYS.forEach(n => SECS.results.classList.toggle('rfx-' + n, k === n));
  SECS.results.classList.toggle('rfx-on', k !== 'default');
  SECS.results.classList.toggle('rfx-24', k === '24-4');   /* 案24-4 は案24 の CSS(配置)を共用 */
  SECS.results.classList.toggle('rfx-pin', !flow && !!resFxVh(k));
  SECS.results.classList.toggle('rfx-flow', flow);
  if (k === '24-4') resFxBuildBig();
}
/* 固定区間の進み: 0=セクション上端が画面上端に着いた / 1=区間の終わり(下端が画面下端)。固定なしの案は 0 */
function resFxPin() {
  const r = rectOf(SECS.results), vh = innerHeight || 1;
  const travel = r.height - vh;
  return travel > 1 ? clamp01(-r.top / travel) : 0;
}
const rfxSmooth = t => t * t * (3 - 2 * t);   /* 原本と同じ smoothstep(easeIO は cubic in-out で保持が強すぎる) */
const rfxRange = (p, a, b) => rfxSmooth(clamp01((p - a) / Math.max(1e-4, b - a)));
/* 「面ごとに止まって読む」横移動。segs=[[動き始め,動き終わり],...]。返り値=いまの面(0〜n-1、途中は小数) */
function rfxHeld(p, segs) { let pos = 0; for (const s of segs) pos += rfxRange(p, s[0], s[1]); return pos; }
/* 【2026-09-26 整理】案1/27/28 専用の「読む区間のスクロールでも進む(速い方を採用)」は案ごと削除。
   生きている案(24-4/26)では元から素通りだったので、再生位置 t / スロット位置 ts はそのまま使う */
function resFxTimeT(t) { return t; }
function resFxSlotTs(ts) { return ts; }
/* 図の「収まった位置」の画面上の中心x。transform を含めないレイアウト値(offsetLeft の連鎖)で取るので、
   拡大・移動中でも所定位置が分かる。trackShift=横に並ぶ面の移動ぶん(案5: 面番号×面の幅) */
function rfxStage() { return SECS.results.querySelector('.pin-stage'); }
/* ステージの表示倍率(--sp)。SP と案12(等倍)は 1 */
function rfxSp() { if (isMobile) return 1; const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sp')); return v > 0 ? v : 1; }
/* ステージ座標(変形前のレイアウト px)での中心。ステージ(.pin-stage)は画面幅いっぱい・固定中は画面の高さなので、その中心＝画面の中央。
   セクションと一緒に動く座標なので、入場中に画面の縁で切れない(2026-09-15 ヒデさん指摘「マスクで出てくる」の根治) */
function rfxCenterX(el, trackShift) { const st = rfxStage(); let x = el.offsetWidth / 2; for (let n = el; n && n !== st; n = n.offsetParent) x += n.offsetLeft; return x - (trackShift || 0); }
function rfxCenterY(el) { const st = rfxStage(); let y = el.offsetHeight / 2; for (let n = el; n && n !== st; n = n.offsetParent) y += n.offsetTop; return y; }
function rfxVW() { const st = rfxStage(); return st ? st.offsetWidth : innerWidth; }
function rfxVH() { const st = rfxStage(); return st ? st.offsetHeight : innerHeight / rfxSp(); }
/* 案14: ピクト(valSaas/valAi)の描画時計の上書き。null=通常(時間) / {fixed:秒}=その時刻で止める(スクロールで進める) /
   {off:秒}=時間 - off で続きを描く(描き切った位相から切れ目なく再開)。drawValueIcons が参照 */
const valTOv = { saas: null, ai: null };
function rfxValT(ov, et) { return ov == null ? et : (ov.fixed != null ? ov.fixed : Math.max(0, et - ov.off)); }
/* ===== 【2026-09-15 ヒデさん指定】「読み飛ばさない・しっかり読ませる」10案(27〜36)の共通部品 ===== */
/* スロットを回し始める位置。案24-4 は終点(下段)が見えてから。それ以外(26)は既定の「数字が 85%H より上に入ったら」 */
function resFxSlotEnter(v) {
  if (resFxSt.key === '24-4') return resFxSt.gate24 ? 0.995 : -1;   /* 案24-4: 数値は終点(下段)が見えてから回す */
  return v;
}
/* ===== 【2026-09-14 ヒデさん指定】主役ピクト系(案6・15〜19): 「数値の訴求 → ピクトのアニメーション」の移行を滑らかに。値はパネル「主役ピクト系の移行」 ===== */
const RFX_HERO_DEF = { introOutAt: 0.19, introOutLen: 0.09, introRise: 60, pictoInAt: 0.22, pictoInLen: 0.10, pictoFrom: 0.7, pictoBlur: 18, heroHold: 0.08, settleLen: 0.42, switchLen: 0.03 };
function rfxHero() { const r = params.sections && params.sections.results; return Object.assign({}, RFX_HERO_DEF, (r && r.hero) || {}); }
/* 案20: 各値の大見出し(「for SaaS」/「for AI」)を .r2v の中央に置く。案を離れたら消す */
function resFxBuildBig() {
  if (resFxSt.big.length) return;
  const E = resFxEls();
  resFxSt.big = E.r2v.map((r2v, i) => {
    const d = document.createElement('div');
    d.className = 'r2v-big' + (i ? ' r2v-big-ai' : '');
    /* 【2026-09-18 ヒデさん依頼】登場の大きい文字は「for SaaS」＋下の行に小さめの「Product」(サイズは --r2v-prod-size) */
    const w = document.createElement('span'); w.className = 'r2v-big-w'; w.textContent = (E.fig[i] && E.fig[i].dataset.tag) || (i ? 'for AI' : 'for SaaS');
    const pr = document.createElement('span'); pr.className = 'r2v-big-prod'; pr.textContent = 'Product';
    d.append(w, pr);
    d.setAttribute('aria-hidden', 'true');
    r2v.appendChild(d);
    return d;
  });
  try { textTools.applyAll(); } catch (e) {}   /* 作った直後に文字システム(太さ等)を当てる */
}
function resFxRemoveBig() { resFxSt.big.forEach(d => d.remove()); resFxSt.big = []; }
/* 【2026-09-18】大きい文字の下の「Product」のサイズ(px)。パネル「案24…：ピクトの大きさと文字の動き」から */
/* ===== 【2026-09-19 ヒデさん依頼】ビジョンの図: 網目のドーム(Figma 18004:38228)を KV のケージと同じ発想でコード描画 =====
   正二十面体の各面を freq 分割した球(freq3=頂点92・辺270。カンプの点89・線261とほぼ同数)を正射影する。
   ゆっくり回転(spin)・傾き(tilt)・奥の線/点ほど薄く。点はブランド色(ピンク/シアン/紺)を一部に、他は薄い青灰(#9DB0C9)。
   値は params.sections.vision.dome(未設定は VF_DEF)。下半球のフェードは容器の mask(applyVfFade)。 */
const VF_DEF = { meshKind: 'geo', fn: 92, r: 262, spin: 0.6, tilt: -14, lineAlpha: 0.85, lineWidth: 1, dot: 2.2, fadeA: 0.42, fadeB: 0.66, freq: 3, scale: 1.15, logoScale: 1, logoDx: 0, logoDy: 0, lineColor: '#5F5F5F', nodeMode: 'alt', levels: 1, pk: 0, variant: 'dome', logoAngle: 0, logoTiltX: 0, bgBlur: 0, bgAlpha: 0, bgW: 1.6, bgH: 2.8, dx: 0, dy: 30, logoOn: 1, mx: 0, my: 0, mz: 0, spinOn: 1, roll: 0, yaw: 0, labelDist: 0.88, labGX: 0, labGY: 0, depthFade: 0, logoStick: 0, logoBackAlpha: 0.3, logoTiltY: 0, logoOpacity: 1, logoShadow: 0, logoPlate: 0, logoVar: 'flat', msx: 1, msy: 1, msz: 1, mpinch: 0 };   /* 【2026-09-21 ヒデさん依頼】メッシュを濃く(lineColor #8C8C8C→#5F5F5F / lineAlpha 0.6→0.85)＋回転を見えるように(spin 0.35→0.6)。既存の保存値(vision.dome/over.visMesh)がこれを隠すため下の移行で剥がす */   /* msx/msy/msz/mpinch=【2026-09-21】メッシュの形状(横/縦/奥のふくらみ・ひし形の尖り)。既定は球(1/1/1/0) */   /* 【2026-09-20 ヒデさん依頼】ロゴは既定で平面(傾き0・変形なし)。傾けたい時だけ下のつまみで */   /* spinOn=回転あり/なし / logo*=ロゴの案(左右の傾き・透明度・影・ガラスの板) */
/* 【2026-09-19 ヒデさん依頼】ロゴの案: 案1=現状 / 3Dのメッシュに馴染ませる新案3つ */
const VF_LOGO_KEYS = ['logoTiltX', 'logoTiltY', 'logoOpacity', 'logoShadow', 'logoPlate', 'logoStick', 'logoBackAlpha'];
/* 【2026-09-26 ヒデさん判断】ロゴの案はノーマル(フラット)だけ。ロゴ追従(球に貼り付いて回る／面に焼き付け)は試した上で撤去。パネルにロゴの案の切替は出さない */
const VIS_LOGOS = [
  { key: 'flat', name: 'ノーマル', fixed: true, tip: 'ロゴはメッシュ中央の上に平面(傾き0)で固定。', cfg: { logoTiltX: 0, logoTiltY: 0, logoOpacity: 1, logoShadow: 0, logoPlate: 0, logoStick: 0 } },
];
function vfLogoKey() { const v = String(vfCfg().logoVar || 'flat'); return (VIS_LOGOS.some(m => m.key === v) && !(typeof variantRemovedKey === 'function' && variantRemovedKey('visLogo', v))) ? v : 'flat'; }
function vfApplyLogoVariant(key) { const m = VIS_LOGOS.find(x => x.key === key); if (!m) return; const v = params.sections.vision; if (!v.dome) v.dome = {}; Object.assign(v.dome, structuredClone(m.cfg)); v.dome.logoVar = key; applyVfFade(); }   /* logoOn=ロゴの表示/非表示(2026-09-19 ヒデさん依頼。非表示なら後ろのぼかしも消す) */   /* dy=図だけの上下(px・Point は動かない。2026-09-19 ヒデさん指定 +30 は仮置き) / bg*=ロゴの後ろの楕円(ぼかし px / 地色の濃さ / 横・縦の広さ=ロゴの何倍)。案3 で使う */   /* 【2026-09-19 ヒデさん指定】ロゴは回さない。logoAngle=平面の角度(°)、logoTiltX=奥行きの傾き(°・メッシュの傾き −14 に合わせた仮置き) */
/* 【2026-09-19 ヒデさん依頼】メッシュの案。案1=ドーム(Figma 18004:38209 の色味: 線 Neutral/400 #A6A6A6・点はピンク/シアン交互・奥ほど薄い4段の濃淡) / 案2=KV のケージをそのまま(測地線球 freq2・線 #6B7690・点 DOT_R×0.52・骨を走る光) */
const VF_VAR_KEYS = ['r', 'spin', 'tilt', 'roll', 'yaw', 'depthFade', 'lineAlpha', 'lineWidth', 'dot', 'freq', 'lineColor', 'nodeMode', 'levels', 'pk', 'bgBlur', 'bgAlpha', 'bgW', 'bgH', 'msx', 'msy', 'msz', 'mpinch'];   /* msx/msy/msz/mpinch=【2026-09-21】メッシュの形状(横長/縦長/ひし形) */
const VIS_MESHES_DOME_CFG = { r: 262, spin: 0.35, tilt: -14, lineAlpha: 0.6, lineWidth: 1, dot: 2.2, freq: 3, lineColor: '#8C8C8C', nodeMode: 'alt', levels: 1, pk: 0, bgBlur: 0, bgAlpha: 0, bgW: 1.6, bgH: 2.8 };   /* 案1 ドームの値(案4 が流用) */
const VIS_MESHES = [
  { key: 'dome', name: '案1 ドーム（Figma 18004:38209 の色味）', fixed: true, tip: '線はニュートラルグレー #A6A6A6、点はブランドのピンク/シアン交互。奥ほど薄い4段の濃淡(線 0.1〜0.5・点 0.2〜1)。頂点92・線270。',
    cfg: { r: 262, spin: 0.35, tilt: -14, lineAlpha: 0.6, lineWidth: 1, dot: 2.2, freq: 3, lineColor: '#8C8C8C', nodeMode: 'alt', levels: 1, pk: 0, bgBlur: 0, bgAlpha: 0, bgW: 1.6, bgH: 2.8 } },
  { key: 'kv', name: '案2 KV のメッシュをそのまま', tip: 'キービジュアルのケージと同じ描き方: 測地線球(頂点42)・線 #6B7690 を奥ほど薄く/細く・点はピンク/シアン交互で手前ほど大きく・骨の上を光(パケット)が走る。半径と回転の速さも KV と同じ比率。',
    cfg: { r: 251, spin: 1.4, tilt: -11, lineAlpha: 0.25, lineWidth: 1.5, dot: 2.9, freq: 2, lineColor: '#6B7690', nodeMode: 'alt', levels: 0, pk: 4, bgBlur: 0, bgAlpha: 0, bgW: 1.6, bgH: 2.8 } },
  /* 【2026-09-19 ヒデさん依頼】案3=案1＋ロゴの後ろをぼかす(楕円の中の網目をぼかし、地色で薄める) */
  { key: 'domeBlur', name: '案3 ブラーあり（ロゴの後ろをぼかす）', tip: '案1 の色味のまま、ロゴの後ろに楕円の領域を置いて中の網目をぼかし、地色で少し薄める。ぼかし・濃さ・広さは下のつまみ。',
    cfg: { r: 262, spin: 0.35, tilt: -14, lineAlpha: 0.6, lineWidth: 1, dot: 2.2, freq: 3, lineColor: '#8C8C8C', nodeMode: 'alt', levels: 1, pk: 0, bgBlur: 10, bgAlpha: 0.55, bgW: 1.6, bgH: 2.8 } },
  /* 【2026-09-19 ヒデさん依頼】案4: 奥側の線・点を薄く(遠近感)。depthFade=奥をどれだけ薄くするか */
  { key: 'domeDepth', name: '案4 奥の線を薄く（遠近感）', tip: '案1 と同じ図で、球の奥側の線と点を薄く・細く(75%減)。手前と奥の差がはっきりして立体に見える。', cfg: Object.assign({}, VIS_MESHES_DOME_CFG, { depthFade: 0.75 }) },
];
function vfVarKey() { const v = String(vfCfg().variant || 'dome'); return (VIS_MESHES.some(m => m.key === v) && !(typeof variantRemovedKey === 'function' && variantRemovedKey('visMesh', v))) ? v : 'dome'; }
function vfApplyVariant(key) { const m = VIS_MESHES.find(x => x.key === key); if (!m) return; const v = params.sections.vision; if (!v.dome) v.dome = {}; Object.assign(v.dome, structuredClone(m.cfg)); v.dome.variant = key; vfMesh = null; applyVfFade(); }   /* scale=メッシュの大きさ(2026-09-19 ヒデさん指定で 1.15・仮置き)。機能名の文字サイズは変えず位置だけ中心から外へ */
const VF_CX = 291, VF_CY = 315;   /* 球の中心(容器座標。カンプ: ケージ(29,49)＋(262,266)) */
/* 【2026-09-21 ヒデさん依頼】PC の機能名5つは「メッシュ中心 VF_CX を軸に左右対称・円弧に沿う」中心アンカー。
   x=水平の中心アンカー(ラベルを中央寄せ＝幅が違っても左右対称) / y=上端アンカー(高さは全ラベル同じなので上端でも対称)。
   ペア(1↔5, 2↔4)は VF_CX=291 を軸に等距離(±262 / ±156)、y は対で同じ＝SDK を頂点に左右へ下る弧。
   ※SP は従来どおり data-x/data-y(カンプ手置き)。この配列は PC のみ差し替える。 */
const VF_LAB_PC = [ { x: 29, y: 105 }, { x: 135, y: 33 }, { x: 291, y: 0 }, { x: 447, y: 33 }, { x: 553, y: 105 } ];
/* 【2026-09-20 ヒデさん依頼・#3 PC/SP独立】ビジョンのメッシュの設定を PC(dome) と SP(domeMb) で分ける。
   描画: SP(isMobile)の時だけ domeMb を dome に重ねる＝PCは domeMb を一切見ない(SPの調整がPCに出ない)。 */
function _vfPhoneOn() { try { return document.documentElement.classList.contains('phone-mode'); } catch (e) { return false; } }
function vfCfg() { const v = params.sections.vision; if (!v.dome) v.dome = {}; const c = Object.assign({}, VF_DEF, v.dome); if ((typeof isMobile !== 'undefined' && isMobile) && v.domeMb) Object.assign(c, v.domeMb); return c; }
/* パネルのつまみの表示用: スマホモード中は SP 上書き(domeMb)を重ねて見せる(PCでいじる値と分ける) */
function vfCfgVal(k) { const v = params.sections.vision; if (_vfPhoneOn() && v.domeMb && v.domeMb[k] != null) return v.domeMb[k]; if (v.dome && v.dome[k] != null) return v.dome[k]; return VF_DEF[k]; }
function vfSet(k, val) { const v = params.sections.vision; if (!v.dome) v.dome = {}; if (_vfPhoneOn()) { if (!v.domeMb) v.domeMb = {}; v.domeMb[k] = val; } else { v.dome[k] = val; } applyVfFade(); }
/* 【2026-09-19 ヒデさん依頼】メッセージの下の余白: 図(ドーム)と Point 01/02 を同じ量だけ下へ(PC。既定 50px は仮置き) */
function applyVisBelow() { const sec = document.getElementById('vision'); if (!sec) return; const v = params.sections.vision; const emphExtra = (typeof visEmphMode === 'function' && visEmphMode() === 'strong' && !(typeof isMobile !== 'undefined' && isMobile)) ? 100 : 0;   /* 【2026-09-20】強調案は見出しメッセージ↔下コンテンツ(図・ポイント)を100px離す(下も連動して下がる)。PC/タブレットのみ */ sec.style.setProperty('--vis-below', ((v.belowGap != null ? v.belowGap : 50) + emphExtra) + 'px'); }
applyVisBelow();
/* 【2026-09-19 ヒデさん依頼】ビジョンの図と Point 01/02 の左右の間隔(PCのみ)。+で Point を右へ(間隔を広げる) */
function applyVisPointsX() { const sec = document.getElementById('vision'); if (!sec) return; const v = params.sections.vision; sec.style.setProperty('--vis-points-x', (v.pointsX != null ? v.pointsX : 0) + 'px'); }
applyVisPointsX();
function applyVfFade() {
  const w = document.getElementById('vfWrap'); if (!w) return; const c = vfCfg(); const sc = (c.scale != null ? c.scale : 1);
  const _mb = (typeof isMobile !== 'undefined' && isMobile);   /* 【2026-09-20】SP は独立した見た目(PCに影響しない) */
  w.style.setProperty('--vf-dy', (c.dy != null ? c.dy : 0) + 'px');   /* セット(網目＋ロゴ＋機能名)の上下 */
  w.style.setProperty('--vf-dx', (c.dx || 0) + 'px');   /* 【2026-09-19 ヒデさん依頼】セットの左右(PCのみ。SPは固定) */
  /* 下のフェード: 容器の高さ(600)に対する割合を、中心基準で拡大して canvas(上 −150)の px に */
  const fy = (f) => (VF_CY + (c.my || 0) + (f * 600 - VF_CY) * sc + 150).toFixed(1) + 'px';   /* 網目を上下にずらしたらフェードも一緒に */
  w.style.setProperty('--vf-fade-a', fy(c.fadeA)); w.style.setProperty('--vf-fade-b', fy(Math.max(c.fadeA + 0.02, c.fadeB)));
  /* 機能名: 文字サイズはそのまま、位置だけ中心から外へ */
  const ld = _mb ? 0.64 : (c.labelDist != null ? c.labelDist : 1);   /* 【2026-09-20 #5】SP は機能名を球の縁(円周)に沿わせる。【2026-09-21 ヒデさん依頼】もっと内側へ(0.72→0.64＝実行エンジンが右端で切れないように) */
  const _lo = c.labOff || [];   /* 【2026-09-20 ヒデさん依頼】機能名の 全体(labGX/labGY)＋個別(labOff[i]) 位置移動 */
  const _mbLabGY = _mb ? (c.mbLabGY != null ? c.mbLabGY : -120) : 0;   /* 【2026-09-21 ヒデさん依頼】SP のみ機能名セットを矢印(SDK上面が矢印先端)まで上げる。-38→-120(内部scale0.56で画面約-67px＝メッセージ直下)。位置移動はSPのみ・PCには持ち上げを入れない＝PC/SP独立 */
  const _mbLabGX = _mb ? [-76, -32, 0, 32, 76] : null;   /* 【2026-09-21 ヒデさん依頼】SPのみ: 左右の機能名をメッシュに重ならないよう外へ。index=[コネクタ,認証ウィザード,SDK,ワークフロー,実行エンジン]。−=左/＋=右・SDKは中央維持。local値(画面では×0.50)。各高さでの球の幅を実測して重ならない量に。PCは null(不変) */
  /* 【2026-09-21 ヒデさん依頼】位置移動はSPのみ・普通のスケール(画面px)で。PCは元のまま(縮小座標・持ち上げなし)＝PC/SP独立。
     SPは #vfWrap が pin-stage で縮小(scale)されるので、手動offset(全機能X/Y・個別labOff・SP持ち上げ)に 1/scale を掛けて
     「値=実際の画面移動px」に換算する。PCは _invSp=1(従来どおり・連動させない)。 */
  let _invSp = 1;
  if (_mb) { try { const _st = w.closest && w.closest('.pin-stage'); if (_st) { const _m = new DOMMatrixReadOnly(getComputedStyle(_st).transform); if (_m && _m.a > 0) _invSp = 1 / _m.a; } } catch (e) {} }
  w.querySelectorAll('.vf-lab').forEach((el, i) => {
    const _a = VF_LAB_PC[i] ? VF_LAB_PC[i] : null;   /* 【2026-09-21】PC/SP とも左右対称の弧アンカー(中心 VF_CX 基準)。SP も PC 同様に線対称(ヒデさん依頼)。SPは sc*ld で内側へ縮んで収まる */
    const x = _a ? _a.x : +el.dataset.x, y = _a ? _a.y : +el.dataset.y;
    const o = _lo[i] || 0, ox = o ? (o.x || 0) : 0, oy = o ? (o.y || 0) : 0;
    const mgx = _mbLabGX ? (_mbLabGX[i] || 0) : 0;   /* 【2026-09-21】SPのみ per-label 横移動(メッシュ回避) */
    let lx = VF_CX + (x - VF_CX) * sc * ld + ((c.labGX || 0) + ox + mgx) * _invSp;
    const ly = VF_CY + (y - VF_CY) * sc * ld + ((c.labGY || 0) + _mbLabGY + oy) * _invSp;
    if (_a || _mb) { lx -= el.offsetWidth / 2; }   /* 【2026-09-21】PC/SP とも中心アンカーは幅の半分だけ左へ＝幅が違っても左右対称・円周に沿う */
    el.style.left = lx.toFixed(1) + 'px';
    el.style.top = ly.toFixed(1) + 'px';
  });
  /* ロゴ: 網目の一部として一緒に拡大(カンプ: 127,288 / 204×37) */
  const logoOn = !(c.logoOn === 0 || c.logoOn === false);
  const lg = w.querySelector('.vf-logo'); if (lg) { lg.style.display = logoOn ? '' : 'none'; const ls = sc * (c.logoScale != null ? c.logoScale : 1); const lw = 204 * ls, lh = 37 * ls; let lcx = VF_CX + (c.logoDx || 0), lcy = VF_CY + (c.logoDy || 0) - 50; if (_mb) { lcy = VF_CY + (c.logoDy || 0) - 80; }   /* 【2026-09-20 ヒデさん依頼】ロゴはメッシュのど真ん中より上に(独立)。【2026-09-21 ヒデさん依頼】SPはもう少し上へ(-72→-80) */ lg.style.left = (lcx - lw / 2).toFixed(1) + 'px'; lg.style.top = (lcy - lh / 2).toFixed(1) + 'px'; lg.style.width = lw.toFixed(1) + 'px'; lg.style.height = lh.toFixed(1) + 'px';
    const ang = (c.logoAngle || 0), tx = (c.logoTiltX != null ? c.logoTiltX : 0), ty = (c.logoTiltY || 0); lg.style.transformOrigin = '50% 50%';
    const tf3 = '';   /* 【2026-09-20 ヒデさん依頼】ロゴはヘッダーのロゴと同じく常にフラット(傾き0)・メッシュの角度から独立。傾き系(logoTiltX/Y・角度)は無視する。 */ lg.style.transform = tf3;
    lg.style.opacity = (c.logoOpacity != null ? c.logoOpacity : 1).toFixed(3);
    const sh = (c.logoShadow || 0); lg.style.filter = sh > 0.05 ? 'drop-shadow(0 ' + (sh * 0.7).toFixed(1) + 'px ' + sh.toFixed(1) + 'px rgba(16,24,40,.22))' : '';
    /* 案4 ガラスの板: ロゴより一回り大きく、同じ傾き */
    const pl = w.querySelector('.vf-logo-plate'); if (pl) { const on = logoOn && !!c.logoPlate; pl.classList.toggle('is-on', on); if (on) { const px = lw * 0.14, py = lh * 0.7; pl.style.left = (lcx - lw / 2 - px).toFixed(1) + 'px'; pl.style.top = (lcy - lh / 2 - py).toFixed(1) + 'px'; pl.style.width = (lw + px * 2).toFixed(1) + 'px'; pl.style.height = (lh + py * 2).toFixed(1) + 'px'; pl.style.transformOrigin = '50% 50%'; pl.style.transform = tf3; } }
    /* ロゴの後ろの楕円(案3): ロゴの中心に、横 bgW 倍・縦 bgH 倍 */
    const bg = w.querySelector('.vf-logo-bg'); if (bg) { const on = logoOn && ((c.bgBlur || 0) > 0.05 || (c.bgAlpha || 0) > 0.005); bg.classList.toggle('is-on', on); if (on) { const bw = lw * (c.bgW != null ? c.bgW : 1.6), bh = lh * (c.bgH != null ? c.bgH : 2.8); bg.style.left = (lcx - bw / 2).toFixed(1) + 'px'; bg.style.top = (lcy - bh / 2).toFixed(1) + 'px'; bg.style.width = bw.toFixed(1) + 'px'; bg.style.height = bh.toFixed(1) + 'px'; bg.style.setProperty('--vfbg-blur', (c.bgBlur || 0).toFixed(1) + 'px'); bg.style.setProperty('--vfbg-a', (c.bgAlpha || 0).toFixed(3)); } } }   /* ロゴ: 中心基準で大きさ(logoScale)・ずらし(logoDx/Dy)・角度(logoAngle)・奥行きの傾き(logoTiltX) */
}
function vfBuild(f) {
  const t = (1 + Math.sqrt(5)) / 2, nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  /* 【2026-09-19 ヒデさん指摘「軸が揺れて見える」】素の正二十面体は頂点(極)が Y 軸からずれているので、Y で回すと模様が転がって見えた。
     頂点 (0,1,t) が真上(0,1,0)に来るよう X 軸まわりに −58.28° 回して、5本の線が集まる極を回転軸に置く */
  const th = -Math.atan2(t, 1), cth = Math.cos(th), sth = Math.sin(th);
  const base = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(nrm).map(v => [v[0], v[1] * cth - v[2] * sth, v[1] * sth + v[2] * cth]);
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const verts = [], idx = new Map(); const key = (v) => v.map(x => x.toFixed(4)).join(',');
  const add = (v) => { const k = key(v); if (idx.has(k)) return idx.get(k); verts.push(v); idx.set(k, verts.length - 1); return verts.length - 1; };
  const edges = new Set(); const E = (a, b) => edges.add(a < b ? a * 65536 + b : b * 65536 + a);
  for (const [ia, ib, ic] of faces) {
    const A = base[ia], B = base[ib], C = base[ic]; const grid = [];
    for (let i = 0; i <= f; i++) { grid[i] = []; for (let j = 0; j <= f - i; j++) { const u = i / f, w = j / f; grid[i][j] = add(nrm([A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * w, A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * w, A[2] + (B[2] - A[2]) * u + (C[2] - A[2]) * w])); } }
    for (let i = 0; i < f; i++) for (let j = 0; j < f - i; j++) { E(grid[i][j], grid[i + 1][j]); E(grid[i][j], grid[i][j + 1]); E(grid[i + 1][j], grid[i][j + 1]); }
  }
  return { verts, edges: Array.from(edges).map(k => [Math.floor(k / 65536), k % 65536]) };
}
let vfMesh = null, vfMeshFreq = 0, vfPk = [], vfPkNext = 0, vfLastT = null;
function vfRgb(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); const v = parseInt(m ? m[1] : 'a6a6a6', 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255].join(','); }
const VF_LV_LINE = [0.2, 0.4, 0.6, 1.0], VF_LV_NODE = [0.2, 0.4, 0.7, 1.0];   /* 4段の濃淡(奥→手前)。カンプの opacity 分布に合わせた */
function vfDraw(tSec) {
  const cv = document.getElementById('vfDome'); if (!cv) return;
  const sec = SECS && SECS.vision; if (sec) { const r = sec.getBoundingClientRect(); if (r.bottom < -50 || r.top > (window.innerHeight || 1) + 50) return; }   /* 画面外では描かない */
  const c = vfCfg(); const f = Math.max(1, Math.min(4, Math.round(c.freq)));
  const _fibo = c.meshKind === 'fibo', _fn = Math.max(12, Math.min(400, Math.round(c.fn || 92)));   /* 【2026-09-25 ヒデさん依頼】形=散らばり(三角網・点を1個ずつ)。KVとは別の値 */
  const _mkey = _fibo ? 'f' + _fn : 'g' + f;
  if (!vfMesh || vfMeshFreq !== _mkey) { vfMesh = _fibo ? sphereFiboHull(_fn) : vfBuild(f); vfMeshFreq = _mkey; }
  const W = 900, H = 900, dpr = Math.min((typeof isMobile !== 'undefined' && isMobile) ? 1.5 : 2, window.devicePixelRatio || 1);   /* 【2026-09-21 ヒデさん依頼・SP軽量化】スマホはドームcanvasの解像度を2→1.5に(座標系はdprでスケール＝見た目ほぼ同じ・約44%省ピクセル) */
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const cx = VF_CX + 150 + (c.mx || 0), cy = VF_CY + 150 + (c.my || 0), R = c.r * (c.scale != null ? c.scale : 1) * (1 + (c.mz || 0) / 100);   /* canvas は容器の(−150,−150)から。半径×メッシュの大きさ。mx/my/mz=【2026-09-19】網目だけの XYZ ずらし(Z は %) */
  const spinOn = !(c.spinOn === 0 || c.spinOn === false);   /* 回転 あり/なし(速さの値は保持) */
  const a = (spinOn ? tSec : 0) * c.spin * 0.12 + (c.yaw || 0) * Math.PI / 180, tl = c.tilt * Math.PI / 180, rl = (c.roll || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tl), st = Math.sin(tl), cr = Math.cos(rl), sr = Math.sin(rl);   /* yaw=向きのずらし / roll=左右の傾き【2026-09-19】 */
  /* 【2026-09-21 ヒデさん依頼】メッシュの形状(丸み/横長/ひし形/縦長)。頂点をワープしてから回転・投影する。
     msx/msy/msz=XYZの伸縮、mpinch=中心をふくらませ極を尖らせる(ひし形) */
  const _msx = c.msx != null ? c.msx : 1, _msy = c.msy != null ? c.msy : 1, _msz = c.msz != null ? c.msz : 1, _mpinch = c.mpinch || 0;
  const P = vfMesh.verts.map(v => {
    let wx = v[0], wy = v[1], wz = v[2];
    if (_mpinch) { const k = 1 - _mpinch * Math.abs(wy); wx *= k; wz *= k; }   /* 赤道は太く極は細く=ひし形シルエット */
    wx *= _msx; wy *= _msy; wz *= _msz;
    const x1 = wx * ca + wz * sa, z1 = -wx * sa + wz * ca; const y2 = wy * ct - z1 * st, z2 = wy * st + z1 * ct; const x3 = x1 * cr - y2 * sr, y3 = x1 * sr + y2 * cr; return [cx + x3 * R, cy - y3 * R, (z2 + 1) / 2];
  });
  /* 【2026-09-19 ヒデさん依頼】案5: ロゴを球の表面に貼って網目と一緒に回す。貼る点＝今のロゴ中心を球の手前側に投影した点。向きは面の法線(回転→傾き→左右の傾きを網目と同じ順で) */
  if (false && c.logoStick && !(c.logoOn === 0 || c.logoOn === false)) { const lg = document.getElementById('vfLogo'); if (lg) {   /* 【2026-09-20 ヒデさん依頼】ロゴは独立フラット化のため、球に貼り付いて回る(案5)処理は無効化 */
    const sc = (c.scale != null ? c.scale : 1); const ls = sc * (c.logoScale != null ? c.logoScale : 1); const lw = 204 * ls, lh = 37 * ls;
    const ux = ((127 + 102 - VF_CX) * sc + (c.logoDx || 0)) / R, uy = -((288 + 18.5 - VF_CY) * sc + (c.logoDy || 0)) / R;
    const n0 = Math.hypot(ux, uy), rr = Math.min(0.9, n0); const x0 = n0 > 1e-6 ? ux / n0 * rr : 0, y0 = n0 > 1e-6 ? uy / n0 * rr : 0, z0 = Math.sqrt(Math.max(0, 1 - x0 * x0 - y0 * y0));
    const az0 = Math.atan2(x0, z0), el0 = Math.asin(Math.max(-1, Math.min(1, y0)));
    const x1 = x0 * ca + z0 * sa, z1 = -x0 * sa + z0 * ca; const y2 = y0 * ct - z1 * st, z2 = y0 * st + z1 * ct; const x3 = x1 * cr - y2 * sr, y3 = x1 * sr + y2 * cr;
    const px = (cx - 150) + x3 * R, py = (cy - 150) - y3 * R;
    lg.style.left = (px - lw / 2).toFixed(1) + 'px'; lg.style.top = (py - lh / 2).toFixed(1) + 'px';
    const D = 180 / Math.PI; lg.style.transform = 'perspective(900px) rotateZ(' + (-(c.roll || 0) + (c.logoAngle || 0)).toFixed(2) + 'deg) rotateX(' + (-c.tilt).toFixed(2) + 'deg) rotateY(' + ((a + az0) * D).toFixed(2) + 'deg) rotateX(' + (el0 * D).toFixed(2) + 'deg)';
    const back = (c.logoBackAlpha != null ? c.logoBackAlpha : 0.3), t = Math.max(0, Math.min(1, (z2 + 0.15) / 0.3));   /* 縁(±0.15)でなめらかに裏側の濃さへ */
    lg.style.opacity = ((c.logoOpacity != null ? c.logoOpacity : 1) * (back + (1 - back) * t)).toFixed(3); } }
  g.lineCap = 'round';
  const lc = vfRgb(c.lineColor || '#A6A6A6'), lw = (c.lineWidth != null ? c.lineWidth : 1), quant = (c.levels == null ? 1 : c.levels) > 0.5;
  const bin = (k) => Math.min(3, Math.floor(k * 4));
  const df = c.depthFade || 0;   /* 【2026-09-19】案4: 奥(k→0)ほど薄く・細く */
  for (const [i, j] of vfMesh.edges) { const A = P[i], B = P[j]; const k = (A[2] + B[2]) / 2;
    const al = quant ? c.lineAlpha * VF_LV_LINE[bin(k)] : c.lineAlpha * (0.42 + 0.58 * k);   /* 案1=4段 / 案2(KV)=連続 */
    g.strokeStyle = 'rgba(' + lc + ',' + (al * (1 - df * (1 - k))).toFixed(3) + ')'; g.lineWidth = (quant ? (k > 0.5 ? lw : lw * 0.7) : lw * (0.7 + 0.3 * k)) * (1 - 0.5 * df * (1 - k)); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); }
  const PINK = '255,93,151', CYAN = '14,187,255', NAVY = '14,68,151', PALE = '157,176,201';
  for (let i = 0; i < P.length; i++) { const [x, y, k] = P[i]; let col, al, rad;
    if ((c.nodeMode || 'alt') === 'alt') { col = (i % 2) ? PINK : CYAN; if (quant) { al = VF_LV_NODE[bin(k)]; rad = c.dot * (0.55 + 0.45 * k); } else { const dep = 0.72 + 0.5 * k; al = 0.5 + 0.5 * dep; rad = c.dot * dep; } }
    else { const h = ((i + 1) * 2654435761 % 4294967296) / 4294967296; col = h < 0.12 ? PINK : h < 0.24 ? CYAN : h < 0.28 ? NAVY : PALE; al = (col === PALE) ? (0.3 + 0.45 * k) : (0.45 + 0.55 * k); rad = c.dot * (0.55 + 0.45 * k); }
    g.fillStyle = 'rgba(' + col + ',' + (al * (1 - df * (1 - k))).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, rad * (1 - 0.35 * df * (1 - k)), 0, Math.PI * 2); g.fill(); }
  /* パケット(骨の上を走る光。案2=KV と同じ発想。pk=1秒あたりの数) */
  const dt = vfLastT == null ? 0 : Math.min(0.1, Math.max(0, tSec - vfLastT)); vfLastT = tSec;
  if ((c.pk || 0) > 0) { vfPkNext -= dt; if (vfPkNext <= 0 && vfPk.length < 14) { vfPkNext = 1 / c.pk; const e = vfMesh.edges[(Math.random() * vfMesh.edges.length) | 0]; vfPk.push({ a: e[0], b: e[1], k: 0, dur: 0.7 + Math.random() * 0.5 }); } } else vfPk.length = 0;
  for (let i = vfPk.length - 1; i >= 0; i--) { const q = vfPk[i]; q.k += dt / q.dur; if (q.k >= 1) { vfPk.splice(i, 1); continue; } const A = P[q.a], B = P[q.b]; if (!A || !B) { vfPk.splice(i, 1); continue; } const x = A[0] + (B[0] - A[0]) * q.k, y = A[1] + (B[1] - A[1]) * q.k, k = A[2] + (B[2] - A[2]) * q.k; const fade = Math.sin(q.k * Math.PI);
    g.fillStyle = 'rgba(' + ((q.a % 2) ? PINK : CYAN) + ',' + ((0.35 + 0.5 * k) * (1 - df * (1 - k))).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, c.dot * (0.9 + 0.6 * k) * (0.6 + 0.4 * fade), 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,' + (0.5 * fade).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, c.dot * 0.45, 0, Math.PI * 2); g.fill(); }
}
applyVfFade();
/* 【2026-09-21 ヒデさん依頼】実績ピクトの表示サイズ。#results に --r2v-disp を設定→ .r2v-graphic の zoom に反映。
   params.sections.results.pictoDisp は mbKey でPC/SP独立(SPは applyMbToParams が SP値を流し込む)。 */
function applyPictoDisp() { try { const r = (params.sections && params.sections.results) || {}; const el = document.getElementById('results'); if (el) el.style.setProperty('--r2v-disp', (r.pictoDisp != null ? r.pictoDisp : 1)); } catch (e) {} }
/* 【2026-09-21 ヒデさん依頼】スマホの実績の縦余白(各ブロック↔区切り線)。#results に --r2v-sp-gap を設定→ SP の .res2 の gap に反映。 */
function applyResSpGap() { try { const r = (params.sections && params.sections.results) || {}; const el = document.getElementById('results'); if (el) el.style.setProperty('--r2v-sp-gap', (r.spGap != null ? r.spGap : 16) + 'px'); } catch (e) {} }
function applyResSlotFade() { const r = (params.sections && params.sections.results) || {}; const d = document.documentElement.style; d.setProperty('--slot-fade', (r.slotFade != null ? r.slotFade : 14) + '%');
  /* 【2026-09-19 ヒデさん依頼】スロットの案: 案2 はぼかし・範囲・窓の高さも */
  d.setProperty('--slot-blur', (r.slotBlur != null ? r.slotBlur : 0) + 'px'); d.setProperty('--slot-blur-zone', (r.slotBlurZone != null ? r.slotBlurZone : 45) + '%'); d.setProperty('--slot-win-n', String(r.slotWin != null ? r.slotWin : 1.6)); d.setProperty('--slot-ramp', String(r.slotRamp != null ? r.slotRamp : 1));
  const sec = document.getElementById('results'); if (sec) { sec.classList.toggle('slot-fx-blur', resSlotFxKey() !== 'plain'); sec.classList.toggle('slot-fx-drum', resSlotFxKey() === 'drum'); } }
/* 【2026-09-19 ヒデさん依頼】数字のスロットの案(案1=現状 / 案2=上下のマスクにぼかしをかけて徐々に消える)。値は仮置き */
const RES_SLOT_KEYS = ['slotFade', 'slotBlur', 'slotBlurZone', 'slotWin', 'slotRamp', 'slotDrumN', 'slotDrumFade'];
const RES_SLOT_FX = [
  { key: 'plain', name: '案1 現状（上下をうすく消す）', fixed: true, tip: '窓の上下 14% をグラデで消すだけ。ぼかし無し。', cfg: { slotFade: 14, slotBlur: 0, slotBlurZone: 45, slotWin: 1.6, slotRamp: 1 } },
  { key: 'blur',  name: '案2 なめらかに溶ける', tip: '回っている桁だけ窓を 1.6 文字分に開き、端ほどゆっくり薄くなる曲線で消す＋端に弱いぼかし(2.5px)。止まると窓が 0.4 秒で閉じる(切り替わりの段差なし)。', cfg: { slotFade: 14, slotBlur: 2.5, slotBlurZone: 45, slotWin: 1.6, slotRamp: 1 } },
  { key: 'melt',  name: '案3 さらに長く溶ける', tip: '案2 より窓を高く(2.0 文字分)、消える帯も長め(×1.15)、ぼかしは弱め(2px)。前後の数字が長い距離をかけて消える。', cfg: { slotFade: 14, slotBlur: 2, slotBlurZone: 55, slotWin: 2.0, slotRamp: 1.15 } },
  { key: 'drum',  name: '案4 ドラム（円筒に貼った数字）', tip: '数字を円筒の面に貼ったように回す。中心から離れるほど縦に縮んで薄くなるので、端で自然に消える(ぼかし無し)。回っている間は窓を 1.7 文字分に開き(上のラベルに重ならない範囲)、止まると閉じる。', cfg: { slotFade: 14, slotBlur: 0, slotBlurZone: 45, slotWin: 1.7, slotRamp: 0.8, slotDrumN: 12, slotDrumFade: 1.3 } },
];
function resSlotFxKey() { const r = (params.sections && params.sections.results) || {}; const v = String(r.slotFx || 'plain'); return (RES_SLOT_FX.some(m => m.key === v) && !(typeof variantRemovedKey === 'function' && variantRemovedKey('resSlotFx', v))) ? v : 'plain'; }
function resApplySlotFx(key) { const m = RES_SLOT_FX.find(x => x.key === key); if (!m) return; const r = params.sections.results; Object.assign(r, structuredClone(m.cfg)); r.slotFx = key; applyResSlotFade(); }
applyResSlotFade();
applyPictoDisp();   /* 【2026-09-21】起動時にピクト表示サイズを反映 */
applyResSpGap();    /* 【2026-09-21】起動時にスマホの実績の縦余白を反映 */
/* 【2026-09-19 ヒデさん依頼】セクション見出しの「ラベル→見出し」の間隔(Our Vision / Use Case / Contact / Strength)。既定 6px は仮置き */
/* 【2026-09-19 ヒデさん依頼】ビジョン→実績の空白を詰める量(px)。既定 200 は仮置き */
function applyVisResPull() { document.documentElement.style.setProperty('--vis-res-pull', (params.visResPull != null ? params.visResPull : 200) + 'px'); }
applyVisResPull();
function applySecHeadGap() { document.documentElement.style.setProperty('--sec-head-gap', (params.secHeadGap != null ? params.secHeadGap : 6) + 'px'); }
applySecHeadGap();
function applyResProd() { const f = (params.sections && params.sections.results && params.sections.results.fx24) || {}; document.documentElement.style.setProperty('--r2v-prod-size', (f.prodSize != null ? f.prodSize : 38) + 'px'); }
applyResProd();
/* 毎フレーム(updateResults から)。t=入場リビールの再生位置(秒・マイナスは未再生)。 */
function resFxFrame(t) {
  const k = resFxSt.key;
  if (k === 'default') return;
  const E = resFxEls();
  const on = t >= 0;
  const dark = devDarkK;   /* 暗転(白反転)の度合い。案が足した線・ラベルもこれに同期 */
  const vis = (el, v) => { if (!el) return; setStyle(el, 'opacity', v.toFixed(3)); setStyle(el, 'pointerEvents', v < 0.02 ? 'none' : ''); };
  const tf = (el, v) => { if (el) setStyle(el, 'transform', v); };
  /* 案が足した罫線/ラベルの色を既存の白反転と同じ式で同期 */
  if (dark > 0.002) {
    const w = b => Math.round(b + (255 - b) * dark);
    SECS.results.style.setProperty('--rfx-line', `rgba(${w(172)},${w(172)},${w(172)},${(0.6 + 0.4 * dark).toFixed(2)})`);
    SECS.results.style.setProperty('--rfx-tag-ink', `rgb(${w(30)},${w(34)},${w(42)})`);
  } else {
    SECS.results.style.removeProperty('--rfx-line');
    SECS.results.style.removeProperty('--rfx-tag-ink');
  }
  /* 縦が短い端末(SP・高さ600px以下)は固定案(26)を縦流れにする＝面の移動や場面切替は行わない(CSS が全面を積む) */
  if (k === '26' && resFxShort()) { valTOv.saas = null; valTOv.ai = null; return; }   /* 【2026-09-26 整理】元は固定案の一覧(生きているのは26だけ。24-4 は入っていない) */

  if (k === '24-4') {
    /* 【2026-09-20 ヒデさん依頼】固定(スクロール停止)しない案(flow)の時は、最初から完成した状態(進み=1)で見せて普通に流す */
    const p = resFxFlowMode(k) ? 1 : resFxPin(), H = rfxHero(), vh = rfxVH();
    const F = Object.assign({ labelUp: 190 }, (params.sections.results.fx24 || {}));
    /* 【案24-4 要素移動版】(2026-09-17 ヒデさん指定) ピクトを大きくズームさせず(ほぼ最終サイズのまま)、フェード＋位置移動だけで終点へ運ぶ＝
       「途中で別の絵柄に切り替わって見える」印象を消す。絵(SVG)は同じまま、要素の移動で補完する。
       元になった案24(絵コンテ Figma 17271:23392): Vision から続けて「for SaaS」「for AI」(70px)が左右に並ぶ → 文字は小さく上へ・各列の中央にピクト →
       終点: 上に説明(ラベル20/見出し46/本文14・幅530)、下にピクト(300)。横罫線の下に見出し(40px・2行)と数値(70px・スロットはここで回る)。パネル「案24」
       【2026-09-26 整理】兄弟案(24/24-2/24-3/24-5)は完全削除済みなので、24-4 の区間と分岐だけ残した(値は元のまま) */
    const L2 = rfxRange(p, 0.03, 0.30), P1 = rfxRange(p, 0.10, 0.44), D = rfxRange(p, 0.20, 0.78);
    const TK = rfxRange(D, 0.45, 1), B = rfxRange(p, 0.58, 0.92), HR = rfxRange(p, 0.50, 0.74);
    resFxSt.gate24 = on && B > 0.05;
    E.res2.style.setProperty('--rfx-vline', P1.toFixed(3));
    E.res2.style.setProperty('--rfx-hr', HR.toFixed(3));
    vis(E.top, on ? B : 0);
    tf(E.top, `translateY(${((1 - B) * 24).toFixed(2)}px)`);
    E.r2v.forEach((el, i) => {
      vis(el, on ? 1 : 0);
      const big = resFxSt.big[i], fig = E.fig[i], tx = E.tx[i];
      /* 【2026-09-19 ヒデさん依頼・修正】入場のぼかしと出だしの高さは 24 系(24/24-2/24-3/24-4/24-5)の共通処理。
         ⚠️ 最初は 24-5 の分岐にだけ入れていて、ヒデさんの保存値(24-4)では動かなかった(Chrome 本体で実測して判明) */
      /* 【2026-09-19 ヒデさん依頼】入場のぼかし: セクションが画面下から入ってくる進み具合(preP: 0=下端に顔を出す/1=所定の位置)に連動して、
         ぼけ→くっきり。文字が画面下端に出るのは pre≒0.5 なので既定は 0.5→0.95 で解ける。所定の位置に着いたら(pre=1)効かない。実績タブ「入場のぼかし」 */
      const rc = params.sections.results; const ePre = preP(SECS.results);
      const eFrom = (rc.entryFrom != null ? rc.entryFrom : 0.4), eTo = Math.max(eFrom + 0.05, rc.entryTo != null ? rc.entryTo : 0.95);
      const ek0 = clamp01((ePre - eFrom) / (eTo - eFrom)); const ek = ek0 * ek0 * (3 - 2 * ek0);
      /* 【2026-09-19 ヒデさん指定】24-4 は強めのぼかし(entryBlur44) */
      const eStrength = rc.entryBlur44 != null ? rc.entryBlur44 : 26;
      const eBlur = eStrength * (1 - ek); const eOp0 = (rc.entryOp != null ? rc.entryOp : 1); const eOp = eOp0 + (1 - eOp0) * ek;
      /* 【2026-09-19 ヒデさん依頼】出だしの高さ: 画面の何割の位置に文字の中心を置くか(既定 0.4=少し上。0.5=ど真ん中)。ビジョンとの空白を詰めるため。実績タブ「入場のぼかし」の「出だしの高さ」 */
      const bsY = (params.sections.results.bigStartY != null ? params.sections.results.bigStartY : 0.4);
      if (big) {
        const base = isMobile ? 0 : (vh * bsY) - rfxCenterY(el);   /* p=0 は画面の bsY(出だしの高さ・既定0.4)の位置に。ステージ座標なので入場中も一緒に上がってくる(SP は列の中央) */
        const sc = 1 - (1 - 40 / 70) * L2;
        const o = (on ? 1 : 0) * (1 - rfxRange(D, 0, 0.5)) * eOp;
        setStyle(big, 'opacity', o.toFixed(3));
        setStyle(big, 'filter', eBlur > 0.05 ? `blur(${eBlur.toFixed(2)}px)` : '');   /* 入場のぼかし(共通) */
        setStyle(big, 'transform', `translate(-50%, calc(-50% + ${(base - (isMobile ? 60 : F.labelUp) * L2).toFixed(2)}px)) scale(${sc.toFixed(4)})`);
      }
      if (fig) {
        const cy = rfxCenterY(fig);
        const grow = 1.08;                           /* 要素移動版: ほぼ最終サイズ(絵柄を大きく変えない) */
        const s = grow - (grow - 1) * D;
        const dy = isMobile ? 0 : ((vh * 0.55) - cy) * (1 - D);
        setStyle(fig, 'opacity', (on ? P1 : 0).toFixed(3));
        const bf = H.pictoBlur * (1 - P1); setStyle(fig, 'filter', bf > 0.05 ? `blur(${bf.toFixed(2)}px)` : '');
        tf(fig, `translateY(${dy.toFixed(2)}px) scale(${s.toFixed(4)})`);
      }
      if (tx) {
        const kids = tx.querySelectorAll('.r2v-h, .r2v-p');
        kids.forEach(kd => { setStyle(kd, 'opacity', ''); tf(kd, ''); });   /* 見出し・本文の個別指定は持たない(元は 24-5 の名残を消す処理。挙動を変えないため残置) */
        setStyle(tx, 'opacity', (on ? TK : 0).toFixed(3)); tf(tx, `translateY(${((1 - TK) * 16).toFixed(2)}px)`);
      }
    });
  } else if (k === '26') {
    const p = resFxPin(), W = rfxVW(), vh = rfxVH();
    const F = Object.assign({ numScale: 1.714, settleAt: 0.05, settleLen: 0.16, lineAt: 0.22, lineLen: 0.10, panAt: 0.56, panLen: 0.18 }, (params.sections.results.fx26 || {}));   /* 2026-09-15: 場面表を詰めて SaaS の読む区間を確保(0.41〜0.56) */
    /* 【案26 数字が大きく→上段の終点→線が伸びる→下段がブラーで→横スクロール】(絵コンテ Figma 17283:23622・2026-09-15 ヒデさん指定)
       A: 3つの数値が中央に大きく(120px相当=1.714倍) → 上段の終点(見出し 左・数値 右)へ収まり、見出しが薄く現れる
       B: 横線が左から伸びきる → C: 下段(説明 左・ピクト 右)がブラーで現れる(ピクト→文章の順) → D: 下段が横に動いて for AI(到着の終盤にブラーで) → 読む → 縦に戻って開発者体験へ。パネル「案26」 */
    setStyle(resEls.vals, 'opacity', '1'); setStyle(resEls.vals, 'filter', ''); setStyle(resEls.vals, 'pointerEvents', '');
    const shrink = rfxRange(p, F.settleAt, F.settleAt + Math.max(0.05, F.settleLen));
    const S0 = isMobile ? 1.1 : F.numScale;
    const OFF = isMobile ? [-100, 0, 100] : [-423, -10, 412];   /* 絵コンテ: 大きい時の3つの中心(画面中央からのずれ) */
    E.r2s.forEach((el, i) => {
      const cx = rfxCenterX(el, 0), cy = rfxCenterY(el);
      const dx = (W / 2 + OFF[i] - cx) * (1 - shrink), dy = (vh / 2 - 25 - cy) * (1 - shrink);
      tf(el, `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${(S0 - (S0 - 1) * shrink).toFixed(4)})`);
    });
    const hk = rfxRange(p, F.settleAt + F.settleLen * 0.6, F.settleAt + F.settleLen + 0.04);   /* 見出し(上段左)は数値が収まる終盤に */
    if (resEls.head) { setStyle(resEls.head, 'opacity', hk.toFixed(3)); setStyle(resEls.head, 'pointerEvents', hk < 0.02 ? 'none' : ''); tf(resEls.head, `translateY(${((1 - hk) * 16).toFixed(2)}px)`); }
    const lineEnd = F.lineAt + Math.max(0.03, F.lineLen);
    E.res2.style.setProperty('--rfx-hr', rfxRange(p, F.lineAt, lineEnd).toFixed(3));
    const fk = rfxRange(p, lineEnd, lineEnd + 0.06), tk = rfxRange(p, lineEnd + 0.03, lineEnd + 0.09);   /* 2026-09-15: 線が伸びきったらすぐ(ピクト→文章)   /* 線が伸びきってから: ピクト → 文章 */
    const pos = rfxHeld(p, [[F.panAt, F.panAt + Math.max(0.05, F.panLen)]]);
    tf(E.track, `translateX(${(-pos * 100).toFixed(3)}%)`);
    E.r2v.forEach((el, i) => {
      const fig = E.fig[i], tx = E.tx[i];
      const arrive = rfxRange(pos, 0.35, 0.95);   /* 2026-09-15: 到着する面は横移動の途中から見え始め、着く前に読める濃さに */
      const kf = on ? (i === 0 ? fk : arrive) : 0, kt = on ? (i === 0 ? tk : arrive) : 0;
      if (fig) rv(fig, kf, 14, 0);
      if (tx) rv(tx, kt, 14, 0);
      vis(el, on ? 1 : 0);
    });
  }
}

function updateResults(p) {
  const c = params.sections.results;
  SECS.results.classList.add('pat-c');                 // 単一レイアウト(pin-vp 地色/z-index に使用)
  SECS.results.classList.remove('pat-a', 'pat-b');

  buildSlots();
  let t = playT('results', resTotal(), canPlay(p), SECS.results, p);
  t = resFxTimeT(t);   /* 【2026-09-14 比較検証】案1: 読む区間のスクロールでも進む(速い方・巻き戻さない) */
  /* 【2026-09-08 ヒデさん指定】静的モバイル: 実績の登場(タイピング/スロット/カード)を最終状態で固定。
     ただし『実績→開発者体験の暗転』は下の devDarkK 連動で残す(t とは別系統なのでそのまま効く)。 */
  /* 【2026-09-09 ヒデさん指定】実績のブラー出現＋スロットは PC と同じ時間再生に戻す */

  /* ---- 再生前: 全部隠す(数字は0で待機) ---- */
  if (t < 0) {
    resEls.dark.style.opacity = 0;
    if (resEls.grow) { resEls.grow.style.opacity = 0; resEls.grow.style.transform = 'translateY(82%) scale(0.07, 0.55)'; }
    rv(resEls.hl1, 0, 0); rv(resEls.stats, 0, 0); rv(resEls.vals, 0, 0); rv(resEls.hr, 0, 0);
    resEls.typed.textContent = '';
    if (resEls.caret) resEls.caret.style.opacity = 0;
    if (resEls.suffix) rv(resEls.suffix, 0, 0);
    if (resEls.ghost) resEls.ghost.style.setProperty('--res-uline', 'rgba(17,17,17,0)');
    renderSlots(-1);
    slotT0 = null;
    resFxSt.slotHi = 0;
    resFxFrame(t);   /* 【2026-09-13 比較検証】案の配置(未再生時も面の位置は保つ) */
    return;
  }

  /* ---- 再生【2026-08-26 ヒデさん指定・ブラーなしフェード】
     ①「事業の推進力を、」フェードイン → ②「Anyflowが支えます。」タイピング
     → ③ タイピング開始頃から 残り(区切り線/3数値/2つの価値)がフェードイン
     → ④ 数値は0の状態からスロットカウンター ---- */
  const l1Dur = c.softDur * 0.6;
  const l1k = easeOutQ(clamp01((t - c.typeAt) / l1Dur));
  rv(resEls.hl1, l1k, 0, 0);                            // ① フェード(blur=0)
  if (resEls.suffix) rv(resEls.suffix, l1k, 0, 0);      // 「が支えます。」も見出し1行目と一緒に静的表示(Anyflowだけ後からタイピング)

  /* 【2026-08-30 ヒデさん指定】タイピングの見せ方: 既定=下線に打ち込む(スペース確保・不動)。push=押し広げる(旧) */
  if (resEls.hl2) resEls.hl2.classList.toggle('type-push', (c.typeStyle || 'slot') === 'push');

  const typeStart = c.typeAt + (c.typeGap != null ? c.typeGap : 0.55);   // ② タイピング開始(見出し1行目からの間隔)
  const CH = 0.06, chars = RES_TYPE_TEXT.length;
  const typeEnd = typeStart + chars * CH;
  const nTyped = t < typeStart ? 0 : Math.min(chars, Math.floor((t - typeStart) / CH));
  resEls.typed.textContent = RES_TYPE_TEXT.slice(0, nTyped);
  const typing = t >= typeStart - 0.05 && t < typeEnd + 0.4;
  if (resEls.caret) resEls.caret.style.opacity = (typing && (t * 1.8) % 1 < 0.55) ? 1 : 0;
  /* 下線プレースホルダ: 見出しと一緒に薄く出て、打ち終わりでスッと消える(最終は下線なしのクリーンな見た目に) */
  if (resEls.ghost) {
    const uFade = clamp01((t - (typeEnd - 0.1)) / 0.45);   // タイピング終わり際から0.45秒でフェードアウト
    const uAlpha = 0.22 * l1k * (1 - uFade);
    resEls.ghost.style.setProperty('--res-uline', 'rgba(17,17,17,' + uAlpha.toFixed(3) + ')');
  }

  const restAt = typeStart + (c.restGap != null ? c.restGap : 0.1);      // ③ その他(区切り線/数値/価値)がフェード
  const restK = easeOutQ(clamp01((t - restAt) / (c.softDur * 0.8)));
  rv(resEls.hr, restK, 0, 0);
  rv(resEls.stats, restK, 0, 0);
  rv(resEls.vals, restK, 0, 0);

  /* ④ スロット: 数値が出てきたら(restK≒出そろい)0から回す */
  const nr = rectOf(resEls.stats);
  if (slotT0 === null) {
    if (restK >= 0.6 && nr.top < innerHeight * resFxSlotEnter(c.slotEnterAt) && nr.bottom > 0) slotT0 = elapsed;   /* 案5/11 は帯が下端なので条件を緩める */
  } else if (nr.top > innerHeight * 1.2) {
    slotT0 = null;
  }
  /* 【2026-09-08】静的モバイル: スロットは回さず最終値(実数字)で固定 */
  renderSlots(resFxSlotTs(slotT0 === null ? -1 : elapsed - slotT0));   /* 【2026-09-14 比較検証】案1: スロットも読む区間のスクロールで進む */
  resFxFrame(t);   /* 【2026-09-13 比較検証】実績の演出案(既定=現行は何もしない)。暗転/白反転は下の既存処理のまま */

  /* ===== 実績 → 開発者体験 のつなぎ(黒せり上がり + 白反転) ===== */
  const devTop = rectOf(SECS.dev).top;
  const handed = clamp01((-devTop) / (innerHeight * 0.25));
  /* 【2026-08-26 ヒデさん指定】黒オブジェクトは「実績のリビール(タイピング/スロット)が終わってから」上げる。
     固定追従なし(smooth)でスクロールが速くても、リビール途中で黒が出るのを防ぐ。
     リビール完了時のスクロール位置を anchor にして、そこから outTo まででフルに覆う(dev1との受け渡しは維持)。 */
  const revealDone = t >= resTotal() - 0.05;
  if (!revealDone) resGrinAnchor = null;
  else if (resGrinAnchor == null) resGrinAnchor = Math.min(p, c.outTo - 0.15);
  const gStart = resGrinAnchor == null ? c.outTo : resGrinAnchor;
  const grin    = clamp01((p - gStart) / Math.max(0.05, c.outTo - gStart));
  /* 【2026-08-26 ヒデさん指定・あべこべ修正】ゆったりの“時間追従”は【固定追従なし(smooth)だけ】。
     「固定」モードは前の実装どおりスクロール駆動(=grin をそのまま)。固定がゆっくりになる問題を解消。 */
  if ((params.scrollHold || 'lock') === 'smooth') {
    const gentleTC = Math.max(0.12, c.blackTC != null ? c.blackTC : 0.6);   // 時定数(秒)。大きいほどゆったり
    grinShown += (grin - grinShown) * (1 - Math.exp(-frameDt / gentleTC));
    if (Math.abs(grin - grinShown) < 0.001) grinShown = grin;
  } else {
    grinShown = grin;   // 固定モード: レート制限なし(従来どおり)
  }
  resBlackK = grinShown;   // dev1 の出現ゲート用に共有
  if (resSmooth()) {
    /* 【2026-08-29 ヒデさん指定】スムーズフェードでも、背景が暗くなるぶんだけ上に残る実績の文字を
       徐々に白へ色調反転する(黒オブジェクトは無し)。暗さは updateDev の dev-bg と同じ「dev の入り」で。 */
    resBlackK = 0;
    if (resEls.grow) resEls.grow.style.opacity = 0;
    resEls.dark.style.opacity = 0;
    /* 【2026-09-08 ヒデさん指定・根治】文字/図/タグの白反転は、実際の背景の暗さ(devDarkK=updateDevのbgK)に
       そのまま追従させる。updateDev が updateResults より前に走るので devDarkK は最新。
       これで「背景は暗いのに文字が暗いまま」のズレが構造的に起きない。暗転カーブ等はdevDarkK側(updateDev)で反映済み。 */
    const darkK = devDarkK;
    if (darkK > 0.002) {
      resInvertOn = true;
      const white = b => `rgb(${Math.round(b[0] + (255 - b[0]) * darkK)},${Math.round(b[1] + (255 - b[1]) * darkK)},${Math.round(b[2] + (255 - b[2]) * darkK)})`;
      resInvertEls().forEach(el => { if (el) el.style.color = white([30, 34, 42]); });
      resFadeTags(darkK);   // for SaaS/for AI タグも白へ(2026-09-08)
      valInkCur = white([17, 17, 17]);   // ピクトグラムの黒い図形(#111)も同じ白反転に揃える
      const lc = `rgba(${Math.round(209 + (255 - 209) * darkK)},${Math.round(213 + (255 - 213) * darkK)},${Math.round(220 + (255 - 220) * darkK)},${(0.6 + 0.4 * darkK).toFixed(2)})`;
      if (resEls.hr) resEls.hr.style.background = lc;
      SECS.results.querySelectorAll('.res2-vline').forEach(v => v.style.background = lc);
    } else if (resInvertOn) {
      resInvertOn = false;
      resInvertEls().forEach(el => { if (el) el.style.color = ''; });
      resClearTags();
      valInkCur = VAL_INK;
      if (resEls.hr) resEls.hr.style.background = '';
      SECS.results.querySelectorAll('.res2-vline').forEach(v => v.style.background = '');
    }
    return;
  }
  const gv = grinShown;
  const riseK   = easeOutC(clamp01(gv / 0.40));
  const spreadK = easeIO(clamp01((gv - 0.36) / 0.64));
  if (resEls.grow) {
    const gy = (1 - riseK) * 82;
    const sx = 0.07 + spreadK * 0.93;
    const sy = 0.55 + spreadK * 0.45;
    resEls.grow.style.transform = `translateY(${gy.toFixed(2)}%) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    resEls.grow.style.opacity = (clamp01(riseK * 4) * (1 - handed)).toFixed(3);
  }
  resEls.dark.style.opacity = 0;
  /* 黒が来た所の“濃い文字”は白へ反転(色付きタグ for Saas/for AI は反転しない) → 全画面黒で消す。 */
  const invK  = easeIO(clamp01((gv - 0.18) / 0.34));
  /* dev1 のモック出現と被らないよう、実績の消えは早め(gv 0.45→0.72 で消える)。 */
  const fadeK = clamp01((gv - 0.45) / 0.27);
  if (gv > 0.001) {
    resInvertOn = true;
    const white = b => `rgb(${Math.round(b[0] + (255 - b[0]) * invK)},${Math.round(b[1] + (255 - b[1]) * invK)},${Math.round(b[2] + (255 - b[2]) * invK)})`;
    resInvertEls().forEach(el => { if (el) el.style.color = white([30, 34, 42]); });
    resFadeTags(invK);   // for SaaS/for AI タグも白へ(2026-09-08)
    valInkCur = white([17, 17, 17]);   // ピクトグラムの黒い図形(#111)も同じ白反転に揃える
    const lc = `rgba(${Math.round(209 + (255 - 209) * invK)},${Math.round(213 + (255 - 213) * invK)},${Math.round(220 + (255 - 220) * invK)},${(0.6 + 0.4 * invK).toFixed(2)})`;
    if (resEls.hr) resEls.hr.style.background = lc;
    SECS.results.querySelectorAll('.res2-vline').forEach(v => v.style.background = lc);
    const fo = (1 - fadeK).toFixed(3);
    [resEls.hl1, resEls.head, resEls.stats, resEls.vals, resEls.hr].forEach(el => { if (el) setStyle(el, 'opacity', fo); });
  } else if (resInvertOn) {
    /* 反転を掛けていない位置に戻ったら、インライン color を掃除(次の再生で白く残らない) */
    resInvertOn = false;
    resInvertEls().forEach(el => { if (el) el.style.color = ''; });
    resClearTags();
    valInkCur = VAL_INK;
    if (resEls.hr) resEls.hr.style.background = '';
    SECS.results.querySelectorAll('.res2-vline').forEach(v => v.style.background = '');
  }
}

/* ---------- 開発者体験 (ダーク・ピン留め) ---------- */
const devBg2 = document.getElementById('devBg2');
/* 【2026-08-30 ヒデさん指定】反転ルールの統一: dev の暗幕(dev-bg)の濃さ。updateDev が毎フレーム更新し、
   導入事例(cases)など「暗幕の上に見える黒テキスト」はこれに連動して白へ反転する(実績と同じルール)。 */
let devDarkK = 0;
const devEls = {
  sec: document.getElementById('dev'),
  bg: document.querySelector('#dev .dev-bg'),      // 暗い地色(fixed 100vh)。可視時のみ opacity を上げる
  h1: document.getElementById('devH1'),
  h2: document.getElementById('devH2'),
  block1: document.getElementById('devBlock1'),   // dev1 (Strength01)
  block2: document.getElementById('devBlock2'),   // dev2 (Strength02)
  in1: document.querySelector('#devBlock1 .dev-blk-in'),   // 固定(sticky)される内側。pin時はこの位置で出現/保持を測る
  in2: document.querySelector('#devBlock2 .dev-blk-in'),
  mock1: document.getElementById('devMock1'),     // dev1 の単体パネル枠(JSが #dmPanel を複製)
  mock: document.getElementById('devMock'),        // dev2 の手前パネル枠
  panel: document.getElementById('dmPanel'),
  list: document.getElementById('devList'),
  listItems: [...document.querySelectorAll('#devList .dl-item')],
  /* 【2026-08-29】DEV_SCREENS の順(api,cli,sdk)に合わせて並べる。cards の席割りがこの順に対応する */
  ghosts: [document.getElementById('dmGhost2'), document.getElementById('dmGhost0'), document.getElementById('dmGhost1')],
};
/* 絵コンテのコマ順:
   ①真っ黒→「自動生成で開発スピードを加速」(1行)がブラー出現・下にモックちら見え
   ②スクロールでモックが中央へ上がりながら実寸まで拡大 (規定位置までは中身は空)
   ③規定位置でモック内アニメ開始 (右チャットに入力→返答→左でコード生成)
   ④ブラーで消える →⑤「開発環境に/柔軟に適用」出現 →⑥上下に分割しその間からモック
   →⑦右へ移動し、文字はブラーで消え、左に CLI → API → SDK が入れ替わる */
/* ⚠️ 尺は「見せ場の数 × 1つあたり 50〜70vh」で決まる。参考36サイトで固定が2画面を
   超えるサイトは1つも無かったので、2026-08-14 に【1巡目のモック(せり上がり〜保持〜退場)
   を廃止】して 800vh → 500vh に圧縮した。1つ1つの間合いは緩めたまま総尺だけ減らせる、
   いちばん効く削り方。※ スクロール可能量は 400vh なので「%×400」が実際の vh */
/* 尺 850vh ＝ スクロール可能量 750vh。「%×750」が実際の vh。
   1つの見せ場に 50〜120vh を配って、どこを回しても必ず何かが動くようにしてある。
   ※ 2026-08-14: 1巡目のモックを一度消したが「無くなった」と指摘があり復活。
     代わりに各フェーズの間合いを広げて、急に出る感じを解消した。 */
/* ===== 開発者体験の時間割 (カンプ 14791:29575 の新レイアウト) =====
   ヒデさん指定の筋書き:
     ①下からスケールアップでモックが出る → 「Strength 01 / 自動生成で…」の文字 → 中身のアニメ
     ②モックが出直す → カンプの位置(左)へ移動 → 「Strength 02 / 開発環境に…」の文字
       → 右に API / CLI / SDK のリスト → 以降はホバーで左のモックが切り替わる */
/* ===== 開発者体験の時間割 =====
   ①モックが下からスケールアップ → 見出し① → 中の会話とコード
   ②【見出し①だけ】ブラーで消え、モックは消えずにそのまま左へスライド
     → 見出し② → 右の API/CLI/SDK がブラーで出現 */
/* ===== 開発者体験の時間割 =====
   ①モックが下からスケールアップ → 見出し① → 中の会話とコード
   ②見出し①だけブラーで消え、モックは消えずに左へスライド。
     【2026-08-15】のっそりしていたので短縮し、見出し②とリストは移動と重ねて同時に出す */
/* 【案1「横に回る」】ヒデさん採用 (2026-08-15)
   3枚が横一列の輪の上を回り、選ばれたカードが手前へ回り込んでくる。
   席は カンプ 14924:21985 の実測（手前0.905 / 中0.814 / 奥0.733 倍）を土台に、
   Y軸まわりの回転と奥行き(Z)を足して輪に見せている。
   動きの速さはサイト共通の「大きい移動 1.3秒 + ぬるっと止まるカーブ」。 */
/* ⚠️ perspective は枠の中心(x=720)を基準に効くので、奥へ引いた(dz)カードは
   【横方向にも中心へ寄る】。カンプの位置に着地させるには、その分を見込んで
   dx を外側へ大きめに取っておく必要がある（縮み係数 f = 1600/(1600+120) = 0.930）。
     必要な dx = (カンプの中心 - 720) / f - (手前の中心 - 720)
   sc も同じ f で縮むぶんを割り戻してある。 */
const DEV_STACK = [
  { sc: 0.905, dx:      0, dy:     0, dz:    0, ry:   0, op: 1.00, z: 3 },   /* 手前 */
  { sc: 0.875, dx: -118.1, dy:   3.2, dz: -120, ry:  22, op: 0.55, z: 2 },   /* 左後ろ */
  { sc: 0.788, dx:  121.7, dy: -17.6, dz: -120, ry: -22, op: 0.38, z: 1 },   /* 右後ろ */
];
/* 【2026-08-27 ヒデさん指定】カルーセルから「右にAIチャットが入っているモック(API)」を削除。
   ⚠️ #dmPanel(API本体) は dev1(Strength 01)の単体パネルの複製元なので、DOMからは消さない。
      dev2 では隠して、カルーセルの席にも並べない。 */
/* 【2026-08-29 ヒデさん指定】「APIの場合」を復活(左のコードだけ・AIチャット無し)。API を先頭(既定・手前)に。 */
const DEV_SCREENS = ['api', 'cli', 'sdk'];
/* ===== カードが入れ替わる時の動き出し方 (2026-08-19) =====
   「半分まで進むのに全体の何割の時間を使うか」で急さが決まる。
   ⚠️【2026-08-19 ヒデさん指定】右のリストのホバー表示（縦バー・下線・文字色）は、
      このカーブと秒数に【連動】させること。別々に持つと、リストは一瞬で切り替わったのに
      モックはまだ回っている、という「ちぐはぐ」になる。
      css: は同じカーブの CSS 版。JS 側と CSS 側で必ず対にしておく */
const DEV_SWAP_EASES = [
  { name: '①元の動き',   fn: easeOutQ, css: 'cubic-bezier(.22,1,.36,1)',
    desc: 'パッと動いて、ゆっくり止まる。いちばん反応が良く見える（既定）。' },
  { name: '②すっと動く', fn: easeOutC, css: 'cubic-bezier(.33,1,.68,1)',
    desc: '動き出しは早め、止まりはなめらか。①より少し落ち着いた感じ。' },
  { name: '③ゆったり',   fn: easeIO,   css: 'cubic-bezier(.65,0,.35,1)',
    desc: 'そっと動き出して、そっと止まる。いちばん落ち着いて見える。' },
];
/* 保存値の範囲チェックはここで行う。
   ⚠️ load() の中でやると DEV_SWAP_EASES がまだ定義されておらず ReferenceError になり、
      保存値がまるごと捨てられる（2026-08-19 に実際に起きた） */
if (!(params.sections.dev.swapEase >= 1 && params.sections.dev.swapEase <= DEV_SWAP_EASES.length))
  params.sections.dev.swapEase = DEFAULTS.sections.dev.swapEase;

/* カンプ位置(左寄せ)から見て「画面中央に置くための X オフセット」。
   ①では中央、②でここから 0 へ動かすとカンプの位置に着く */
/* モックは 1230px の枠の左端にいる。枠は画面中央にあるので、
   モック単体を画面中央に見せるためのズラし量は (1230 - 840.6) / 2 で【画面幅によらず一定】 */


/* ===== モックの中身: 画面ごとの実コード (ダミー) =====
   [クラス, 文字列] のトークン列。kw=キーワード / id=識別子 / st=文字列 / cm=コメント / ok=成功表示 */
const DM_CODE = {
  /* 【2026-08-30 エンジニアレビュー(大久保さん・FigJam 553:3892)】実際のワークフローコードに差し替え */
  editor: [
    [['kw', 'import type'], ['pl', ' { '], ['id', 'TriggerOutput'], ['pl', ', '], ['id', 'WorkflowContext'], ['pl', ' }']],
    [['pl', '  '], ['kw', 'from'], ['st', ' "@anyflowinc/embed-types"'], ['pl', ';']],
    [['kw', 'import'], ['pl', ' { '], ['id', 'Kintone'], ['pl', ' } '], ['kw', 'from'], ['st', ' "@anyflowinc/kintone"'], ['pl', ';']],
    [],
    [['kw', 'export async function'], ['pl', ' '], ['id', 'workflow'], ['pl', '(']],
    [['pl', '  triggerOutput: '], ['id', 'TriggerOutput'], ['pl', ',']],
    [['pl', '  _context: '], ['id', 'WorkflowContext'], ['pl', ',']],
    [['pl', '): '], ['id', 'Promise'], ['pl', '<'], ['kw', 'void'], ['pl', '> {']],
    [['pl', '  '], ['kw', 'const'], ['pl', ' client = '], ['kw', 'new'], ['pl', ' '], ['id', 'Kintone'], ['pl', '();']],
    [['pl', '  '], ['kw', 'await'], ['pl', ' client.record.'], ['id', 'addRecord'], ['pl', '({']],
    [['pl', '    app: _context.endUserInputs.'], ['id', 'kintoneAppId'], ['pl', ',']],
    [['pl', '    record: '], ['id', 'toKintoneRecord'], ['pl', '(triggerOutput.payload),']],
    [['pl', '  });']],
    [['pl', '}']],
    [],
    [['cm', '/** Webhook の payload を']],
    [['cm', '    kintone のレコード形式に変換する */']],
    [['kw', 'export function'], ['pl', ' '], ['id', 'toKintoneRecord'], ['pl', '(']],
    [['pl', '  payload: '], ['id', 'TriggerOutput'], ['pl', '['], ['st', '"payload"'], ['pl', ']) {']],
    [['pl', '  '], ['kw', 'return'], ['pl', ' {']],
    [['pl', '    '], ['st', '"名前"'], ['pl', ': { value: payload?.name },']],
    [['pl', '    '], ['st', '"メールアドレス"'], ['pl', ': { value: payload?.email }']],
    [['pl', '  };']],
    [['pl', '}']],
  ],
  /* 【2026-08-30 エンジニアレビュー(FigJam 557:4090)】embed CLI の実フローに差し替え */
  cli: [
    [['kw', '%'], ['pl', ' embed version']],
    [['ok', '    ______          __             __   ________    ____']],
    [['ok', '   / ____/___ ___  / /_  ___  ____/ /  / ____/ /   /  _/']],
    [['ok', '  / __/ / __ `__ \\/ __ \\/ _ \\/ __  /  / /   / /    / /']],
    [['ok', ' / /___/ / / / / / /_/ /  __/ /_/ /  / /___/ /____/ /']],
    [['ok', '/_____/_/ /_/ /_/_.___/\\___/\\__,_/   \\____/_____/___/']],
    [['cm', '                                              v0.1.2']],
    [],
    [['kw', '$'], ['pl', ' embed pull']],
    [['ok', '  \u2714'], ['cm', ' 4 files synced']],
    [],
    [['kw', '$'], ['pl', ' claude '], ['st', '"CSV\u306e\u9867\u5ba2\u30c7\u30fc\u30bf\u3092HubSpot\u3078"']],
    [['ok', '  \u270e'], ['cm', ' main.ts generated']],
    [],
    [['kw', '$'], ['pl', ' embed push']],
    [['ok', '  \u2714'], ['cm', ' ready for test run']],
  ],
  /* 【2026-08-30 エンジニアレビュー(FigJam 557:4184)】request_trigger の実リクエストに差し替え */
  api: [
    [['kw', 'POST'], ['pl', ' /request_trigger HTTP/1.1']],
    [['pl', 'Host: '], ['id', 'embed-vender-api.anyflow.jp']],
    [['pl', 'Authorization: '], ['kw', 'Bearer'], ['st', ' YOUR_SECRET_TOKEN']],
    [['pl', 'Content-Type: '], ['st', 'application/json']],
    [],
    [['pl', '{']],
    [['pl', '  '], ['st', '"solution_instance_id"'], ['pl', ': '], ['st', '"123"'], ['pl', ',']],
    [['pl', '  '], ['st', '"payload"'], ['pl', ': {']],
    [['pl', '    '], ['st', '"action"'], ['pl', ': '], ['st', '"add_lead"'], ['pl', ',']],
    [['pl', '    '], ['st', '"name"'], ['pl', ': '], ['st', '"Dummy Corp"'], ['pl', ',']],
    [['pl', '    '], ['st', '"employees"'], ['pl', ': '], ['id', '30']],
    [['pl', '  }']],
    [['pl', '}']],
    [],
    [['ok', '200 OK'], ['cm', '  \u00b7 128ms']],
    [['pl', '{ '], ['st', '"job"'], ['pl', ': { '], ['st', '"id"'], ['pl', ': '], ['st', '"456"'], ['pl', ', '], ['st', '"state"'], ['pl', ': '], ['ok', '"succeeded"'], ['pl', ' },']],
    [['pl', '  '], ['st', '"payload"'], ['pl', ': { '], ['st', '"records"'], ['pl', ': '], ['id', '1'], ['pl', ' } }']],
  ],
  /* 【2026-08-30 エンジニアレビュー(FigJam 556:4025)】SDK＝ウィザード埋め込みの実コードに差し替え */
  sdk: [
    [['cm', '// SDK \u3092\u521d\u671f\u5316']],
    [['kw', 'const'], ['pl', ' sdk = '], ['id', 'AnyflowSDK'], ['pl', '.'], ['id', 'init'], ['pl', '('], ['id', 'fetchJwt'], ['pl', ');']],
    [],
    [['cm', '// iframe\u5185\u306b\u30a6\u30a3\u30b6\u30fc\u30c9\u753b\u9762\u3092\u8868\u793a']],
    [['kw', 'const'], ['pl', ' iframe = document.'], ['id', 'getElementById'], ['pl', '('], ['st', '"wizard"'], ['pl', ');']],
    [['kw', 'const'], ['pl', ' solutionWizard: '], ['id', 'SolutionWizard'], ['pl', ' =']],
    [['pl', '  sdk.'], ['id', 'createWizard'], ['pl', '(iframe);']],
    [['id', 'solutionWizard'], ['pl', '.'], ['id', 'load'], ['pl', '('], ['id', 'solution_id'], ['pl', ');']],
  ],
};
/* 画面ごとのテンポ: chat=会話パートの有無 / load=ローディング開始 / hold=溜め / burst=一気に書く */
const DM_TIMING = {
  /* load=ローディング開始 / loadDur=ゆったり見せる時間 / holdT=書き出す前の溜め
     step,dur=一気に書き出すテンポ */
  editor: { chat: true,  load: 4.2, loadDur: 1.5, holdT: 0.3, step: 0.045, dur: 0.13, loop: 12.5 },
  cli:    { chat: false, load: 0.4, loadDur: 1.8, holdT: 0.4, step: 0.05, dur: 0.14, loop: 9 },
  api:    { chat: false, load: 0.4, loadDur: 1.8, holdT: 0.4, step: 0.05, dur: 0.14, loop: 9 },
  sdk:    { chat: false, load: 0.4, loadDur: 1.8, holdT: 0.4, step: 0.05, dur: 0.14, loop: 9 },
};

/* SDK画面の右ペイン。AIペインと同じ角丸・同じ余白でトンマナを踏襲しつつ中身だけ変える */
/* ⚠️ この一覧は innerHTML で組み立てている。'<' をそのまま書くとタグとして
   解釈されて消えるので、必ず &lt; で書くこと (2026-08-18 にこれで1回消えた) */
const DM_SDK_ROWS = [
  ['&lt;ConnectButton', ' />', 'Component'],
  ['&lt;ConnectorList', ' />', 'Component'],
  ['&lt;FlowBuilder', ' />', 'Component'],
  ['useConnections', '()', 'Connection[]'],
  ['useFlowRun', '()', 'Run'],
  ['client.flows', '.run()', 'Promise<Run>'],
];
const dmSdkRowEls = (() => {
  const root = document.getElementById('dmSdkList');
  if (!root) return [];   /* 2026-08-25 リデザイン: 新デザインのパネルは editor+chat のみ(SDK Reference無し) */
  return DM_SDK_ROWS.map(([ns, m, t]) => {
    const el = document.createElement('div');
    el.className = 'dm-sdk-row';
    el.innerHTML = `<span class="dot"></span><span><span class="k">${ns}</span>${m}</span><span class="t">${t}</span>`;
    root.appendChild(el);
    return el;
  });
})();

/* ---- 後ろに控える2枚(CLI / SDK)の中身。手前に回ってきた時に見た目が変わらないよう
       本物と同じ組み方で、静止した状態で置いておく ---- */
function dmFillStatic(rootId, key) {
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = '';
  (DM_CODE[key] || []).forEach(tokens => {
    const line = document.createElement('div');
    line.className = 'dm-line';
    if (!tokens.length) line.innerHTML = '&nbsp;';
    else tokens.forEach(([cls, text]) => {
      const sp = document.createElement('span');
      sp.className = cls; sp.textContent = text; line.appendChild(sp);
    });
    root.appendChild(line);
  });
}
function dmFillSdkList(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = '';
  DM_SDK_ROWS.forEach(([ns, m, t]) => {
    const el = document.createElement('div');
    el.className = 'dm-sdk-row';
    el.style.opacity = 1;
    el.innerHTML = `<span class="dot"></span><span><span class="k">${ns}</span>${m}</span><span class="t">${t}</span>`;
    root.appendChild(el);
  });
}

/* ===== 章②のモック内アニメ (2026-08-18) =====
   API / CLI / SDK それぞれ、中身が1行ずつ出てくる。
   CLI は途中で印がくるくる回ってから ✔ が付き、SDK は右の一覧も順に出る。 */
const DM_SPIN = '\u280b\u2819\u2839\u2838\u283c\u2834\u2826\u2827\u2807\u280f';
const DM2 = {
  lineGap: 0.13,   // 1行ずつずらす間隔(秒)
  lineDur: 0.30,   // 1行が出きるまで(秒)
  rowGap:  0.09,   // SDK 一覧の行ごとの間隔(秒)
  rowsAt:  0.35,   // コードが出はじめてから、右の一覧が出るまで(秒)
  spinPer: 0.08,   // くるくるの1コマ(秒)
};
/* API は「送ってから返ってくる」間を作りたいので、レスポンス行だけ待たせる */
const DM2_PAUSE = { api: { from: 11, add: 0.55 } };
let dmSpinEl = null, dmSpinLine = -1;
let dm2Spin, dm2SpinLine = -1;

/* ⚠️ 手前に来るカードは画面ごとに違う。
   API は本体パネル(#dmCode)、CLI と SDK は「ゴースト」と呼んでいる複製カードが前に回ってくる。
   本体を animate しても後ろに隠れていて見えないので、必ず手前のカードを動かすこと。 */
/* 【2026-08-29 ヒデさん指定】API は「左のコードだけ」の静止ゴースト(#dmCodeApi)に付け替え。
   以前は本体パネル(#dmCode+AIチャット)だったが、チャットは削除したので専用ゴーストへ。 */
const DM2_ROOT = { api: 'dmCodeApi', cli: 'dmCodeCli', sdk: 'dmCodeSdk' };
const dm2Cache = {};
function dm2Lines(screen) {
  const id = DM2_ROOT[screen];
  if (!id) return [];
  if (!dm2Cache[id]) dm2Cache[id] = [...document.getElementById(id).children];
  return dm2Cache[id];
}
let dm2SdkRows2 = null;

/* ループの終わり際、次の周へ戻る前にすっと消す時間(秒)。
   これが無いと「全部出ている状態」から一瞬で空に戻り、パチッと切れて見える */
const DM2_OUT = 0.6;
function dmAnimScreen(screen, ts) {
  const pause = DM2_PAUSE[screen];
  const lines = dm2Lines(screen);
  /* 【2026-08-19 ヒデさん指定】モック内のアニメーションはすべてループ再生にする。
     ⚠️ 章①のチャット(devMockContent)は t % loop でもともと繰り返していたが、
        章②のコード書き出し(ここ)だけ ts をそのまま使っていて【1回きり】だった。
        右のパネル側と同じ DM_TIMING[screen].loop で回して、2つの周期をそろえる */
  const tm = DM_TIMING[screen] || DM_TIMING.editor;
  const loop = tm.loop > 0 ? tm.loop : 0;
  if (loop > 0 && ts > 0) ts = ts % loop;
  /* 周の終わり際のフェードアウト量 (0=そのまま / 1=消えきり) */
  const outK = (loop > 0 && ts > loop - DM2_OUT) ? clamp01((ts - (loop - DM2_OUT)) / DM2_OUT) : 0;
  for (let i = 0; i < lines.length; i++) {
    const at = i * DM2.lineGap + (pause && i >= pause.from ? pause.add : 0);
    const k = easeOutQ(clamp01((ts - at) / DM2.lineDur));
    const el = lines[i];
    /* ⚠️ .dm-line は既定で clip-path: inset(0 100% 0 0)（＝全部隠れている）。
       ここを開かないと、文字があっても一切見えない。
       章①のエディタと同じく、左から右へ拭くように出す */
    setStyle(el, 'clipPath', k >= 1 ? 'none' : `inset(0 ${((1 - k) * 100).toFixed(1)}% 0 0)`);
    setStyle(el, 'opacity', k <= 0 ? '0' : (1 - outK).toFixed(3));
  }
  /* CLI: 次の行(✔)が出はじめるまで、印を回し続ける */
  if (screen === 'cli') {
    if (dm2Spin === undefined) {
      dm2Spin = null;
      lines.forEach((l, li) => { for (const sp of l.children)
        if (sp.textContent.indexOf(DM_SPIN[0]) >= 0) { dm2Spin = sp; dm2SpinLine = li; } });
    }
    if (dm2Spin) {
      const doneAt = (dm2SpinLine + 1) * DM2.lineGap;
      if (ts >= 0 && ts < doneAt) {
        const f = Math.floor(ts / DM2.spinPer) % DM_SPIN.length;
        const want = '  ' + DM_SPIN[f];
        if (dm2Spin.textContent !== want) dm2Spin.textContent = want;
      }
    }
  }
  /* SDK: 右の一覧も1行ずつ (手前に来るのはゴースト側の一覧) */
  if (screen === 'sdk') {
    if (!dm2SdkRows2) { const _sl = document.getElementById('dmSdkList2'); dm2SdkRows2 = _sl ? [..._sl.children] : []; }  /* 2026-08-29: SDK Reference 列を削除したので無い場合あり */
    dm2SdkRows2.forEach((el, i) => {
      const k = easeOutQ(clamp01((ts - DM2.rowsAt - i * DM2.rowGap) / DM2.lineDur));
      setStyle(el, 'opacity', (k * (1 - outK)).toFixed(3));   /* コードと一緒に消えて、一緒に出直す */
      setStyle(el, 'transform', k >= 1 ? '' : `translateY(${((1 - k) * 8).toFixed(2)}px)`);
    });
  }
}

const dmCodeRoot = document.getElementById('dmCode');
const dmLoadRoot = document.getElementById('dmLoad');
let dmLineEls = [], dmCurScreen = null;
(function buildLoader() {
  [180, 240, 150, 210, 120, 190].forEach(w => {
    const b = document.createElement('div');
    b.className = 'sk';
    b.style.width = w + 'px';
    dmLoadRoot.appendChild(b);
  });
})();
const dmSkEls = [...dmLoadRoot.children];

function dmBuildScreen(key) {
  if (dmCurScreen === key) return;
  dmCurScreen = key;
  dmCodeRoot.className = 'dm-code code';
  dmCodeRoot.innerHTML = '';
  dmLineEls = [];
  dmSpinEl = null; dmSpinLine = -1;
  DM_CODE[key].forEach(tokens => {
    const line = document.createElement('div');
    line.className = 'dm-line';
    if (!tokens.length) line.innerHTML = '&nbsp;';
    else tokens.forEach(([cls, text]) => {
      const sp = document.createElement('span');
      sp.className = cls;
      sp.textContent = text;
      line.appendChild(sp);
    });
    dmCodeRoot.appendChild(line);
    /* CLI の「くるくる回る印」を覚えておく (あとで回すため) */
    for (const sp of line.children) {
      if (sp.textContent.indexOf(DM_SPIN[0]) >= 0) { dmSpinEl = sp; dmSpinLine = dmLineEls.length; }
    }
    dmLineEls.push(line);
  });
}
dmBuildScreen('editor');
/* dev2 カルーセルの後ろ2枚(CLI/SDK)の中身を静止で充填(V1.0踏襲)。 */
dmFillStatic('dmCodeCli', 'cli');
dmFillStatic('dmCodeSdk', 'sdk');
dmFillStatic('dmCodeApi', 'api');   /* 【2026-08-29】APIゴーストのコードを充填 */
if (document.getElementById('dmSdkList2')) dmFillSdkList('dmSdkList2');  /* 2026-08-29: SDK Reference 列は削除したので存在時のみ */
/* dev1(Strength01) 用に本体パネルを複製して単体で置く（中身は同じエディタ+チャット）。 */
let dev1Refs = null;   /* dev1(章①)の複製パネルの参照。updateDev がループ駆動に使う */
(function cloneDev1Panel() {
  const src = document.getElementById('dmPanel');
  const dst = document.getElementById('devMock1');
  if (src && dst) {
    const clone = src.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    dst.appendChild(clone);
    dev1Refs = dmRefs(clone);   /* class で拾うので複製でも使える */
  }
})();

/* ---- モック内アニメ: ローディング → 溜め → 一気にコードを書き出す ---- */
/* 【2026-08-30 エンジニアレビュー(FigJam 557:4145)】実際のユースケースに近づける: 入力文言を変更 */
const DM_TEXT = 'kintone にユーザデータを連携したい';
const DM_REPLY = 'Webhook のユーザデータを kintone のレコードに変換して登録するワークフローを作成します。';
/* ⚠️ id ではなく class で拾う（写しでも同じコードが使えるようにするため）。
   dmRefs は関数宣言なので、下で定義していてもここから呼べる */
const dmEls = dmRefs(document.getElementById('dmPanel')).els;

/* 【2026-08-25 リデザイン】モックは「静止した完成状態」で出しっぱなし（KVと同様・カンプも静止）。
   コードは全行表示、チャットは 質問→AI回答 まで出た状態、入力欄はプレースホルダに戻す。 */
function dmFillComplete(root) {
  const r = dmRefs(root), e = r.els;
  r.lines.forEach(l => { l.style.clipPath = 'inset(0 0 0 0)'; l.style.opacity = 1; l.style.filter = ''; });
  if (r.load) r.load.style.opacity = 0;
  if (e.userText) e.userText.textContent = DM_TEXT;
  if (e.userMsg) e.userMsg.style.opacity = 1;
  if (e.think) e.think.style.opacity = 0;
  if (e.botText) e.botText.textContent = DM_REPLY;
  if (e.botMsg) e.botMsg.style.opacity = 1;
  if (e.typed) e.typed.textContent = '';
  if (e.cursor) e.cursor.style.opacity = 0;
  if (e.ph) e.ph.style.opacity = 1;
  root.classList.remove('is-blank');
}
/* 本体(dev2)と複製(dev1)の両方を完成状態に */
[document.getElementById('dmPanel'), (devEls.mock1 && devEls.mock1.querySelector('.dm-panel'))]
  .forEach(p => { if (p) dmFillComplete(p); });


/* モック1台ぶんの参照をまとめて拾う。id ではなく class で拾うので【写し】でも使える。
   固定追従なしモードでは章①用にもう1台（写し）を置き、そこにも同じアニメを流す */
function dmRefs(root) {
  const q = sel => root.querySelector(sel);
  const load = q('.dm-load');
  const code = q('.dm-code');
  return {
    els: {
      typed: q('.dm-typed'), cursor: q('.dm-cursor'), ph: q('.dm-ph'),
      send: q('.dm-send'), userMsg: q('.dm-user'), userText: q('.dm-user p'),
      botMsg: q('.dm-botmsg'), botText: q('.dm-botmsg p'), think: q('.dm-thinkmsg'),
    },
    lines: code ? [...code.children] : [],
    load, sks: load ? [...load.children] : [],
    sdkRows: [...root.querySelectorAll('.dm-sdk-list > *')],
    panel: root.classList.contains('dm-panel') ? root : q('.dm-panel'),
  };
}

/* R を渡すとそのモックを動かす。省略時は本物（#devMock）を動かす */
function devMockContent(mode, t, screen, R) {
  const E = R ? R.els : dmEls;
  const LINES = R ? R.lines : dmLineEls;
  const LOAD = R ? R.load : dmLoadRoot;
  const SKS = R ? R.sks : dmSkEls;
  const SDKR = R ? R.sdkRows : dmSdkRowEls;
  const tm = DM_TIMING[screen] || DM_TIMING.editor;
  if (mode === 'empty') {
    E.typed.textContent = '';
    E.ph.style.display = '';
    E.cursor.style.opacity = 0;
    E.userMsg.style.opacity = 0;
    E.botMsg.style.opacity = 0;
    E.userText.textContent = '';
    E.botText.textContent = '';
    E.send.classList.remove('is-hit');
    E.think.style.display = 'none';
    LOAD.style.opacity = 0;
    SDKR.forEach(e => { e.style.opacity = 0; });
    LINES.forEach(l => { l.style.clipPath = 'inset(0 100% 0 0)'; l.style.opacity = 1; l.style.filter = ''; });
    return;
  }
  const T = t % tm.loop;

  if (tm.chat) {
    /* 【2026-08-15】空の状態 → 入力欄にタイピング → 送信ボタンを押す
       → 打った文字がそのまま履歴に入る（アイコンなし）
       → AIが普通のテキストで返す → そのあと左のコードが流れる */
    /* 2026-08-15: もっとスピーディーにとの指定で全体を詰めた */
    const typeFrom = 0.25, typeTo = typeFrom + DM_TEXT.length * 0.046;
    const sendAt = typeTo + 0.22;          // 送信ボタンを押す
    const postAt = sendAt + 0.16;          // 履歴に反映
    const thinkTo = postAt + 0.75;         // 考え中
    const replyTo = thinkTo + DM_REPLY.length * 0.028;

    const sent = T >= sendAt;
    const n = sent ? 0 : Math.floor(clamp01((T - typeFrom) / (typeTo - typeFrom)) * DM_TEXT.length);
    E.typed.textContent = DM_TEXT.slice(0, n);
    E.ph.style.display = n > 0 ? 'none' : '';
    E.cursor.style.opacity = (!sent && T > typeFrom - 0.1 && (T * 1.8) % 1 < 0.55) ? 1 : 0;
    E.send.classList.toggle('is-hit', T >= sendAt && T < sendAt + 0.22);

    E.userMsg.style.opacity = clamp01((T - postAt) / 0.3).toFixed(3);
    E.userText.textContent = T >= postAt ? DM_TEXT : '';

    const thinkOn = T > postAt + 0.35 && T < thinkTo;
    E.think.style.display = thinkOn ? 'flex' : 'none';
    E.think.querySelectorAll('.dm-think-b i').forEach((d, i) => {
      d.style.opacity = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(T * 7 - i * 1.1))).toFixed(2);
    });
    E.botMsg.style.opacity = clamp01((T - thinkTo) / 0.25).toFixed(3);
    const rn = Math.floor(clamp01((T - thinkTo) / (replyTo - thinkTo)) * DM_REPLY.length);
    E.botText.textContent = T >= thinkTo ? DM_REPLY.slice(0, rn) : '';
  } else {
    E.typed.textContent = '';
    E.ph.style.display = '';
    E.cursor.style.opacity = 0;
    E.userMsg.style.opacity = 0;
    E.botMsg.style.opacity = 0;
    E.think.style.display = 'none';
  }

  /* ① ローディング: スケルトンに光が走る */
  const loadIn = clamp01((T - tm.load) / 0.5);
  const burstAt = tm.load + tm.loadDur + tm.holdT;
  const loadOut = clamp01((T - (burstAt - 0.35)) / 0.3);
  LOAD.style.opacity = (loadIn * (1 - loadOut)).toFixed(3);
  SKS.forEach((b, i) => {
    /* ゆっくり光が横切る (0.55周/秒) */
    const ph = (((T - tm.load) * 0.55 - i * 0.1) % 1 + 1) % 1;
    b.style.backgroundPositionX = (170 - ph * 240).toFixed(1) + '%';
  });

  /* SDK画面: 右のリファレンス一覧がコードと同じテンポで並んでいく */
  const sdkOn = screen === 'sdk';
  SDKR.forEach((el, i) => {
    if (!sdkOn) { el.style.opacity = 0; return; }
    const k = clamp01((T - (tm.load + tm.loadDur + tm.holdT) - i * 0.12) / 0.35);
    el.style.opacity = k.toFixed(3);
    el.style.transform = `translateY(${((1 - k) * 8).toFixed(2)}px)`;
  });

  /* ② 溜め → ③ 一気に書き出す */
  const pat = params.patterns.mock;
  LINES.forEach((line, i) => {
    const at = burstAt + i * tm.step;
    const k = clamp01((T - at) / tm.dur);
    if (k <= 0) { line.style.clipPath = 'inset(0 100% 0 0)'; line.style.filter = ''; line.style.opacity = 1; return; }
    line.style.clipPath = k >= 1 ? 'none' : `inset(0 ${((1 - k) * 100).toFixed(1)}% 0 0)`;
    if (pat === 'B') {
      /* 案B: 書き出した直後だけ白くにじむ */
      line.style.filter = k < 1 ? `brightness(${(1 + (1 - k) * 1.6).toFixed(2)})` : '';
      line.style.opacity = 1;
    } else if (pat === 'C') {
      /* 案C: 発光しながら現れる */
      line.style.filter = k < 1
        ? `drop-shadow(0 0 ${((1 - k) * 7).toFixed(1)}px rgba(120,220,255,.9)) brightness(${(1 + (1 - k)).toFixed(2)})` : '';
      line.style.opacity = 1;
    } else {
      line.style.filter = '';
      line.style.opacity = 1;
    }
  });
}

let devHoldT0 = null, devScreenT0 = null, devStarted = false;
/* ②で選ばれている画面。既定は API (カンプで選択状態になっているもの)。ホバーで変わる */
let devScreen2 = 'api', devSwapT0 = null;   /* 【2026-08-29】API(左コードのみ)を復活し既定=API(手前) */
/* 開発者体験の「暗い背景 → 明るい背景」の進み具合 (0→1)。導入事例が参照する */
let devFin = 0;

/* ---- 右リストのホバー: 左のモックがブラーで切り替わる ---- */
(function bindDevList() {
  const pick = el => {
    const it = el && el.closest('.dl-item');
    if (!it || it.dataset.screen === devScreen2) return;
    devScreen2 = it.dataset.screen;
    devSwapT0 = elapsed;
    /* 活性(左罫線+不透明1)を移す。カルーセルの席回転(updateDev2Stack)と連動する */
    devEls.listItems.forEach(x => x.classList.toggle('is-on', x === it));
  };
  if (devEls.list) {
    devEls.list.addEventListener('pointerover', e => pick(e.target));
    devEls.list.addEventListener('click', e => pick(e.target));
  }
})();

/* ---- スキップ: いまの章を終わらせて、次の章の位置までスクロールする ----
   「見終わらないと進めない」のが不安との指摘への動線。目立たないテキストリンク */

/* 【2026-08-25 ヒデさん指定】dev2 の3枚カルーセル(V1.0踏襲)。右の API/CLI/SDK をホバーして
   devScreen2 が変わると席が回り、3Dっぽく入れ替わって見える。dev2 が画面に入っている間だけ毎フレーム位置を書く。
   全体を DEV2_SCALE で dev2 に収める。 */
/* 【2026-08-29 ヒデさん指定】テキストスライド案は手前のモックが dev1 と同サイズ(840×504)になるよう
   1/0.905(front席のsc)=1.105 で等倍化。list案は従来どおり 0.6。 */
function dev2Scale() { return (params.sections.dev.ds2 === 'slide') ? 1.105 : 0.6; }
function updateDev2Stack() {
  if (!devEls.block2 || !devEls.mock) return;
  const r = rectOf(devEls.block2);
  if (r.bottom < -100 || r.top > (innerHeight || 1) + 100) return;   // 画面外はスキップ
  const c = params.sections.dev;
  const swapE = DEV_SWAP_EASES[(c.swapEase || 1) - 1] || DEV_SWAP_EASES[0];
  const sel = Math.max(0, DEV_SCREENS.indexOf(devScreen2));
  /* 【2026-08-29 ヒデさん指定】API(左コードのみ)を復活し 3枚に。ghosts=api,cli,sdk の順。席は手前/左後ろ/右後ろ */
  const cards = [devEls.ghosts[0], devEls.ghosts[1], devEls.ghosts[2]];   // 0=API 1=CLI 2=SDK
  const nSeat = cards.length;
  cards.forEach((el, i) => {
    if (!el) return;
    const seatI = (i - sel + nSeat) % nSeat;
    if (el._seat !== seatI) { el._from = el._cur || DEV_STACK[seatI]; el._seat = seatI; el._t0 = elapsed; }
    el.classList.toggle('dm-back', seatI !== 0);   /* 2026-09-15: 手前以外＝ガラス案ではぼかす(すりガラスの見え方) */
    const to = DEV_STACK[seatI];
    const kk = el._t0 == null ? 1 : swapE.fn(clamp01((elapsed - el._t0) / c.stackDur));
    /* すれ違い中の透け防止(V1.0の対策＋2026-09-03): 暗くなる側は動きがほぼ終わってから暗くし、
       明るくなる側(前面に入るカード)は逆に早め(最初の30%)に不透明化する。
       これで前面には常にどちらか不透明なカードが居て、背景が透けなくなる。 */
    const dimming = to.op < el._from.op;
    const opK = dimming ? easeOutQ(clamp01((kk - 0.85) / 0.15)) : easeOutQ(clamp01(kk / 0.30));
    const cur = {
      sc: el._from.sc + (to.sc - el._from.sc) * kk,
      dx: el._from.dx + (to.dx - el._from.dx) * kk,
      dy: el._from.dy + (to.dy - el._from.dy) * kk,
      dz: el._from.dz + (to.dz - el._from.dz) * kk,
      ry: el._from.ry + (to.ry - el._from.ry) * kk,
      op: el._from.op + (to.op - el._from.op) * opK,
    };
    el._cur = cur;
    const swing = Math.sin(Math.PI * clamp01(kk));   // 回っている最中だけ傾く(止まると0=フラット)
    el.style.opacity = cur.op.toFixed(3);
    el.style.zIndex = Math.round(cur.sc * 1000);
    el.style.transform =
      `translate3d(${(cur.dx * dev2Scale()).toFixed(1)}px, ${(cur.dy * dev2Scale()).toFixed(1)}px, ${(cur.dz * dev2Scale()).toFixed(1)}px)` +
      ` rotateY(${(cur.ry * swing).toFixed(2)}deg) scale(${(cur.sc * dev2Scale()).toFixed(4)})`;
  });
}

/* ===== dev モックのループ駆動 (2026-08-26 ヒデさん指定「表示されたら流れっぱなし」) =====
   V1.0 と同じく、ブロックが画面に入っている間は devMockContent を t%loop で回し続ける。
   dev1 = 複製パネル(dev1Refs) / dev2 = 本体 dmPanel(API/editor) ＋ CLI/SDK ゴースト。 */
const devMockT0 = { dev1: null, dev2: null };
function driveEditorLoop(refs, visible, key) {
  const panel = refs ? refs.panel : devEls.panel;
  const lines = refs ? refs.lines : (typeof dmLineEls !== 'undefined' ? dmLineEls : []);
  if (!lines || !lines.length) return;
  if (visible) {
    if (devMockT0[key] == null) devMockT0[key] = elapsed;
    if (panel) panel.classList.remove('is-blank');
    devMockContent('anim', elapsed - devMockT0[key], 'editor', refs);
  } else {
    devMockT0[key] = null;
    devMockContent('empty', 0, 'editor', refs);
  }
}
/* 個別要素のブラー+フェード出現 (rise は任意)。dev2 の順次出現に使う */
function revealEl(el, k, blurMax, riseMax) {
  if (!el) return;
  el.style.opacity = k.toFixed(3);
  const bl = (1 - k) * (blurMax == null ? 14 : blurMax);
  el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : '';
  if (riseMax) el.style.transform = k < 0.999 ? `translateY(${((1 - k) * riseMax).toFixed(1)}px)` : '';
}
let dev2SeqT0 = null, dev2StackEl = null;
