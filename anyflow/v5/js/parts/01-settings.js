/* ================= 軌道データ (Figma カンプから抽出) ================= */
/* ===== 軌道レイアウト (2026-08-26 ヒデさん採用: ジャイロクロス) =====
   figma = カンプ通り(2本ほぼ平行) / gyro = ジャイロクロス。
   gyro は2本の傾きを逆方向にして天球儀のように立体交差させ、惑星の前後を横切る場所を
   増やして奥行きを出す。中心は惑星(436,242)寄りに置き、開き(ry/rx)も変えて交差を強調。 */
const ORBIT_LAYOUTS = {
  figma: {
    name: 'カンプ通り',
    outer: { cx: 457.741, cy: 306.543, rx: 435.517, ry: 146.026, rot: -23.3266 },
    inner: { cx: 475.283, cy: 350.505, rx: 397.09,  ry: 133.142, rot: -23.3266 },
  },
  gyro: {
    name: 'ジャイロクロス',
    outer: { cx: 436, cy: 265, rx: 435.517, ry: 435.517 * 0.30, rot: -24 },
    inner: { cx: 436, cy: 253, rx: 397.09,  ry: 397.09  * 0.42, rot: 14 },
  },
};
/* 【2026-08-29 ヒデさん指定】回転アニメの時計。開始位相(startPhase)を足す。
   ページを開いた時点の startPhase を1回だけ固定して覚え(kvStartAtLoad)、
   そこに elapsed を足すので、ボタンで startPhase を保存しても今の表示は飛ばない(次回開いた時に効く)。 */
let kvStartAtLoad = null, kvRevealElapsed = null;
function kvGT() {
  if (kvStartAtLoad == null) kvStartAtLoad = (params.conv && params.conv.startPhase) || 0;
  /* 【2026-09-08】静的モバイル: グラフィックの時間アニメ(メッシュ/軌道/回転)を固定時刻で静止させる＝
     スクロールで動いて見えるのを止める。 */
  /* 【2026-09-09 ヒデさん指定】出現アニメは PC と同じに戻す(静的化で固定していたクロックを解除) */
  /* 登場(KVが見え始める)までは開始位相のまま止める → 登場した瞬間が開始地点になる */
  if (kvRevealElapsed == null) return kvStartAtLoad;
  return kvStartAtLoad + (elapsed - kvRevealElapsed);
}
/* 軌道そのものの回転量(度)。0なら従来どおり形は固定 */
/* いま選んでいる案の「軌道の回転」の量 */
function convOrbitSpinAmt() {
  const C = params.conv;
  if (!C) return 0;
  const m = params.converge || 'reel';
  const by = C.orbitSpinBy;
  if (by && typeof by[m] === 'number') return by[m];
  return C.orbitSpin || 0;      /* 案ごとの値がまだ無い時は、昔の共通の値を使う */
}
function convOrbitSpin(key) {
  const amt = convOrbitSpinAmt();
  if (!amt) return 0;
  if (params.kvDesign !== 'planet') return 0;
  const dir = (key === 'inner') ? -1 : 1;   /* 2本が逆向きに回ると立体感が出る */
  /* 【2026-08-30 ヒデさん指定】回り方のバリエーション:
     turn   = ぐるっと一周し続ける(従来)
     wobble = グラグラ揺れる(往復)。振れ幅は spinWobbleDeg(°)、速さは「回転の速さ」を流用 */
  const style = ((params.conv.spinStyleBy || {})[params.converge || 'off']) || 'turn';
  if (style === 'wobble') {
    /* 【2026-08-30 ヒデさん指定・改】グラグラがガタガタして見えたので滑らかに:
       速度を落とし(2.4→1.4)、周期の違う2つの波を混ぜて「端でピタッと折り返す」感じを消す。
       一周はせず、揺れ幅(spinWobbleDeg)の範囲内でぬるっと行き来する。 */
    const deg = (params.conv.spinWobbleDeg != null ? params.conv.spinWobbleDeg : 16);
    const ph = kvGT() * Math.abs(amt) * 1.4;
    const s = Math.sin(ph) * 0.7 + Math.sin(ph * 0.53 + 1.3) * 0.3;
    return s * deg * dir;
  }
  return kvGT() * amt * 18 * dir;
}
function orbitBase(key) {
  return (ORBIT_LAYOUTS[params.orbitLayout] || ORBIT_LAYOUTS.figma)[key];
}
/* 各ドット: 所属楕円と初期角度
   【2026-08-19 ヒデさん指定】
     ・上の軌道(outer)はドットが2個しかなかったので、ピンクを1個足して3個に
     ・ネイビー(#0E4497)は水色(#0EBBFF)へ
     ・角度は「できるだけ等間隔」に → outer=120°ずつ / inner=90°ずつ
   外側の基準角は【カンプの位置からいちばん動かなくて済む値】を最小二乗で求めた:
     outer 44.15° (グレー -23.1° / 元ネイビー +23.1°)
   内側の基準角は 14°。カンプ寄せの 33.14° にしなかったのは、
   ⚠️ 2本の軌道は画面上で交差するため、そこですれ違うドットが重なるから。
      全周を1°刻み × 内外の基準角を総当たりで走査した実測:
        outer 44.15° / inner 33.14°(カンプ寄せ) → いちばん近づく瞬間 1px = 2個が1個に見える
        outer 44.15° / inner 14°               → いちばん近づく瞬間 26px = ちゃんと2個に見える
      26px はこの構成(3個+4個・この2本の楕円)で取りうる最大値。
      ドットの直径が 11.2px なので、26px なら間に1個ぶんの隙間が残る */
const DOTS = [
  /* ↓ 上の軌道 (outer)。120°ずつの等間隔 */
  { name: 'グレー',    color: '#4E4E4E', ellipse: 'outer', angle: 44.15 },
  { name: 'ピンク C',  color: '#FF5D97', ellipse: 'outer', angle: 164.15 },   /* 2026-08-19 追加 */
  { name: '水色 C',    color: '#0EBBFF', ellipse: 'outer', angle: 284.15 },   /* 元ネイビー #0E4497 */
  /* ↓ 下の軌道 (inner)。90°ずつの等間隔。ピンクと水色が交互に並ぶ */
  { name: 'ピンク B',  color: '#FF5D97', ellipse: 'inner', angle: 14 },
  { name: '水色 A',    color: '#0EBBFF', ellipse: 'inner', angle: 104 },
  { name: 'ピンク A',  color: '#FF5D97', ellipse: 'inner', angle: 194 },
  { name: '水色 B',    color: '#0EBBFF', ellipse: 'inner', angle: 284 },
];
const DOT_R = 5.606;
/* 【2026-08-28 ヒデさん指定】軌道に乗る基準ドットは、カンプ(node 13951-13623 / 15886)の
   12px 相当。半径6.0=直径12。やや大きめで、基本は透過させない(カンプに合わせる)。 */
const BASE_DOT_R = 6.0;
/* ===== ドットの間隔 (2026-08-19) =====
   「速さのゆらぎ(pulse)」の位相をドットごとにずらすと、等間隔に置いても
   走っているうちに間隔が崩れる。実測: outer は 120°のはずが 82°〜151° まで開閉した。
   ①きっちり等間隔 = 同じ軌道のドットは同じ位相で走らせる → 間隔が常に一定
   ②ばらつかせる   = 従来どおりドットごとに位相をずらす → 団子になったり離れたりする */
const DOT_GAPS = [
  { name: '①きっちり等間隔', desc: '間隔を保ったまま7個が同じ速さで回る（外120°ずつ・内90°ずつ）。カンプの整った印象に近い。' },
  { name: '②ばらつかせる',   desc: '1個ずつ速さがずれて、近づいたり離れたりする。生き物っぽく見えるが、間隔は崩れる。' },
];
/* ①の時に使う ゆらぎ位相。
   ⚠️ 内と外でずらすと、2本のリングの相対位置が時間とともに動く。
      すると軌道の交差点で【ドットが完全に重なる瞬間】が必ず出てしまう。
      内外そろえておけば相対位置が固定され、最接近 26px（＝重ならない）を保てる */
const DOT_PULSE_PHASE = 0;

/* ================= ゆらぎ (グラフィック全体の動き) ================= */
const SWAYS = [
  { id: 'none',   name: '①固定', desc: 'ゆらぎなし。カンプの構図のまま。' },
  { id: 'seesaw', name: '②シーソー', desc: '全体が±3°ほどでゆっくり傾く。' },
  { id: 'cross',  name: '③クロス', desc: '最初はカンプ通り平行。少し経つと2本が逆方向に傾いて交差しはじめる。' },
];

/* 【2026-08-29 ヒデさん指定】Vision メッセージの「強み」強調アニメ 10案。
   先進的・洗練・ちょいハイテク、でも上品・誠実・自信のトンマナ。 */

/* ================= ディザ演出 (惑星B ハーフトーン専用) ================= */
const DITHERS = [
  { name: '①固定', desc: '色は動かない。' },
  { name: '②うつろい', desc: '場所ごとに白⇄青⇄紫をゆっくり行き来して、境目のピクセルがパラパラ入れ替わる。' },
  { name: '③流れ', desc: '白→青→紫の色の帯が斜めに流れていき、ピクセルが順にめくれていく。' },
  { name: '④さざ波', desc: '細かい色の波が球面を通って、通り道のドットがパラパラ変わる。' },
];


/* ================= セクション演出の複数案 =================
   絵コンテで「Claude側で補完して」とされた箇所は案を出し分けられる */
/* 見出しの左スライド4案は、2026-08-14 に「中央で上下に分かれる」形へ作り替えたため廃止 */



/* ================= 惑星デザイン (Figmaカンプ5種) =================
   カンプ画像(4倍解像度)をそのまま球面テクスチャとして貼り、
   デザインごとに専用シェーダー(finish)で質感を仕上げる。
   裏側はカンプに存在しないため鏡映で生成 (uv を d.xy から取ると表裏対称になる)。 */
/* ================= 波が流れる惑星 (F/G/H) =================
   カンプ 14776:26144 の3案。E と同じハーフトーン(ベイヤーディザ)の質感のまま、
   「色の場」だけを差し替えて【左下から右上へ色の帯が波のように流れる】形にしたもの。
     F = 帯なし(一方向のグラデがゆっくり流れる)
     G = 白い帯が1本、斜めに流れる
     H = 白い帯が2本、S字にうねりながら流れる */
