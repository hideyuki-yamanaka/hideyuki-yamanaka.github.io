function presetStoreLoad() {
  try {
    const j = JSON.parse(localStorage.getItem(PRESET_KEY) || 'null');
    if (j && typeof j === 'object' && j.presets && typeof j.presets === 'object') return j;
  } catch (e) {}
  return null;
}
function presetStoreSave() {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify({
      v: 1, presets: params.gfxPresets || {}, on: params.gfxPresetOn || {},
      /* 消したバリエーションの控えもここに置く。パネルを作り替えても残るように */
      hidden: params.gfxVariantHidden || {},
      /* 【2026-08-29】削除したプリセットのゴミ箱(復元用)もここに置く */
      trash: params.gfxPresetTrash || {},
      /* 【2026-08-30 ヒデさん指定】バリエーションの「この設定で上書き」の控え(案名→全設定) */
      over: params.gfxVarOverride || {},
      fav: params.gfxFav || [],   /* 【2026-09-01】お気に入りピン留め */
    }));
  } catch (e) {}
}
const STORAGE_KEY = 'anyflow-embed-anim-v81';   /* 2026-08-27 案ごとの形/3案/番号詰め。v80の保存値は破棄 */

/* 【2026-09-01 ヒデさん指定】本番では「新しい焼き込み」を必ず勝たせる。
   これまで焼き込みは「保存が無い時のフォールバック」だったため、過去に本番を開いた
   ブラウザでは古いlocalStorageが勝ち続け、デプロイしてもKVが変わらなかった(実際に発生)。
   本番ドメイン限定: 保存された世代が焼き込み世代より古ければ、anyflow-*の保存を全部捨てて
   焼き込み値で起動する。ローカル(localhost)は対象外=ヒデさんの調整は消えない。
   ローカルで本番の挙動を試したい時は URL に ?prodsim=1 を付ける。 */
try {
  const _isLocalDev = /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname) && !/[?&]prodsim=1/.test(location.search);
  if (!_isLocalDev) {
    const _seenGen = +(localStorage.getItem('anyflow-shipped-gen') || 0);
    if (_seenGen < SHIPPED_GENERATION) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.indexOf('anyflow-') === 0) localStorage.removeItem(k);
      }
      localStorage.setItem('anyflow-shipped-gen', String(SHIPPED_GENERATION));
    }
  }
} catch (e) {}
/* 【2026-09-15 実測で発覚】load() の浅いコピー({ ...DEFAULTS.sections.results, ...保存値 })で、保存に無い入れ子(fx21 / hero など)が DEFAULTS と同じオブジェクトを共有していた。
   その状態でつまみを動かすと DEFAULTS まで書き換わり、「既定へ戻す」「上書きを解除」が効かない。→ 起動時に既定の原本を控え、params は入れ子まで複製して共有を断つ */
const DEFAULTS_PRISTINE = structuredClone(DEFAULTS);
let params = structuredClone(load());
/* 【2026-09-13 比較検証】URL に ?resFx=1|4|5|6|7|9|default を付けると実績の演出案を指定できる(共有用)。
   パネルで別の値を触るまでは保存されない。 */
try {
  const _rfx = location.search.match(/[?&]resFx=(default|11|12|13|14|15|16|17|19|20|21|22|23|24-5|24-2|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|4|5|6)(?:&|$)/);
  if (_rfx) { params.patterns = params.patterns || {}; params.patterns.resFx = _rfx[1]; }
  const _cv = location.search.match(/[?&]cv=(\d{1,2})(?:&|$)/);
  if (_cv) params.cvStyle = _cv[1];   /* お問い合わせのデザイン案(2026-09-15) */
  const _eg = location.search.match(/[?&]edge=(\d)(?:&|$)/);
  if (_eg) { params.cvEdge = _eg[1]; window.__edgeFromUrl = true; }   /* 切れ目の形(2026-09-16)。反映は init で */
  const _fm = location.search.match(/[?&]form=(\d)(?:&|$)/);
  if (_fm) { params.cvForm = _fm[1]; window.__formFromUrl = true; }   /* グラデの形(2026-09-16)。反映は init で */
  const _cta = location.search.match(/[?&]cta=(button|form)(?:&|$)/);
  if (_cta) params.cvCta = _cta[1];   /* 【V5.0】CTA=ボタン/フォーム */
  const _fs = location.search.match(/[?&]fstyle=([1-5])(?:&|$)/);
  if (_fs) params.formStyle = _fs[1];   /* 【V5.0】フォームのスタイル案 */
  const _hd = location.search.match(/[?&]hdr=(1[0-5]|[1-9])(?:&|$)/);
  if (_hd) params.hdrMode = _hd[1];   /* 【V5.0】追従ヘッダーの案 */
} catch (e) {}
/* 【2026-09-08 ヒデさん指定・根治】「ビジョンだけ本番が遅い/直らない」の根本対策。
   世代ガードは『保存世代 < 焼き込み世代』でしか発火しないため、いったん現行世代のまま
   古い(遅い)値で固まったブラウザは値を直しても永久に直らなかった(実測: 現行世代+npOrbitDur3.5
   注入→リロード2回でも3.5のまま)。しかも『速くする移行』のフラグは既に立っていて再適用もされない。
   対策= ビジョン重要値の“内容署名”を持ち、SHIPPED と食い違ったら本番では毎回 SHIPPED の値へ
   同期し直す(=焼き込みが常に正・固まったブラウザも次回ロードで自動回復)。localhost は対象外なので
   ヒデさんのローカル調整は消えない。焼き込み値を変えれば署名が変わり全ブラウザへ行き渡る(世代バンプ不要)。 */
try {
  const _isLocalDev2 = /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname) && !/[?&]prodsim=1/.test(location.search);
  const _visKeys = ['npOrbitDur', 'npOrbitLead', 'npOrbitEase', 'npOrbitOp0', 'npOrbitBlur0', 'npOrbitDir',
    'npFireK', 'npGap', 'npP1', 'npP2', 'npPointDur', 'miniDur', 'revealDur', 'line1At', 'labelDur',
    'msgSize', 'pHSize', 'pPSize', 'pWidth', 'introPat', 'charLag', 'strokeW'];
  const _shipVis = (typeof SHIPPED_SETTINGS !== 'undefined' && SHIPPED_SETTINGS.sections && SHIPPED_SETTINGS.sections.vision) || {};
  const _sig = _visKeys.map(k => k + ':' + _shipVis[k]).join('|');
  if (!_isLocalDev2 && localStorage.getItem('anyflow-vision-sig') !== _sig) {
    if (params.sections && params.sections.vision) {
      for (const k of _visKeys) if (_shipVis[k] !== undefined) params.sections.vision[k] = _shipVis[k];
    }
    /* ⚠️ メモリだけ直しても localStorage の古い値が残ると、署名一致後の次回ロードで再び古値が勝つ。
       保存値(STORAGE_KEY)のビジョンも今この場で SHIPPED へ書き直しておく(＝次回以降も正しい値)。 */
    try {
      const _raw = localStorage.getItem(STORAGE_KEY);
      if (_raw) { const _o = JSON.parse(_raw);
        if (_o && _o.sections && _o.sections.vision) {
          for (const k of _visKeys) if (_shipVis[k] !== undefined) _o.sections.vision[k] = _shipVis[k];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(_o));
        } }
    } catch (e2) {}
    localStorage.setItem('anyflow-vision-sig', _sig);
  }
} catch (e) {}
function loadParams() {
  try {
    let s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    /* 【2026-08-30 ヒデさん指定】保存が無い(=本番の初回など)なら、devで調整した焼き込み値を初期値にする。
       フラグも立てて、適用済み migration が二重に走って値を戻すのを防ぐ。 */
    if (!s && typeof SHIPPED_SETTINGS !== 'undefined') {
      s = JSON.parse(JSON.stringify(SHIPPED_SETTINGS));
      try { for (const fk in SHIPPED_FLAGS) { if (!localStorage.getItem(fk)) localStorage.setItem(fk, SHIPPED_FLAGS[fk]); } } catch (e) {}
    }
    /* ⚠️【2026-08-19】以前は保存されたドットの個数が今と違うと、この if を丸ごと外れて
       【保存値ぜんぶが初期化】されていた。ドットを1個足しただけで
       「動かし方」や「固定追従」の設定まで巻き添えで消える。
       個数が違っても他の設定は生かし、ドットだけ既定で埋めるようにする */
    if (s && Array.isArray(s.dots)) {
      const merged = { ...structuredClone(DEFAULTS), ...s };
      merged.pulse = { ...DEFAULTS.pulse, ...(s.pulse || {}) };
      merged.sphere = { ...DEFAULTS.sphere, ...(s.sphere || {}) };
      merged.planet = { ...DEFAULTS.planet, ...(s.planet || {}) };
      merged.kv = { ...DEFAULTS.kv, ...(s.kv || {}) };
      merged.orbits = {
        outer: { ...DEFAULTS.orbits.outer, ...((s.orbits && s.orbits.outer) || {}) },
        inner: { ...DEFAULTS.orbits.inner, ...((s.orbits && s.orbits.inner) || {}) },
      };
      merged.marquee = { ...DEFAULTS.marquee, ...(s.marquee || {}) };
      /* 【2026-08-19】ロゴの間隔を 96 → 72px に詰めた。
         旧既定(96)のまま保存されている＝触っていない場合だけ、新しい既定に載せ替える */
      if (merged.marquee && merged.marquee.gap === 96) merged.marquee.gap = DEFAULTS.marquee.gap;
  if (typeof merged.replay !== 'boolean') merged.replay = DEFAULTS.replay;
  /* 【2026-08-27】止まったまま保存された古い値の救済。開いた時は必ず再生状態にする */
  merged.running = true;
  merged.orbitEase = merged.orbitEase || DEFAULTS.orbitEase;
  merged.dotGap = merged.dotGap || DEFAULTS.dotGap;
  merged.visReveal = merged.visReveal || DEFAULTS.visReveal;
  merged.visSpin = merged.visSpin || DEFAULTS.visSpin;
  merged.visMove = merged.visMove || DEFAULTS.visMove;
  if (typeof merged.converge !== 'string') merged.converge = DEFAULTS.converge;
  if (!merged.conv || typeof merged.conv !== 'object') merged.conv = {};
  merged.conv.dotMove = { ...DEFAULTS.conv.dotMove, ...((s.conv && s.conv.dotMove) || {}) };   /* 2026-08-26 集約アニメ */
  merged.conv = {                                                                  /* 集約アニメの調整つまみ */
    ...DEFAULTS.conv, ...(s.conv || {}),
    reel:   { ...DEFAULTS.conv.reel,   ...((s.conv && s.conv.reel)   || {}) },
    spiral: { ...DEFAULTS.conv.spiral, ...((s.conv && s.conv.spiral) || {}) },
    accre:  { ...DEFAULTS.conv.accre,  ...((s.conv && s.conv.accre)  || {}) },
    beads:  { ...DEFAULTS.conv.beads,  ...((s.conv && s.conv.beads)  || {}) },
    mesh:   { ...DEFAULTS.conv.mesh,   ...((s.conv && s.conv.mesh)   || {}) },
    link:   { ...DEFAULTS.conv.link,   ...((s.conv && s.conv.link)   || {}) },
    gyro:   { ...DEFAULTS.conv.gyro,   ...((s.conv && s.conv.gyro)   || {}) },
  };
  if (typeof merged.orbitLayout !== 'string') merged.orbitLayout = DEFAULTS.orbitLayout;
  /* 案ごとの形とプリセットの入れ物。古い保存値(全案共通の orbitPresets)からの引っ越しもここで */
  if (!merged.gfxByMode || Array.isArray(merged.gfxByMode)) merged.gfxByMode = {};
  if (!merged.gfxPresets || Array.isArray(merged.gfxPresets)) merged.gfxPresets = {};
  if (!merged.gfxPresetOn || Array.isArray(merged.gfxPresetOn)) merged.gfxPresetOn = {};
  if (!merged.gfxVariantOn || Array.isArray(merged.gfxVariantOn)) merged.gfxVariantOn = {};
  /* 案ごとの軌道回転。古い保存値(全案共通の orbitSpin)は、全案の初期値として配る */
  if (!merged.conv.orbitWidthBy || typeof merged.conv.orbitWidthBy !== 'object') {
    merged.conv.orbitWidthBy = { ...DEFAULTS.conv.orbitWidthBy };
  }
  if (!merged.conv.orbitScaleBy || typeof merged.conv.orbitScaleBy !== 'object') {
    merged.conv.orbitScaleBy = { ...DEFAULTS.conv.orbitScaleBy };
  }
  if (!merged.conv.gyroMixBy || typeof merged.conv.gyroMixBy !== 'object') {
    merged.conv.gyroMixBy = { ...DEFAULTS.conv.gyroMixBy };
  }
  if (!merged.conv.orbitSpinBy || typeof merged.conv.orbitSpinBy !== 'object') {
    const v0 = merged.conv.orbitSpin || 0;
    merged.conv.orbitSpinBy = { off: v0, reel: v0, spiral: v0, accre: v0, mesh: v0, beads: v0, duplex: v0, gyro: v0 };
  }
  /* 【2026-09-26 整理】旧・全案共通プリセット(orbitPresets)を案ごとの引き出しへ移す一度きりの処理は撤去(フラグ済みで二度と動かない) */
  delete merged.orbitPresets; delete merged.orbitPresetOn;

  /* 廃止した案(⑪糸・⑭⑯〜⑳)を選んだままなら既定へ寄せる (2026-08-26) */
  /* ⚠️ ここは CONVERGES(const)の定義より前に走るので、CONVERGES を参照すると TDZ で例外になり、
     【保存した設定がまるごと読めなくなる】(2026-08-26 に実際に踏んだ)。キーは直書きで判定する。 */
  if (!['off', 'reel', 'spiral', 'accre', 'mesh', 'beads', 'duplex', 'gyro'].includes(merged.converge)) {
    merged.converge = DEFAULTS.converge;
  }
  /* 廃止した案・消え方を選んだままの保存値を、生きている値へ寄せる (2026-08-26) */
  if (merged.converge === 'vein' || merged.converge === 'pulse') merged.converge = DEFAULTS.converge;
  /* 【2026-08-27 ヒデさん指定】消え方の選択は廃止。前面カット固定 */
  if (merged.conv.reel) merged.conv.reel.vanish = 'clip';
  /* 惑星の模様 5〜7(C1/C2/C3)は 2026-08-27 に廃止。選んだままなら既定へ寄せる */
  if (!['A1', 'A2', 'A3', 'B'].includes(merged.design)) merged.design = DEFAULTS.design;
  /* 光り方は 2026-08-28 に パルス/波紋 の2つへ。廃止した案を選んだままなら寄せる */
  if (!['pulse', 'echo'].includes(merged.conv.glowKind)) merged.conv.glowKind = 'pulse';
  if (!['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9'].includes(merged.conv.glowEcho)) merged.conv.glowEcho = 'k8';
  for (const kk of ['echoSpeed', 'echoShells', 'echoSpread', 'echoStart', 'echoFade', 'echoAlpha', 'fxEvery', 'fxInertia', 'fxCount',
                    'ringCount', 'ringSpin', 'ringFlat', 'ringSize', 'ringTumble', 'ringWidth', 'startPhase'])
    if (typeof merged.conv[kk] !== 'number') merged.conv[kk] = DEFAULTS.conv[kk];
  if (!['atom', 'saturn', 'rosette', 'globe'].includes(merged.conv.ringShape)) merged.conv.ringShape = DEFAULTS.conv.ringShape;
  if (typeof merged.conv.echoCrisp !== 'boolean') merged.conv.echoCrisp = DEFAULTS.conv.echoCrisp;
  if (!['every', 'count', 'time'].includes(merged.conv.fxMode)) merged.conv.fxMode = DEFAULTS.conv.fxMode;
  merged.kvDesign = 'planet';   /* 【2026-09-26 整理】旧KV(A案p7/B案p9・iframe)は撤去。古い保存値でも惑星に */
  if (merged.crossDelay == null) merged.crossDelay = DEFAULTS.crossDelay;
  if (merged.crossLead == null) merged.crossLead = DEFAULTS.crossLead;
  merged.kv = { ...DEFAULTS.kv, ...(s.kv || {}) };
  merged.sphere = { ...DEFAULTS.sphere, ...(s.sphere || {}) };
  merged.cv = { ...DEFAULTS.cv, ...(s.cv || {}) };   /* 【2026-09-15】お問い合わせのディザ: 保存に無い新しい鍵(色5段・形・暗さ)は既定で埋める */
  if (merged.cvColor && !merged.cvColorBy) merged.cvColorBy = { [String(merged.cvStyle || '0')]: String(merged.cvColor) };   /* 旧: 全体で1つ → デザイン案ごと */
  if (!merged.cvColorBy || typeof merged.cvColorBy !== 'object') merged.cvColorBy = {};
      merged.sections = {
        common:  { ...DEFAULTS.sections.common,  ...((s.sections && s.sections.common) || {}) },
        vision:  { ...DEFAULTS.sections.vision,  ...((s.sections && s.sections.vision) || {}) },
        results: { ...DEFAULTS.sections.results, ...((s.sections && s.sections.results) || {}) },
        dev:     { ...DEFAULTS.sections.dev,     ...((s.sections && s.sections.dev) || {}) },
        cases:   { ...DEFAULTS.sections.cases,   ...((s.sections && s.sections.cases) || {}) },
      };
      /* 【2026-08-19】一度 2.0秒 に変えたが「前の方が良かった」とのことで 1.3秒 に戻した。
         2.0秒 のまま保存されている場合だけ、元の 1.3秒 に戻す */
      if (merged.sections.dev && Math.abs(merged.sections.dev.stackDur - 2.0) < 1e-6)
        merged.sections.dev.stackDur = DEFAULTS.sections.dev.stackDur;
      /* ⚠️【2026-08-19 重大バグ】ここで DEV_SWAP_EASES を参照していた。
         あの定数の定義はこの行よりずっと下にあるため ReferenceError になり、
         下の catch に飲み込まれて【保存値がまるごと無視され、毎回そっくり初期値で起動】していた。
         「保存ボタンを押しても次に開くと元に戻る」の正体がこれ。
         load() の中では、この関数より下で定義されるものを絶対に参照しないこと。
         swapEase の範囲チェックは DEV_SWAP_EASES を定義した直後で行う。 */
      /* 【2026-08-19】実績の左グラデ画像はパララックスなしに変更（旧既定 16 → 0）。
         旧既定のまま(=触っていない)なら新しい既定に載せ替える */
      if (merged.sections.results && Math.abs(merged.sections.results.parallax - 16) < 1e-6)
        merged.sections.results.parallax = DEFAULTS.sections.results.parallax;
      /* 【2026-08-25】ビジョン: 上下分割の廃止＋軌道の出現位置/サイズ変更。
         旧既定のまま(=触っていない)保存だけ、新しい既定に載せ替える。触った値は尊重。
         miniCX / miniCY は新規プロパティなので、上の spread で自動的に新既定が入る。 */
      const _visV = merged.sections.vision;
      if (_visV) {
        if (Math.abs(_visV.splitAmt  - 92)   < 1e-6) _visV.splitAmt  = DEFAULTS.sections.vision.splitAmt;   // 92 → 0
        if (Math.abs(_visV.driftAmt  - 130)  < 1e-6) _visV.driftAmt  = DEFAULTS.sections.vision.driftAmt;   // 130 → 0
        if (Math.abs(_visV.miniScale - 0.16) < 1e-6) _visV.miniScale = DEFAULTS.sections.vision.miniScale;  // 0.16 → 0.31
        /* 【2026-08-29】「2つの価値」見出しを非表示にしたので、その待ちを詰める。旧既定のままの人だけ寄せ直す */
        if (Math.abs(_visV.npP1 - 0.95) < 1e-6) _visV.npP1 = DEFAULTS.sections.vision.npP1;   // 0.95 → 0.40
        if (Math.abs(_visV.npP2 - 1.35) < 1e-6) _visV.npP2 = DEFAULTS.sections.vision.npP2;   // 1.35 → 0.80
      }
      /* 【2026-08-25】導入事例: カードスタック → 2×2グリッド＋ライン描画に刷新。
         カード出現の意味(基準)が devFin→再生進捗p に変わったので、旧既定のまま保存されていたら
         新既定へ載せ替える。lineAt 等の新プロパティは上の spread で自動的に入る。 */
      const _casV = merged.sections.cases;
      if (_casV) {
        if (Math.abs(_casV.cardAt  - 0.84) < 1e-6) _casV.cardAt  = DEFAULTS.sections.cases.cardAt;   // 0.84 → 0.56
        if (Math.abs(_casV.cardGap - 0.05) < 1e-6) _casV.cardGap = DEFAULTS.sections.cases.cardGap;  // 0.05 → 0.06
        if (Math.abs(_casV.cardDur - 0.16) < 1e-6) _casV.cardDur = DEFAULTS.sections.cases.cardDur;  // 0.16 → 0.22
      }
      merged.patterns = { ...DEFAULTS.patterns, ...(s.patterns || {}) };
      if (!['A', 'B', 'C'].includes(merged.patterns.dev)) merged.patterns.dev = 'A';
      if (!['A', 'B'].includes(merged.patterns.cases)) merged.patterns.cases = 'A';
      if (!['A', 'B', 'C'].includes(merged.patterns.mock)) merged.patterns.mock = 'B';
      /* 【2026-08-30 ヒデさん指定】強み強調はグラデ揺らぎ(live)で確定。保存値がどれでも live へ */
      merged.visStrongFx = 'live';
      /* 【2026-08-30 ヒデさん指定・パネル整理】進み方=自動再生(時間)・固定なし で確定。保存値がどれでもこの組に */
      merged.drive = 'time';
      merged.scrollHold = 'smooth';
      /* 【2026-08-30 ヒデさん指定】軌道ドットの周回の緩急(pulse)は「急に速く/遅く」に見えるため削除(0固定) */
      if (merged.pulse) merged.pulse.amp = 0;
      /* 【2026-08-30】旧「粒(吸い込み)専用の連動(reelP.link)」を共通トグル(spinLink)へ引き継ぎ */
      if (merged.conv && merged.conv.reelP && merged.conv.reelP.link === false && merged.conv.spinLink == null)
        merged.conv.spinLink = false;
      {
        const _rv = merged.sections.vision && merged.sections.vision.revealDur;
        if (_rv != null && (Math.abs(_rv - 0.7) < 1e-6 || Math.abs(_rv - 0.9) < 1e-6))
          merged.sections.vision.revealDur = 1.15;
      }
      /* ⚠️ 今の DOTS の個数ぶんだけ作る。保存が足りなければ既定で埋め、余っていれば捨てる
         (s.dots を起点にすると、増えたドットのぶんが undefined になって落ちる) */
      merged.dots = DEFAULTS.dots.map((d, i) => ({ ...d, ...(s.dots[i] || {}) }));
      /* 削除済みの選択肢が保存されていた場合はデフォルトに戻す */
      if (!DESIGNS[merged.design]) merged.design = DEFAULTS.design;
      if (merged.sway < 1 || merged.sway > SWAYS.length) merged.sway = 1;
      /* 【2026-08-27 ヒデさん指定】①のスピンも既定オフ。保存値が残っている人も一度だけ揃える */
      /* 【2026-08-27 ヒデさん指定】①の流れは「上がる」で固定(選択UIは廃止)。保存値も揃える */
      if (merged.conv && merged.conv.reel) merged.conv.reel.flow = 'up';
      if (merged.dither < 1 || merged.dither > DITHERS.length) merged.dither = 1;
      if (merged.dotGap < 1 || merged.dotGap > DOT_GAPS.length) merged.dotGap = DEFAULTS.dotGap;
      return merged;
    }
  } catch (e) {
    /* ⚠️【2026-08-19】ここは以前 catch (e) {} と【握りつぶし】ていた。
       そのせいで load() の中のちょっとした書き間違い（下で定義される定数の参照）が
       「保存値が毎回まるごと捨てられる」という症状になり、原因が全く見えなかった。
       黙って初期値に戻すのは同じでよいが、必ず理由を残すこと。 */
    console.error('[anyflow] 保存した設定を読み込めませんでした。初期値で起動します:', e);
  }
  return structuredClone(DEFAULTS);
}
/* 【2026-08-27 ヒデさん指定】プリセットは STORAGE_KEY とは別に持つ。
   ⚠️ 本体の保存値が無い / バージョンを上げて捨てた時は loadParams() が
      いきなり DEFAULTS を返すので、そこを通っても必ずプリセットを載せ直す。
      (この受け皿を作る前は、キーを上げるとプリセットも消えていた) */
