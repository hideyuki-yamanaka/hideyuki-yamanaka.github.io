/*
 * 「この場所にする」を押してから動画の世界に入るまでのズームイン演出 5案。
 * /mock/enter で並べて比べられる。
 *
 * 共通の仕組み（どの案も同じ。違うのは効き方だけ）
 * - 選んだカードが「窓枠」。窓の開口部だけが広がって、画面いっぱいを覆う
 * - 窓の向こうの景色は画面に貼り付いたまま。開口部が動いたぶんだけ中で逆に動かす
 * - 景色は parallax の量だけ“わずかに”しか動かない。
 *   枠が大きく広がるのに景色はほぼ動かない、この差が奥行きになる
 * - 終点は器の実寸から計算する（1512 の固定値で出すと横長の画面で左上にずれる）
 *
 * 単位はカンプ（1512x982 ステージ）上の px ＝ 見た目そのままの px。
 */
export type EnterPattern = {
  key: string;
  label: string;
  note: string;
  /** 全体の尺(ms)。この時間が終わったら動画画面に切り替わる */
  duration: number;
  /** 開口部の「位置」の動き方。どこから寄るか */
  ease: [number, number, number, number];
  /** 開口部の「大きさ」の動き方。ここが寄りの体感を決める */
  growEase: [number, number, number, number];
  /** 窓の向こうの景色の視差。1 に近いほど景色が動かない＝奥行きが強い */
  parallax: number;
  /** 角丸(px)。窓枠が外れていく */
  radius: [number, number];
  /** 白フチ(px) */
  border: [number, number];
  /** 途中で入れるブラー(px)。[開始, 中盤, 終了] */
  blur: [number, number, number];
  /** 周囲を暗く落とす量(0-1)。トンネル感を出す */
  dim: number;
};

const STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1];
/* 出だしを抑えて終盤で加速する。強くしすぎると溜めが長すぎて重く感じるので、
   ほどよく効くこのくらいに留める。 */
const SUCK: [number, number, number, number] = [0.7, 0, 0.9, 0.5];

export const ENTER_PATTERNS: EnterPattern[] = [
  {
    key: "tunnel",
    label: "吸い込まれる",
    note: "最初はほとんど動かず、終盤で一気に加速して吸い込まれる。まわりは暗く落ちる",
    duration: 1600,
    ease: STANDARD,
    growEase: SUCK,
    /* 景色をほぼ止めることで、枠だけが猛烈に迫ってくるように見せる */
    parallax: 1.06,
    radius: [120, 0],
    border: [10, 0],
    blur: [0, 0, 0],
    dim: 0.55,
  },
  {
    key: "approach",
    label: "すっと近づく",
    note: "ためを作らず、一定の速さで素直に窓へ近づく。いちばんクセがない",
    duration: 1200,
    ease: STANDARD,
    growEase: STANDARD,
    parallax: 1.02,
    radius: [120, 0],
    border: [10, 0],
    blur: [0, 0, 0],
    dim: 0.15,
  },
  {
    key: "focus",
    label: "ブラー越しに入る",
    note: "近づく途中で一度ピントがぼけて、向こう側で合う。夢に入るような感触",
    duration: 1800,
    ease: STANDARD,
    growEase: STANDARD,
    parallax: 1.04,
    radius: [120, 0],
    border: [10, 0],
    blur: [0, 14, 0],
    dim: 0.25,
  },
  {
    key: "slow",
    label: "ゆっくり没入",
    note: "2.6秒かけてじわーっと入っていく。ぼーっとする時間の助走らしいゆったり感",
    duration: 2600,
    ease: STANDARD,
    growEase: [0.4, 0, 0.2, 1],
    parallax: 1.08,
    radius: [120, 0],
    border: [10, 0],
    blur: [0, 4, 0],
    dim: 0.35,
  },
  {
    key: "snap",
    label: "パッと窓が開く",
    note: "0.9秒でキビキビと開く。待たせない・すぐ観たい人向け",
    duration: 900,
    ease: STANDARD,
    growEase: [0.16, 1, 0.3, 1],
    parallax: 1.01,
    radius: [120, 0],
    border: [10, 0],
    blur: [0, 0, 0],
    dim: 0,
  },
];

export const DEFAULT_ENTER = ENTER_PATTERNS[0];

/* 調整パネルの細密チューニング値（案1をベースに拡張。2026-08-23 ヒデさん依頼） */
export type EnterTune = {
  /** アニメーション時間（秒） */
  durationSec: number;
  /** ため（緩急）%：0=一定の速さ、100=終盤で一気に加速（今の吸い込まれ） */
  tame: number;
  /** 奥行き（視差）%：大きいほど枠だけが迫って見える */
  parallax: number;
  /** まわりの暗さ% */
  dim: number;
  /** 途中のブラー(px)：中盤に一度ぼける */
  blurMid: number;
};
export const DEFAULT_ENTER_TUNE: EnterTune = {
  durationSec: 1.6,
  tame: 100,
  parallax: 6,
  dim: 55,
  blurMid: 0,
};

export function buildEnter(t: EnterTune): EnterPattern {
  /* 100%超は SUCK を外挿してさらに強い「ため」に。
     ベジェの x 成分（偶数番）は仕様上 0〜1 必須なのでクランプする */
  const k = Math.max(0, t.tame / 100);
  const growEase = STANDARD.map((s, i) => {
    const v = s + (SUCK[i] - s) * k;
    return i % 2 === 0 ? Math.max(0, Math.min(1, v)) : v;
  }) as [number, number, number, number];
  return {
    ...DEFAULT_ENTER,
    duration: Math.max(200, t.durationSec * 1000),
    growEase,
    parallax: 1 + t.parallax / 100,
    dim: t.dim / 100,
    blur: [0, t.blurMid, 0],
  };
}

export function findEnter(
  key?: string | number | EnterPattern | null
): EnterPattern {
  if (key != null && typeof key === "object") return key;
  if (key == null) return DEFAULT_ENTER;
  const byIndex = ENTER_PATTERNS[Number(key) - 1];
  return byIndex ?? ENTER_PATTERNS.find((p) => p.key === key) ?? DEFAULT_ENTER;
}