function waveFragment(bands, warp, rampSrc, rimCol, rimAmt) {
  /* 【2026-09-02 ヒデさん指定】配色ランプとフチの色を差し替え可能に。
     未指定なら従来のカンプ配色のまま(C1〜C3は挙動不変) */
  return `
precision highp float;
uniform vec2 uRes;
uniform float uAngle;
uniform float uAngle2;
uniform float uNoise;
uniform float uTime;
uniform float uDither;  /* 1=止まる 2=ゆっくり 3=流れる 4=波打つ */
uniform float uLight;

mat3 rotAxis(vec3 a, float t){
  float c = cos(t), s = sin(t);
  vec3 u = normalize(a);
  return mat3(
    c+u.x*u.x*(1.-c),      u.x*u.y*(1.-c)-u.z*s,  u.x*u.z*(1.-c)+u.y*s,
    u.y*u.x*(1.-c)+u.z*s,  c+u.y*u.y*(1.-c),      u.y*u.z*(1.-c)-u.x*s,
    u.z*u.x*(1.-c)-u.y*s,  u.z*u.y*(1.-c)+u.x*s,  c+u.z*u.z*(1.-c)
  );
}
float hash(vec3 p){
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i+vec3(1,0,0)), u.x),
        mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), u.x), u.y),
    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), u.x),
        mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), u.x), u.y), u.z);
}
float fbm(vec3 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }

${rampSrc || `/* ===== カンプ実測の配色ランプ =====
   assets/planet-e.png（カンプの惑星）のピクセルを数えた面積比:
     水色/シアン 55.7% / 青 24.2% / 白に近い 8.3% / マゼンタ 7.5% / 紫 4.1%
   ストップの幅をこの比率に合わせてあるので、どこを流れても
   「水色が主役・ピンクは端に少しだけ」というカンプの色バランスが崩れない。
   ⚠️ 等間隔のストップにすると、ピンクと紫が出過ぎて色が汚くなる（実際にそうなった） */
vec3 ramp(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 mg = vec3(1.000, 0.365, 0.592);   /* #FF5D97 ブランドのピンク */
  vec3 pu = vec3(0.502, 0.459, 0.863);   /* #8075DC カンプ実測の紫 */
  vec3 bl = vec3(0.102, 0.659, 0.984);   /* #1AA8FB カンプ実測の青 */
  vec3 cy = vec3(0.043, 0.867, 1.000);   /* #0BDDFF カンプ実測の水色 */
  vec3 wh = vec3(0.918, 1.000, 1.000);   /* #EAFFFF カンプ実測の白 */
  if (x < 0.075) return mix(mg, pu, x / 0.075);                    /* ピンク 7.5% */
  if (x < 0.115) return mix(pu, bl, (x - 0.075) / 0.040);          /* 紫 4.1% */
  if (x < 0.355) return mix(bl, cy, (x - 0.115) / 0.240);          /* 青 24.2% */
  /* 水色が過半(55.7%)。中でわずかに明暗が動く程度にして帯っぽくしない */
  if (x < 0.915) return mix(cy, mix(cy, wh, 0.22), (x - 0.355) / 0.560);
  return mix(mix(cy, wh, 0.22), wh, (x - 0.915) / 0.085);          /* 白 8.3% */
}`}

void main(){
  float CELL = 2.0;
  vec2 fcTrue = gl_FragCoord.xy;
  vec2 cellId = floor(fcTrue / CELL);
  vec2 fc = (cellId + 0.5) * CELL;
  vec2 pTrue = (fcTrue * 2.0 - uRes) / uRes.y;
  vec2 p = (fc * 2.0 - uRes) / uRes.y;
  float R = 0.884615;
  float px = 2.0 / uRes.y;
  float alpha = 1.0 - smoothstep(R - 1.5 * px, R + 1.5 * px, length(pTrue));
  if (alpha <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float z = sqrt(max(R * R - dot(p, p), 1e-5));
  vec3 n = normalize(vec3(p, z));
  vec3 ax1 = normalize(vec3(0.53, 0.85, 0.35));
  vec3 ax2 = normalize(vec3(-0.62, 0.22, 0.76));
  vec3 d = rotAxis(ax2, uAngle2) * rotAxis(ax1, uAngle) * n;

  /* 左下(青) → 右上(ピンク) の軸に沿って色の帯を並べる。
     カンプ 14776:26144 は右上がピンク・左下が青で、白い帯がその間を斜めに走る */
  vec3 axis = normalize(vec3(0.70, 0.62, -0.30));
  vec3 perp = normalize(cross(axis, vec3(0.0, 0.30, 0.95)));
  float u = dot(d, axis) / R;      /* -1(左下) 〜 1(右上) */
  float v = dot(d, perp) / R;

  /* 流れの速さ・うねり方 (ディザ演出のスイッチで切替) */
  float spd = 0.0, swell = 0.0;
  if (uDither > 1.5 && uDither < 2.5) { spd = 0.16; swell = 0.10; }
  else if (uDither > 2.5 && uDither < 3.5) { spd = 0.34; swell = 0.18; }
  else if (uDither > 3.5) { spd = 0.30; swell = 0.55; }

  /* 帯の位置。v(帯と直交する向き)で位相をずらすと、まっすぐでなくS字にうねる */
  float wave = u * ${bands} + sin(v * 2.1 + uTime * 0.5) * (${warp} + swell) - uTime * spd;
  float band = sin(wave * 3.14159265);
  /* 0〜1 に写す。ランプ側が面積比を持っているので、ここは素直に均等でよい */
  float lum = 0.5 + 0.5 * band;
  lum += (fbm(d * 2.4) - 0.5) * 0.12;         /* わずかなゆらぎ */
  lum += pow(clamp(dot(n, normalize(vec3(0.55, 0.52, 0.62))), 0.0, 1.0), 7.0) * 0.22;

  float dith = bayer8(cellId);
  float spread = 0.8 + uNoise * 1.2;
  float levels = 6.0;
  float q = clamp(floor(lum * levels + (dith - 0.5) * spread + 0.5) / levels, 0.0, 1.0);
  vec3 col = ramp(q);

  /* 左下のマゼンタリム (カンプもピンクは端だけ。面積を増やさないよう控えめに) */
  float rim = pow(1.0 - n.z, 1.6) * clamp(dot(normalize(n.xy + vec2(1e-4)), normalize(vec2(-0.7, -0.6))), 0.0, 1.0);
  float mg = clamp(floor(rim * 1.5 * 3.0 + (dith - 0.5) * 1.3 + 0.5) / 3.0, 0.0, 1.0);
  col = mix(col, ${rimCol || 'vec3(1.0, 0.365, 0.592)'}, mg * ${rimAmt || '0.70'});

  if (uLight > 1.5) {
    vec3 Ldir = normalize(vec3(0.62, 0.62, 0.48));
    float diffL = clamp(dot(n, Ldir), 0.0, 1.0);
    float lightAmt = 0.45 + 0.55 * diffL;
    vec3 shadowCol = col * vec3(0.55, 0.60, 0.85);
    col = mix(shadowCol, col, lightAmt);
    col += vec3(0.95, 0.96, 1.0) * pow(diffL, 8.0) * 0.25;
  }

  gl_FragColor = vec4(col * alpha, alpha);
}`;
}

const DESIGNS = {
  A1: {
    name: 'A1 ビビッドブルー',
    swatch: 'linear-gradient(140deg, #ff5d97 5%, #fff 30%, #1e9bff 65%, #0b6bff 100%)',
    src: 'assets/planet-b.png',
    grainScale: '120.0',
    /* ビビッド優先: 粒は乗算で粗く、白飛びさせない */
    finish: `
      col *= 1.0 + grain * 0.5 * uNoise;
      float hi = pow(max(dot(n, normalize(vec3(-0.4, 0.65, 0.65))), 0.0), 2.5);
      col = mix(col, vec3(1.0), hi * 0.08);
      col *= 1.0 - pow(1.0 - n.z, 2.2) * 0.10;`,
  },
  A2: {
    name: 'A2 ピンク×ブルー',
    swatch: 'linear-gradient(160deg, #ff5d97 22%, #fff 50%, #26a9ff 78%)',
    src: 'assets/planet-c.png',
    grainScale: '150.0',
    /* 2色の境界を活かす: 中くらいの粒を加算で */
    finish: `
      col += grain * 0.16 * uNoise;
      float hi = pow(max(dot(n, normalize(vec3(-0.45, 0.6, 0.66))), 0.0), 2.2);
      col = mix(col, vec3(1.0), hi * 0.12);
      col *= 1.0 - pow(1.0 - n.z, 2.0) * 0.08;`,
  },
  A3: {
    name: 'A3 ライトグレイン',
    swatch: 'linear-gradient(200deg, #9fdcff 12%, #fff 45%, #ff9ac4 88%)',
    src: 'assets/planet-d.png',
    grainScale: '260.0',
    /* 高密度の微粒が主役: 細かい粒を強めに */
    finish: `
      col += grain * 0.20 * uNoise;
      float hi = pow(max(dot(n, normalize(vec3(-0.45, 0.6, 0.66))), 0.0), 2.2);
      col = mix(col, vec3(1.0), hi * 0.12);
      col *= 1.0 - pow(1.0 - n.z, 2.0) * 0.07;`,
  },
  B: {
    name: 'B ハーフトーン',
    swatch: 'radial-gradient(circle at 68% 30%, #fff 8%, #5fd2ff 40%, #0e9bff 72%, #ff4fd8 100%)',
    src: 'assets/planet-e.png',   /* WebGL非対応時のフォールバック表示にのみ使用 */
    /* 完全生成のディザリング専用シェーダー:
       画像貼り付けだと網点が回転でにじみ継ぎ目も出るため、
       色のグラデを計算で作り、ベイヤーディザで1pxドットに割ってピクセル調に仕上げる */
    fragment: `
precision highp float;
uniform vec2 uRes;
uniform float uAngle;
uniform float uAngle2;
uniform float uNoise;
uniform float uTime;    /* ディザ演出用の時間 (一時停止と連動) */
uniform float uDither;  /* ディザ演出モード 1〜8 */
uniform float uLight;   /* 1=なし / 2=右上光源 */

mat3 rotAxis(vec3 a, float t){
  float c = cos(t), s = sin(t);
  vec3 u = normalize(a);
  return mat3(
    c+u.x*u.x*(1.-c),      u.x*u.y*(1.-c)-u.z*s,  u.x*u.z*(1.-c)+u.y*s,
    u.y*u.x*(1.-c)+u.z*s,  c+u.y*u.y*(1.-c),      u.y*u.z*(1.-c)-u.x*s,
    u.z*u.x*(1.-c)-u.y*s,  u.z*u.y*(1.-c)+u.x*s,  c+u.z*u.z*(1.-c)
  );
}
float hash(vec3 p){
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i+vec3(1,0,0)), u.x),
        mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), u.x), u.y),
    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), u.x),
        mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), u.x), u.y), u.z);
}
float fbm(vec3 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }

/* マゼンタ → 紫 → 深い青 → ブルー → シアン → 白 のカラーランプ
   (0未満に押し下げられると紫〜マゼンタ帯に入る) */
vec3 ramp(float x){
  x = clamp(x, -0.6, 1.0);
  vec3 magenta = vec3(1.0, 0.27, 0.78);
  vec3 purple = vec3(0.58, 0.26, 0.94);
  vec3 deep = vec3(0.04, 0.36, 0.86);
  vec3 blue = vec3(0.05, 0.62, 0.98);
  vec3 cyan = vec3(0.56, 0.88, 1.0);
  vec3 white = vec3(1.0);
  if (x < -0.3) return mix(magenta, purple, (x + 0.6) / 0.3);
  if (x < 0.0) return mix(purple, deep, (x + 0.3) / 0.3);
  if (x < 0.34) return mix(deep, blue, x / 0.34);
  if (x < 0.67) return mix(blue, cyan, (x - 0.34) / 0.33);
  return mix(cyan, white, (x - 0.67) / 0.33);
}

void main(){
  float CELL = 2.0; /* ドット1粒の物理px (dpr2でCSS1px相当) */
  vec2 fcTrue = gl_FragCoord.xy;
  vec2 cellId = floor(fcTrue / CELL);
  vec2 fc = (cellId + 0.5) * CELL;   /* セル中央で色を決める → 粒が均一なピクセルに */
  vec2 pTrue = (fcTrue * 2.0 - uRes) / uRes.y;
  vec2 p = (fc * 2.0 - uRes) / uRes.y;
  float R = 0.884615;
  float px = 2.0 / uRes.y;
  float alpha = 1.0 - smoothstep(R - 1.5 * px, R + 1.5 * px, length(pTrue));
  if (alpha <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float z = sqrt(max(R * R - dot(p, p), 1e-5));
  vec3 n = normalize(vec3(p, z));
  vec3 ax1 = normalize(vec3(0.53, 0.85, 0.35));
  vec3 ax2 = normalize(vec3(-0.62, 0.22, 0.76));
  vec3 d = rotAxis(ax2, uAngle2) * rotAxis(ax1, uAngle) * n;

  /* 明るさ: 右上ハイライトは画面固定(カンプ準拠)、表面の流れは球と一緒に回る */
  vec3 L = normalize(vec3(0.55, 0.52, 0.62));
  float lam = dot(n, L) * 0.5 + 0.5;
  float flow = (fbm(d * 2.2) - 0.5) * 0.4;
  /* 中央はシアン〜ブルー主体、白は右上のハイライト付近だけ (カンプ準拠) */
  float lum = clamp(lam * 0.95 - 0.15 + pow(lam, 6.0) * 0.55 + flow, 0.0, 1.0);

  /* ---- ディザ演出: 表面の模様ではなく「色そのもの」を動かす ----
     lum を波で押し上げ/押し下げると 白⇄シアン⇄青⇄紫⇄マゼンタ の帯を行き来し、
     ベイヤーディザで量子化しているため境目のピクセルがパラパラと入れ替わる */
  if (uDither > 1.5 && uDither < 2.5) {
    /* ②うつろい: 場所ごとに位相の違うゆっくりした色サイクル (白⇄青⇄紫) */
    lum += sin(uTime * 0.45 + fbm(d * 1.6) * 6.2832) * 0.30;
  } else if (uDither > 2.5 && uDither < 3.5) {
    /* ③流れ: 白→青→紫の色の帯が斜めに流れていく */
    lum += sin(dot(p, normalize(vec2(0.8, -0.6))) * 3.2 - uTime * 1.1) * 0.32;
  } else if (uDither > 3.5 && uDither < 4.5) {
    /* ④さざ波: 細かい色の波が通過して境目のドットがめくれる */
    lum += sin((p.x + p.y) * 8.0 - uTime * 2.4) * 0.16;
  }
  float dith = bayer8(cellId);

  /* ベイヤーディザ: 階調を段に割って、隣のセルと交互に混ぜる → 網点 */
  float spread = 0.8 + uNoise * 1.2;
  float levels = 6.0;
  float q = clamp(floor(lum * levels + (dith - 0.5) * spread + 0.5) / levels, -0.6, 1.0);
  vec3 col = ramp(q);

  /* 左下のマゼンタリム (これもディザで混ぜる) */
  float rim = pow(1.0 - n.z, 1.6) * clamp(dot(normalize(n.xy + vec2(1e-4)), normalize(vec2(-0.7, -0.6))), 0.0, 1.0);
  float mg = clamp(floor((rim * 1.5 + flow * 0.25) * 3.0 + (dith - 0.5) * 1.3 + 0.5) / 3.0, 0.0, 1.0);
  col = mix(col, vec3(1.0, 0.27, 0.78), mg * 0.92);

  /* ---- 右上光源モード: 白を「光の反射」として陰影をつける ---- */
  if (uLight > 1.5) {
    vec3 Ldir = normalize(vec3(0.62, 0.62, 0.48));
    float diffL = clamp(dot(n, Ldir), 0.0, 1.0);
    float lightAmt = 0.45 + 0.55 * diffL;
    vec3 shadowCol = col * vec3(0.55, 0.60, 0.85); /* 影はグレーでなく青みに沈める */
    col = mix(shadowCol, col, lightAmt);
    col += vec3(0.95, 0.96, 1.0) * pow(diffL, 8.0) * 0.25;
  }

  gl_FragColor = vec4(col * alpha, alpha);
}`,
  },
  C1: {
    name: 'C1 波・流れる',
    swatch: 'linear-gradient(135deg, #fff 0%, #56d0ff 38%, #2f6dff 66%, #ff4fd8 100%)',
    src: 'assets/planet-e.png',
    fragment: waveFragment('0.55', '0.06'),
  },
  C2: {
    name: 'C2 波・白帯',
    swatch: 'linear-gradient(135deg, #ff6fd8 0%, #fff 32%, #56d0ff 62%, #2f6dff 100%)',
    src: 'assets/planet-e.png',
    fragment: waveFragment('1.05', '0.30'),
  },
  C3: {
    name: 'C3 波・呼吸',
    swatch: 'linear-gradient(140deg, #ff4fd8 0%, #fff 22%, #56d0ff 46%, #fff 68%, #2f6dff 100%)',
    src: 'assets/planet-e.png',
    fragment: waveFragment('0.85', '0.14'),
  },
  /* ===== 【2026-09-02 ヒデさん指定】A1〜A3のニューバージョン =====
     画像貼り(A1/A2/A3)の配色を、B/C系と同じ「完全生成・色が溶けて流れるハーフトーン」で
     作り直した新3案。既存のA1〜A3はそのまま残し、選択肢として並ぶ。 */
  N1: {
    name: 'A1+ ビビッドブルー・溶け(新)',
    swatch: 'linear-gradient(135deg, #ff5d97 0%, #fff 18%, #1e9bff 55%, #0b6bff 100%)',
    fragment: waveFragment('0.90', '0.22', `
/* A1配色: 深い青が主役。白の帯を挟んでピンクは端だけ */
vec3 ramp(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 mg = vec3(1.000, 0.365, 0.592);   /* #FF5D97 */
  vec3 wh = vec3(1.0, 1.0, 1.0);
  vec3 lb = vec3(0.118, 0.608, 1.000);   /* #1E9BFF */
  vec3 db = vec3(0.043, 0.420, 1.000);   /* #0B6BFF */
  vec3 dd = vec3(0.031, 0.290, 0.820);   /* 深い青 */
  if (x < 0.07) return mix(mg, wh, x / 0.07);
  if (x < 0.22) return mix(wh, lb, (x - 0.07) / 0.15);
  if (x < 0.62) return mix(lb, db, (x - 0.22) / 0.40);
  return mix(db, dd, (x - 0.62) / 0.38);
}`),
  },
  N2: {
    name: 'A2+ ピンク×ブルー・溶け(新)',
    swatch: 'linear-gradient(160deg, #ff5d97 22%, #fff 50%, #26a9ff 78%)',
    fragment: waveFragment('0.75', '0.20', `
/* A2配色: ピンクと青が対等。真ん中に白 */
vec3 ramp(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 mg = vec3(1.000, 0.365, 0.592);   /* #FF5D97 */
  vec3 wh = vec3(1.0, 1.0, 1.0);
  vec3 bl = vec3(0.149, 0.663, 1.000);   /* #26A9FF */
  vec3 db = vec3(0.071, 0.459, 0.851);   /* 深い青 */
  if (x < 0.30) return mix(mg, mix(mg, wh, 0.35), x / 0.30);
  if (x < 0.50) return mix(mix(mg, wh, 0.35), wh, (x - 0.30) / 0.20);
  if (x < 0.72) return mix(wh, bl, (x - 0.50) / 0.22);
  return mix(bl, db, (x - 0.72) / 0.28);
}`, "vec3(0.071, 0.459, 0.851)", '0.55'),
  },
  N3: {
    name: 'A3+ ライトグレイン・溶け(新)',
    swatch: 'linear-gradient(200deg, #9fdcff 12%, #fff 45%, #ff9ac4 88%)',
    fragment: waveFragment('0.80', '0.18', `
/* A3配色: パステル。淡い水色→白→淡いピンク */
vec3 ramp(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 lc = vec3(0.624, 0.863, 1.000);   /* #9FDCFF */
  vec3 wh = vec3(1.0, 1.0, 1.0);
  vec3 pk = vec3(1.000, 0.604, 0.769);   /* #FF9AC4 */
  vec3 dp = vec3(1.000, 0.478, 0.690);   /* 濃いめのピンク */
  if (x < 0.32) return mix(lc, mix(lc, wh, 0.6), x / 0.32);
  if (x < 0.56) return mix(mix(lc, wh, 0.6), wh, (x - 0.32) / 0.24);
  if (x < 0.86) return mix(wh, pk, (x - 0.56) / 0.30);
  return mix(pk, dp, (x - 0.86) / 0.14);
}`, "vec3(1.000, 0.478, 0.690)", '0.55'),
  },
};