function load() {
  const merged = loadParams();
  const st = presetStoreLoad();
  if (st) {
    merged.gfxPresets = st.presets || {};
    merged.gfxPresetOn = (st.on && typeof st.on === 'object') ? st.on : {};
    /* ⚠️ hidden が入っていない古い保管を読んだ時に {} で上書きすると、
       消した案が勝手に戻ってしまう。入っている時だけ差し替える (2026-08-28) */
    if (st.hidden && typeof st.hidden === 'object') merged.gfxVariantHidden = st.hidden;
    if (st.trash && typeof st.trash === 'object') merged.gfxPresetTrash = st.trash;   /* 2026-08-29: 削除プリセットのゴミ箱を復元 */
    if (st.over && typeof st.over === 'object') merged.gfxVarOverride = st.over;      /* 2026-08-30: バリエーション上書きの控えを復元 */
    if (Array.isArray(st.fav)) merged.gfxFav = st.fav;                              /* 2026-09-01: お気に入りを復元 */
  } else if (merged.gfxPresets && Object.keys(merged.gfxPresets).length) {
    /* まだ別置きしていない古い持ち物は、ここで引っ越す */
    try { localStorage.setItem(PRESET_KEY, JSON.stringify({ v: 1, presets: merged.gfxPresets, on: merged.gfxPresetOn || {} })); } catch (e) {}
  }
  /* 【2026-08-30 ヒデさん指定】プリセット保管が無い(=本番の初回など)なら、
     選択中プリセット・削除した案・ゴミ箱も焼き込み(SHIPPED_PRESET_STATE)から復元 */
  if (!st && typeof SHIPPED_PRESET_STATE !== 'undefined') {
    /* 【2026-08-31 ヒデさん指定】プリセット保管が無い(=本番の初回など)は、devの最新状態を丸ごと初期値に:
       残っているプリセットチップ(presets)・選択(on)・削除した案(hidden)。ゴミ箱(trash)は完全削除済み={}。 */
    if (SHIPPED_PRESET_STATE.presets) merged.gfxPresets = JSON.parse(JSON.stringify(SHIPPED_PRESET_STATE.presets));
    merged.gfxPresetOn = JSON.parse(JSON.stringify(SHIPPED_PRESET_STATE.on || {}));
    merged.gfxVariantHidden = JSON.parse(JSON.stringify(SHIPPED_PRESET_STATE.hidden || {}));
    merged.gfxPresetTrash = JSON.parse(JSON.stringify(SHIPPED_PRESET_STATE.trash || {}));
    if (SHIPPED_PRESET_STATE.over) merged.gfxVarOverride = JSON.parse(JSON.stringify(SHIPPED_PRESET_STATE.over));   /* 2026-09-01: 上書きも本番初期値へ */
    if (Array.isArray(SHIPPED_PRESET_STATE.fav)) merged.gfxFav = JSON.parse(JSON.stringify(SHIPPED_PRESET_STATE.fav));
  }
  if (!merged.gfxPresets || Array.isArray(merged.gfxPresets)) merged.gfxPresets = {};
  if (!merged.gfxPresetOn || Array.isArray(merged.gfxPresetOn)) merged.gfxPresetOn = {};
  if (!merged.gfxVariantHidden || Array.isArray(merged.gfxVariantHidden)) merged.gfxVariantHidden = {};
  /* 【2026-08-29→08-31 改】SHIPPED_PRESETS(昇格バリエーションの土台・凍結)での seed は、
     SHIPPED_PRESET_STATE に presets が無い古い焼き込みの時だけ。最新焼き込みでは
     「ヒデさんがチップとして残したもの」だけを出す(削除したチップを本番で復活させない)。 */
  try {
    if (!(typeof SHIPPED_PRESET_STATE !== 'undefined' && SHIPPED_PRESET_STATE.presets))
      for (const mk in SHIPPED_PRESETS) { if ((SHIPPED_PRESETS[mk] || []).length && (!merged.gfxPresets[mk] || !merged.gfxPresets[mk].length)) { merged.gfxPresets[mk] = SHIPPED_PRESETS[mk].map(function (p) { return { name: p.name, data: JSON.parse(JSON.stringify(p.data)) }; }); } }
  } catch (e) {}
  return merged;
}
/* ⚠️【2026-08-27 事故対応】直接編集をオンにすると再生を止める(params.running=false)。
   その状態のまま保存すると【次に開いた時に何も動かず＝画面が真っ白】になる(実際に発生)。
   一時停止は"今だけの状態"なので、保存には必ず再生中として書き出す。 */
function save() {
  /* 【2026-09-20 ヒデさん依頼・PC/SP独立の要】スマホ(実機/スマホ幅=isMobile)は「閲覧専用」。
     起動時 applyMbToParams が SP専用の値(params.mb)を本体 params に流し込んで描画しているため、
     ここで保存すると PC の基準値まで SP の値で上書きされてしまう(＝SPがPCに漏れる)。
     編集・保存は PC 側(スマホモードのトグルは PC 上のクラス切替で isMobile=false のまま)だけで行う。 */
  if (typeof isMobile !== 'undefined' && isMobile) return;
  /* いま画面に出ている形を、いまの案の引き出しへ入れてから保存する
     (2026-08-27 ヒデさん指定・案ごとに形を分ける) */
  if (typeof gfxStash === 'function') gfxStash();
  try { if (typeof varAutoCapture === 'function') varAutoCapture(); } catch (e) {}   /* 【2026-09-20】案(kvVar等)の上書き控えを保存前に最新化(デフォルトにしても戻るバグの修正) */
  /* 【2026-09-15 ヒデさん指摘「デフォルトにしても反映されない」の根治】選択中の KV バリエーションに「⤓ いまの設定で上書き」の控えがあると、
     起動時にその控えが再適用されて保存値に勝つ(実測: 線の濃さ 0.25 で保存→再読込で 0.54 に戻った)。
     「これをデフォルトに設定」＝いま見えている形を既定にする操作なので、控えも同じ内容に更新する */
  try {
    const _m = params.converge || 'reel', _i = params.gfxVariantOn && params.gfxVariantOn[_m];
    const _v = (typeof GFX_VARIANTS !== 'undefined' && GFX_VARIANTS[_m] || [])[_i];
    if (_v && params.gfxVarOverride && params.gfxVarOverride[_m] && params.gfxVarOverride[_m][_v.name]) { params.gfxVarOverride[_m][_v.name] = gfxSnapshotFull(); presetStoreSave(); }
  } catch (e) {}
  const out = { ...params, running: true };
  /* プリセットと「消したバリエーション」は PRESET_KEY 側だけで持つ。本体に二重で持たせない
     (二重に持つと、古いほうが勝って消した案が戻る事故になる) */
  delete out.gfxPresets; delete out.gfxPresetOn; delete out.gfxVariantHidden; delete out.gfxFav;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
}
/* ===== 保存の考え方 (2026-08-19 ヒデさん指定) =====
   以前は「触った瞬間に保存」だったので、ちょっと試しただけの値が
   そのまま次回の既定になってしまい、元に戻したいのに戻せなかった。
   いまは【触っている間は画面で試せるだけ／保存ボタンを押して初めて残る】。
   dirty = 保存していない変更があるか */
let dirty = false;
let varCaptureReady = false;   /* 【2026-09-20】起動時の案適用が済むまで、markDirty での即時控えを止める門番(起動途中の初期値で控えを汚さない) */
let syncSaveBtn = null;   /* パネルを組む時に、保存ボタンの表示を更新する関数が入る */
function markDirty() {
  dirty = true; if (syncSaveBtn) syncSaveBtn(); if (syncPresetPills) syncPresetPills();
  if (typeof gfxTouchVariant === 'function') gfxTouchVariant();
  /* 【2026-09-20 ヒデさん報告・巻き戻りの根治強化】つまみを触った瞬間に、選択中の案の控え(gfxVarOverride)を
     【メモリ内だけ】即時更新する。これで 0.8秒の自動保存を待たずに案を選び直しても・パネルが再描画されても
     applyKvVariant が『いまの値』を再適用する(＝焼き込み値に戻らない)。localStorage への書き込みは下のデバウンスで。
     ⚠️ 起動が終わる(案の焼き込み適用が済む)までは動かさない。起動途中の初期値を控えに焼くと、
        その後の applyKvVariant が壊れた控えを適用して逆に焼き込み値へ戻ってしまうため(varCaptureReady で門番)。 */
  if (varCaptureReady) { try { if (typeof varAutoCapture === 'function') varAutoCapture(true); } catch (e) {} }
  /* 【2026-09-20 ヒデさん依頼】スマホ実機と同期中は、ドラッグ中もリアルタイムに反映(800msの保存を待たずに送る)。同期ON時のみ・約140msのthrottle。
     save() は localStorage 保存＋(liveSyncがラップして)スマホへ push するので、これで保存前でも実機がすぐ変わる。 */
  if (typeof window !== 'undefined' && window.__liveSyncOn && varCaptureReady) {
    const _now = Date.now();
    if (!markDirty._live || _now - markDirty._live > 140) { markDirty._live = _now; try { save(); } catch (e) {} }
  }
  /* 【2026-09-01 ヒデさん指定】調整は自動で保存する(リロード・ブラウザを閉じても引き継ぐ)。
     以前は「保存ボタンを押して初めて残る」設計(2026-08-19)だったが、押し忘れると
     調整が消える方が困る、との指定で自動保存に変更。連続ドラッグ中は書かない(0.8秒デバウンス)。 */
  clearTimeout(markDirty._t);
  markDirty._t = setTimeout(() => {
    try { if (typeof varAutoCapture === 'function') varAutoCapture(); } catch (e) {}   /* 【2026-09-19】案の上書き控えを常に最新に */
    try { save(); dirty = false; if (syncSaveBtn) syncSaveBtn(); } catch (e) {}
  }, 800);
}

/* ================= ドット要素 (奥/手前レイヤーに1個ずつ) ================= */
const SVG_NS = 'http://www.w3.org/2000/svg';
const dotsBackG = document.getElementById('dotsBack');
const dotsFrontG = document.getElementById('dotsFront');
/* ===== 軌道を回る「緩急」パターン (2026-08-15) =====
   手前に来ると速く、奥へ行くとゆったり回る。
   仕組み: 等速の角度 θ を φ = θ + a·sin(θ - θ0) に写す。
   すると角速度は 1 + a·cos(θ - θ0) になり、手前で最大・奥で最小になる。
   ⚠️ a を 1 に近づけると角速度が 0 に近づいて「奥で止まって見える」ので 0.85 が上限 */
const ORBIT_EASES = [
  { id: 'even',   name: '等速',  desc: 'ずっと同じ速さで回る。' },
  { id: 'strong', name: '緩急',  desc: '手前に来ると速く、奥へ行くとゆっくり回る。奥行きが出る。', amt: 0.85 },
];
/* posOn は「楕円ローカルで下半分(sin>0)が手前」。手前の真ん中は θ=90° なので
   θ0 = 90° にすると、いちばん手前で速度が最大になる */
function orbitEase(deg) {
  const a = ORBIT_EASES[(params.orbitEase || 1) - 1].amt || 0;
  if (a <= 0) return deg;
  const t = (deg - 90) * Math.PI / 180;
  return deg + a * Math.sin(t) * (180 / Math.PI);
}

const dotEls = DOTS.map(d => {
  const mk = () => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('r', DOT_R);
    c.setAttribute('fill', d.color);
    return c;
  };
  const back = mk(), front = mk();
  dotsBackG.appendChild(back);
  dotsFrontG.appendChild(front);
  return { back, front, k: 1 };
});

/* ドットの出現度合い (0=まだ無い / 1=出きった)。
   Our Vision で軌道が出てくる時に、1つずつ順に出すために使う (2026-08-17 指定)。
   ⚠️ 軌道の SVG は KV と Our Vision で使い回しているので、
      Our Vision 以外の場面では 1 のままにしておくこと */
const dotK = DOTS.map(() => 1);