/* ================= 調整パラメーター ================= */
const DEFAULTS = {
  running: true,
  /* 【2026-09-03 ヒデさん指定】編集モードの汎用テキスト編集の保存先。
     キー→{fs,fw,lh,ls,pt,pr,pb,pl,text}。トップ全体で共有(案・KV非依存)。 */
  edits: {},
  editsMb: {},   /* 【2026-09-20 ヒデさん依頼・PC/SP独立】スマホモードで付けた文字設定の上書き(スマホの時だけ base に重なる) */
  mb: {},        /* 【2026-09-20 ヒデさん依頼・PC/SP独立(全つまみ)】スマホ専用の値。{ "dotパス": 値 }。スマホ(isMobile)の時だけ applyMbToParams で本体へ流し込む */
  grid: { on: false, cell: 40, w: 1, op: 0.45, color: '#ACACAC' },   /* 【2026-09-21 ヒデさん依頼】背景の方眼グリッド。on=表示 / cell=マスの大きさ(px・既定40=中央仕切り720/余白120がマス目に乗る) / w=線の太さ(px) / op=線の濃さ(0〜1) / color=線色。applyGrid() が html.grid-on と CSS変数に反映 */
  sway: 2,   // 2026-08-29 ヒデさん指定: 揺らぎは既定オン(②シーソー=全案共通で効く緩やかな揺れ)。回転は既定オフ
  swayAmp: 0,   // 2026-08-29 ヒデさん指定: ゆらぎの強さ(振幅倍率)。0でぴたっと止まる。【2026-09-19 ヒデさん指定】軸は固定で回すだけ→0(KVタブ「揺らぎの強さ」で戻せる)
  swayDir: 'tilt',   /* 【2026-08-30 ヒデさん指定】揺らぎの動き: tilt=傾き(従来) / h=左右 / v=上下 / diag=斜め */
  /* 【2026-08-29 ヒデさん指定】ネットワーク3D案(Figma15970)のつまみ。mode=3d/2d。3D=手前太く奥細く＋物理 */
  net3d: { mode: '3d', frontW: 5, backW: 1, phys: 0.7, flatW: 2, spd: 0.7, dots: 1, spin: 0, spinDots: true, showDots: true },   /* dots=1本の軌道に流すドット数(2026-08-29) / spin=軌道の回転・spinDots=粒も連動・showDots=粒表示(2026-08-30) */
  /* 【2026-08-29 ヒデさん指定】コンバージョン背景(流れるグラデ+Bayerディザ)。
     既定はカンプのディザ設定(Bayer16×16 / Size1 / Levels3 / Brightness104% / Contrast1.38)に合わせる */
  cv: { cell: 1, levels: 3, spread: 1.0, speed: 0.25, swell: 0.12, flowScale: 3.0, bright: 1.04, contrast: 1.38,
        colors: ['#fee0f8', '#b6e0ff', '#0ebbff', '#477ed1', '#ff5d97'], gMode: 0, gcx: 0.60, gcy: 0.00, gr: 0.9, gAspect: 1, gAng: 0, dark: 0, darkCol: '#0d0f14', hueMode: 'off', moodSec: 30, moodWhite: 0.85, swapHold: 0.45, topCol: '#7cc9e8', topWhite: 0.12, ceil: 0.9, gOffX: 0.18, gOffY: 0.12, gSpread: 1.5, ramp: 0, addT: 0, addB: 0 },   // 【2026-09-15】色5段・形・暗さ(カラー案)・色味の移ろい(ブランド色⇄白)
  cvColorBy: {},       // 【2026-09-15 ヒデさん指定】お問い合わせのカラー案: デザイン案ごとに { cvStyle: 'C1〜C10' }
  cvSway: '0',         // 【2026-09-15 ヒデさん依頼】揺らぎのパターン(案)。0=現行 / 1〜5。URL ?sway=N
  cvEdge: '0',         // 【2026-09-16 改訂】お問い合わせ上部の溶け込みの深さ。0=標準/1さらに深く/2浅め。URL ?edge=N
  cvForm: '0',         // 【2026-09-16 ヒデさん依頼】お問い合わせのグラデの形。0=放射(現行)/1=縦グラデ/2=放射柔らか/3=斜め。URL ?form=N
  cvCta: 'form',     // 【V5.0 2026-09-16 ヒデさん依頼】お問い合わせのCTA。button=ボタン遷移(現行)/form=フォーム直置き。URL ?cta=button|form
  cvHier: '1',         // 【V5.0 2026-09-16 ヒデさん依頼】コンバージョン調整パネルの“情報の階層”の見せ方。1インデント/2余白区分/3左アクセント/4背景ブロック/5見出し強弱
  formStyle: '1',      // 【V5.0 2026-09-16 ヒデさん依頼】自作フォームのスタイル案。1〜5(リキッドグラス系)。URL ?fstyle=N
  formWidth: 660,      // 【V5.0 2026-09-16 ヒデさん依頼】お問い合わせフォームの横幅(px)。パネルで調整
  cvfGlass: { bgA: 0.5, blur: 22, sat: 1.5, inA: 0.56, phA: 0.32 },   // 【V5.0 2026-09-17】フォームカードの地色の白さ/ぼかし/彩度/入力欄の白さ/プレースホルダーの濃さ(白飛び対策で調整可)
  hdrMode: '12',        // 【V5.0 2026-09-16 ヒデさん依頼】追従ヘッダーの案。1すりガラス/2ソリッド白/3隠す戻す/4縮む/5フローティングピル。URL ?hdr=N
  burgerIcon: '2',     // 【V5.0 2026-09-17】ハンバーガーのアイコン案(1クラシック/2 2本/3中央短/4ドット/5太丸)
  burgerAnim: '1',     // 【V5.0 2026-09-17】ハンバーガーを押した時の変化(1クロス/2半回転X/3 90°X/4一本線/5シザー)
  floatStyle: '1',     // 【V5.0 2026-09-17】フローティング(ピル)のスタイリング案 1〜10(影/ブラー/リキッドグラス等)
  hdrTune: { '8': { logoH: 47, cw: 345 } },   // 【V5.0 2026-09-17】案ごとのスクロール後サイズ微調整(その案を選んだ時だけパネルに出す)。hm-8: ロゴ縮小なし(47)
  drawerStyle: '3',    // 【V5.0 2026-09-17】ハンバーガーを押した先の画面 1中央/2右スライド/3左寄せ大(ダーク)
  hdrMotion: '1',      // 【V5.0 2026-09-17 ヒデさん依頼】ヘッダー変形のモーション(イージング)案 1なめらか/2キビキビ/3ゆったり/4バウンド/5直線
  hdrDur: 1.65,   /* 【2026-09-17 大掃除】ヘッダーの調整UIは撤去。ローカルで使っていた 1.65 秒を固定値に */ //         // 【V5.0 2026-09-17】ヘッダー変形の速さ(秒・進む時)。戻る時はこの0.55倍でキビキビ(トップ復帰のラグ解消)
  devStyle: '0',       // 【2026-09-15 ヒデさん指定】開発者体験モックのスタイル案(0=現行 / 1〜5)
  devTone: 'dark',     // 同・配色(dark / graphite / blue / cyan / pink)
  cvStyle: '10',       // 【2026-09-16 ヒデさん確定】お問い合わせは「フッター一体型・溶け込む」(ID10)で固定。パネルの選択UIは削除済み(比較したい時だけ URL ?cv=N)
  crossDelay: 2.5,     // クロスが効き始めるまでの秒数 (それまではカンプ通り平行)
  crossLead: 6,        // 完全にクロスするまでにかける秒数           // ゆらぎ 1=固定 / 2=シーソー / 3=クロス
  design: 'B',       // 惑星デザイン B〜E ＋ F/G/H(波が流れる)
  dither: 2,         // ディザ演出 1〜4 (惑星E専用)
  light: 1,          // ライティング 1=なし / 2=右上光源
  duration: 24,      // ドット1周の基準秒数
  globalSpeed: 1,    // 全体スピード倍率
  direction: 1,      // 1=時計回り / -1=反時計回り
  ramp: 1.5,         // 動き出しのなめらか加速(秒)
  pulse: {
    amp: 0,          // 緩急の強さ (0=一定速度)。2026-08-30 ヒデさん指定: 「急に速く/遅く」に見えるので削除(0固定)
    period: 8,       // 緩急の周期(秒)
  },
  sphere: {
    duration: 32,    // 球体1回転の秒数
    tumble: 0.37,    // 多面ゆらぎ (2軸目の回転比率)
    noise: 0.5,      // 質感の粒の強さ
    dir: 1,          // 回転方向 (1=順 / -1=逆)
    tilt: 0,         // 回転軸の傾き(度)
    random: 0,       // ランダムのゆらぎ量。回転速度が不規則に伸び縮みする
  },
  planet: { dx: 21, dy: 46, scale: 0.99, flat: 1 },   // 惑星の位置ずらし(px)・大きさ・つぶし(縦横比)
  /* KV: グラフィック全体の位置と登場シーケンス(秒) */
  kv: {
    gx: 0, gy: -70,   // 軌道グループ全体の位置ずらし
    rotX: 0, rotY: 0, rotZ: 0,   // 【2026-08-28】グラフィック全体の回転(XYZ・3D)
    persp: 1400,   // 【2026-08-29】遠近感(3Dの奥行きの効き)。CSS perspective の距離px。小さいほど強い

    /* 【2026-08-30 ヒデさん指定】全体的に出はじめを前倒し(尺=ゆったり感は不変)。headerAt 0.25→0.15 / typeAt 1.0→0.7 / eyebrowGap 0.14→0.10 */
    headerAt: 0.15,   // ヘッダーがブラーで出る
    navGap: 32,       // 【2026-08-30 ヒデさん指定】ナビ項目の左右の間隔(px)。旧20→広めの32を既定に
    /* 【2026-08-31 ヒデさん指定】コピー(文字)の調整。パネル「キービジュアル > コピー(文字)」 */
    mainSize: 70,       // メインコピーの文字サイズ(px)。調整版(Figma 17435:22386)＝70
    jumpSize: 120,      // 【2026-09-17】最終行「競争力を」のサイズ(px)。調整版＝120(行間1.2はCSS固定)
    mainWeight: 800, mainLh: 1.4, lastWeight: 700, lastLh: 1.2, eyebrowWeight: 500, eyebrowLh: 0, eyebrowLayout: 'row',   // 【2026-09-18】案が入れ替える書体(PCのみ・CSS変数経由。eyebrowLh 0=auto / eyebrowLayout col=罫線を上に置く2行組)
    eyebrowSize: 20,    // サブコピーの文字サイズ(px)。調整版＝20
    /* (mainWeight/eyebrowWeight/eyebrowLs/mainThin は 2026-09-17 の大掃除で撤去。太さ・字間は「文字」(params.edits)が唯一の置き場) */
    copyX: 0, copyY: 0,   // コピー全体の位置ずらし(px・カンプ位置基準) 2026-09-02        // 【2026-09-01】メインを縁取りで細く見せる量(px)。背景色の縁で線を削る
    hlOff: 0,             // 【2026-09-20】ヘッダー↔コピーの距離。コピー(.headline)の基準top(PC208/SP434)に足すオフセット(px)。PC/SP独立(mbKey)
    gfxY: 0,              // 【2026-09-20】グラフィック(惑星)↔コピーの距離。右グラフィックの縦位置オフセット(px・+で下/−で上)。PC/SP独立(mbKey)
    copyOrder: 'main',  // 【2026-09-02】KVコピーの上下並び 'main'=メイン上/サブ下 'sub'=サブ上/メイン下
    eyebrowDash: true,  // サブコピー先頭の罫線(ハイフン)あり/なし
    eyebrowDashW: 26,   // 罫線の長さ(px)
    dashGap: 10,        // 罫線とサブコピー文字の間(px)
    copyGap: 16,        // メインコピーとサブコピーの間(px)
    eyebrowGap: 0.10, // タイピングが終わってから小ラベル(罫線ごと)が出るまで
    typeAt: 0.7,      // タイピング開始
    charDur: 0.042,    // 1行目「AIと事業を」の1文字あたり(平均)。素早く打つ
    charDur2: 0.088,   // 2行目「強くする」の1文字あたり(平均)。ゆったり打つ
    typeEase: 0.55,   // タイピングの緩急 (0=一定, 1=最初ゆっくり→加速)
    lineGap: 0.20,    // 改行の間
    graphicGap: -0.9, // 小ラベル基準の前後。マイナス=小ラベルより前(タイピング中)に出す(2026-08-29 さらに早める -0.45→-0.9)
    revealDur: 1.5,   // ブラーで出てくる所の所要時間 (大きいほどゆったり)
  },
  orbits: {
    /* 軌道ごと: サイズ倍率 / 角度ずらし(°) / 位置ずらし(px) / ゆれ(幅°・周期s・位相°) */
    outer: { scale: 1, angle: 0, dx: 0, dy: 0, flat: 1, behind: false, wobbleAmp: 0, wobblePeriod: 12, wobblePhase: 0 },
    inner: { scale: 1, angle: 0, dx: 0, dy: 0, flat: 1, behind: false, wobbleAmp: 0, wobblePeriod: 12, wobblePhase: 180 },
  },
  orbitEase: 1,        // 軌道の回り方の緩急 (ORBIT_EASES)
  dotGap: 1,           // ドットの間隔 (DOT_GAPS) 1=きっちり等間隔 / 2=ばらつかせる
  visReveal: 2,        // (未使用) 2026-08-25 以降、Our Vision=ブラー / 2行=マスク を updateVision に直書き
  visStrongFx: 'live', // 2026-08-30 ヒデさん指定: 「強み」強調はグラデ揺らぎで確定(他の案とパネルは削除)
  visSpin: 2,          // ドットの回り方は「②速く回って減速」で確定（パネルからは外した）
  visMove: 2,          // 軌道の出方 (VIS_MOVES)。②先に動いて後で拡大 で確定（パネルからは外した）
  replay: true,        // スクロールで画面外へ出たセクションを巻き戻して再生し直す
  /* 【2026-09-09 ヒデさん指定】ヘッダーのホバーアニメ(調整パネルで切替・リアルタイム反映)。
     nav=テキスト(お問い合わせ以外) fade/underline/roll/lift/cyan、btn=お問い合わせボタン lighten/fill/scale/arrow/invert。 */
  hoverFx: { nav: 'fade', btn: 'lighten' },
  marquee: {
    /* ロゴとロゴの左右の間隔(px)。継ぎ目も同じ値になるので、どこで切れても等間隔。
       【2026-08-19 ヒデさん指定】96px は広すぎたので 72px に詰めた
       【2026-09-18】Figma 17707:26078 のロゴ間隔は 46.5〜66.2px(平均54)なので 54 に(仮置き: 均一間隔のため平均値) */
    gap: 54,
    duration: 30,    // ロゴが1周する秒数
    direction: 1,    // 1=左へ / -1=右へ
  },
  /* pulsePhase は「②ばらつかせる」の時だけ使う、ドットごとのゆらぎのズレ。
     ⚠️ 以前は i*60 固定だったので、ドットが7個になると7個目が 360°(=0°) になり
        1個目と完全に同じ動きになっていた。個数で割って必ずバラけるようにする */
  dots: DOTS.map((_, i) => ({ speed: 1, delay: 0, offset: 0, pulsePhase: i * 360 / DOTS.length })),
  /* スクロールセクションの調整値 */
  sections: {
    common: {
      smooth: 3,         // スクロール慣性補間の強さ (小さいほど慣性たっぷり / 0=オフ)
      /* 再生中にホイールを回した時の早送り。0 で早送りなし(閉じ込められるので非推奨) */
      ffMax: 0.6,        // 上限。0.6 なら最大 1.6倍速まで (2026-08-18: さらに抑えた)
      ffGain: 700,       // 効きはじめの緩さ。大きいほどゆるやかに効く
      /* スクロール駆動の時、ピン区間の何割で再生しきるか。
         小さいほど少ないスクロールで一気に展開する */
      driveWin: 0.80,
      /* ⚠️ 尺の倍率は【各セクション別】に持たせた (2026-08-18 ヒデさん指定)。
         まとめて1つだと、章の数や再生時間が違うセクションでばらつきが出るため。
         → params.sections.<各セクション>.driveLen を見ること */
    },
    /* ビジョンは「ピン留めされたら自動再生 → ワンスクロールで軌道が左下へ」。
       自動パートの時間はすべて秒で指定する */
    vision:  {
      emph: 'default',   // 【2026-09-20】ビジョンのバリエーション。'default'=現状(1行・中央) / 'strong'=強調(2行・左揃え・大きめ)
      driveLen: 3.0,     // スクロール駆動の時、尺を何倍に伸ばすか（大きいほどゆったり）
      /* ⚠️ 再生中はスクロールを止めているので、lenVh はまるごと「再生後の空スクロール」になる。
         長いと「終わったのに何度もスクロールしないと次へ行けない」になるので短くする */
      lenVh: 150,
      /* 【2026-08-30 ヒデさん指定】出はじめを前倒し(尺は不変): labelAt 0.15→0.10 / line1At 0.45→0.32 / line2Gap 0.55→0.40 */
      labelAt: 0.10,     // Our Vison がブラーで出る
      labelDur: 1.0,     // その所要時間
      labelOutLead: 0.5, // 上下に分かれ始める何秒前から「Our Vison」を消し始めるか
      labelOutDur: 0.6,  // 消えきるまでの秒数
      line1At: 0.32,     // 1行目 (Our Vison に続けてすぐ)
      line2Gap: 0.40,    // 2行目までの間 (1行目が出きる前に始まってよい＝絵コンテ指定)
      revealDur: 1.15,   // 1行の出現時間(2026-08-30 ヒデさん指定: マスク出現をもう少しゆったり 0.9→1.15)
      splitGap: 0,       // 2行そろってから「消え始める／軌道が出る」までの間 (0=そのまま)
      splitDur: 0.9,     // 消え・軌道出現のタイミングの基準になる時間
      /* 【2026-08-25 ヒデさん指定】上下に分かれる演出は廃止。2行はその場でブラーで消える。
         上下の開き量 splitAmt と 流れる量 driftAmt は 0（＝分かれない）が既定。 */
      splitAmt: 0,       // 上下に開く量(px・片側)。0=分かれない
      miniGap: 0.32,     // 2行が出そろってから軌道が出るまで (splitDur に対する割合) 2026-08-30: 0.45→0.32 前倒し
      miniDur: 0.4,      // 軌道グラフィックの出現時間 (2026-09-01: ヒデさんが元々詰めていた0.4へ。ブラー18は維持)
      /* 【2026-08-29 ヒデさん指定】固定追従なし(no-pin)の時間再生の「ブロック間隔」。パネルで調整可。
         npGap=メッセージ後グラフィックが出るまで / npP1=グラフィック後ポイント1 / npP2=ポイント2 (秒) */
      npGap: 0, npP1: 0.0, npP2: 0.15,   /* 2026-09-02 ヒデさん指定: valHead削除に伴いポイントをさらに前倒し(0.10/0.30→0.0/0.15) */
      npFireK: 0.70,     /* グラフィック発火＝メッセージの何割が出た時点か(2026-09-02: 隠れ係数0.70をパネルへ公開) */
      npPointDur: 0.3,   /* 【2026-09-02 ヒデさん指定】「グラフィック後ポイントが出るまで遅い」の正体=この出現(フェード)時間。0.6→0.3でパッと出す */
      moveLead: 0.35,    // 軌道が何割出た時点で左下へ動き出すか (0=出はじめと同時)
      moveDur: 2.6,      // 左下へ移動する時間(秒)。この間ずっと少しずつ拡大する
      /* 【2026-08-25・Figma 15764:55518】軌道が最初に小さく現れる中心位置(ステージ座標)。
         カンプでは右寄り(中心 ≒ x1134 / y417・幅約293px)。左端の左寄せメッセージと重ならない。 */
      miniCX: 1334,      // 軌道が現れる中心の左右位置(px) 2026-08-26 ヒデさん指定: 1134→+200右=1334
      miniCY: 417,       // 軌道が現れる中心の上下位置(px)
      miniY: 0,          // ↑ miniCY からの縦位置の微調整(px)
      miniScale: 0.248,  // ミニ楕円の縮小率 2026-08-26 ヒデさん指定: 出現サイズ0.8倍 (0.31×0.8≒0.248)
      strokeW: 3,        // 軌道線の太さ(px) ※カンプの stroke-width は 3
      /* 軌道上のドットの出方 (2026-08-17 指定)。以前は軌道が出た時点で6個そろっていた */
      dotsInAt: 0.18,      // 軌道が出はじめてから、1個目が出るまでの秒数 (2026-08-30: 0.25→0.18 前倒し)
      dotsInStagger: 0.14, // ドットごとの遅れ (大きいほど1つずつ順に出る)
      dotsInDur: 0.5,      // 1個が出きるまでの秒数 (点が膨らみながら濃くなる)
      spinLaps: 1,       // 止まるまでに何周するか (2026-08-15: きっちり1周)
      spinHold: 0.5,     // 左下に着いてから止まり始めるまでの秒数
                         /* ⚠️ spinHold + spinBrake = 1.35 にすると、役割名(コネクタ等)が
                            Point 02 とちょうど同じタイミングで出る (2026-08-15 指定) */
      spinBrake: 0.85,   // 減速して止まるまでの秒数
      /* 固定追従なしの時だけ使う。ブロックが画面に入ったら少しだけ回って、
         カンプの位置（所定の位置）でピタッと止まる（2026-08-18 ヒデさん指定） */
      npSpinDeg: 40,     // 止まるまでに回る角度
      npSpinDur: 1.0,    // 回りきるまでの秒数
      introPat: 1,       // 出現パターン 1=現状(一括ブラー) 2=ドットが動くバージョン(2026-09-02 ヒデさん指定)
      npOrbitDur: 2.2,   // パターン2で1周にかける時間(秒) 2026-09-03: 3.5→2.2(早めに止まる)
      npOrbitDir: -1,    // パターン2の回る向き。-1=既定(2026-09-02 ヒデさん指定で従来と逆に) / 1=逆
      npOrbitLead: 1.2,  // パターン2: ブラー出現の何秒前から動き出しているか 2026-09-03: 0.5→1.2(もっと早くから回っている)
      npOrbitEase: 2.0,  // パターン2: 減速の効き。出だしが最速で徐々に減速(2026-09-03 等速廃止)。
                         //   ⚠️出だしの速さ=効き÷1周時間。「1周6秒×効き2」で旧・等速時の速さと一致
      npOrbitOp0: 0.35,  // パターン2: 出だしのドットの不透明度(止まる頃に100%へ)
      npOrbitBlur0: 2,   // パターン2: 出だしのドットのブラー(px。止まる頃に0へ)
      pHSize: 26, pPSize: 14,   // ポイント1・2の見出し/本文の文字サイズ(px) 2026-09-03
      pWidth: 328,              // ポイント1・2の横幅(px) 2026-09-03
      msgSize: 50,              // 日本語メッセージの文字サイズ(px・カンプ50) 2026-09-03
      emphGap: 119,             // 【2026-09-25】強調案の1行目↔2行目の行間(px・PC既定119/SP既定50)。強調案だけに効く
      npOrbitTextGap: 0, // パターン2: ドットが止まってから文字(役割名/Platform)が出るまでの間(秒)
      npPtLead: 0.6,     // 【2026-09-08 ヒデさん指定】ポイント1/2を回転が終わる何秒前から出すか(左グラフィックのアニメ終盤と被せる)
      blur: 18,          // 出現ブラー量 (2026-08-31: さらに強く 14→18)
      /* 【2026-09-01 ヒデさん指定】軌道グラデをパネルで直接調整できるように。
         g0=傾き大きい楕円(いま青く見える方) / g1=傾き小さい楕円(いまピンクに見える方)。
         x,y=グラデ軸の中心(楕円ローカル座標) / deg=向き / len=色が変わる距離 /
         white=白の位置(%) / wSpan=白まわりのぼかし幅(%) / c1..c4=端→中間→中間→端の色。
         初期値はこれまでの見た目と同じになるよう実測から逆算した値 */
      pfGrad: {
        g0: { x: 769.97, y: 177.74, deg: 92.1, len: 175.4, white: 49, wSpan: 23,
              c1: '#FF5D97', c2: '#FFCFE0', c3: '#A2E6FF', c4: '#00ABEB' },
        g1: { x: 769.97, y: 177.74, deg: 92.1, len: 175.4, white: 51, wSpan: 23,
              c1: '#00ABEB', c2: '#A2E6FF', c3: '#FFCFE0', c4: '#FF5D97' },
      },
      /* 「2つの価値」まわりの位置ずらし(px)。カンプ位置からの相対。
         2026-08-15 にヒデさんが調整パネルで詰めた値を既定にした */
      headX: -78, headY: 0,   // 連携が生む、2つの価値
      p1X: 0,     p1Y: 0,     // Point 01 (2026-09-15: カンプ位置を CSS に入れたので 0)
      noPinX: 6.5, noPinY: 109,   // 軌道グラフィックの位置(2026-09-15: カンプ 16678:23002 実測 x−228 / y236)
      p2X: 0,     p2Y: 0,     // Point 02
      charLag: 0,        // 1文字ずつの遅れ (0=行まるごと ← 2026-08-15 指定)
      driftAmt: 0,       // 分かれたあと慣性で流れる量(px・片側)。0=流れない(分割廃止に伴い既定0)
      vanishDur: 0.85,   // 流れながら消えきるまでの秒数
      vanishAt: 0.15,    // 分かれ始めてから消え出すまで (splitDur に対する割合)
    },
    /* 尺(中央で止まる) / カウント時間 / 画像のぼけ。
       尺の8割ぶんスクロールすると全部出そろい、残り2割で下のセクションへ抜ける */
    results: {
      hrGap: 100, hrGap2: 0,   /* 2026-09-15: 案24系 区切り線の上/下の余白(px) */
      pictoW: 1,         // 【2026-09-02 ヒデさん指定】for SaaS/for AI ピクトグラムの線幅倍率(1=1px基準)
      pictoSpeed: 1,     // 【2026-09-08 ヒデさん指定】ピクトの再生速度(SaaS/AI共通・全案に適用。1=標準)
      pictoDisp: 1,      // 【2026-09-21 ヒデさん依頼】ピクトの表示サイズ倍率(実際に見えている大きさ。flowモードでも効く。1=現状)
      spGap: 16,         // 【2026-09-21 ヒデさん依頼】スマホの実績の縦の余白(各ブロック↔区切り線。既定16px=現状。SP専用)

      driveLen: 2.0,     // スクロール駆動の時、尺を何倍に伸ばすか（小さいほどスクロール量が減る。2026-08-25 3.0→2.0）
      lenVh: 200,   /* 固定される幅 = 200-100 = 100vh。この間に再生と暗転が収まる */
      numsGap: 0.55,   // 見出しが何割出たら、下の数字たちが出はじめるか
      imgBlur: 24,     // 画像が出る時のぼかし量
      /* スクロールで画像の中身がずれる量。
         【2026-08-19 ヒデさん指定】左のグラデーション画像はパララックスなしにする → 0 */
      parallax: 0,
      typeAt: 0.10,    // 見出し1行目「事業の推進力を、」が出はじめるまで (2026-08-30: 0.15→0.10 前倒し)
      charDur: 0.055,  // 1文字あたりの秒数(案B)
      softDur: 1.6,    // まわりの要素がブラーから出そろうまで
      /* 【2026-08-29 ヒデさん指定】タイピングテキストと、その他の要素(区切り線/3数値/2つの価値)の
         出るタイミングを別々に。typeGap=見出し1行目→タイピング開始 / restGap=タイピング開始→その他 */
      typeGap: 0.40, restGap: 0.05,   /* 2026-08-30: 前倒し(0.55/0.1→0.40/0.05) */
      typeStyle: 'slot',   // 2026-08-30 ヒデさん指定: Anyflowのタイピング見せ方 slot=下線に打ち込む(既定)/push=押し広げる
      slotGap: 4,          // 【2026-09-01】「Anyflow」と「が支えます。」の間(px)。パネルで調整可
      imgAt: 0.9,      // 画像が出はじめるまで(案A。テキストのあと)
      outFrom: 0.14,   // 案B/C: ここから遷移開始。案Cは黒レクタングルが入り始める(実績が出そろったらすぐ・2026-08-25 0.48→0.14)
      outTo: 0.95,     // ここで完全に黒。dev を実績尾部に重ねたので、黒の全面到達≒dev1中央到達に近づける(2026-08-26 0.85→0.95)
      /* 【2026-09-08 ヒデさん指定】smoothモードの暗転(実績→開発者体験)の効き。
         darkFrom=明るいままの範囲(devが画面をこの割合登るまで暗転しない) / darkTo=黒くなりきる位置 /
         darkVar=暗転カーブ(1なめらか/2ためて一気に/3早めにゆっくり/4直線) */
      darkFrom: 0.04, darkTo: 0.5, darkVar: 2,   /* 2026-09-08修正: devのモックが出る前に黒くなりきるよう締める(0.18/0.82は遅すぎてモックが明るい背景に出ていた) */
      outBlur: 22,     // 消える時のぼかし量(案Bのみ。案Cは白反転)
      /* 【2026-09-26 整理】完全削除した案の設定(主役ピクト系 hero・案14/20/21)は削除。
         案24-4 が読む出現ブラー(hero.pictoBlur)は RFX_HERO_DEF の既定 18 がそのまま効く(値は同じ) */
      fx24: { labelUp: 190, prodSize: 38 },   /* prodSize: 登場の大きい文字の下に付く「Product」のサイズ(px)。2026-09-18 */   // 案24: 文字が上へ動く距離(px)。【2026-09-26】主役の大きさ(heroScale)は24-4で効かないので削除
      fx26: { numScale: 1.714, settleAt: 0.05, settleLen: 0.16, lineAt: 0.22, lineLen: 0.10, panAt: 0.56, panLen: 0.18 },   /* 2026-09-15: SaaS を読む区間 4%→15%(下段が出てすぐ横へ動いて「表示されない」に見えていた) */   // 案26: 数値の大きさ(120/70)・収まり・線・横移動(固定区間の割合)
      /* 数字のスロット (2026-08-17 指定)。
         数字は最初から出しておき、回転そのものを見せる。ブラー出現は見出しだけ。
         ⚠️ 下の4つは「回転が見えるように」仮で置いた値。パネルで詰めてください */
      slotAt: 0.2,       // 再生開始から回り出すまでの秒数 (0 で即スタート) (2026-08-30: 0.3→0.2 前倒し)
      slotDur: 1.4,      // 1桁が回り終わるまでの秒数
      slotStagger: 0.12, // 桁ごとの遅れ (左から順に止まる)
      slotCycles: 3,     // 止まるまでに 0〜9 を何周流すか
      entryBlur: 16, entryBlur44: 26, entryFrom: 0.4, entryTo: 0.95, entryOp: 1, bigStartY: 0.4,   // 【2026-09-19】for SaaS/AI の入場のぼかし(強さpx / 解け始め・解けきり=入場の進み 0〜1 / 出だしの薄さ 1=薄くしない)
      slotEnterAt: 0.85, // 数字が画面のどこまで入ったら回り出すか (1.0=下端 / 0.5=中央)
      slotFx: 'plain', slotBlur: 0, slotBlurZone: 45, slotWin: 1.6, slotRamp: 1, slotDrumN: 12, slotDrumFade: 1.3,   // 【2026-09-19】スロットの案(plain=現状 / blur=ぼかして消える)と、そのつまみ(ぼかし px・範囲 %・窓の高さ em)
      slotEase: 5,       // 減速の強さ。大きいほど「最初速く→最後じりじり」になる (2〜9)
                         /* ⚠️ 回転中のぼかしは 2026-08-17 に「要らない」で確定。
                            パラメータごと削除したので、復活させる時は renderSlots にも戻すこと */
    },
    /* stackDur = カードが回って入れ替わるのにかける秒数
       swapEase = その動き出し方 (DEV_SWAP_EASES)
       ⚠️ 2026-08-19: 一度 2.0秒 × ゆったり(easeIO) にしたが、
          ヒデさんが見比べて「前の方が良かった」とのことで元に戻した。
          既定は 1.3秒 × ①元の動き(easeOutQ)。
          他のカーブはパネルから選べるようにしてあるので、試したくなったらそこで。 */
    /* 【2026-08-29 ヒデさん指定】ds2=開発者体験2のデザイン。'list'=現行(右にAPI/CLI/SDKリスト) /
       'slide'=テキストスライド(見出しの箱がCLI→SDK→APIと切替、モックも同期。dev1と同サイズ・モック内アニメOFF)。
       slideMotion=箱の切替モーション(snap/flip/blur)、slideHold=各語をホールドする割合、slideSnapK=スナップのキレ。 */
    dev:     { lenVh: 200, driveLen: 3.0, swapBlur: 14, stackDur: 1.3, swapEase: 1,
               ds2: 'slide', slideMotion: 'snap', slideHold: 0.62, slideSnapK: 3.4,   /* 2026-08-29: テキストスライドを既定に */
               slideEvery: 3.0, slideDur: 0.5,   /* 自動スロットの間隔と切替時間(秒) */
               /* 【2026-08-29 ヒデさん指定】dev2: ブロックの出入り(フェード)は dev1 と同じスクロール位置駆動(vpMode)。
                  ただし箱が左右に割れて開く所は【時間再生】でゆったり。splitDelay=登場から割れ始めるまでの間(秒)、
                  splitDur=割れきるまでの時間(秒。大きいほどゆったり)。 */
               vpMode: 'center', splitDelay: 0.32, splitDur: 1.2,
               /* 【2026-09-15】モックのスタイル案のつまみ。stv = 案ごとの値(案を切り替えても各案の設定が残る) */
               mockInner: 1, mockBlur: 24, mockShadow: 1, stv: {},
               slotBoxY: 0, slotBoxH: 42,   /* 2026-09-15: ②のスロットの箱の上下位置・高さ */
               pinStops: 'on', devDwell: 40 },   /* 2026-09-16 ①②で中央に固定して一旦止まる。devDwell=止まっている長さ(vh)。2026-09-17: 90→40 で“優しく”短めに(急に止めすぎない)。'off'で通常スクロール */
    /* 【2026-08-25 刷新・カンプ 15800:24526/24258】導入事例 = 2×2グリッド。
       見出し(ブラー) → 水平線3本が左から(上→下でディレイ) → 中央の垂直線 → カード4枚がブラーで登場。 */
    cases:   { lenVh: 200, driveLen: 3.0, playSec: 2.0, inBlur: 20,
      /* 見出しだけ「開発者体験の暗転(devFin)」基準。暗い背景の上に文字が重ならないようにするため */
      introAt: 0.72,   // 見出し「導入事例」が出はじめる位置 (devFin の何割地点か)
      introDur: 0.22,  // 見出しが出きるまで
      /* 以下はこのセクションの再生進捗 p(0→1) 基準 */
      /* 【2026-08-30 ヒデさん指定】前倒し(尺は不変)。⚠️ これまで固定追従なし(常時no-pin)ではハードコード値
         (0.25s/0.7s/0.9s…)が使われ、パネルのつまみが効いていなかった。updateCases を「playSec に対する割合」で
         共通化したので、いまはパネルの値=実際の動きになっている。 */
      lineAt: 0.08,      // 1本目(上)の水平線を引き始める
      lineStagger: 0.07, // 水平線ごとの遅れ (上→下で順に) 0.10→0.07
      lineDur: 0.28,     // 水平線1本を左から引き切るまで
      vlineAt: 0.28,     // 中央の垂直線を引き始める 0.34→0.28
      vlineDur: 0.30,    // 垂直線を上から引き切るまで
      cardAt: 0.40,      // カード4枚がブラーで出はじめる 0.56→0.40
      cardGap: 0,        // カードごとの遅れ。2026-08-30 ヒデさん指定: 1枚ずつでなく4枚同時にブラーで出す(0=同時)
      cardDur: 0.25, cardStagger: 0.18,     // カード1枚が出きるまで
    },
  },
  /* 【2026-08-18】アニメーションの駆動方式。参考サイト調査を受けて2軸を用意した。
       time   = 今までどおり。固定して「映像を再生」する。速さが常に一定で絵コンテ通り
       scroll = スクロール量で展開する。手を止めれば絵も止まり、戻せばそのまま巻き戻る */
  /* 【2026-08-19 ヒデさん指定】既定は「スクロール駆動 × 固定追従あり」。
     ⚠️ 保存があればそちらが優先される（＝最後に保存した設定が引き継がれる）。
        ここは「まだ一度も保存していない人／元に戻したあと」の初期値。 */
  drive: 'time',   /* 2026-08-30 ヒデさん指定: 自動再生(時間)で確定。パネルの切替も削除した */
  /* 【2026-08-18 指定】固定追従(sticky)を使うか。
       on  = 従来。セクションを画面に貼りつけて見せる
       off = 貼りつけない。セクションは普通に流れ、画面に入った時に中で再生する
             （貼りつけが外れる時のスライドが起きないので、重なりの事故が構造的に無い） */
  pin: 'on',
  /* 【2026-08-26 ヒデさん指定】スクロールの固定の強さ(3パターン・調整パネルで切替)。
     'smooth' = 固定なし。自由にスクロール、アニメは画面に来たら時間で再生(ガタつき無し・既定)
     'soft'   = 弱め。ブロックはせずゆるく引き戻す(ラバーバンド)＋回すと早送りで追いつく
     'lock'   = 固定。従来のスクロールジャック(再生中は貼りつけて動かさない)
     ※ pin='on' のまま(=リビール演出は維持)、この scrollHold で“ロックの強さ”だけ切替える。 */
  scrollHold: 'smooth', // 2026-08-26 ヒデさん指定: サイト全体は「固定追従なし」を既定に(掴み無し・ロック無し)。固定は個別で必要な所だけ。切替は 固定追従なし / 固定 の2択
  kvDesign: 'planet',   // 右グラフィック＝V1.0の惑星(2026-08-26 復活)。【2026-09-26 整理】旧iframe案(A/B)は撤去したので 'planet' だけ
  visResPull: 200,   /* 【2026-09-19 夜】260→200(ヒデさん「まだ近い」→気持ち60px空ける・仮置き) 【2026-09-19】ビジョン→実績の空白を詰める量(px・PCのみ)。ビジョンタブ。200→260(1440×921 で図/Point に被らない上限は約320) */
  secHeadGap: 6,   /* 【2026-09-19】セクション見出しのラベル→見出しの間隔(px)。🌊全体タブ */
  drawer: { padT: 0, padB: 0, padL: 130, padR: 0, gap: 24, fs: 56, numFs: 14, barW: 20, barH: 2, barGap: 7, navBlur: 8 },   /* navBlur=スクロールでナビが格納される時のぼかし最大(px) */   /* barW/barH/barGap=右上のハンバーガー(2本線)の 長さ/太さ/間隔(px)。2本にした分ちょっと広め(7) 2026-09-18 */
  /* 【2026-09-18 ヒデさん依頼「ロゴティッカーを目視で美しく」】ロゴごとの微調整。dy=上下(px・＋で下)、mx=左右それぞれに足す余白(px)。
     既定値はインク(見える部分)の重心と濃さの実測から: 重心が箱の中心より下のロゴは上げ(akerun/ANDPAD)、上のロゴは下げ(sweeep)、
     黒ベタで重いロゴ(スマレジ/ContractS/UPSIDER)は余白を広く、線の細い NP掛け払い は狭く。 */
  logoTune: { hennge: { dy: 0, mx: 0 }, upsider: { dy: -0.5, mx: 5 }, np: { dy: -0.5, mx: -4 }, akerun: { dy: -1.5, mx: -1 }, smaregi: { dy: 0, mx: 8 },
              andpad: { dy: -2, mx: -1 }, icare: { dy: -0.5, mx: 0 }, contracts: { dy: 0.5, mx: 8 }, sweeep: { dy: 2, mx: -1 } },   // 【2026-09-18 ヒデさん依頼】ハンバーガーメニューの余白(px)・項目の間隔・文字サイズ(項目/番号)。上下は以前(10)より広め
  kvVar: 'normal',     // 【2026-09-18 ヒデさん依頼】KVのバリエーション(normal=ノーマル Figma 17707:26544 / strong=強調 調整版)
  kvGfx: { scale: 1.21, dx: 148, dy: 184, ox: 0, oy: 0, oz: 0 },   // 【2026-09-18】右グラフィック全体の拡大・移動(PCのみ)。案(KV_VARIANTS)が入れ替える。ox/oy/oz=【2026-09-19】XYZのずらし(0=いまの位置。Z は % で手前/奥)
  converge: 'mesh',     // 【V4.0 2026-09-09 ヒデさん指定】既定＝ネットワークタブ★1(mesh『D 大きいケージ』)。惑星への集約アニメ。既定は「周回のみ」(2026-08-28 ヒデさん指定・グループ再編)
  /* 集約アニメの調整つまみ (2026-08-26 ヒデさん指定: 各項目をパネルで調整できるように)
     pers: 'normal'=今の実装 / 'fix'=パース調整版(輪が先に惑星の真ん中へ寄ってから同心円ですぼまる)
     showOuter/showInner: 軌道の輪のオンオフ(輪を消すとその輪のドットも消える)
     タイミング系(inDur/shrinkAt/endAt など)は「周期の中の割合」(0〜1) */
  orbitLayout: 'figma',  // 軌道レイアウト(ORBIT_LAYOUTS)。2026-08-26 ヒデさん指定でカンプ通り(2本が平行)を既定に戻した
  /* 【2026-08-27 ヒデさん指定】グラフィックの形(軌道と惑星の位置・サイズ・傾き)は
     アニメ案ごとに別々に持つ。案を切り替えると、その案の形に入れ替わる(引き継がない)。
     形が入っていない案は gfxDefault() = 最初に実装した位置関係で始まる。 */
  gfxByMode: {},         // { 案キー: {layout, outer, inner, planet} }
  gfxPresets: {},        // { 案キー: [{name, data}] } 案ごとのプリセット
  gfxPresetOn: {},       // { 案キー: 選んでいる番号 }
  gfxVariantOn: { mesh: 3 },      // { 案キー: 選んでいるバリエーションの番号 } 【V4.0 2026-09-09】既定 mesh:3＝『D 大きいケージ』(ネットワーク★1)
  gfxVariantHidden: {},  // { 案キー: [消したバリエーションの名前] } UI から削除したもの
  gfxPresetTrash: {},    // { 案キー: [{name, data}] } 削除したプリセットのゴミ箱(復元用・2026-08-29)
  gfxVarOverride: {},    // { 案キー: { バリエーション名: 全設定 } } 「この設定で上書き」の控え(2026-08-30)
  gfxFav: [],            // 【2026-09-01】お気に入りピン留め [{m:モード, name:案名}] 並び順=ピン留め順
  presetUiStyle: 'chips',// プリセットの見せ方: 'chips'(コンパクトチップ) / 'drop'(ドロップダウン)。2026-08-29
  conv: {
    showOuter: true, showInner: true,
    showDots: true,                                          // 軌道上のドット(7個)の表示/非表示
    /* 【2026-09-01 ヒデさん指定】B3「J 地平線・横揺れ」の横揺れ。内外の輪を左右にゆらす。
       on=横揺れする(この案の目玉なのでB3では定義がtrueにする) / pat=揺れ方(sine/drift/tri) /
       outerAmp・innerAmp=外・内の振れ幅(px) / period=1往復の秒数 / delay=内側の遅れ(秒) */
    hsway: { on: false, pat: 'sine', outerAmp: 16, innerAmp: 16, period: 6, delay: 0.8 },
    net3d: false,                                            // 2026-08-29: ネットワーク3D案のときだけ true(専用レンダラーに切替)
    /* 【2026-08-26 ヒデさん指定】どの案でも効く共通のドット設定
       dotSize = 全部のドットの大きさ倍率
       dotPersp: 'flat'=どこでも同じ大きさ / 'persp'=手前が大きく奥が小さい(遠近感)
       perspK = 遠近の強さ
       perspScope = 遠近を効かせる対象 'dots'=ドットのみ / 'orbit'=軌道の線のみ / 'both'=両方
                    軌道は「手前(下)の線を太く・奥(上)を細く」で遠近を出す(2026-08-29 ヒデさん指定) */
    dotSize: 1, dotPersp: 'flat', perspK: 0.45, perspScope: 'dots',
    /* 【2026-08-28 ヒデさん指定】惑星の手前に来たもの(輪のはみ出し・粒・パケット)を
       隠すかどうか。true=隠す(惑星の中へ入ったように見える) / false=そのまま前を通す */
    frontCut: true,
    /* 【2026-08-27 ヒデさん指定】軌道にそってドット自体が動く(周回する)かを案ごとに切替。
       off にすると、その案ではドットが位置に留まったまま(集約などの動きだけが起きる) */
    dotMove: { reel: true, spiral: true, accre: true, mesh: true, beads: true, duplex: true, gyro: true },
    /* 【2026-08-27 ヒデさん指定】軌道そのものの回転は【案ごと】に持つ。
       案によって似合う回り方が違うため。orbitSpin(全案共通)は古い保存値からの引き継ぎ用に残す */
    orbitSpinBy: { off: 0, reel: 0, spiral: 0, accre: 0, mesh: 0, beads: 0, duplex: 0, gyro: 0 },
    /* 【2026-08-28 ヒデさん指定】軌道の線の太さ(倍率)。案ごとに持つ。1=カンプ通りの3px */
    orbitWidthBy: { off: 1, reel: 1, spiral: 1, accre: 1, mesh: 1, beads: 1, duplex: 1, gyro: 1 },
    /* 【2026-08-28 ヒデさん指定】軌道全体の大きさ(倍率)。案ごとに持つ。1=そのまま */
    orbitScaleBy: { off: 1, reel: 1, spiral: 1, accre: 1, mesh: 1, beads: 1, duplex: 1, gyro: 1 },
    /* 【2026-08-27 ヒデさん指定】ドット1粒ずつの不規則さと、軌道そのものの動き。
       dotRandom = ドットごとに速さ・位置がばらつく量
       orbitSpin = 軌道そのものが回る速さ(0で回らない。これまでは形が固定だった)
       orbitDrift = 軌道そのものがゆっくり漂う量 */
    dotRandom: 0, orbitSpin: 0, orbitDrift: 0,
      glow: 0.35,
    /* 【2026-08-28 ヒデさん指定】吸収の光り方を5つから選ぶ。
       pulse=ふっと明るくなる(従来) / hue=色が変わる / core=芯が育つ /
       ripple=波紋 / breath=呼吸
       charge=データが溜まっていく度合い(0〜1)。吸収のたびに増え、ゆっくり戻る */
    glowKind: 'pulse',
    glowEcho: 'k8',     /* エコーの見え方(k1〜k9)。glowKind='echo' の時だけ効く。既定はくっきり尾を引く */
    fxMode: 'every',    /* 【2026-08-28】エフェクトの出方。every=毎回 / count=N回に1回 / time=N秒に1回 */
    fxCount: 10,        /* 【2026-08-28】count のとき、何回の取り込みに1回だすか */
    fxEvery: 8,         /* 【2026-08-28】time のとき、何秒に1回だすか */
    fxInertia: 0.5,     /* 【2026-08-28】広がりの慣性。0=一定(機械的)、1=最初速く→減速(自然な波紋) */
    echoCrisp: false,   /* 【2026-08-28】くっきり表示。trueで残像のぼかしを切り、輪郭をはっきり見せる */
    /* 【2026-08-28 ヒデさん指定】エコーがガクガクして見えるので、細かく調整できるようにした。
       echoSpeed=広がる速さ(小さいほどゆっくり滑らか) / echoShells=重ねる枚数 /
       echoSpread=どこまで広がるか / echoStart=どこから始まるか / echoFade=消え方のなめらかさ */
    echoSpeed: 0.7, echoShells: 3, echoSpread: 0.28, echoStart: 1.12, echoFade: 1.6,
    echoAlpha: 1,      /* 残像の濃さ(倍率)。1 が既定 */
    /* 【2026-08-28 ヒデさん指定】複数軌道(アトム型/土星型/花型など)。ringCount>=2 で有効 */
    ringCount: 0, ringShape: 'atom', ringSpin: 0.35, ringFlat: 0.42, ringSize: 1, ringTumble: 0.6, ringWidth: 3, ringRotate: false,
    startPhase: 0,   /* 【2026-08-29】回転アニメの開始位相(「いまを開始地点にする」で設定) */
    glowHold: 6,        /* 溜まったものが半分に戻るまでの秒数 */                                              // 吸収の瞬間の惑星の光り方
    /* reel(①循環版 2026-08-26): 内の輪が吸収→外の輪が内の位置へ移動(moveDur)→
       元の外の位置に新しい輪がフェードイン(inDur)、を交代でくり返す。
       vanish=消え方(fade=フェード/sink=惑星の後ろへ沈む/shrink=点まで縮む/blur=ぼかし)
       fadeAt=透過し始め(収縮の中の割合) / fadeTo=吸収の瞬間に残す濃さ / spinUp=収縮中の回転アップ */
    reel:   { T: 4.8, inDur: 0.14, shrinkAt: 0.30, endAt: 0.72, depth: 0.95, moveDur: 0.16,
              swapSec: 1.2,   /* 【2026-08-30 ヒデさん指定・統一】輪の入れ替わり(回転)にかける秒数。パネル「入れ替わりの速さ」 */
              vanish: 'clip', fadeAt: 0.7, fadeTo: 0, spinUp: 0,   /* spinUpは2026-08-30廃止(0固定) */
              blend: 0, blendAlpha: 0.45,   /* 外と内の間を埋める中間の輪(イラレのブレンドのイメージ) */
              transRot: true,   /* 【2026-08-28】輪が入れ替わる時、傾きの違うスロットへ移ると回転して見える。offで回転しない */
              /* データ粒: 最初は点線 → 圧縮されて1本の線になる。太さ/密度/ゆらぎを調整できる */
              pxWidth: 1.6, pxDensity: 1, pxWobble: 0, pxSpin: 1,   /* pxSpin=ドットが軌道を回る速さ */
              pxJoinAt: 0, pxJoinEnd: 1,   /* 点がつながり始める / つながりきる タイミング(収縮の中の割合) */
              glowWidth: 0.5, glowTone: 'now', glowPower: 1,   /* 圧縮グローの線の太さ・光り方・強さ */
              flow: 'up' },   // 2026-08-27 ヒデさん指定: 既定は「上がる」(内→外→吸収)
    /* 【2026-08-29 ヒデさん指定】収縮(reel)に重ねる「粒が吸い込まれる」オプション(spiral と同じ設定形)。既定オフ。 */
    reelP: { on: false, count: 12, life: 8, speed: 0.55, size: 0.62, stay: 5, swirl: 1, fallCurve: 1 },
    /* 【2026-08-30 ヒデさん指定】軌道の回転と「粒」(各案の内蔵の粒＝渦/円盤/粒リング＋追加の粒(吸い込み))を
       連動させるか。false=軌道の線だけ回り、粒の回転軸は固定のまま。パネル「動き(この案)>粒も一緒に回す」。 */
    spinLink: true,
    /* spiral(② 2026-08-26): 粒はまず軌道上を stay 秒ほど回り、それから惑星へ吸い込まれる */
    spiral: { count: 12, life: 8, speed: 0.55, size: 0.62, stay: 5, swirl: 1, fallCurve: 1 },   /* 2026-08-28 ゆったりへ */   /* swirl=吸い込まれる間の巻き具合 */
    /* beads(⑬ドットの軌道): 軌道の線の代わりに、ドットが密に並んで「輪」に見せる。
       一部だけが順に惑星へ吸われるので、輪の形は保たれる。ghost=薄い軌道線を残すか */
    /* beads: 軌道線は出さず、点だけで輪を作る(2026-08-27 ヒデさん指定で ghost 廃止) */
    beads:  { count: 300, even: true, speed: 0.26,   /* even=弧の長さで等分(見た目が均等) */ life: 3.4, size: 0.5, ratio: 0.22, jitter: 0, spin: 0, spinEase: 1, backIn: 1.2 },
    /* mesh(⑫メッシュ): 3つの見た目(style) + ランダムに漂う動き
       style: organic=ふわふわ漂う / constellation=星座(明滅) / grid=格子状のネット /
              cage=包囲ケージ(惑星のまわりの球殻にノードを並べて回す。2026-08-27 ヒデさん指定) */
    /* mesh(メッシュ): ノードがランダムに漂う網。見た目は「ふわふわ」に固定(2026-08-26 ヒデさん指定) */
    /* pts = 頂点を手で置いた座標([{x,y}])。null なら自動配置。
       【2026-08-28 ヒデさん指定】「グラフィックを編集」から頂点をドラッグして決められる */
    mesh:   { style: 'organic', nodes: 14, hop: 0.55, span: 0.34, rate: 1.2, size: 0.6, spread: 1, pts: null,
              cageR: 1.75, cageSpin: 1, cageLinks: 3, cageTilt: -20,   /* ケージ専用 */
              lineAlpha: 0.25, lineWidth: 1.4, drift: 1, random: 0.6 },   /* 2026-09-09 ヒデさん指定: メッシュ線の濃さ 0.5→0.25 */
    /* link(⑮同時双方向): 惑星とドットをラインで結び、双方向にデータが飛び交う。
       melt = 惑星の内側での溶かし方(fade / blur / shrink) */
    link:   { speed: 1, size: 0.6, density: 1, curve: 0.22, lineAlpha: 0.16, lineWidth: 1, T: 3.2, vanishK: 0.35 },
    /* ⑦ジャイロ回転 (2026-08-27 ヒデさん指定)
       2本の輪が独楽(ジャイロスコープ)のように立体的に転がる。
       2Dのまま3Dに見せるため、面の向き(rot)を回しながら 縦の潰れ(ry) を |cos| で伸び縮みさせる。
       tumble=転がる速さ / spin=面が回る速さ / phase=2本のずれ(90度で直交＝ジャイロらしい)
       thin=真横になった時にどこまで潰すか / pull=惑星へ吸い寄せる強さ / pullT=その周期 */
    gyro:   { tumble: 1, spin: 1, phase: 90, thin: 0.06, pull: 0.25, pullT: 5 },
    /* 【2026-08-28 ヒデさん指定】⑦の「転がり」を、どの案にも混ぜられるようにした度合い。
       0=混ぜない / 1=⑦と同じだけ転がる。案ごとに持つ */
    gyroMixBy: { off: 0, reel: 0, spiral: 0, accre: 0, mesh: 0, beads: 0, duplex: 0 },
    /* accre(⑦降着円盤 2026-08-26): 軌道の代わりに無数の微粒子の渦。回りながら内へ落ちて取り込まれる */
    accre:  { count: 1000, fall: 0.55, speed: 0.45, size: 0.35, scale: 1.15, twinkle: 0.4, wobble: 0, showOrbit: false,
              swirl: 1, fallCurve: 1 },   /* swirl=内側ほど速く回る度合い / fallCurve=落ち方のカーブ */
  },
  patterns: {
    results: 'C',   // 実績のレイアウト A=横長画像 / B=左端の縦帯 / C=中央テキスト＋黒オブジェクトで開発者体験へ(既定)
    /* 【2026-08-29 ヒデさん指定】実績→開発者体験の「切替演出」。
       'black' = 黒オブジェクトがせり上がる(従来) / 'smooth' = スムーズフェード(既定・2026-08-29)
       (スクロールジャック/固定追従なし・背景が自然にクロスフェード・黒オブジェクトなし) */
    resTrans: 'smooth',
    devStack: 'on', // 開発者体験②で後ろに2枚控えるか (カンプ 14924:21985)
    dev: 'A', cases: 'A', mock: 'B',
    caseHover: 'ct-lift',   // 導入事例のホバー = カードの周りに線が引かれる (2026-09-15 ヒデさん採用)
    caseLayout: '1',         // 導入事例の罫線 = なし (2026-09-15 ヒデさん採用)
    /* 【2026-08-28 ヒデさん指定】実績の2つの価値の、右側ピクトグラムの動き(各5案) */
    valSaas: 'S9',       // for SaaS「リアルタイムにデータ同期」2026-09-08: S1完全削除に伴い生存案へ
    valAi: 'A21',        // for AI「コンテキスト取得から実行」2026-09-08: 折れて進む・改(矢印/三角フェードイン)を既定に
    /* 【2026-09-13 ヒデさん指定・比較検証】実績セクションの演出案(Codex 1/4/5/6/7/9)。'default'=現行。
       採用前の比較用。本番の焼き込み(SHIPPED_SETTINGS)には入れない＝本番は常に現行。 */
    resFx: '24-4',
  },   // セクション演出の採用案
};
/* ⚠️ パラメータの「意味」を変えたら必ずこのバージョンを上げること。
   上げないと、利用者のブラウザに残った旧値が新しいデフォルトを上書きして
   レイアウトが壊れる (v7→v8: slideX を絶対位置から中央からの微調整に変更
   / v8→v9: 導入事例の depth を「ブラーと透明度の効き」から「絵コンテ通りの縮小率」に変更
   / v9→v10: 導入事例の重なりを spread(%) から step(px) に変更、惑星の既定位置を更新
   / v10→v11: 導入事例を「縦に並べてから重ねる」→ カンプ通りのスティッキースタックに作り直し
   / v11→v12: 見出しスライドを5案化・2行目の追従を即時に、実績の余白と尺を変更
   / v12→v13: スライド⑤を削除、実績を時間＋スクロール併用に、開発者体験の間合いを緩める、
              KVのタイピング速さを行ごとに分離
   / v13→v14: 導入事例の重なりを overlap(px) から step(ズレ px・既定0＝完全に重なる) に変更
   / v14→v15: 出現の秒数をトークン(0.25/0.8/1.3)に統一、見出しの1文字ずつ出しを追加、
              慣性スクロール(Lenis)を導入
   / v15→v16: 開発者体験の1巡目モックを復活し尺を850vhへ・間合いを全体に拡大、
              実績を220vhへ短縮し乗り換え区間も使う、導入事例の文字を黒抜け直後に出す
   / v16→v17: ビジョンの見出しを中央寄せにし、左スライド廃止 → 上下に分かれて
              間から軌道が出る形に変更 (slide* を split* に差し替え)
   / v17→v18: 惑星に「波が流れる」F/G/H を追加
   / v18→v19: 導入事例を「縦に並んでスクロールで重なる」形に変更 (step → gap)、
              ビジョン/開発者体験も時間駆動から時間＋スクロール併用へ
   / v19→v20: ビジョンを「出だしだけ自動・あとは全部スクロール」に変更
   / v20→v21: フォントウェイトをカンプと突き合わせて修正、カード間隔 40→44px
   / v21→v22: Platform図の字間を撤去、「認証基盤」ラベル追加、コネクタの位置を更新
   / v22→v23: KVは打ち終わってから小ラベル、スクロール速度の上限(maxRate)を全体に、
              ビジョンは画面中央に来てから開始
   / v23→v24: 波の惑星の配色をカンプ実測の面積比ランプに差し替え
   / v24→v25: スクロール速度の上限(maxRate)は“のっそり”するため撤去。元の追従に戻した
   / v25→v26: Platform図の役割ラベルをドット基準の相対配置に変更、
              スクロール＝きっかけ/再生＝時間 方式に、ビジョンの尺をドット停止まで延長
   / v26→v27: 全セクションを「所定の位置で止めて1本の映像として自動再生」方式に
   / v27→v28: ビジョンの出だし・行間・上下分割と、実績のテキスト出現を詰めた
   / v28→v29: 描画ループを例外で止まらないようにし、所定の位置へ寄せてから再生開始
   / v29→v30: KVのタイピングを速く、早送りを4倍速に（白へワープするバグ修正）、
              ビジョンの助走→本編の時間飛びを解消
   / v30→v31: 開発者体験を5つの章に分け、章ごとに再生→解放→スクロールで次章に
   / v31→v32: ビジョンの spinDur を廃止し spinHold(たっぷり回す時間)へ。
              ロゴティッカーを1枚ずつに切り出して等間隔化 (marquee.gap 追加)
   / v32→v33: 開発者体験をカンプ 14791:29575 の新レイアウトへ (DEV_P を総入れ替え)
   / v33→v34: 実績をカンプ 14801:31557 へ / スクロールリプレイ復活 / 軌道の緩急とライト追加
              / 惑星の回転に向き・傾き・ランダムを追加 / 各セクションの尺を短縮
   / v34→v35: 軌道ライトを細く(orbitLightW)＋グラデの継ぎ目がライトと一緒に動くように
   / v35→v36: 通り過ぎた後に頭へ引き戻されるループを修正 / キーメッセージの出方を2種類に
              / 軌道の出現と移動を同時に(moveLead) / 待ちを全体的に短縮
   / v36→v37: 軌道ライト廃止 / 惑星デザインのキーを A1..C3 に振り直し / ゆらぎ既定=クロス
              / パネルを階層化＋全項目に補足 / 実績を中央寄せ＋画像レスポンシブ＋パララックス
   / v37→v38: 軌道グラデの白をカンプ通りに戻した
   / v38→v39: キーメッセージを行ごと×ブラーのみに / スライダーの既定値がツマミ中央に来るように
   / v39→v40: 消えていた .dev-bg / .dev-bg2 を復活 (真っ白の原因) ＋ 開発者体験を上下中央そろえ) */
/* v40→v41: 実績をカンプ 14824:22160 へ (見出し変更・罫線追加・数字80px・画像はフレームでトリミング) */
/* v41→v42: 軌道の拡大を移動の“途中で”じわじわに / 2つの価値の位置をパネルで動かせるように */
/* v42→v43: 実績に案B(カンプ 14831:22066)を追加して既定に。案Aは「テキスト→画像」の順へ */
/* v43→v44: スキップ削除 / モックの会話を作り直し / モックは消さず左へスライド
             / 実績(案B)の終わりで暗い背景へトランジション */
/* v44→v45: ビジョンと実績のフォントをカンプ再取得値へ / 実績→開発者体験を1スクロールで切替
             / 章②を短縮しリストは一括 / ホバーは下線＋白文字 / 開発者体験②を3枚スタックに */
/* v45→v46: 実績→開発者体験の暗幕を fixed にして流れないように / つなぎの1画面をモックと見出しで埋める
             / 2つの価値の位置を調整値で既定化 / ホバー切替のブラーを廃止 */
/* v46→v47: 軌道の出はじめを小さく / 役割名を Point02 と同時に / カード入れ替えを案1(横に回る)で本実装
             / 実績の開始をビューポート中央に戻す */
/* v47→v48: 開発者体験②のレイアウトをカンプ 14927:22549 の実測へ (カードの重なり位置とリストの余白) */
/* v48→v49: ドットの回り方と軌道の出方を3パターンずつに (visSpin / visMove) */
/* v49→v50: 実績→開発者体験を1画面重ねて「その場で切り替わる」形に / モックの下地を不透明に
             / ゆらぎクロスは平行から始める / パネルの確定項目を整理 / 滑らかさ既定3 */