/* 現在の軌道ジオメトリ = カンプ基準値 × パネル設定 (サイズ/角度/位置) + ゆれ */
function orbitGeom(key, noSpin) {
  /* noSpin=true: 軌道自体の回転(convOrbitSpin/ジャイロ回転)を除いたジオメトリを返す。
     【2026-08-30 ヒデさん指定】粒(吸い込み)を軌道の回転と連動させない時に使う(粒の回転軸を固定)。 */
  const b = orbitBase(key);   /* レイアウト(カンプ通り/ジャイロクロス)の基準値 */
  const p = params.orbits[key];
  let wobble = 0;
  if (p.wobbleAmp > 0 && p.wobblePeriod > 0) {
    wobble = p.wobbleAmp * Math.sin(2 * Math.PI * elapsed / p.wobblePeriod + p.wobblePhase * Math.PI / 180);
  }
  /* ①収縮ループ中は軌道を固定 (傾き・クロスなし。ヒデさん指定 2026-08-26) */
  const convReelFixed = params.kvDesign === 'planet' && params.converge === 'reel';
  if (!convReelFixed && SWAYS[(params.sway || 1) - 1].id === 'cross') {
    /* クロス: 2本が逆方向に傾く。
       ⚠️ 最初からクロスしているとカンプと違うので、はじめは平行(傾き0)にしておき、
          crossLead 秒かけてじわじわ交差しはじめる */
    const lead = clamp01((elapsed - params.crossDelay) / Math.max(0.1, params.crossLead));
    wobble += (key === 'outer' ? 6 : -6) * (params.swayAmp == null ? 1 : params.swayAmp) * Math.sin(2 * Math.PI * elapsed / 10) * easeIO(lead);
  }
  let dfx = 0, dfy = 0;
  /* 【2026-09-01 ヒデさん指定】横揺れ(B3): 内外の輪を左右へ。内側はディレイぶん遅れて追従 */
  const hs = params.conv && params.conv.hsway;
  if (hs && hs.on && params.kvDesign === 'planet') {
    const amp = key === 'inner' ? (hs.innerAmp || 0) : (hs.outerAmp || 0);
    if (amp > 0) {
      const T = Math.max(0.5, hs.period || 6);
      const ph = 2 * Math.PI * (elapsed - (key === 'inner' ? (hs.delay || 0) : 0)) / T;
      let w;
      if (hs.pat === 'drift')    w = 0.62 * Math.sin(ph) + 0.38 * Math.sin(ph * 0.53 + 1.7);  /* ふわふわ(不規則) */
      else if (hs.pat === 'tri') w = 2 * Math.asin(Math.sin(ph)) / Math.PI;                    /* 等速で往復(三角波) */
      else                       w = Math.sin(ph);                                             /* なめらか(振り子) */
      dfx += amp * w;
    }
  }
  const dr = (params.conv && params.conv.orbitDrift) || 0;
  if (dr > 0 && params.kvDesign === 'planet') {
    const ph = key === 'inner' ? 2.1 : 0;
    dfx = Math.sin(elapsed * 0.37 + ph) * dr * 26;
    dfy = Math.cos(elapsed * 0.29 + ph) * dr * 18;
  }
  /* 【2026-08-27 ヒデさん指定】⑦ジャイロ回転: 輪そのものが独楽のように転がる。
     面の向きを回しながら、縦の潰れを |cos| で伸び縮みさせると
     2Dのままでも「立体的に転がっている」ように見える。
     さらに周期的に惑星へ引き寄せて、集約している感じを出す。 */
  let gyK = 1, gyRot = 0, gyPull = 1;
  /* 【2026-08-28 ヒデさん指定】⑦だけの動きだった「転がり」を、どの案にも混ぜられるようにした。
     mix = 0 で混ぜない / 1 で⑦と同じだけ転がる。⑦を選んでいる時は常に 1 */
  /* 【2026-08-29 ヒデさん指定】ジャイロの転がりも既定オフに統一。以前は converge==='gyro' で強制1(常に回転)
     だったのをやめ、gyroMixBy(=軌道の回転トグルで制御)に一本化。0でジャイロも止まる。 */
  const gyMix = (params.kvDesign !== 'planet') ? 0
    : Math.max(0, Math.min(1, ((params.conv.gyroMixBy || {})[params.converge] || 0)));
  if (gyMix > 0) {
    const G = params.conv.gyro;
    const t = kvGT() * Math.max(0, G.tumble == null ? 1 : G.tumble);
    const ph = (key === 'inner' ? (G.phase == null ? 90 : G.phase) : 0) * Math.PI / 180;
    const thin = Math.max(0.02, G.thin == null ? 0.06 : G.thin);
    const kFull = thin + (1 - thin) * Math.abs(Math.cos(t * 0.9 + ph));
    gyK = 1 + (kFull - 1) * gyMix;                            /* 混ぜ具合ぶんだけ潰す */
    gyRot = kvGT() * (G.spin == null ? 1 : G.spin) * 26 * (key === 'inner' ? -1 : 1) * gyMix;
    const pull = Math.max(0, G.pull == null ? 0.25 : G.pull);
    if (pull > 0) {
      const cyc = Math.max(0.5, G.pullT == null ? 5 : G.pullT);
      const u = (kvGT() % cyc) / cyc;                        /* 0→1 のくり返し */
      gyPull = 1 - pull * gyMix * Math.pow(Math.sin(u * Math.PI), 2);
    }
  }
  return {
    cx: b.cx + p.dx + dfx, cy: b.cy + p.dy + dfy,
    /* 案ごとの「軌道のサイズ」もここで掛ける (2026-08-28 ヒデさん指定) */
    rx: b.rx * p.scale * gyPull * convOrbitScale(),
    ry: b.ry * p.scale * (p.flat == null ? 1 : p.flat) * gyK * gyPull * convOrbitScale(),
    /* 【2026-08-27 ヒデさん指定】軌道そのものを回す/漂わせる(これまでは形が固定だった)。
       惑星の案を選んでいる時だけ効かせる */
    rot: b.rot + p.angle + wobble + (noSpin ? 0 : convOrbitSpin(key) + gyRot),
  };
}

/* ===== 楕円の上に「見た目が均等」に点を並べるための表 (2026-08-28 ヒデさん指定) =====
   ⚠️ これまでは【角度を等分】して並べていた。楕円は長径の両端でカーブがきつく、
      同じ角度でも弧の長さが短いので、そこだけ点が詰まって見えていた(ヒデさん指摘の箇所)。
   弧の長さで等分し直すと、見た目が均等になる。
   ・表は「1周のどこ(u=0〜1)」→「楕円の角度(度)」の対応。
   ・形(ry/rx)が同じなら結果も同じなので、比率ごとに作って使い回す(小数2桁で丸めて共用)。
   ・u を進めれば弧の上を一定の速さで進むので、端で速くなる/遅くなるムラも消える。 */
const convArcTables = new Map();
function convArcTable(ratio) {
  const key = ratio.toFixed(2);
  let t = convArcTables.get(key);
  if (t) return t;
  const r = Math.max(0.02, +key);
  const STEPS = 1440, cum = [0];
  let px = 1, py = 0, total = 0;
  for (let i = 1; i <= STEPS; i++) {
    const a = i / STEPS * Math.PI * 2;
    const x = Math.cos(a), y = Math.sin(a) * r;
    total += Math.hypot(x - px, y - py); cum.push(total); px = x; py = y;
  }
  const N = 512; t = new Float32Array(N + 1);
  let j = 0;
  for (let k = 0; k <= N; k++) {
    const want = total * k / N;
    while (j < STEPS && cum[j + 1] < want) j++;
    const seg = (cum[j + 1] - cum[j]) || 1;
    t[k] = ((j + (want - cum[j]) / seg) / STEPS) * 360;
  }
  t[N] = 360;
  convArcTables.set(key, t);
  if (convArcTables.size > 48) convArcTables.delete(convArcTables.keys().next().value);
  return t;
}
/* u(0〜1、はみ出しても可) → 楕円の角度(度) */
function convArcAngle(ratio, u) {
  const t = convArcTable(ratio), N = t.length - 1;
  const uu = u - Math.floor(u);
  const x = uu * N, i = Math.floor(x), f = x - i;
  return t[i] + (t[i + 1] - t[i]) * f;
}

function posOn(g, deg) {
  const t = deg * Math.PI / 180;
  const rot = g.rot * Math.PI / 180;
  const lx = g.rx * Math.cos(t), ly = g.ry * Math.sin(t);
  return {
    x: g.cx + lx * Math.cos(rot) - ly * Math.sin(rot),
    y: g.cy + lx * Math.sin(rot) + ly * Math.cos(rot),
    front: Math.sin(t) > 0,   // 楕円ローカルで下半分 = 手前側
  };
}

/* ================= 【2026-08-29 ヒデさん指定】自由回転＝軌道の疑似3D =================
   惑星は動かさず、軌道(楕円)を「3Dの円」として捉え、傾けた分だけ形を計算し直して
   2Dのまま描く(ペラペラにならない)。惑星中心を軸に system 全体を倒す。前後(z)で分割し、
   手前(z>=0)は惑星の前(layer-front)、奥(z<0)は惑星の後ろ(layer-back)に描く。 */
const kvRepro = (function () {
  const D2R = Math.PI / 180;
  const C0X = 457.1, C0Y = 288.3;   // 惑星(グラフィック)の中心＝倒す時の軸
  let bg, fg, dbg, dfg, ready = false;
  function grp(parent) { const g = document.createElementNS(SVG_NS, 'g'); parent.appendChild(g); return g; }
  function ensure() {
    if (ready) return;
    const lb = document.querySelector('.orbit .layer-back'), lf = document.querySelector('.orbit .layer-front');
    if (!lb || !lf) return;
    bg = grp(lb); dbg = grp(lb);   // 奥の軌道 / 奥のドット
    fg = grp(lf); dfg = grp(lf);   // 手前の軌道 / 手前のドット
    ready = true;
  }
  function rot3(x, y, z, ax, ay, az) {
    ax *= D2R; ay *= D2R; az *= D2R;
    let y1 = y * Math.cos(ax) - z * Math.sin(ax), z1 = y * Math.sin(ax) + z * Math.cos(ax);   // X(奥に倒す)
    let x2 = x * Math.cos(ay) + z1 * Math.sin(ay), z2 = -x * Math.sin(ay) + z1 * Math.cos(ay); // Y
    let x3 = x2 * Math.cos(az) - y1 * Math.sin(az), y3 = x2 * Math.sin(az) + y1 * Math.cos(az); // Z
    return [x3, y3, z2];
  }
  /* 楕円 g={cx,cy,rx,ry,rot} 上の角度 th(ラジアン) の点を、傾いた円として3D化 → 自由回転 → 投影 */
  function pt3(g, th, ax, ay, az) {
    const rx = g.rx, ry = g.ry, rot = g.rot * D2R;
    const wide = rx >= ry;
    const R = wide ? rx : ry;
    const phi = Math.acos(Math.max(0, Math.min(1, wide ? ry / rx : rx / ry)));
    let lx, ly, lz;
    if (wide) { lx = R * Math.cos(th); ly = R * Math.sin(th) * Math.cos(phi); lz = R * Math.sin(th) * Math.sin(phi); }
    else { lx = R * Math.cos(th) * Math.cos(phi); ly = R * Math.sin(th); lz = R * Math.cos(th) * Math.sin(phi); }
    const x3 = lx * Math.cos(rot) - ly * Math.sin(rot), y3 = lx * Math.sin(rot) + ly * Math.cos(rot);
    const p = rot3(g.cx + x3 - C0X, g.cy + y3 - C0Y, lz, ax, ay, az);
    return [C0X + p[0], C0Y + p[1], p[2]];   // [x, y, depth(手前が+)]
  }
  function ringPaths(g, ax, ay, az) {
    const N = 128, pts = [];
    for (let i = 0; i <= N; i++) pts.push(pt3(g, i / N * 2 * Math.PI, ax, ay, az));
    const segs = { front: [], back: [] }; let cur = null, sign = null;
    for (const p of pts) {
      const s = p[2] >= 0 ? 'front' : 'back';
      if (s !== sign) { if (cur && cur.length > 1) segs[sign].push(cur); cur = [p]; sign = s; }
      else cur.push(p);
    }
    if (cur && cur.length > 1) segs[sign].push(cur);
    const toD = run => 'M' + run.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    return { front: segs.front.map(toD), back: segs.back.map(toD) };
  }
  function path(parent, d, stroke, w) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', stroke);
    p.setAttribute('stroke-width', w); p.setAttribute('stroke-linecap', 'round');
    parent.appendChild(p);
  }
  function readEll(e) {
    const tr = e.getAttribute('transform') || ''; const m = /rotate\(([-\d.]+)/.exec(tr);
    return { cx: +e.getAttribute('cx'), cy: +e.getAttribute('cy'), rx: +e.getAttribute('rx'), ry: +e.getAttribute('ry'), rot: m ? +m[1] : 0 };
  }
  const HIDE_IDS = ['ellOuterF', 'ellOuterB', 'ellInnerF', 'ellInnerB'];
  function setHidden(hide) {
    const d = hide ? 'none' : '';
    for (const id of HIDE_IDS) { const e = document.getElementById(id); if (e) e.style.display = d; }
    /* 【2026-09-02 ヒデさん指定】自由回転で回すのは軌道(輪・アトム型リング)だけ。
       粒・ドット(基本7個/データ粒/漂う粒)は連動させない＝隠さず通常描画のまま残す。
       以前はここで dotsBackG/dotsFrontG ごと非表示にしていたため、XYZを動かした瞬間に
       粒が全部消える(アトム型では再投影も無く完全に消える)バグになっていた */
    if (dotsBackG) dotsBackG.style.display = '';
    if (dotsFrontG) dotsFrontG.style.display = '';
    if (typeof convShapeBack !== 'undefined' && convShapeBack) for (const e of convShapeBack) e.style.display = d;
    if (typeof convShapeFront !== 'undefined' && convShapeFront) for (const e of convShapeFront) e.style.display = d;
  }
  function clear() { for (const g of [bg, fg, dbg, dfg]) if (g) g.textContent = ''; }
  function update(geoms, shapeOn) {
    ensure(); if (!ready) return;
    const kv = params.kv || {}; const ax = kv.rotX || 0, ay = kv.rotY || 0, az = kv.rotZ || 0;
    const active = !!(ax || ay || az);
    if (!active) { setHidden(false); clear(); return; }
    setHidden(true); clear();
    /* いま出ている軌道リングを集める */
    const rings = [];
    if (shapeOn && typeof convShapeBack !== 'undefined' && convShapeBack) {
      for (let i = 0; i < convShapeBack.length; i++) {
        const e = convShapeBack[i]; if (+(e.getAttribute('opacity') || 0) < 0.02) continue;
        const w = e.getAttribute('stroke-width') || '3';
        rings.push({ g: readEll(e), gf: 'url(#gShRF' + i + ')', gb: 'url(#gShRB' + i + ')', w });
      }
    } else {
      const oW = (document.getElementById('ellOuterF') || {}).getAttribute ? document.getElementById('ellOuterF').getAttribute('stroke-width') : '3';
      const iW = (document.getElementById('ellInnerF') || {}).getAttribute ? document.getElementById('ellInnerF').getAttribute('stroke-width') : '3';
      const C = params.conv || {};
      if (C.showOuter !== false) rings.push({ g: geoms.outer, gf: 'url(#gOuterF)', gb: 'url(#gOuterB)', w: oW || '3' });
      if (C.showInner !== false) rings.push({ g: geoms.inner, gf: 'url(#gInnerF)', gb: 'url(#gInnerB)', w: iW || '3' });
    }
    for (const r of rings) {
      const { front, back } = ringPaths(r.g, ax, ay, az);
      for (const d of back) path(bg, d, r.gb, r.w);
      for (const d of front) path(fg, d, r.gf, r.w);
    }
    /* 【2026-09-02 ヒデさん指定】ドットの再投影は廃止。粒・ドットは自由回転に連動させず、
       通常パイプライン(隠していない dotsBackG/dotsFrontG)がそのまま描き続ける */
  }
  return { update, setHidden };
})();

/* ===== ネットワーク周回 3D (2026-08-29 ヒデさん指定・Figma 15970-42735 の再現) =====
   周回のみグループの新バリエーション。惑星は固定のまま、3本の軌道を「傾いた3Dの円」として描く。
   3D=手前が太く奥が細い線幅テーパー＋物理(手前のドットは速く/奥はゆっくり)。2Dはフラット均一線。
   実測(frame 850x521・惑星448.67,255.64)を KV座標系(915.483x630・惑星457.1,288.3)へ平行移動。 */
const net3d = (function () {
  const D2R = Math.PI / 180;
  const SX = 457.1 - 448.67, SY = 288.3 - 255.64;   // 惑星中心をKVへ合わせる平行移動
  const ORBITS = [
    { key: 'big',   cx: 425.1 + SX, cy: 260.4 + SY, R: 441.5, phi: 81,   rho: -26.79, grad: 'gNet0', flipZ: 1, dot: { ang: 210, c: '#0EBBFF' } },
    { key: 'horiz', cx: 425.1 + SX, cy: 284.1 + SY, R: 376.5, phi: 80.6, rho: 0,      grad: 'gNet1', flipZ: 1, dot: { ang: 205, c: '#0E4497' } },
    { key: 'cross', cx: 437.5 + SX, cy: 263.7 + SY, R: 174,   phi: 80.6, rho: 27.34,  grad: 'gNet2', flipZ: 1, dot: { ang: 150, c: '#FF5D97' } },
  ];
  ORBITS.forEach(o => { o.theta = o.dot.ang * D2R; });
  let bg, fg, dbg, dfg, ready = false, defsDone = false, lastT = null, wasActive = false;
  let spinAng = 0;   /* 【2026-08-30】軌道の回転の累積角(時間で回す) */
  function grp(p) { const g = document.createElementNS(SVG_NS, 'g'); p.appendChild(g); return g; }
  function addDefs(svg) {
    let defs = svg.querySelector('defs');
    if (!defs) { defs = document.createElementNS(SVG_NS, 'defs'); svg.insertBefore(defs, svg.firstChild); }
    ORBITS.forEach(o => {
      if (defs.querySelector('#' + o.grad)) return;
      const a = o.rho * D2R, L = o.R;
      const x1 = o.cx - Math.cos(a) * L, y1 = o.cy - Math.sin(a) * L, x2 = o.cx + Math.cos(a) * L, y2 = o.cy + Math.sin(a) * L;
      const lg = document.createElementNS(SVG_NS, 'linearGradient');
      lg.id = o.grad; lg.setAttribute('gradientUnits', 'userSpaceOnUse');
      lg.setAttribute('x1', x1.toFixed(1)); lg.setAttribute('y1', y1.toFixed(1));
      lg.setAttribute('x2', x2.toFixed(1)); lg.setAttribute('y2', y2.toFixed(1));
      [['0', '#00ABEB'], ['0.49', '#ffffff'], ['1', '#FF5D97']].forEach(s => {
        const st = document.createElementNS(SVG_NS, 'stop'); st.setAttribute('offset', s[0]); st.setAttribute('stop-color', s[1]); lg.appendChild(st);
      });
      defs.appendChild(lg);
    });
  }
  function ensure() {
    if (ready) return;
    const lb = document.querySelector('.orbit .layer-back'), lf = document.querySelector('.orbit .layer-front');
    if (!lb || !lf) return;
    bg = grp(lb); dbg = grp(lb); fg = grp(lf); dfg = grp(lf); ready = true;
    if (!defsDone) { addDefs(lb); addDefs(lf); defsDone = true; }   /* グラデは両レイヤーに(別SVGなので)  */
  }
  function pt3(o, th, spin) {
    const x = o.R * Math.cos(th), y = o.R * Math.sin(th), ph = o.phi * D2R, rh = o.rho * D2R;
    const y2 = y * Math.cos(ph), z2 = o.flipZ * (-y * Math.sin(ph));
    let x3 = x * Math.cos(rh) - y2 * Math.sin(rh); const y3 = x * Math.sin(rh) + y2 * Math.cos(rh);
    let z = z2;
    /* 【2026-08-30 ヒデさん指定】軌道の回転: 3D構造ぜんぶを縦(画面Y)軸まわりに回す。
       横(x3)と奥行き(z)を混ぜる=惑星が回るような立体スピン。y3(縦)は不動。 */
    if (spin) { const cs = Math.cos(spin), sn = Math.sin(spin); const nx = x3 * cs - z * sn; z = x3 * sn + z * cs; x3 = nx; }
    return [o.cx + x3, o.cy + y3, z];
  }
  function widthAt(z, R) {
    const n = params.net3d || {};
    if ((n.mode || '3d') === '2d') return (n.flatW != null ? n.flatW : 2);
    const t = (z / R + 1) / 2, fw = n.frontW != null ? n.frontW : 5, bw = n.backW != null ? n.backW : 1;
    return bw + (fw - bw) * t;
  }
  function path(parent, d, stroke, w) {
    const p = document.createElementNS(SVG_NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none');
    p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', w.toFixed(2)); p.setAttribute('stroke-linecap', 'round'); parent.appendChild(p);
  }
  function clear() { for (const g of [bg, fg, dbg, dfg]) if (g) g.textContent = ''; }
  const HIDE_IDS = ['ellOuterF', 'ellOuterB', 'ellInnerF', 'ellInnerB'];
  function setHidden(hide) {
    const d = hide ? 'none' : '';
    for (const id of HIDE_IDS) { const e = document.getElementById(id); if (e) e.style.display = d; }
    if (typeof dotsBackG !== 'undefined' && dotsBackG) dotsBackG.style.display = d;
    if (typeof dotsFrontG !== 'undefined' && dotsFrontG) dotsFrontG.style.display = d;
    if (typeof convShapeBack !== 'undefined' && convShapeBack) for (const e of convShapeBack) e.style.display = d;
    if (typeof convShapeFront !== 'undefined' && convShapeFront) for (const e of convShapeFront) e.style.display = d;
  }
  function active() { return !!(params.conv && params.conv.net3d); }
  function update() {
    if (!active()) {
      if (wasActive) { if (ready) { setHidden(false); clear(); } wasActive = false; }
      lastT = null; return;
    }
    ensure(); if (!ready) return;
    wasActive = true; setHidden(true); clear();
    const n = params.net3d || {}, mode = n.mode || '3d';
    const spd = (n.spd != null ? n.spd : 0.7) * 1.1, phys = (n.phys != null ? n.phys : 0.7);
    let dt = (lastT == null ? 0 : Math.min(0.05, Math.max(0, elapsed - lastT))); lastT = elapsed;
    if (params.running === false) dt = 0;
    /* 【2026-08-30 ヒデさん指定】軌道の回転(3D構造まるごとスピン)と、それに粒を連動させるか。 */
    const orbitSpin = (n.spin != null ? n.spin : 0);
    spinAng += orbitSpin * 0.7 * dt;
    const lineSpin = orbitSpin ? spinAng : 0;
    /* 連動オフ(spinDots=false)なら、線だけ回して粒は元の軌道面のまま(粒の回転軸を変えない) */
    const dotSpin = (orbitSpin && n.spinDots !== false) ? spinAng : 0;
    const showDots = n.showDots !== false;
    const N = 140;
    ORBITS.forEach(o => {
      const pts = [];
      for (let i = 0; i <= N; i++) pts.push(pt3(o, i / N * 2 * Math.PI, lineSpin));
      for (let i = 0; i < N; i++) {
        const a = pts[i], b = pts[i + 1], zA = (a[2] + b[2]) / 2, w = widthAt(zA, o.R);
        path(zA >= 0 ? fg : bg, `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`, 'url(#' + o.grad + ')', w);
      }
      if (!showDots) return;   /* 粒オフ: この軌道のドットは描かない(周回計算も不要) */
      /* ドットの物理: 手前(zN>0)ほど速く・奥ほどゆっくり。2Dは一定 */
      const zc = pt3(o, o.theta, dotSpin)[2], zN = zc / o.R;
      const factor = mode === '3d' ? (1 + phys * zN) : 1;
      o.theta += spd * Math.max(0.08, factor) * dt;
      /* 【2026-08-29 ヒデさん指定】飛び交うドット数を可変に。1本の軌道に等間隔で並べて流す。 */
      const cnt = Math.max(1, Math.min(12, Math.round(n.dots != null ? n.dots : 1)));
      for (let k = 0; k < cnt; k++) {
        const p = pt3(o, o.theta + k * (2 * Math.PI / cnt), dotSpin);
        const c = document.createElementNS(SVG_NS, 'circle');
        const r = mode === '3d' ? Math.max(3, 5 + (p[2] / o.R) * 2.2) : 6;
        c.setAttribute('cx', p[0].toFixed(1)); c.setAttribute('cy', p[1].toFixed(1));
        c.setAttribute('r', r.toFixed(1)); c.setAttribute('fill', o.dot.c);
        (p[2] >= 0 ? dfg : dbg).appendChild(c);
      }
    });
  }
  return { update, setHidden, active };
})();


/* ===== 【2026-09-15 ヒデさん指定】お問い合わせのデザイン案(10案)。流れるディザを活かしつつ、フッター一体型(ロゴなし)を含む =====
   fi=フッター一体型(通常フッターを隠す) / card=角丸カード＋黒帯(一体型だが画面幅いっぱいにはしない) / dark=ディザを暗いトーンに(シェーダ uTone) */
const CV_STYLES = [
  { key: '0',  name: '現行', fixed: true, tip: 'カンプどおり: 1200×416 の枠に流れるディザ、中央に見出し・本文・黒ボタン。フッターは通常。' },
  { key: '10', name: 'フッター一体型・溶け込む', fi: true, tip: '上端をページの地色から徐々に現れるようにマスクし、下端までディザが続く。中央に見出し、下端にフッター。' },
];

/* ===== 【2026-09-15 ヒデさん指定】お問い合わせのカラー案(10案)。ブランド色を使いつつ、グラデの形・ディザの具合・暗さ(黒ベース)を変える。
   選ぶとその案の値を params.cv に入れる(＝下のつまみで細かく変えられる。⋯「いまの設定で上書き」でその案に保存) ===== */
const CV_DEF_COLORS = ['#fee0f8', '#b6e0ff', '#0ebbff', '#477ed1', '#ff5d97'];
/* ===== 【2026-09-15 ヒデさん指定・作り直し】「色が移ろう」= ブランド色と白の間だけを行き来する =====
   ⚠️ 以前は色相(hue)をぐるっと回していたので、青からピンクへ行く途中で【ブランドにない色(緑・黄など)】が出ていた。
      → 色相を回すのをやめ、「ブランド色で作った5色セット(パレット)」ごと入れ替える方式に。
        間に白のパレットを挟むので、にごった中間色を通らずに色味だけが徐々に変わる。
        白の入り具合(moodWhite)を下げると、白を通らず直接つなぐ(=中間色が少し出る)。 */
const CV_MOOD_PAL = {
  navy:  ['#eaf1ff', '#9dc0f7', '#2f6fd0', '#153f8f', '#0e4497'],   /* 紺 */
  blue:  ['#eef7ff', '#b6e0ff', '#0ebbff', '#2f6fd0', '#0e4497'],   /* 青(シアン→紺) */
  cyan:  ['#f2fbff', '#c9edff', '#0ebbff', '#0aa0e0', '#0e79b8'],   /* シアン */
  white: ['#ffffff', '#f4f9ff', '#ffffff', '#fdf2f7', '#ffffff'],   /* 白(通過点) */
  pink:  ['#fff0f7', '#ffc2dc', '#ff5d97', '#f2529a', '#c8317a'],   /* ピンク */
};
const CV_MOOD_RINGS = { swing: ['blue', 'white', 'pink', 'white'], cycle: ['navy', 'cyan', 'white', 'pink'] };
let cvMoodCache = null;
/* 白のパレットは「両隣の中間色」と白の間で混ぜる(白の入り具合 wAmt)。1周ぶんを組み立てて使い回す */
function cvMoodBuild(mode, wAmt) {
  if (cvMoodCache && cvMoodCache.m === mode && cvMoodCache.w === wAmt) return cvMoodCache.p;
  const names = CV_MOOD_RINGS[mode]; if (!names) return null;
  const N = names.length;
  const pal = names.map((nm, i) => {
    const base = CV_MOOD_PAL[nm] || CV_MOOD_PAL.blue;
    if (nm !== 'white') return base.map(h => cvHex(h, '#ffffff'));
    const a = CV_MOOD_PAL[names[(i - 1 + N) % N]] || base, b = CV_MOOD_PAL[names[(i + 1) % N]] || base;
    return base.map((h, j) => {
      const W = cvHex(h, '#ffffff'), A = cvHex(a[j], '#ffffff'), B = cvHex(b[j], '#ffffff');
      return [0, 1, 2].map(k => { const mid = (A[k] + B[k]) / 2; return mid + (W[k] - mid) * wAmt; });
    });
  });
  cvMoodCache = { m: mode, w: wAmt, p: pal };
  return pal;
}
/* p = 1周のうちどこにいるか(0〜1)。隣り合うパレットをなめらかに混ぜて5色を返す */
function cvMoodAt(p, mode, wAmt) {
  const pal = cvMoodBuild(mode, wAmt); if (!pal) return null;
  const N = pal.length, x = ((p % 1) + 1) % 1 * N, i = Math.floor(x) % N, f = x - Math.floor(x), e = f * f * (3 - 2 * f);
  const A = pal[i], B = pal[(i + 1) % N];
  return A.map((c, j) => [0, 1, 2].map(k => c[k] + (B[j][k] - c[k]) * e));
}
/* ===== 【2026-09-19 ヒデさん依頼】色の入れ替わり =====
   「白のところは変わらず、ピンクのところがブルーに、ライトブルーになる」= 白い核(c0)は固定し、外側の4色(淡ブルー/シアン/青/ピンク)の
   並びを時間で入れ替える。swap=1つずつ外へ回す(ピンクの面 → 青 → シアン → 淡ブルー → ピンク) / flip=左右(内外)を反転(ピンク⇄淡ブルー)。
   各状態に「留まる」時間(swapHold)を置き、残りでなめらかに混ぜる(白を経由しないので中間色はブランド色どうしの混色)。
   13段(カンプ)ランプは、状態0=カンプ実測の13色そのまま / それ以外=並べ替えた5色から13の位置で作る。 */
const CV_COMP_STOPS = [[0.996,0.878,0.973],[0.714,0.878,1.000],[0.549,0.843,1.000],[0.384,0.808,1.000],[0.220,0.769,1.000],[0.137,0.753,1.000],[0.055,0.733,1.000],[0.169,0.612,0.910],[0.278,0.494,0.820],[0.459,0.463,0.765],[0.639,0.427,0.706],[0.820,0.396,0.651],[1.000,0.365,0.592]];
const CV_COMP_POS = [0, 0.26237, 0.34377, 0.42516, 0.50656, 0.54725, 0.58795, 0.67557, 0.76318, 0.82239, 0.88159, 0.94080, 1];
const CV_COMP_FLAT = new Float32Array(CV_COMP_STOPS.flat());
function cvRamp5(t, pal) { const P = [0, 0.262, 0.588, 0.763, 1]; t = Math.min(1, Math.max(0, t)); for (let i = 0; i < 4; i++) { if (t <= P[i + 1]) { const f = (t - P[i]) / (P[i + 1] - P[i]); return [0, 1, 2].map(k => pal[i][k] + (pal[i + 1][k] - pal[i][k]) * f); } } return pal[4]; }
function cvSwapState(mode, base5, k) { const o = base5.slice(1); let r; if (mode === 'flip') r = (k % 2) ? o.slice().reverse() : o; else { const n = ((k % 4) + 4) % 4; r = o.map((_, i) => o[(i - n + 4) % 4]); } return [base5[0]].concat(r); }
function cvSwapAt(p, mode, cols5, hold) {
  const base5 = (Array.isArray(cols5) ? cols5 : CV_DEF_COLORS).map((h, i) => cvHex(h, CV_DEF_COLORS[i]));
  const N = mode === 'flip' ? 2 : 4; const x = (((p % 1) + 1) % 1) * N; const i = Math.floor(x) % N; const f = x - Math.floor(x);
  const h = Math.min(0.95, Math.max(0, hold)); const g = f <= h ? 0 : (f - h) / (1 - h); const e = g * g * (3 - 2 * g);
  const A = cvSwapState(mode, base5, i), B = cvSwapState(mode, base5, i + 1);
  const five = A.map((c, j) => [0, 1, 2].map(k => c[k] + (B[j][k] - c[k]) * e));
  const comp13 = (st, k) => (k % N === 0) ? CV_COMP_STOPS : CV_COMP_POS.map(t => cvRamp5(t, st));
  const CA = comp13(A, i), CB = comp13(B, i + 1);
  const comp = new Float32Array(39); for (let j = 0; j < 13; j++) for (let k = 0; k < 3; k++) comp[j * 3 + k] = CA[j][k] + (CB[j][k] - CA[j][k]) * e;
  return { five, comp };
}
function cvHex(h, d) { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); const v = parseInt((m ? m[1] : String(d).replace('#', '')), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; }
const CV_BLEND_DEF = 260;      /* 【2026-09-16 改訂2】溶け込みの深さの既定 px。上(導入事例側)まで色を届かせつつ、rise＋本体で線を出さず溶かす */
const CV_HEAD_TOP_DEF = 120;   /* 【2026-09-15 ヒデさん指摘】導入事例との間の余白を詰めたい。見出しの上の余白 210→120(仮置き)。調整パネル「見出しの上の余白」で 0〜400 に変えられる */
const CV_BASE = { cell: 1, levels: 3, spread: 1.0, speed: 0.25, swell: 0.12, flowScale: 3.0, bright: 1.04, contrast: 1.38, colors: CV_DEF_COLORS, gMode: 0, gcx: 0.60, gcy: 0.00, gr: 0.9, gAspect: 1, gAng: 0, dark: 0, darkCol: '#0d0f14', ink: 'auto', hueMode: 'off', moodSec: 30, moodWhite: 0.85, swapHold: 0.45, topCol: '#7cc9e8', topWhite: 0.12, ceil: 0.9, gOffX: 0.18, gOffY: 0.12, gSpread: 1.5, headTop: CV_HEAD_TOP_DEF, blend: CV_BLEND_DEF, wave: 0.40, waveLen: 0.50, waveSpd: 0.09, swayDeg: 12, swaySec: 40, swayMode: 0, ramp: 0, addT: 0, addB: 0 };
/* ===== 【2026-09-15 ヒデさん依頼】揺らぎのパターン(案)。お問い合わせのグラデがどう揺れるかの性格を切り替える。
   URL: ?sway=0〜5。案を選ぶと「流れる雰囲気」のつまみにその案の値が入る(細かく変えたら ⋯「いまの設定で上書き」で保存) ===== */
const SWAY_KEYS = ['swayMode', 'swayDeg', 'swaySec', 'wave', 'waveLen', 'waveSpd', 'speed', 'swell', 'flowScale', 'gcx', 'gcy', 'gr', 'swayPivot', 'waveAnchor', 'hueMode', 'moodSec', 'moodWhite', 'swapHold', 'core', 'coreSoft', 'coreSkip'];   /* 2026-09-19: 色の入れ替わり(hueMode 等)も案の一部に=別欄と喧嘩しない */   /* 2026-09-18: 白い光の中心(gcx/gcy)と広がり(gr)、揺らぎの軸・うねり抑制も案の値に */
const SWAY_BASE = { swayMode: 0, swayDeg: 12, swaySec: 40, wave: 0.40, waveLen: 0.50, waveSpd: 0.09, speed: 0.04, swell: 0.02, flowScale: 0.4, gcx: 0.78, gcy: 0.12, gr: 0.9, swayPivot: 0, waveAnchor: 0, hueMode: 'off', moodSec: 30, moodWhite: 0.85, swapHold: 0.45, core: 0, coreSoft: 0, coreSkip: 0 };   /* 【2026-09-15 ヒデさん指摘】粒(fbm=speed/swell)を弱め、大きな波(wave)＋全体のゆらぎ(sway)で『面ごと』うねらせる */
const CV_SWAYS = [
  { key: '0', name: '現行 ゆっくり流れる（うねり）', fixed: true, tip: '波全体がゆっくり左右にうねる。粒のざわつきは無く、色の面ごと大きく形が変わる。落ち着いた基本の動き。',
    cv: { swayMode: 0, swayDeg: 12, swaySec: 40, wave: 0.40, waveLen: 0.50, waveSpd: 0.09, speed: 0.04, swell: 0.02, flowScale: 0.4, gcx: 0.78, gcy: 0.12, gr: 0.9 } },
  /* 【2026-09-18 ヒデさん依頼】フォームの後ろに白が来て白飛びする対策として、白い光が「右上のあたりを漂う」3案(見た目は極力そのまま)。
     白がフォームまで流れ込む主因は うねり(wave 0.40=画面の4割ぶん位置がずれる)。7=うねりを小さく / 8=白の広がりを絞る / 9=白はほぼ固定 */
  { key: '7', name: '案1 白は右上を漂う（うねり小さめ）', tip: '白い光は右上の周りだけをゆっくり漂う。うねり(波)を 0.40→0.18 に小さくして中央のフォームまで流れ込まないように。色の面の動きはそのまま。',
    cv: { swayMode: 0, swayDeg: 8, swaySec: 40, wave: 0.18, waveLen: 0.50, waveSpd: 0.09, speed: 0.04, swell: 0.02, flowScale: 0.4, gcx: 0.82, gcy: 0.10, gr: 0.9 } },
  { key: '8', name: '案2 白の広がりを絞る（右上の小さな光）', tip: '動きは今のまま、白い光の広がりを 0.9→0.6 に小さくして、フォームまで届かないようにする。',
    cv: { swayMode: 0, swayDeg: 12, swaySec: 40, wave: 0.40, waveLen: 0.50, waveSpd: 0.09, speed: 0.04, swell: 0.02, flowScale: 0.4, gcx: 0.82, gcy: 0.10, gr: 0.6 } },
  { key: '9', name: '案3 白は右上に固定・色だけ流れる', tip: '白い光はほぼ右上に固定(傾き3°・うねり0.12)し、周りの色のうねりだけ続ける。いちばん静か。',
    cv: { swayMode: 0, swayDeg: 3, swaySec: 40, wave: 0.12, waveLen: 0.50, waveSpd: 0.06, speed: 0.04, swell: 0.02, flowScale: 0.4, gcx: 0.80, gcy: 0.10, gr: 0.8 } },
  { key: '10', name: '案4 白を軸に揺らす（白の近くはうねらせない）', tip: '揺らぎの軸を画面中心から白い光の中心へ移し、白の近くだけうねりを弱める。白は右上に留まり、周りの色は今までどおり動く(見た目を一番損なわない)。',
    cv: { swayMode: 0, swayDeg: 12, swaySec: 40, wave: 0.30, waveLen: 0.50, waveSpd: 0.09, speed: 0.04, swell: 0.02, flowScale: 0.4, gcx: 0.78, gcy: 0.12, gr: 0.9, swayPivot: 1, waveAnchor: 0.85 } },
  /* 【2026-09-19 ヒデさん依頼】色の入れ替わりは別の欄(色の移ろい)ではなく、この案の一部に。案4の動き＋色。
     どの案も hueMode を持つ(SWAY_BASE で 'off')ので、案を切り替えれば前の案の色設定は残らない=喧嘩しない */
  { key: '11', name: '案5 色が入れ替わる（案4の動き＋白はそのまま・ピンク→青→水色）', tip: '案4の動きのまま、白い光は変えずに外側の色だけが時間で入れ替わる(ピンクの面が 青→シアン→水色→ピンク と一周)。1周の時間と留まる割合は下のつまみ。',
    cv: { swayMode: 0, swayDeg: 12, swaySec: 40, wave: 0.30, waveLen: 0.50, waveSpd: 0.09, speed: 0.04, swell: 0.02, flowScale: 0.4, gcx: 0.78, gcy: 0.12, gr: 0.9, swayPivot: 1, waveAnchor: 0.85, hueMode: 'swap', moodSec: 30, moodWhite: 0.85, swapHold: 0.45 } },
  { key: '12', name: '案6 左右入れ替え（案4の動き＋ピンク⇄水色）', tip: '案4の動きのまま、ピンクと水色が内外で入れ替わる往復(白はそのまま)。',
    cv: { swayMode: 0, swayDeg: 12, swaySec: 40, wave: 0.30, waveLen: 0.50, waveSpd: 0.09, speed: 0.04, swell: 0.02, flowScale: 0.4, gcx: 0.78, gcy: 0.12, gr: 0.9, swayPivot: 1, waveAnchor: 0.85, hueMode: 'flip', moodSec: 30, moodWhite: 0.85, swapHold: 0.45 } },
  /* 【2026-09-19 ヒデさん指定】「白エリアの領域を絞り、ゆらぎも基本は右上で範囲も抑えて」→ 広がり 0.9→0.55・中心を右上(0.84,0.10)・揺らぎの軸は白・傾き±6°・うねり 0.16・白の近くはうねらせない(0.9) */
  { key: '13', name: '案7 白なし・右上に留める（揺らぎ小）', tip: '白い領域を取り(中心は水色〜シアンから始まる)、いちばん明るい所を右上(84%,10%)に置く。揺らぎの軸を白に置いて傾き±6°・うねり 0.16 に抑え、白の近くはうねらせない＝白はほぼ右上に留まり、周りの色だけ静かに動く。',
    cv: {swayMode: 0,swayDeg: 6,swaySec: 40,wave: 0.16,waveLen: 0.5,waveSpd: 0.08,speed: 0.04,swell: 0.02,flowScale: 0.4,gcx: 0.84,gcy: 0.1,gr: 0.8,swayPivot: 1,waveAnchor: 0.9,hueMode: 'off',moodSec: 30,moodWhite: 0.85,swapHold: 0.45, core: 0, coreSoft: 0.12, coreSkip: 0.34} },
];
function cvSwayKey() { const v = String((params && params.cvSway) || '0'); return (CV_SWAYS.some(s => s.key === v) && !variantRemovedKey('cvSway', v)) ? v : '0'; }
function cvApplySway(key) { const c = CV_SWAYS.find(s => s.key === key); if (!c) return; params.cv = params.cv || {}; Object.assign(params.cv, structuredClone(SWAY_BASE), structuredClone(c.cv)); }

/* ===== 【2026-09-16 改訂・ヒデさん依頼】お問い合わせ上部の「溶け込み(馴染ませ)」=====
   デザインサンプル(Figma 17400:22955)を実測: ピンクは縦の線形グラデ(上端=透明→下端=満色)を
   お問い合わせ帯まるごと(≒947px)の長い距離でかけ、Bayerディザを重ねたもの。境目に線・波・形は無い。
   2案の違いはグレーの「ぼかし玉(レイヤーブラー354px)」の置き方だけ(=大きな非対称のゆらぎ。細かい揺れではない)。
   → v4 でも rise(導入事例の下の空き)＋本体の中 を合わせた長い距離で、上端の傾きを 0 に近づけて溶かす。
   案は“形”でなく“溶け込みの深さ(blend px)”の違いだけにする(波・弧・斜め・二段・もやは撤去)。 */
const CV_EDGES = [
  { key: '0', name: '標準（上まで馴染ませる）', blend: 260, shape: 'linear', fixed: true, tip: '導入事例のカード下まで色が届き、そこへ柔らかく溶け込む(奥行き)。境目の線は出ない既定。余白は詰めめ。' },
  { key: '1', name: 'さらに深く（もっとゆるやか）', blend: 460, shape: 'linear', tip: 'もっと下まで使ってさらにゆっくり。上端がいちばん淡い。' },
  { key: '2', name: '浅め（コンパクト）',          blend: 160, shape: 'linear', tip: '溶け込みを短めに。余白をぐっと詰めたい時。それでも線は出さず徐々に。' },
];
function cvEdgeKey() { const v = String((params && params.cvEdge) || '0'); return (CV_EDGES.some(e => e.key === v) && !variantRemovedKey('cvEdge', v)) ? v : '0'; }
function applyCvEdge(key) { const e = CV_EDGES.find(x => x.key === key); if (!e) return; params.cvEdge = String(key); params.cv = params.cv || {}; params.cv.blend = e.blend; }

/* 溶け込みの縦グラデ(スムーザーステップ)を H px で作る文字列。上端=透明 → H px で満色。
   H を長く取り、上端の傾きを 0 に近づけることで「色が始まる線」を消す(馴染ませが目的)。 */
function cvFadeStops(H, ang) {
  const P = [[0,0],[.0625,.01],[.125,.042],[.1875,.098],[.25,.167],[.375,.333],[.5,.5],[.625,.667],[.75,.833],[.8125,.902],[.875,.958],[.9375,.99],[1,1]];
  const body = P.map(([t,a]) => `rgba(0,0,0,${a}) ${(t*H).toFixed(1)}px`).join(',');
  return `linear-gradient(${ang||'180deg'}, ${body})`;
}
/* #cvCanvas に、上端(=導入事例側)から span px かけて満色になる縦マスクを直接適用(PCのみ)。
   span を長く(rise＋本体の中)取るので、境目は線にならず本体の中で徐々に色が乗る。形(波/弧)は付けない。 */
function cvEdgeMask(canvas, span) {
  span = Math.max(1, Math.round(span));
  const img = cvFadeStops(span, '180deg');
  canvas.style.maskImage = img;        canvas.style.webkitMaskImage = img;
  canvas.style.maskSize = '100% 100%'; canvas.style.webkitMaskSize = '100% 100%';
  canvas.style.maskRepeat = 'no-repeat'; canvas.style.webkitMaskRepeat = 'no-repeat';
  canvas.style.maskPosition = 'top';   canvas.style.webkitMaskPosition = 'top';
  canvas.style.maskComposite = '';     canvas.style.webkitMaskComposite = '';
}

/* ===== 【2026-09-16 ヒデさん依頼】お問い合わせのグラデの「形」を調整パネルで選ぶ =====
   デザインサンプル(17400:22955)は輪の無い“縦グラデ”。現行は放射(同心円)。色は現行のまま、形だけ切替。
   最終形はヒデさんが実物を見比べて決める(varRowX でパターン選択)。 */
/* 【2026-09-19 ヒデさん指摘「似たパラメーターの喧嘩」の根治】白い光の中心(gcx/gcy)と広がり(gr)は「グラデの案(cvSway)」が持ち主。
   以前は FORM_BASE にも 0.78/0.12/0.9 が入っていて、読み込み時の cvApplyForm(cvFormKey()) が毎回上書きし、案で絞った白(案7 gr0.55)が負けていた。
   → 形(FORM_BASE)からは外す。形1〜3(縦/斜め)は自分の中心を持つのでそのまま */
const FORM_BASE = { gMode: 0, gAng: 0, gAspect: 1, gSpread: 0.85, contrast: 1.38 };   /* 放射=デザインカンプ 17398:21957 に一致(gSpread0.85でv4の背の低さを補正)。中心・広がりは案(cvSway)側 */
const CV_FORMS = [
  { key: '0', name: '放射（カンプ 17398・既定）',   tip: 'デザインカンプ 17398:21957 の放射グラデを再現。明るい中心=右上、そこからシアン→青→ピンク(左端)。色の比率・角度・広がりをカンプに一致。', cv: {} },
  { key: '1', name: '縦グラデ（サンプル寄り）',   tip: 'サンプル同様、輪をなくして上→下へ素直に色が乗る。落ち着いた雰囲気。色は現行のまま。', cv: { gMode: 2, gAng: 90, gcx: 0.5, gcy: 0.5, gr: 1.15, gAspect: 1 } },
  { key: '2', name: '放射・大きく柔らかく',       tip: '放射のまま“輪の主張”だけ消す。中心を大きく広げて同心円の帯をぼかす。色は残す。', cv: { gMode: 0, gcx: 0.60, gcy: 0.30, gr: 1.25, gAspect: 1.10, gSpread: 1.5, contrast: 1.34 } },
  { key: '3', name: '斜めグラデ',               tip: '斜め35°の線形グラデ。帯が斜めに流れる。', cv: { gMode: 2, gAng: 35, gcx: 0.5, gcy: 0.5, gr: 1.2, gAspect: 1 } },
];
function cvFormKey() { const v = String((params && params.cvForm) || '0'); return (CV_FORMS.some(f => f.key === v) && !variantRemovedKey('cvForm', v)) ? v : '0'; }
function cvApplyForm(key) { const c = CV_FORMS.find(f => f.key === key); if (!c) return; params.cvForm = String(key); params.cv = params.cv || {}; Object.assign(params.cv, structuredClone(FORM_BASE), structuredClone(c.cv)); }

/* 【V5.0 2026-09-16 ヒデさん依頼】お問い合わせの CTA(ボタン/フォーム直置き) と、自作フォームのスタイル案(5) */
const CV_CTAS = [
  { key: 'button', name: 'ボタン（遷移）',     tip: '現行。マーキーの「フォームを記入」ボタン。押すと別ページ(contact.html)へ遷移。' },
  { key: 'form',   name: 'フォーム（直置き）', tip: '見出し・本文の下にお問い合わせフォームを直置き(遷移なし)。フォームの見た目は下の「フォームのスタイル」で選ぶ。' },
];
const CV_HDRS = [
  { key: '5', name: 'フローティングピル',   tip: 'スクロールで画面の縁から浮くカプセル型に。ガラス＋影。' },
  { key: '8',  name: '⑧ 左寄せピル(ロゴ＋バーガー)',   tip: 'スクロールで左に小さなピル。ロゴとハンバーガーが隣接。' },
  { key: '12', name: '⑫ 分離: 丸ロゴ＋丸バーガー',     tip: '左に丸いロゴマーク、右に丸いハンバーガー。2つの浮遊要素。' },
];
function hdrModeKey() { const v = String((params && params.hdrMode) || '1'); if (CV_HDRS.some(h => h.key === v) && !variantRemovedKey('hdrMode', v)) return v; const first = CV_HDRS.find(h => !variantRemovedKey('hdrMode', h.key)); return first ? first.key : '5'; }   /* 削除済みなら生存案の先頭へ(既定が消えても壊れない) */
/* 【V5.0 2026-09-17 ヒデさん依頼】ヘッダー変形の“モーション(イージング)”5案。速さは params.hdrDur(秒)。 */
const CV_HDR_MOTIONS = [
  { key: '1', name: 'なめらか',   ease: 'cubic-bezier(.4,0,.2,1)',      tip: '標準の ease-in-out。素直に加減速する落ち着いた変形。' },
  { key: '2', name: 'キビキビ',   ease: 'cubic-bezier(.2,.9,.25,1)',    tip: '出だしが速く終わりでスッと止まる。反応が良い機敏な変形。' },
  { key: '3', name: 'ゆったり',   ease: 'cubic-bezier(.45,.05,.4,1)',   tip: 'ゆっくり始まりゆっくり収まる。上品でゆとりのある変形。' },
  { key: '4', name: 'バウンド',   ease: 'cubic-bezier(.34,1.45,.5,1)',  tip: '終点で少し行き過ぎて戻る。弾むような気持ちいい変形。' },
  { key: '5', name: '直線',       ease: 'linear',                       tip: '一定速度。加減速なしのメカニカルな変形。' },
];
function hdrMotionKey() { const v = String((params && params.hdrMotion) || '1'); return CV_HDR_MOTIONS.some(m => m.key === v) ? v : '1'; }
function hdrMotionEase() { const m = CV_HDR_MOTIONS.find(x => x.key === hdrMotionKey()); return (m && m.ease) || 'cubic-bezier(.4,0,.2,1)'; }
/* イージングを :root に反映。速さ(--hdr-dur)は bindHdrScroll が「進む=hdrDur / 戻る=0.55倍」で方向別に設定(トップ復帰のラグ解消)。 */
function applyHdrMotion() {
  try {
    document.documentElement.style.setProperty('--hdr-ease', hdrMotionEase());
    const d = Math.max(0.15, +(params && params.hdrDur) || 0.7);
    document.documentElement.style.setProperty('--hdr-dur', d.toFixed(3) + 's');   /* 初期値。方向別上書きは scroll ハンドラ */
  } catch (e) {}
}
/* 【V5.0 2026-09-17】ハンバーガーのアイコン・押した時の変化・浮くピルの質感 を varRowX(ピル＋⋯削除)で出す用の案リスト */
const CV_BURGER_ICONS = [
  { key: '1', name: 'クラシック', tip: '3本の水平線(定番)。' },
  { key: '2', name: '2本線', tip: '2本の線でミニマルに。' },
];
const CV_BURGER_ANIMS = [
  { key: '1', name: 'クロス', tip: '上下が回って×に(定番)。' },
  { key: '2', name: '半回転X', tip: '半回転しながら×に。' },
  { key: '3', name: '90°X', tip: '90°回りながら×に。' },
  { key: '4', name: '一本線', tip: '上下が中央へ集まって1本線に。' },
  { key: '5', name: 'シザー', tip: '左端を軸に×へ(すくい上げ)。' },
];
const CV_FLOATS = [
  { key: '1', name: '標準', tip: '標準のすりガラス。' },
  { key: '2', name: '濃フロスト', tip: '白強めのフロスト＋柔らかい影。' },
  { key: '3', name: '深い影', tip: 'くっきり深い影。' },
  { key: '4', name: '軽い', tip: '薄い地色・影控えめ。' },
  { key: '5', name: 'リキッド', tip: '斜めの光沢＋内側ハイライト。' },
  { key: '6', name: '白', tip: 'ソリッド白・シャープ。' },
  { key: '7', name: '発光縁', tip: 'ブランド色のリングが光る。' },
  { key: '8', name: '強ブラー', tip: 'すりガラス最大。' },
  { key: '9', name: '長い影', tip: '低い角度の長い影で浮遊感。' },
  { key: '10', name: 'リキッド2', tip: '色づいた艶・強め。' },
];
function burgerIconKey() { const v = String((params && params.burgerIcon) || '1'); return (CV_BURGER_ICONS.some(i => i.key === v) && !variantRemovedKey('burgerIcon', v)) ? v : (CV_BURGER_ICONS.find(i => !variantRemovedKey('burgerIcon', i.key)) || { key: '1' }).key; }
function burgerAnimKey() { const v = String((params && params.burgerAnim) || '1'); return (CV_BURGER_ANIMS.some(i => i.key === v) && !variantRemovedKey('burgerAnim', v)) ? v : (CV_BURGER_ANIMS.find(i => !variantRemovedKey('burgerAnim', i.key)) || { key: '1' }).key; }
function floatStyleKey() { const v = String((params && params.floatStyle) || '1'); return (CV_FLOATS.some(i => i.key === v) && !variantRemovedKey('floatStyle', v)) ? v : (CV_FLOATS.find(i => !variantRemovedKey('floatStyle', i.key)) || { key: '1' }).key; }
function applyHdrMode(key) {
  params.hdrMode = String(key);
  const h = document.documentElement;
  h.classList.add('hdr-follow');
  /* 【V5.0】親 .stage に transform があると position:fixed がそれ基準になり追従しない。
     ヘッダーを body 直下へ出して viewport 基準の fixed にする。
     【2026-09-19 仮置き】SP も出す(旧: mb はスケール維持のため動かさなかった)。SP でもスクロール後にハンバーガー箱でメニューを開けるようにするため。
     ドロワーも stage の中だと fixed(inset:0)が stage 基準になり画面外へ飛ぶので同様に出す */
  {
    const hdr = document.querySelector('.header');
    if (hdr && hdr.parentElement !== document.body) document.body.appendChild(hdr);
    /* ドロワーは backdrop-filter を持つ header の中だと fixed がクリップされるので body 直下へ出す */
    const dr = document.getElementById('hdrDrawer');
    if (dr && dr.parentElement !== document.body) document.body.appendChild(dr);
  }
  for (let i = 1; i <= 15; i++) h.classList.toggle('hm-' + i, String(key) === String(i));
  applyBurgerStyle();
  applyFloatStyle();
  applyHdrTune();
  applyDrawerStyle();
}
/* 【V5.0 2026-09-17】ハンバーガーを押した先の画面(ドロワー)の案を反映 */
function applyDrawerStyle() {
  const dr = document.getElementById('hdrDrawer'); if (!dr) return;
  const s = String(params.drawerStyle || '1');
  for (let i = 1; i <= 3; i++) dr.classList.toggle('drw-' + i, s === String(i));
}
/* 【V5.0 2026-09-17 ヒデさん依頼】お問い合わせフォームの地色の白さ/ぼかし/彩度/入力欄の白さ/プレースホルダーの濃さを反映(白飛び対策) */
function applyCvfGlass() {
  const sec = document.getElementById('conversion'); if (!sec) return;
  const g = params.cvfGlass || {};
  const set = (k, v, u) => sec.style.setProperty(k, (v != null ? v : '') + (u || ''));
  set('--cvf-bg-a', g.bgA != null ? g.bgA : 0.5, '');
  /* 【2026-09-21 ヒデさん依頼】フォームカードの色味(tint)。既定は白。色コード→RGB */
  var _bc = g.bgColor || '#ffffff', _bm = /^#?([0-9a-fA-F]{6})$/.exec(_bc);
  set('--cvf-bg-rgb', _bm ? (parseInt(_bm[1].slice(0, 2), 16) + ',' + parseInt(_bm[1].slice(2, 4), 16) + ',' + parseInt(_bm[1].slice(4, 6), 16)) : '255,255,255', '');
  set('--cvf-blur', g.blur != null ? g.blur : 22, 'px');
  set('--cvf-sat', g.sat != null ? g.sat : 1.5, '');
  set('--cvf-in-a', g.inA != null ? g.inA : 0.56, '');
  set('--cvf-ph-a', g.phA != null ? g.phA : 0.32, '');
  set('--cvf-r', g.radius != null ? g.radius : 22, 'px');     /* 2026-09-18: フォームの角丸 */
  set('--cvf-in-r', g.inR != null ? g.inR : 10, 'px');       /* 2026-09-18: 入力欄の角丸 */
  /* 【2026-09-18 ヒデさん依頼】枠線(カード/入力欄)の色系・太さ・濃さ、プレースホルダーの色系 */
  set('--cvf-bw', g.bw != null ? g.bw : 1, 'px'); set('--cvf-bc', 'rgba(' + (g.bDark ? '0,0,0' : '255,255,255') + ',' + (g.ba != null ? g.ba : 0.66) + ')', '');
  set('--cvf-in-bw', g.inBw != null ? g.inBw : 1, 'px'); set('--cvf-in-bc', 'rgba(' + (g.inBDark ? '0,0,0' : '255,255,255') + ',' + (g.inBa != null ? g.inBa : 0.72) + ')', '');
  set('--cvf-ph-rgb', g.phDark === false ? '255,255,255' : '0,0,0', '');
}
/* 【V5.0 2026-09-17 ヒデさん指定】選んだヘッダー案ごとの「スクロール後サイズ」微調整を header にインライン適用(その案の時だけ)。
   常時ではなく、パネルはその案を選んだ時だけ出す(buildPanel が hdrModeKey で出し分け)。 */
function applyHdrTune() {
  const hdr = document.querySelector('.header'); if (!hdr) return;
  const t = (params.hdrTune && params.hdrTune[hdrModeKey()]) || null;
  if (t && t.logoH != null) hdr.style.setProperty('--hdr-logo-h', t.logoH + 'px'); else hdr.style.removeProperty('--hdr-logo-h');
  if (t && t.cw != null) hdr.style.setProperty('--hdr-cw', t.cw + 'px'); else hdr.style.removeProperty('--hdr-cw');
}
/* 【V5.0 2026-09-17】ハンバーガーのアイコン案(bi-)と押した時の変化(ba-)を html に反映 */
function applyBurgerStyle() {
  const h = document.documentElement;
  const bi = burgerIconKey(), ba = burgerAnimKey();   /* 削除済みは既定へ落とす */
  for (let i = 1; i <= 5; i++) { h.classList.toggle('bi-' + i, bi === String(i)); h.classList.toggle('ba-' + i, ba === String(i)); }
}
/* 【V5.0 2026-09-17】フローティング(ピル)のスタイリング案(fs-)を html に反映 */
function applyFloatStyle() {
  const h = document.documentElement;
  const fs = floatStyleKey();
  for (let i = 1; i <= 10; i++) h.classList.toggle('fs-' + i, fs === String(i));
}
/* 【V5.0】追従ヘッダーのスクロール監視(1回だけ設置)。lenis でも window.scrollY は追従する。 */
let _hdrScrollBound = false;
function bindHdrScroll() {
  if (_hdrScrollBound) return; _hdrScrollBound = true;
  const hdr = document.querySelector('.header'); if (!hdr) return;
  let lastY = window.scrollY || 0, ticking = false;
  /* 【2026-09-17 作り直し】スクロール量に連動した連続変形。--hdr-t(0=全幅/1=コンパクト)を毎フレーム更新し、
     幅・位置・余白・ロゴ・ナビ・バーガー・地色を CSS の calc(var(--hdr-t)) で“ひとつの動き”として補間する。
     クラス一気切替＋トランジションだと width:fit-content(アニメ不可)や position 切替で瞬間移動・重なりが出るのが原因だった。
     連続変数なので低速スクロール・途中反転でも 1:1 で追従し、跳ね/ちらつきが出ない。 */
  const upd = () => {
    ticking = false;
    const y = window.scrollY || window.pageYOffset || 0;
    /* 【2026-09-17 ヒデさん指定】スクロール量/速さに依存させない。しきい値で --hdr-t を 0/1 に切り替えるだけにし、
       変形の“動き”は CSS の transition(--hdr-t を --hdr-dur で補間)に任せる＝どれだけ速くスクロールしても一定速度でゆったり。
       ヒステリシス(発火70px/解除30px)で境目のちらつきを防ぐ。 */
    const wasOn = hdr.classList.contains('hdr-stuck');
    /* 【2026-09-20 ヒデさん依頼】SP はヘッダー右を常に黒い四角ハンバーガーに(スクロール前から)。クリックでドロワーが開く(compact判定=hdr-stuck) */
    const _mbHdr = !!(window.matchMedia && window.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches);
    const on = _mbHdr ? true : (wasOn ? (y > 30) : (y > 70));
    if (on !== wasOn) {   /* 【2026-09-17 ヒデさん指摘】進む=ゆったり / 戻る=キビキビ(トップ復帰のラグ解消)。速さは params.hdrDur */
      const d = Math.max(0.15, +(params && params.hdrDur) || 0.7);
      hdr.style.setProperty('--hdr-dur', (on ? d : d * 0.55).toFixed(3) + 's');
    }
    hdr.style.setProperty('--hdr-t', on ? 1 : 0);
    hdr.classList.toggle('hdr-stuck', on);
    /* 【2026-09-17 ヒデさん指定】開発者体験(黒いセクション)の上にヘッダーが来たら、ロゴ/ハンバーガーの色だけ白へ反転。
       ヘッダーの地色は変えない。分離案(hm-12)などの透明ヘッダー用。 */
    const _dev = document.getElementById('dev');
    /* 【2026-09-22 ヒデさん依頼】反転が「ワンテンポ遅い」根治: #dev の上端が 44px に来る幾何条件だと、
       背景(devDarkK)が先に暗転しきっても反転が devTop=0 まで待ち、実測で約480px遅れていた。
       → 実際の背景の暗さ devDarkK が 0.5 を超えた瞬間に反転(＝見た目の暗転と同期)。退場は従来の幾何(dr.bottom≥30)を維持。PC/SP共通。 */
    if (_dev) { const dr = _dev.getBoundingClientRect(); const _dk = (typeof devDarkK !== 'undefined' ? devDarkK : 0); hdr.classList.toggle('hdr-on-dark', _dk >= 0.5 && dr.bottom >= 30); }
    /* 【2026-09-17 ヒデさん指摘】hm-15(ミニピル)は「消える」をやめ常に表示。hm-3 のみ下スクロール隠し(現在削除済み) */
    if (document.documentElement.classList.contains('hm-3')) {
      if (y > 160 && y > lastY + 4) hdr.classList.add('hdr-hidden');
      else if (y < lastY - 4 || y <= 160) hdr.classList.remove('hdr-hidden');
    } else { hdr.classList.remove('hdr-hidden'); }
    lastY = y;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
}
/* 【V5.0】ハンバーガーのドロワー開閉 */
let _drawerBound = false;
function bindDrawer() {
  if (_drawerBound) return; _drawerBound = true;
  const burger = document.querySelector('.hdr-burger');
  const drawer = document.getElementById('hdrDrawer');
  const cta = document.querySelector('.header .cta');   /* 分離型(hm-12)で黒箱=メニューボタンになる */
  if (!drawer) return;
  const setOpen = (open) => {
    if (open) { drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('is-open')); }
    else { drawer.classList.remove('is-open'); setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 380); }
    if (burger) { burger.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    if (cta) cta.classList.toggle('is-open', open);   /* 黒箱の中のハンバーガーも×へ */
  };
  if (burger) burger.addEventListener('click', () => setOpen(!drawer.classList.contains('is-open')));
  /* 【2026-09-17】分離型(hm-12)でスクロール後(コンパクト=hdr-stuck)は、黒箱クリックでドロワーを開く。
     展開時(ページ上部)は通常どおり「お問い合わせ」へ遷移する。 */
  if (cta) cta.addEventListener('click', (e) => {
    const sep = document.documentElement.classList.contains('hm-12');
    const hdr = document.querySelector('.header');
    const compact = hdr && hdr.classList.contains('hdr-stuck');
    if (sep && compact) { e.preventDefault(); setOpen(!drawer.classList.contains('is-open')); }
  });
  drawer.addEventListener('click', (e) => { if (e.target === drawer || (e.target.closest && e.target.closest('.hdr-drawer-nav a'))) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

const CV_COLORS = [
  /* 【2026-09-16 ヒデさん依頼】デザインカンプ(node 17383:21430)の色味に忠実な案。13ストップのランプ(ramp:'comp')で、
     C1(現行)の5段近似より青の階調と紫の中間色がカンプ通りに出る。形・ディザは現行と同じ。 */
  { key: 'CK',  name: 'デザインカンプ', tip: 'デザインカンプ(17383:21430)の放射グラデを実測した13色を忠実に再現。淡ピンク白→青の階調→紫→ピンク。現行(C1)は5色の近似で、これはカンプそのままの色味です。', cv: { ramp: 'comp' } },
  { key: 'C1',  name: 'カンプ（5色近似）', tip: 'カンプ実測の5色(淡ピンク白→淡ブルー→シアン→青紫→ピンク)・カンプの放射グラデ・Bayer 1px 3段。忠実版は「デザインカンプ」を選んでください。', cv: {} },
  { key: 'C2',  name: 'ブルー寄り', tip: 'ピンクを青紫に置き換え、シアン〜ブルーで統一。放射の中心は右上。', cv: { colors: ['#eef7ff', '#9ad9ff', '#0ebbff', '#1f5fd6', '#6a4bd8'], gMode: 1, gcx: 0.8, gcy: 0.1, gr: 0.95, gAspect: 1.25 } },
  { key: 'C3',  name: 'ピンク寄り', tip: 'ピンク〜マゼンタを主役に、外側で青へ。放射の中心は左上。', cv: { colors: ['#fff0f7', '#ffb8d6', '#ff5d97', '#c04ab5', '#4a5fd8'], gMode: 1, gcx: 0.2, gcy: 0.15, gr: 1.0, gAspect: 1.1 } },
  { key: 'C11', name: '色が移ろう（青⇄白⇄ピンク）', tip: 'うねり全体の色味が、ブランドの青とピンクの間を白を通ってゆっくり行き来する(他の中間色は出さない)。既定は30秒で1往復。「色味の移ろい」で往復/巡る・1周の時間・白の入り具合を変えられる。', cv: { hueMode: 'swing', moodSec: 30, moodWhite: 0.85 } },
];
function cvColorKey() { const by = (params && params.cvColorBy) || {}; const v = String(by[cvStyleKey()] || 'C1'); return (CV_COLORS.some(s => s.key === v) && !variantRemovedKey('cvColor', v)) ? v : 'C1'; }
/* カラー案の値(既定＋その案の「上書き」控え)を params.cv に入れる */
function cvApplyColorFull(key) { cvApplyColor(key); const ov = ((params.gfxVarOverride || {}).cvColor || {})[key]; if (ov) { try { Object.assign(params.cv, structuredClone(ov)); } catch (e) {} } }
function cvApplyColor(key) { const c = CV_COLORS.find(s => s.key === key); if (!c) return; params.cv = params.cv || {}; Object.assign(params.cv, structuredClone(CV_BASE), structuredClone(c.cv)); }
function cvStyleKey() { const v = String((params && params.cvStyle) || '10'); return (CV_STYLES.some(s => s.key === v) && !variantRemovedKey('cvStyle', v)) ? v : '10'; }   /* 【2026-09-16 確定】既定は一体型(10) */
function cvStyleDef() { const k = cvStyleKey(); return CV_STYLES.find(s => s.key === k) || CV_STYLES[0]; }

/* ===== 【2026-09-15 ヒデさん指定】開発者体験モックのスタイル案(立体感)と配色。#dev に dev-st-N / dev-tone-X を付け、CSS 変数で傾き・ぼかし・影を渡す ===== */
const DEV_STYLES = [
  { key: '0',  name: '現行（フラット）', fixed: true, tip: 'カンプどおりの平らな板(#161616 に白10%・薄い縁)。' },
  /* 【2026-09-15 ヒデさん指定】AI らしい5案。案を選ぶと調整パネルの項目がその案のものに入れ替わる */
  { key: '11', name: 'ネオンが一周する', tip: '縁に沿って光が走る(既定は反時計回り)。シアン→白→ピンクの尾を引く。速さ・向き・光の長さ・太さを調整できます。' },
];
/* 【2026-09-15 ヒデさん指定】案ごとのつまみ。パネルでは選んでいる案のまとまりだけ出す(syncDevDyn)。
   値は params.sections.dev.stv[まとまりのkey][項目のkey] に入る(案を切り替えても各案の値が残る)。
   css() が返した文字列を #dev の CSS 変数に入れる＝CSS 側は var() を読むだけ */
const DEV_DYN_SPEC = {
  '11': { title: 'この案の調整（ネオンが一周する）', on: ['11'], rows: [
    { k: 'dir', seg: [['反時計回り', 'ccw'], ['時計回り', 'cw']], label: '光の向き', def: 'ccw', v: '--dm-run-dir', css: v => (v === 'cw' ? 'normal' : 'reverse') },
    { k: 'sec', label: '光が1周する時間', min: 2, max: 24, step: 0.5, def: 6, v: '--dm-run-sec', css: v => v + 's', fmt: v => v.toFixed(1) + '秒', hint: '短いほど速く走ります。' },
    { k: 'len', label: '光の長さ', min: 0.06, max: 0.7, step: 0.02, def: 0.28, v: '--dm-run-len', css: v => v + 'turn', fmt: v => Math.round(v * 100) + '%', hint: '縁1周のうち何割を光が占めるか。短いと点に近く、長いと帯になります。' },
    { k: 'w', label: '光の太さ', min: 1, max: 6, step: 0.5, def: 2, v: '--dm-run-w', css: v => v + 'px', fmt: v => v.toFixed(1) + 'px', hint: '縁取りの太さ。' },
  ] },
};
/* ガラス(後ろが透ける)案 = 地色を敷いて後ろのカードをぼかす対象 */
const DEV_GLASS_KEYS = [];   /* 2026-09-18: ガラス案(1)を完全削除 */
function devStv(g) { const d = (params.sections && params.sections.dev) || {}; d.stv = d.stv || {}; d.stv[g] = d.stv[g] || {}; return d.stv[g]; }
function devDynGet(g, r) { const v = devStv(g)[r.k]; return v != null ? v : r.def; }
const DEV_TONES = [
  { key: 'dark', name: '現行（黒）', fixed: true, tip: '#161616 に白10%(カンプ)。' },
  { key: 'graphite', name: 'グラファイト', tip: '少し明るいグレー。' },
];
function devStyleKey() { const v = String((params && params.devStyle) || '0'); return (DEV_STYLES.some(s => s.key === v) && !variantRemovedKey('devStyle', v)) ? v : '0'; }
function devToneKey() { const v = String((params && params.devTone) || 'dark'); return (DEV_TONES.some(s => s.key === v) && !variantRemovedKey('devTone', v)) ? v : 'dark'; }
/* 【2026-09-20 ヒデさん依頼・#10】開発者体験①②の 見出し↔モックの間隔 とモックの拡大を CSS 変数へ(PCのみ) */
function applyDevTune() {
  const sec = document.getElementById('dev'); if (!sec) return; const d = (params.sections && params.sections.dev) || {};
  sec.style.setProperty('--dev1-gap', (d.dev1Gap != null ? d.dev1Gap : 36) + 'px');
  sec.style.setProperty('--dev2-gap', (d.dev2Gap != null ? d.dev2Gap : 36) + 'px');   /* 【2026-09-26】既定 77→36(①と同じ)。②の束を上端基準にし、CSS で正面カードの内側8px×拡大を差し引くので、この値＝見出し→正面カードの見た目の間隔。旧77は中心基準の張り出しの打ち消しだった */
  sec.style.setProperty('--dev1-scale', String(d.dev1Scale != null ? d.dev1Scale : 1.1));
  sec.style.setProperty('--dev2-scale', String(d.dev2Scale != null ? d.dev2Scale : 1.1));
}
function applyDevStyle() {
  const sec = (typeof SECS !== 'undefined' && SECS.dev) || document.getElementById('dev'); if (!sec) return;
  const sk = devStyleKey(), tk = devToneKey();
  DEV_STYLES.forEach(st => sec.classList.toggle('dev-st-' + st.key, st.key === sk));
  DEV_TONES.forEach(t => sec.classList.toggle('dev-tone-' + t.key, t.key === tk));
  const d = (params.sections && params.sections.dev) || {};
  sec.style.setProperty('--dm-blur', (d.mockBlur != null ? d.mockBlur : 24) + 'px');
  sec.style.setProperty('--dm-sh', String(d.mockShadow != null ? d.mockShadow : 1));
  sec.style.setProperty('--dm-in', String(d.mockInner != null ? d.mockInner : 1));
  /* ガラス案の時だけ、後ろのカードを実際にぼかす(backdrop-filter は後ろのカードを参照できないため) */
  sec.classList.toggle('dev-glass', DEV_GLASS_KEYS.indexOf(sk) >= 0);
  /* 案ごとのつまみ → CSS 変数(全まとまりぶん入れておく＝案を切り替えてもその案の値がすぐ効く) */
  try { Object.keys(DEV_DYN_SPEC).forEach(g => DEV_DYN_SPEC[g].rows.forEach(r => sec.style.setProperty(r.v, r.css(devDynGet(g, r))))); } catch (e) {}
}
/* パネル: 選んでいる案のまとまりだけ出す */
const DEV_DYN = {};
function syncDevDyn() { const k = devStyleKey(); Object.keys(DEV_DYN).forEach(g => { const el = DEV_DYN[g], sp = DEV_DYN_SPEC[g]; if (el && sp) el.style.display = sp.on.indexOf(k) >= 0 ? '' : 'none'; }); }
/* ===== 【2026-09-15 ヒデさん指定】ビジョン「つなぐ／強み」の揺らぎのグラデ: 鮮やかな配色 3案＋つまみ(彩度・明るさ・速さ・角度) =====
   値は params.sections.vision.{gradVar, gradSat, gradBri, gradDur, gradAng}。CSS 変数と #vision.vg-N で反映 */
const VIS_GRADS = [
  { key: '0', name: '現行（紺⇄ピンク）', fixed: true, tip: '紺(#0E4497)とピンク(#FF5D97)が 67° で流れる。中間は2色の混色。', v: { gradSat: 1, gradBri: 1 } },
  { key: '2', name: '鮮やか・ピンク×シアン', tip: '紺を外してピンクとシアンだけで流す。いちばん明るく発色する。彩度 +20%。', v: { gradSat: 1.2, gradBri: 1.05 } },
  { key: '3', name: '鮮やか・混ざる帯を短く', tip: '紺⇄ピンクのまま、色の間に同色の区間を置いて混色の帯を短く(にごる幅を 1/3 に)。彩度 +40%・明るさ +6%。', v: { gradSat: 1.4, gradBri: 1.06 } },
];
function visGradKey() { const v = String((params.sections && params.sections.vision && params.sections.vision.gradVar) || '0'); return (VIS_GRADS.some(g => g.key === v) && !variantRemovedKey('visGrad', v)) ? v : '0'; }
function applyVisGrad() {
  const sec = SECS && SECS.vision; if (!sec) return;
  const v = (params.sections && params.sections.vision) || {}, k = visGradKey();
  VIS_GRADS.forEach(g => sec.classList.toggle('vg-' + g.key, g.key === k));
  sec.style.setProperty('--vg-sat', String(v.gradSat != null ? v.gradSat : 1));
  sec.style.setProperty('--vg-bri', String(v.gradBri != null ? v.gradBri : 1));
  sec.style.setProperty('--vg-dur', (v.gradDur != null ? v.gradDur : 7) + 's');
  sec.style.setProperty('--vg-ang', (v.gradAng != null ? v.gradAng : 67) + 'deg');
}
function visApplyGrad(key) { const g = VIS_GRADS.find(x => x.key === key); if (!g) return; const v = params.sections.vision; v.gradVar = key; Object.assign(v, { gradSat: 1, gradBri: 1, gradDur: 7, gradAng: 67 }, g.v); }
/* 文字色の自動判定: 色5段の中ほど(26/59/76%)の明るさ平均に「暗さ」を掛けて 0.42 未満なら白文字 */
function cvInkLight() {
  const c = params.cv || {}; if (c.ink === 'light') return true; if (c.ink === 'dark') return false;
  const cols = Array.isArray(c.colors) ? c.colors : CV_DEF_COLORS;
  const lum = h => { const v = cvHex(h, '#888888'); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const mid = (lum(cols[1]) + lum(cols[2]) + lum(cols[3])) / 3;
  const dark = Math.max(c.dark || 0, (typeof cvStyleDef === 'function' && cvStyleDef().dark) ? 1 : 0);
  return (mid * (1 - dark * 0.7)) < 0.42;
}
/* ===== 【2026-09-15 ヒデさん指摘】縦幅や間隔を伸ばしても「上が薄くならない」ための土台 =====
   ① 溶け込みの薄い帯は【伸ばす前の高さ】を基準にした px で持つ(% だと伸ばした分だけ薄い帯も伸びる)
   ② グラデ自体はセクションに素直に収める(引き伸ばさない)。以前は上端固定で下へ伸ばしていたが、
      色の範囲を超えた所が平坦になり、縦幅を伸ばすと絵が破綻したためやめた(2026-09-15) */
let cvNatH = 0, cvNatKey = '';
function cvNaturalH(sec) {
  if (!sec) return 0;
  const key = (sec.className || '') + '|' + Math.round(window.innerWidth || 0) + '|' + ((params.cv && params.cv.headTop != null) ? params.cv.headTop : CV_HEAD_TOP_DEF);
  if (key === cvNatKey && cvNatH > 20) return cvNatH;
  const st = sec.style, mh = st.minHeight, pt = st.paddingTop;
  st.minHeight = '0px'; st.paddingTop = '0px';                 /* 伸ばす指定を一時的に外して素の高さを測る */
  const h = sec.getBoundingClientRect().height;
  st.minHeight = mh; st.paddingTop = pt;
  if (h > 20) { cvNatH = h; cvNatKey = key; }
  return cvNatH || h;
}
let cvRisePx = 0;                 /* 【2026-09-15】canvas を上へはみ出させている量(CSSpx)。シェーダへ渡す */
function cvApplyFade(sec) {
  const base = cvNaturalH(sec) || sec.getBoundingClientRect().height || 609;
  const f0 = (params.cv && params.cv.fade0 != null) ? params.cv.fade0 : 0;
  const f1 = (params.cv && params.cv.fade1 != null) ? params.cv.fade1 : 44;
  /* 【2026-09-15 ヒデさん指摘】PC は「上の溶け込み(px)」を導入事例の下の空きへ逃がす方式。
     SP はレイアウトが別物なので従来どおり(素の高さに対する %)。 */
  const _mbF = document.documentElement.classList.contains('mb');
  const _cvCanvasEl = document.getElementById('cvCanvas');
  if (_mbF) {
    cvRisePx = 0;
    sec.style.setProperty('--cv-rise', '0px');
    sec.style.setProperty('--cv-fade0', Math.round(base * f0 / 100) + 'px');
    sec.style.setProperty('--cv-fade1', Math.round(base * f1 / 100) + 'px');
    /* SP は従来の CSS 変数マスクへ戻す(PC で付けたインラインマスクを解除) */
    if (_cvCanvasEl) { ['maskImage','webkitMaskImage','maskSize','webkitMaskSize','maskRepeat','webkitMaskRepeat','maskPosition','webkitMaskPosition','maskComposite','webkitMaskComposite'].forEach(k => _cvCanvasEl.style[k] = ''); }
  } else {
    const _deepRaw = Math.max(0, (params.cv && params.cv.blend != null) ? params.cv.blend : CV_BLEND_DEF);
    const _deep = Math.min(_deepRaw, Math.round(base * 0.95));   /* 本体の高さを超えない=下端は必ず満色になる */
    /* 上端を導入事例の下の空きへ“少しだけ”逃がす(隙間があれば)。無くても本体の中で溶けるので線は出ない */
    let _room = 0;
    const _gr = document.getElementById('caseGrid');
    if (_gr) _room = Math.max(0, Math.round(sec.getBoundingClientRect().top - _gr.getBoundingClientRect().bottom - 2));
    /* 【2026-09-16 ヒデさん案】お問い合わせを z-index で導入事例の“下”に潜らせ、グラデでカードを淡く染める。
       cases は z-index:1 で上・pin-vp 透明なので、canvas を余分に上げるとカードの裏でグラデが淡く透ける。 */
    const _under = Math.max(0, (params.cv && params.cv.underCards != null) ? params.cv.underCards : 0);   /* カードの裏へ潜り込ませる量(px)。0=従来(カード直下で止める) */
    cvRisePx = Math.min(_deep, _room) + _under;   /* 隙間ぶん＋カードの裏へ潜る分 */
    const _span = cvRisePx + _deep;   /* 溶け込みの総距離: rise(隙間＋カード裏) ＋ deep(本体の中)。上端ほど淡いので裏はうっすら色味 */
    sec.style.setProperty('--cv-rise', cvRisePx + 'px');
    sec.style.setProperty('--cv-fade0', '0px');
    sec.style.setProperty('--cv-fade1', _span + 'px');
    /* 【2026-09-16 改訂】溶け込みは「本体の中まで前寄せで長く」。形(波/弧/斜め/二段/もや)は付けない=馴染ませが目的 */
    if (_cvCanvasEl && typeof cvEdgeMask === 'function') cvEdgeMask(_cvCanvasEl, _span);
  }
}
/* 画面幅が変わったら素の高さも変わる(文字の折返し)ので測り直す */
function cvSyncStretch() {
  const sec = document.getElementById('conversion'); if (!sec) return 1;
  const before = cvNatH, base = cvNaturalH(sec);
  if (base !== before) cvApplyFade(sec);
  const now = sec.getBoundingClientRect().height;
  return (base > 20 && now > 20) ? Math.min(3, Math.max(0.5, now / base)) : 1;
}
function applyCvStyle(fromSwitch) {
  const sec = document.getElementById('conversion'); if (!sec) return;
  if (typeof applyCvfGlass === 'function') applyCvfGlass();   /* フォームの地色/ぼかし/彩度/入力欄/プレースホルダー */
  const st = cvStyleDef();
  /* デザイン案を切り替えた時は、その案に紐づくカラー案の値を入れ直す(初回読み込みは保存値を尊重して触らない) */
  if (fromSwitch && applyCvStyle._last !== st.key) cvApplyColorFull(cvColorKey());
  applyCvStyle._last = st.key;
  sec.classList.toggle('cv-ink-light', cvInkLight());
  CV_STYLES.forEach(s => sec.classList.toggle('cvs-' + s.key, s.key === st.key));
  /* 【V5.0】CTA=ボタン/フォーム 切替、フォームのスタイル案 fst-1〜5 */
  sec.classList.toggle('cv-cta-form', String((params.cvCta) || 'button') === 'form');
  ['1','2','3','4','5'].forEach(k => sec.classList.toggle('fst-' + k, String(params.formStyle || '1') === k));
  sec.classList.toggle('cv-fi', !!st.fi && !st.card);
  const ft = document.getElementById('footer'); if (ft) ft.classList.toggle('ft-hidden', !!st.fi);
  /* 【2026-09-15 ヒデさん指摘「縦幅を伸ばしても見た目が変わらない」】
     一体型は min-height が素の高さ(≒670px)より小さいと何も起きなかった。→「素の高さ＋追加の高さ」で持つ。
     枠の案は従来どおり「縦幅」そのもの(カンプ 416)。 */
  /* 【2026-09-15 ヒデさん指摘】見出しの上の余白。素の高さに影響するので cvNaturalH より【先】に入れる */
  /* 【2026-09-16】切れ目(溶け込み)が基準の空きより高い時、はみ出す分だけ見出しの上の余白を削る＝見た目の総高さを一定に保つ */
  const _edgeComp = 0;   /* 【2026-09-16 改訂】溶け込みはマスクで本体に重ねる方式。空間を予約しないので見出し/間隔の補正は不要 */
  { const _ht = ((params.cv && params.cv.headTop != null) ? params.cv.headTop : CV_HEAD_TOP_DEF) - _edgeComp;
    sec.style.setProperty('--cv-head-top', Math.max(16, Math.round(_ht)) + 'px'); }
  { const _fi = !!st.fi && !st.card, _nat = _fi ? cvNaturalH(sec) : 0;
    const _t = (params.cv && params.cv.addT) || 0, _b = (params.cv && params.cv.addB) || 0;
    sec.style.setProperty('--cv-add-t', Math.round(_t) + 'px');
    sec.style.setProperty('--cv-add-b', Math.round(_b) + 'px');
    sec.style.setProperty('--cv-h', Math.round(_fi && _nat > 20 ? _nat + _t + _b : ((params.cv && params.cv.h) || 416)) + 'px'); }
  { const HV = { cyan: ['#0EBBFF', '#fff'], black: ['#090909', '#fff'], white: ['#ffffff', '#111'], pink: ['#FF5D97', '#fff'], navy: ['#0E4497', '#fff'] };
    const hv = HV[(params.cv && params.cv.btnHover) || 'cyan'] || HV.cyan; sec.style.setProperty('--cv-hov-bg', hv[0]); sec.style.setProperty('--cv-hov-fg', hv[1]); }
  sec.style.setProperty('--cvf-w', Math.round(params.formWidth != null ? params.formWidth : 660) + 'px');   /* 【V5.0】フォームの横幅 */
  const _mb = document.documentElement.classList.contains('mb');
  /* ⚠️ 間隔は #cases(別のセクション)に効かせるので、変数はルート(html)に置く。#conversion に置くと届かない */
  { let _g = _mb ? 0 : (((params.cv && params.cv.gapTop) || 0) + _edgeComp);   /* 【2026-09-16】切れ目の高さ分だけ間隔も広げる(headTop 側で相殺し総高さ一定) */
    /* 詰める(マイナス)は「導入事例の下に空いている分」までに制限する。これ以上詰めるとカードが切れるため */
    if (_g < 0) {
      const _cs = document.getElementById('cases'), _gr = document.getElementById('caseGrid');
      if (_cs && _gr) {
        const _slack = Math.max(0, Math.round(_cs.getBoundingClientRect().bottom - _gr.getBoundingClientRect().bottom - 8));
        _g = Math.max(_g, -_slack);
      }
    }
    document.documentElement.style.setProperty('--cv-gap', Math.round(_g) + 'px');   /* 導入事例との間隔(SP は従来どおり効かせない) */ }
  cvApplyFade(sec);   /* 溶け込みの境界(「伸ばす前の高さ」基準の px。伸ばしても薄い帯は広がらない) */
  /* 案11: 黒ボタンをフッター帯(©の左)へ移す。他の案では本文の下へ戻す */
  const btn = sec.querySelector('.cv-btn'), footR = sec.querySelector('.cv-foot-r'), content = sec.querySelector('.cv-content');
  if (btn && footR && content) { if (st.btnInFoot) { if (btn.parentElement !== footR) footR.insertBefore(btn, footR.firstChild); } else if (btn.parentElement !== content) content.appendChild(btn); }
}

/* ===== コンバージョン背景: 流れるグラデ + Bayerディザ (2026-08-29 ヒデさん指定) =====
   カンプ 15993:43966 のラジアルグラデ(5ストップ・gradientTransform実測)を WebGL で再現し、
   惑星と同じ発想の「流れ」(fbmドメインワープ)を足して、Bayer行列で per-channel ディザ。
   粗さ(セル)・階調(levels)・流れの速さ/うねり・明るさ/コントラストは params.cv(調整パネル)で。 */
const cvBg = (function () {
  const canvas = document.getElementById('cvCanvas');
  if (!canvas) return {};
  let gl = null, uni = {}, fail = false;
  const t0 = performance.now();
  const VS = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }';
  const FS = `
precision mediump float;
uniform vec2 uRes; uniform float uTime;
uniform float uCell, uLevels, uSpread, uSpeed, uSwell, uFlowScale, uBright, uContrast;
uniform vec3 uC0, uC1, uC2, uC3, uC4;      /* 【2026-09-15】5段の色(カラー案・パネルで変更可) */
uniform float uCompRamp;   /* 【2026-09-16 ヒデさん依頼】1=デザインカンプ(17383:21430)の13段ランプを忠実に使う */
uniform vec3 uTopCol;   /* 【2026-09-15 ヒデさん指定】いちばん明るい所(カンプでは右上)の色。既定は薄い水色 */
uniform float uWhite;   /* 同・そこに白をどれだけ残すか(かすかに=0.12 くらい) */
uniform vec4 uFormRect; uniform float uFormCeil;   /* 【2026-09-18】お問い合わせフォームの範囲(gl座標 x0,y0,x1,y1)と、その中だけの明るさ上限(白飛び対策) */
uniform float uCeil;    /* 【2026-09-15】明るさの頭打ち。コントラスト(1.38)で淡い色が白に飛んで『欠けて見える』のを防ぐ */
uniform float uRise;   /* 【2026-09-15】canvas が上へはみ出した高さ(デバイスpx)。グラデはセクションの高さ基準のまま保つ */
/* 【2026-09-15 ヒデさん指摘】「うねりが小刻みにしかつけられない」。fbm は3オクターブなので強くすると細かいノイズも一緒に増え、
   大きな波にならず荒れるだけだった。→ なめらかな正弦波3本の合成で「大きなうねり」を別レイヤーとして足す。
   uWaveAmp=強さ / uWaveLen=波の細かさ(小さいほど大きな波) / uWaveSpd=ゆっくりさ */
uniform float uWaveAmp, uWaveLen, uWaveSpd;
/* 【2026-09-15 ヒデさん指摘】「もっとゆらゆらしている感じ」。進む波だけだと「流れて」見えるので、
   グラデ全体をゆっくり左右に傾ける＋わずかに息をするように伸縮させる＝ゆらゆら。
   uSwayDeg=傾く角度(度) / uSwaySec=1往復の秒数 */
uniform float uSwayDeg, uSwaySec, uSwayMode;   /* uSwayMode=揺らぎの型(0 ゆっくり傾く のみ。1〜6 は 2026-09-18 に完全削除) */
uniform float uSwayPivot, uWaveAnchor;
uniform float uCoreSkip;   /* 【2026-09-19 ヒデさん指定「白の領域を取る」】ランプの開始位置(0=白から / 0.34=白と淡ブルーを飛ばしてシアン寄りから) */
uniform float uCoreSoft;   /* 【2026-09-19 ヒデさん指摘「白がくっきりし過ぎ」】白の縁のぼかし: 白の周りだけ、色の切り替わりを t の前後 ±2w で平均してやわらかく(白の大きさは変えない) */
uniform float uCore;   /* 【2026-09-19 ヒデさん指定】白の絞り: 0=そのまま / 大きいほど白い芯だけ小さく(t を pow で中心側だけ圧縮。端の色の広がりは変えない) */   /* 【2026-09-18】揺らぎの軸(0=画面中心/1=白い光の中心) ／ 白い光の近くでうねりを弱める割合(0〜1) */
uniform float uGSpread;   /* 【2026-09-15】カンプの放射の広がり。1=カンプ / 大きいほど淡い中心が小さくなり、端まで色が届く */
uniform float uGMode, uGAng, uDark; uniform vec2 uGC, uGR; uniform vec3 uDarkCol;   /* 形(0=カンプ/1=放射/2=線形)・中心・広がり・回転、暗さ(黒ベース) */
uniform float uHue;   /* 【2026-09-15】色味の移ろい(色相の回転・ラジアン。JS が時間で回す) */
vec3 hueRot(vec3 c, float a) { const vec3 k = vec3(0.57735); float ca = cos(a), sa = sin(a); return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca); }
uniform vec3 uGA, uGB;   /* radial gradientTransform の係数(PC/SP でカンプが違うので JS から渡す) */
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float bayer16(vec2 a){ return bayer8(0.5 * a) * 0.25 + bayer2(a); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
/* カンプ実測の5ストップ(radial): 0=淡ピンク白 / 0.262=淡ブルー / 0.588=#0EBBFF / 0.763=青紫 / 1=#FF5D97 */
/* 【2026-09-16 ヒデさん依頼】デザインカンプ(node 17383:21430)のラジアルグラデを実測した13ストップ。
   淡ピンク白(t=0・右上) → 青の階調 → 紫 → ピンク(t=1・左下)。位置・色ともカンプの gradient stops そのまま。 */
uniform vec3 uS[13];   /* 【2026-09-19 ヒデさん依頼】13段の色は JS から渡す(通常はカンプ実測値そのまま=CV_COMP_STOPS。「色の入れ替わり」の時だけ並べ替えた色) */
vec3 stopColComp(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 s0=uS[0], s1=uS[1], s2=uS[2], s3=uS[3], s4=uS[4], s5=uS[5], s6=uS[6], s7=uS[7], s8=uS[8], s9=uS[9], s10=uS[10], s11=uS[11], s12=uS[12];
  if(t<0.26237) return mix(s0,s1,t/0.26237);
  if(t<0.34377) return mix(s1,s2,(t-0.26237)/0.08140);
  if(t<0.42516) return mix(s2,s3,(t-0.34377)/0.08139);
  if(t<0.50656) return mix(s3,s4,(t-0.42516)/0.08140);
  if(t<0.54725) return mix(s4,s5,(t-0.50656)/0.04069);
  if(t<0.58795) return mix(s5,s6,(t-0.54725)/0.04070);
  if(t<0.67557) return mix(s6,s7,(t-0.58795)/0.08762);
  if(t<0.76318) return mix(s7,s8,(t-0.67557)/0.08761);
  if(t<0.82239) return mix(s8,s9,(t-0.76318)/0.05921);
  if(t<0.88159) return mix(s9,s10,(t-0.82239)/0.05920);
  if(t<0.94080) return mix(s10,s11,(t-0.88159)/0.05921);
  return mix(s11,s12,(t-0.94080)/0.05920);
}
vec3 stopCol(float t){
  /* 色は uniform(既定はカンプ実測: #fee0f8 / #b6e0ff / #0ebbff / #477ed1 / #ff5d97)。位置はカンプの 0 / .262 / .588 / .763 / 1 */
  t = clamp(t, 0.0, 1.0);
  /* いちばん明るい所は「指定色＋ほんの少し白」。真っ白だと地色と同化して『グラデが欠けて見える』ため */
  vec3 c0 = mix(uTopCol, vec3(1.0), clamp(uWhite, 0.0, 1.0));
  if (t < 0.262) return mix(c0, uC1, t / 0.262);
  if (t < 0.588) return mix(uC1, uC2, (t - 0.262) / 0.326);
  if (t < 0.763) return mix(uC2, uC3, (t - 0.588) / 0.175);
  return mix(uC3, uC4, (t - 0.763) / 0.237);
}
vec3 rampAt(float t){ return (uCompRamp > 0.5) ? stopColComp(t) : stopCol(t); }
void main(){
  float CELL = max(1.0, uCell);
  vec2 cellId = floor(gl_FragCoord.xy / CELL);
  vec2 fc = (cellId + 0.5) * CELL;
  /* Figmaのオブジェクト座標(y下向き)に合わせる。uRise ぶん上へはみ出していても、
     グラデは【セクションの範囲】に写る(はみ出した所は上へ自然に続く)＝見え方は uRise=0 の時と同じ */
  vec2 uv = vec2(fc.x / uRes.x, (uRes.y - fc.y - uRise) / max(1.0, uRes.y - uRise));
  /* 流れ: 惑星と同じ発想で、uv を fbm でゆらしてから色を引く(ドメインワープ) */
  vec2 w = uv * uFlowScale;
  float n1 = fbm(w + vec2(uTime * uSpeed, 0.0));
  float n2 = fbm(w + vec2(0.0, uTime * uSpeed * 0.8) + 7.3);
  vec2 uvW = uv + (vec2(n1, n2) - 0.5) * uSwell;
  /* 大きなうねり: 周期の違う正弦波を重ねて、ゆっくり大きく押し引きする(細かいノイズが増えないので上品に揺れる) */
  if (uWaveAmp > 0.0001) {
    float tw = uTime * uWaveSpd;
    vec2 q = uv * max(0.15, uWaveLen);
    float w1 = sin((q.x * 1.00 + q.y * 0.35) * 6.2832 + tw * 1.00);
    float w2 = sin((q.x * 0.55 - q.y * 0.80) * 6.2832 - tw * 0.73 + 1.7);
    float w3 = sin((q.y * 0.70) * 6.2832 + tw * 0.49 + 3.1);
    float wk = uWaveAmp;
    if (uWaveAnchor > 0.001) { float dd = distance(uv, uGC); float near = 1.0 - smoothstep(0.15, 0.55, dd); wk *= 1.0 - clamp(uWaveAnchor, 0.0, 1.0) * near; }   /* 白い光の近くはうねらせない(案4) */
    uvW += vec2(w1 * 0.55 + w3 * 0.45, w2 * 0.60 + w1 * 0.40) * wk;
  }
  /* 【2026-09-15 ヒデさん依頼】揺らぎのパターン(案)。型ごとに動きの性格を変える。
     どの型も「ゆらゆらの大きさ」(uSwayDeg)と「周期」(uSwaySec)で強さ・速さを調整できる */
  if (uSwayDeg > 0.001) {
    float ph = uTime * 6.2832 / max(2.0, uSwaySec);
    vec2 pv = mix(vec2(0.5), uGC, clamp(uSwayPivot, 0.0, 1.0));   /* 揺らぎの軸: 画面中心 ↔ 白い光の中心(案4) */
    vec2 d = uvW - pv;
    float A = uSwayDeg * 0.017453;   /* 傾ける角度(ラジアン) */
    float S = uSwayDeg * 0.006;      /* 位置をずらす量(大きさに比例) */
    if (uSwayMode < 0.5) {                      /* 0 ゆっくり傾く(＋わずかな伸縮) */
      float a = sin(ph) * A, sc = 1.0 + sin(ph * 0.63 + 1.1) * uSwayDeg * 0.0045;
      d *= sc;
      uvW = pv + vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
    }   /* 揺らぎの型 1〜6(たゆたう/呼吸/潮/渦/斜め/連動モーフ)は 2026-09-18 に完全削除。残るのは 0 のみ */
  }
  /* カンプの gradientTransform(実測) で radial の t を出す(係数は uGA/uGB: PC と SP で別) */
  float t;
  if (uGMode < 0.5) {
    /* 【2026-09-15 ヒデさん指摘】カンプの形では「中心・広がり・縦横比・回転」のつまみが効いていなかった。
       カンプの明るい中心(0.78, 0.12)を基準に、パネルの値で ずらす/回す/伸ばす/広げる を全部効かせる。
       既定(中心 0.78,0.12 / 広がり0.9 / 縦横比1 / 回転0)なら、カンプそのままの見え方になる。 */
    vec2 c0p = vec2(0.78, 0.12);
    vec2 d = uvW - uGC;                                  /* 中心をずらす */
    float ca = cos(uGAng), sa = sin(uGAng);
    d = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);  /* 回転 */
    d.x /= max(0.2, uGR.x / max(0.05, uGR.y));           /* 縦横比 */
    vec3 g = vec3(d + c0p, 1.0);
    float gx = dot(uGA, g); float gy = dot(uGB, g);
    t = length(vec2(gx, gy) - 0.5) * 2.0 * max(0.2, uGSpread) * (0.9 / max(0.1, uGR.y));   /* 広がり */
  }
  else {
    /* パネルの形: 中心(uGC)・広がり(uGR)・回転(uGAng)。放射=楕円の距離 / 線形=回転した軸に沿った距離 */
    vec2 d = uvW - uGC; float ca = cos(uGAng), sa = sin(uGAng); d = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
    t = (uGMode < 1.5) ? length(d / max(uGR, vec2(0.05))) : (d.x / max(uGR.x, 0.05) + 0.5);
  }
  t = pow(clamp(t, 0.0, 1.0), 1.0 / (1.0 + max(0.0, uCore)));   /* 白の絞り(案7) */
  t = clamp(uCoreSkip, 0.0, 0.9) + t * (1.0 - clamp(uCoreSkip, 0.0, 0.9));   /* 白を取る: 中心の色を uCoreSkip の位置から始める */
  vec3 col;
  float sw = uCoreSoft * (1.0 - smoothstep(0.3, 0.7, t));   /* 白の周り(t<0.3)は全開、遠くは効かない */
  if (sw > 0.0005) {
    col = (rampAt(t - 2.0 * sw) + rampAt(t - sw) * 2.0 + rampAt(t) * 3.0 + rampAt(t + sw) * 2.0 + rampAt(t + 2.0 * sw)) / 9.0;   /* 白の縁のぼかし */
  } else col = rampAt(t);
  if (abs(uHue) > 0.001) col = clamp(hueRot(col, uHue), 0.0, 1.0);   /* 色味の移ろい: うねり全体が青になったりピンクになったり */
  col = (col - 0.5) * uContrast + 0.5;     /* カンプのディザ設定: Contrast 1.38 */
  col *= uBright;                          /* Brightness 104% */
  /* 【2026-09-18 ヒデさん依頼】フォームの領域には白が来ないように: 範囲内だけ明るさの上限を下げる(縁60pxはなだらかに) */
  float fm = 0.0;
  if (uFormRect.z > uFormRect.x) { float fe = 140.0; vec2 fc2 = gl_FragCoord.xy;
    fm = smoothstep(uFormRect.x - fe, uFormRect.x, fc2.x) * (1.0 - smoothstep(uFormRect.z, uFormRect.z + fe, fc2.x)) * smoothstep(uFormRect.y - fe, uFormRect.y, fc2.y) * (1.0 - smoothstep(uFormRect.w, uFormRect.w + fe, fc2.y)); }
  col = min(col, vec3(uCeil));             /* 白飛びの頭打ち(1.0 で従来どおり) */
  { float mx = max(col.r, max(col.g, col.b)); float capF = min(uCeil, uFormCeil);   /* フォーム裏: 色味は変えずに明るさだけ上限へ(縁140pxはなだらか) */
    if (fm > 0.0 && mx > capF) col = mix(col, col * (capF / mx), fm); }
  col = mix(col, mix(uDarkCol, col, 0.42), uDark);   /* 暗さ: 黒ベースに寄せる(色は残り火のように残る) */
  float dith = bayer16(cellId);
  vec3 q = clamp(floor(col * uLevels + vec3((dith - 0.5) * uSpread) + 0.5) / uLevels, 0.0, 1.0);
  gl_FragColor = vec4(q, 1.0);
}`;
  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { fail = true; return null; }
    return s;
  }
  function init() {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) { fail = true; return; }
    const p = gl.createProgram();
    const v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) { fail = true; return; }
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { fail = true; return; }
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'aP');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const k of ['uRes', 'uTime', 'uCell', 'uLevels', 'uSpread', 'uSpeed', 'uSwell', 'uFlowScale', 'uBright', 'uContrast', 'uGA', 'uGB', 'uC0', 'uC1', 'uC2', 'uC3', 'uC4', 'uS', 'uGMode', 'uGAng', 'uDark', 'uGC', 'uGR', 'uDarkCol', 'uHue', 'uTopCol', 'uWhite', 'uCeil', 'uGSpread', 'uRise', 'uCompRamp', 'uWaveAmp', 'uWaveLen', 'uWaveSpd', 'uSwayDeg', 'uSwaySec', 'uSwayMode'])
      uni[k] = gl.getUniformLocation(p, k);
    uni.uFormRect = gl.getUniformLocation(p, 'uFormRect'); uni.uFormCeil = gl.getUniformLocation(p, 'uFormCeil');   /* 2026-09-18 */
    uni.uSwayPivot = gl.getUniformLocation(p, 'uSwayPivot'); uni.uWaveAnchor = gl.getUniformLocation(p, 'uWaveAnchor'); uni.uCore = gl.getUniformLocation(p, 'uCore'); uni.uCoreSoft = gl.getUniformLocation(p, 'uCoreSoft'); uni.uCoreSkip = gl.getUniformLocation(p, 'uCoreSkip');
  }
  function visible() {
    const r = canvas.getBoundingClientRect();
    return r.width > 0 && r.bottom > -60 && r.top < (innerHeight || 1) + 60;
  }
  function draw() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round((canvas.clientWidth || 400) * dpr)), h = Math.max(2, Math.round((canvas.clientHeight || 200) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    const c = params.cv || {};
    gl.uniform2f(uni.uRes, w, h);
    gl.uniform1f(uni.uTime, (performance.now() - t0) / 1000);
    gl.uniform1f(uni.uCell, Math.max(1, (c.cell != null ? c.cell : 1)) * dpr);
    gl.uniform1f(uni.uLevels, Math.max(2, c.levels != null ? c.levels : 3));
    gl.uniform1f(uni.uSpread, c.spread != null ? c.spread : 1.0);
    gl.uniform1f(uni.uSpeed, c.speed != null ? c.speed : 0.25);
    gl.uniform1f(uni.uSwell, c.swell != null ? c.swell : 0.12);
    gl.uniform1f(uni.uFlowScale, c.flowScale != null ? c.flowScale : 3.0);
    gl.uniform1f(uni.uBright, c.bright != null ? c.bright : 1.04);
    gl.uniform1f(uni.uContrast, c.contrast != null ? c.contrast : 1.38);
    /* 【2026-09-15 ヒデさん指定】カラー案: 5色・形・暗さ(params.cv。パネル「コンバージョン」で細かく変えられる) */
    const cols = Array.isArray(c.colors) ? c.colors : CV_DEF_COLORS;
    /* 色が移ろう案: ブランド色＋白のパレットを時間でなめらかに入れ替える(params.cv.colors は書き換えない=保存値は無事) */
    let mood = null;
    if (c.hueMode === 'swing' || c.hueMode === 'cycle') {
      const msec = Math.max(4, c.moodSec != null ? c.moodSec : 30);
      mood = cvMoodAt(((performance.now() - t0) / 1000) / msec, c.hueMode, c.moodWhite != null ? c.moodWhite : 0.85);
    }
    ['uC0', 'uC1', 'uC2', 'uC3', 'uC4'].forEach((k, i) => { const v = mood ? mood[i] : cvHex(cols[i], CV_DEF_COLORS[i]); gl.uniform3f(uni[k], v[0], v[1], v[2]); });
    /* 【2026-09-19 ヒデさん依頼】色の入れ替わり(白い光はそのまま・外側の色だけ回す/左右反転)。13段(カンプ)ランプと5段ランプの両方に同じ並べ替えを入れる */
    { const sw = (c.hueMode === 'swap' || c.hueMode === 'flip') ? cvSwapAt(((performance.now() - t0) / 1000) / Math.max(4, c.moodSec != null ? c.moodSec : 30), c.hueMode, cols, c.swapHold != null ? c.swapHold : 0.45) : null;
      gl.uniform3fv(uni.uS, sw ? sw.comp : CV_COMP_FLAT);
      if (sw) ['uC1', 'uC2', 'uC3', 'uC4'].forEach((k, i) => gl.uniform3f(uni[k], sw.five[i + 1][0], sw.five[i + 1][1], sw.five[i + 1][2])); }
    gl.uniform1f(uni.uGMode, c.gMode != null ? c.gMode : 0);
    gl.uniform2f(uni.uGC, c.gcx != null ? c.gcx : 0.60, c.gcy != null ? c.gcy : 0.00);
    const gr = c.gr != null ? c.gr : 0.9, ga = c.gAspect != null ? c.gAspect : 1;
    gl.uniform2f(uni.uGR, gr * ga, gr);
    gl.uniform1f(uni.uGAng, (c.gAng != null ? c.gAng : 0) * Math.PI / 180);
    gl.uniform1f(uni.uDark, Math.max(c.dark != null ? c.dark : 0, (typeof cvStyleDef === 'function' && cvStyleDef().dark) ? 1 : 0));
    const dc = cvHex(c.darkCol, '#0d0f14'); gl.uniform3f(uni.uDarkCol, dc[0], dc[1], dc[2]);
    /* 色相の回転は使わない(ブランドにない色が出るため)。移ろいは上のパレット入れ替えで行う */
    gl.uniform1f(uni.uHue, 0);
    /* 【2026-09-15 ヒデさん指摘・修正】以前は縦に伸ばした分だけグラデも下へ引き伸ばしていたが、
       色の範囲(0〜1)を超えた所が【平坦なピンク】になり、縦幅を伸ばすと絵が破綻していた。
       グラデはセクション全体に素直に収める(引き伸ばさない)。上が薄くなる問題は溶け込みの px 固定で対処済み。
       cvSyncStretch は「伸ばす前の高さ」の測り直し(＝溶け込みの px 更新)のために呼ぶ。 */
    if (typeof cvSyncStretch === 'function') cvSyncStretch();
    /* いちばん明るい所(カンプでは右上)が地色と同化して「グラデが欠けて見える」ので、淡ブルー側へ寄せて色を通す */
    { const tc = cvHex(c.topCol, '#7cc9e8'); gl.uniform3f(uni.uTopCol, tc[0], tc[1], tc[2]); }
    gl.uniform1f(uni.uWhite, c.topWhite != null ? c.topWhite : 0.12);
    gl.uniform1f(uni.uCeil, c.ceil != null ? c.ceil : 0.9);
    /* 【2026-09-18】フォームの範囲を毎フレーム渡す(canvas の実ピクセル座標・y は下から) */
    try { const fe = document.querySelector('#conversion .cv-form'), cvs = gl.canvas; const fcs = fe ? getComputedStyle(fe) : null;
      if (fe && cvs && fcs && fcs.display !== 'none') { const fr = fe.getBoundingClientRect(), cr = cvs.getBoundingClientRect(); const sx = cvs.width / Math.max(1, cr.width), sy = cvs.height / Math.max(1, cr.height);
        gl.uniform4f(uni.uFormRect, (fr.left - cr.left) * sx, (cr.bottom - fr.bottom) * sy, (fr.right - cr.left) * sx, (cr.bottom - fr.top) * sy); }
      else gl.uniform4f(uni.uFormRect, 0, 0, 0, 0); } catch (e) { try { gl.uniform4f(uni.uFormRect, 0, 0, 0, 0); } catch (e2) {} }
    gl.uniform1f(uni.uFormCeil, c.formCeil != null ? c.formCeil : 1.0);   /* 2026-09-18: 取り下げ(1.0=効かない)。仕組みだけ残す */
    gl.uniform1f(uni.uRise, cvRisePx * dpr);   /* 【2026-09-15】上へのはみ出し(CSSpx→デバイスpx) */
    gl.uniform1f(uni.uWaveAmp, c.wave != null ? c.wave : 0.13);      /* 【2026-09-15】大きなうねり */
    gl.uniform1f(uni.uWaveLen, c.waveLen != null ? c.waveLen : 0.85);
    gl.uniform1f(uni.uWaveSpd, c.waveSpd != null ? c.waveSpd : 0.11);
    gl.uniform1f(uni.uSwayDeg, c.swayDeg != null ? c.swayDeg : 5);      /* 【2026-09-15】ゆらゆら(全体の傾き) */
    gl.uniform1f(uni.uSwaySec, c.swaySec != null ? c.swaySec : 26);
    gl.uniform1f(uni.uSwayPivot, c.swayPivot != null ? c.swayPivot : 0); gl.uniform1f(uni.uWaveAnchor, c.waveAnchor != null ? c.waveAnchor : 0);   /* 2026-09-18 案4 */
    gl.uniform1f(uni.uCore, c.core != null ? c.core : 0);   /* 2026-09-19 白の絞り(案7) */
    gl.uniform1f(uni.uCoreSoft, c.coreSoft != null ? c.coreSoft : 0);   /* 2026-09-19 白の縁のぼかし */
    gl.uniform1f(uni.uCoreSkip, c.coreSkip != null ? c.coreSkip : 0);   /* 2026-09-19 白を取る */
    gl.uniform1f(uni.uSwayMode, c.swayMode != null ? c.swayMode : 0);   /* 揺らぎの型(案) */
    gl.uniform1f(uni.uGSpread, c.gSpread != null ? c.gSpread : 1.5);
    gl.uniform1f(uni.uCompRamp, (c.ramp === 'comp' || c.ramp === 1) ? 1 : 0);   /* 【2026-09-16】デザインカンプの13段ランプ */
    /* 【2026-09-09】radial の gradientTransform をカンプ別に。PC=15993:43966 / SP=16534:22768(346×275)。
       SP は M=[-31.225 24.205 -22.32 -26.671 300.25 32.955], r=10 を u,v∈[0,1] に正規化して
       gx = 係数·(u,v,1)/20 + 0.5 の形にした値(中心(300,33)=右上で t=0(淡ピンク白)、左下 t≒0.98(ピンク)、右下 0.70(青紫))。 */
    const GA = isMobile ? [-0.33604, 0.22351, 0.76480] : [-0.38077, 0.29537, 0.79503];
    const GB = isMobile ? [-0.30497, -0.31268, 0.80212] : [-0.37953, -0.33868, 0.86993];
    gl.uniform3f(uni.uGA, GA[0], GA[1], GA[2]);
    gl.uniform3f(uni.uGB, GB[0], GB[1], GB[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame() {
    requestAnimationFrame(frame);
    if (fail || !visible()) return;
    if (!gl) { init(); if (fail || !gl) return; }
    draw();
  }
  requestAnimationFrame(frame);
  /* sample() = 描画直後に readPixels で色を返す(検証用。preserveDrawingBuffer なしでも同一フレームなら読める) */
  function sample() {
    if (fail) return { fail: true };
    if (!gl) { init(); if (fail || !gl) return { fail: true }; }
    draw();
    const w = canvas.width || 2, h = canvas.height || 2;
    const read = (fx, fy) => {
      const p = new Uint8Array(4);
      gl.readPixels(Math.round(w * fx), Math.round(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
      return [p[0], p[1], p[2]];
    };
    return { tl: read(0.05, 0.9), tr: read(0.95, 0.9), c: read(0.5, 0.5), bl: read(0.05, 0.1), br: read(0.95, 0.1) };
  }
  return { sample };
})();