/* v50→v51: ビジョンの2行を上下中央へ / 実績も再生中はスクロールを止める
             / 開発者体験の日本語見出しを4px下げ / モックの会話をスピーディーに */
/* v51→v52: ドットはきっちり1周して止まる / 実績はタイピング廃止＆カウントアップ
             / ラベルと数字を右端そろえ / パネルをいじったらその場でリプレイ */
/* v52→v53: 数字のカウンターをスロット式(縦帯をマスクで切り取って回す)に */
/* v53→v54: 上に戻る時のスクロールリプレイをきれいに (奥にいる間は完成状態を見せる) */
/* v54→v55: 開発者体験の見出しをさらに4px下げ＋Thinへ / API・CLI・SDK のウェイトをカンプ 14937:23895 へ */
/* v55→v56: 実績の数字はスロットをやめて単純なブラー出現に（見出し→数字の順） */
/* v56→v57: 開発者体験の見出しをカンプ 14937:23888 へ (40px / gap12px) */
/* v57→v58: 透明な要素があたり判定を持っていて、下の文字を選べなくしていたのを修正 */
/* v58→v59: 開発者体験の背景グラデをカンプ 14937:23887 へ (#161616 → #454545)
   / v59→v60: デザイントークン整理(サイズ偶数化・角丸4段階・色統合) と
              描画まわりの改善(背景ぼかしは手前1枚 / 矩形キャッシュ / 無駄な書き込みを止める)
              ⚠️ swapBlur・countDur・spinSpeed を削除したのでバージョンを上げる */
/* v60→v61: ビジョンの開始をビューポート中央（ピン開始）にそろえた */
/* 2026-08-19: ドットを6個→7個に増やし、角度を等間隔に置き直した。
   ⚠️ バージョンは上げない。上げると「動かし方(スクロール駆動)」「固定追従」など
      ヒデさんがパネルで選んだ設定まで一緒に初期化されてしまうため。
      代わりに load() 側で【個数が違っても他の設定は生かす】ようにしてある。
      新しく足した dotGap は保存側に無いので、自動で既定(=①きっちり等間隔)が入る */
/* ⚠️【2026-08-27】ヒデさんの画面で「軌道と惑星が初期に戻らない」問題の原因は、
   ブラウザに残っていた古い保存値(直接編集でいじった形)だった。
   コード側の既定値は本番(anyflow-embed-v3)と完全に一致していることを実測で確認済み
   (楕円 cx/cy/rx/ry/rotate、惑星 transform とも一致)。
   一度きりのリセットでは取りこぼすので、保存キーごと上げて古い保存値を丸ごと捨てる。 */
/* ===== プリセットの保管場所 (2026-08-27 ヒデさん指定) =====
   ⚠️ 調整パネルを作り替えるたびに STORAGE_KEY を上げると、保存値が丸ごと捨てられる。
      プリセットまで一緒に消えるのは困るので、【バージョンを付けない別のキー】に分けて置く。
      ここは今後もキー名を変えない。パネルをどう作り替えてもプリセットは残る。 */
const PRESET_KEY = 'anyflow-gfx-presets';
