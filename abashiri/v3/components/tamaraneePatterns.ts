/*
 * 人物イラストにカーソルを乗せた時の「眉が上がる ＋ たまらねー がひょこっと出る」5案。
 * /mock/tamaranee で並べて比べられる。
 *
 * 共通ルール
 * - 眉の持ち上げ量は faceConfig.browLift（既定5px）。案ごとに「上がり方の速さ」だけ変える
 * - 文字は右上に置いてあり、出方（transform / opacity / blur）だけを案ごとに変える
 * - 単位はカンプ（1512x982 ステージ）上の px ＝ 見た目そのままの px
 */
export type TamaraneePattern = {
  key: string;
  label: string;
  /** 何が違うのかの一言 */
  note: string;
  /** 眉が持ち上がるまでの時間(ms)とイージング */
  brow: { duration: number; ease: string };
  /** 文字の出方。off = 消えている時、on = 出ている時 */
  text: {
    duration: number;
    /** 遅らせて「ワンテンポ置いて出る」感じを作る(ms) */
    delay: number;
    ease: string;
    /** transform-origin。跳ねの支点 */
    origin: string;
    off: React.CSSProperties;
    on: React.CSSProperties;
  };
};

/* 行き過ぎてから戻る＝「ひょこっ」の正体。跳ね方の強さで4段用意した */
const BOUNCE_S = "cubic-bezier(0.34, 1.40, 0.64, 1)";   /* 軽く跳ねる */
const BOUNCE_M = "cubic-bezier(0.34, 1.56, 0.64, 1)";   /* しっかり跳ねる */
const BOUNCE_L = "cubic-bezier(0.18, 1.85, 0.42, 1)";   /* 大きく跳ねる */
const BOUNCE_XL = "cubic-bezier(0.16, 2.20, 0.38, 1)";  /* かなり暴れる */

export const TAMARANEE_PATTERNS: TamaraneePattern[] = [
  {
    key: "hyoko",
    label: "案1  ひょこっ（標準）",
    note: "下から跳ね上がって、行き過ぎてから収まる。素直で使いやすい跳ね方",
    brow: { duration: 260, ease: BOUNCE_M },
    text: {
      duration: 460,
      delay: 60,
      ease: BOUNCE_M,
      origin: "50% 100%",
      off: { opacity: 0, transform: "translateY(16px) scale(0.72)" },
      on: { opacity: 1, transform: "translateY(0) scale(1)" },
    },
  },
  {
    key: "poyon",
    label: "案2  ぽよん（大きく弾む）",
    note: "小さく縮んだ状態から大きく跳ねて戻る。いちばんコミカルで目を引く",
    brow: { duration: 220, ease: BOUNCE_L },
    text: {
      duration: 620,
      delay: 40,
      ease: BOUNCE_XL,
      origin: "50% 100%",
      off: { opacity: 0, transform: "translateY(20px) scale(0.35)" },
      on: { opacity: 1, transform: "translateY(0) scale(1)" },
    },
  },
  {
    key: "punyu",
    label: "案3  ぷにゅっ（潰れて戻る）",
    note: "横に潰れた状態から縦に伸びて戻る。ゴムまりが跳ねたような弾力が出る",
    brow: { duration: 240, ease: BOUNCE_M },
    text: {
      duration: 560,
      delay: 50,
      ease: BOUNCE_L,
      origin: "50% 100%",
      off: { opacity: 0, transform: "translateY(12px) scaleX(1.35) scaleY(0.45)" },
      on: { opacity: 1, transform: "translateY(0) scaleX(1) scaleY(1)" },
    },
  },
  {
    key: "kururi",
    label: "案4  くるっ（回って跳ねる）",
    note: "傾いた状態から回りながら跳ね上がる。手で書き足したような勢いが出る",
    brow: { duration: 260, ease: BOUNCE_M },
    text: {
      duration: 540,
      delay: 40,
      ease: BOUNCE_L,
      origin: "12% 95%",
      off: { opacity: 0, transform: "translateY(10px) rotate(-22deg) scale(0.55)" },
      on: { opacity: 1, transform: "translateY(0) rotate(0deg) scale(1)" },
    },
  },
  {
    key: "sotto",
    label: "案5  そっと（弱めに跳ねる）",
    note: "跳ねを控えめにして、ゆっくり出る。落ち着いた「ぼーっ」の世界に馴染む",
    brow: { duration: 340, ease: BOUNCE_S },
    text: {
      duration: 720,
      delay: 90,
      ease: BOUNCE_S,
      origin: "50% 100%",
      off: { opacity: 0, transform: "translateY(10px) scale(0.86)" },
      on: { opacity: 1, transform: "translateY(0) scale(1)" },
    },
  },
];

export const DEFAULT_TAMARANEE = TAMARANEE_PATTERNS[0];

export function findTamaranee(key?: string | number | null): TamaraneePattern {
  if (key == null) return DEFAULT_TAMARANEE;
  const byIndex = TAMARANEE_PATTERNS[Number(key) - 1];
  return byIndex ?? TAMARANEE_PATTERNS.find((p) => p.key === key) ?? DEFAULT_TAMARANEE;
}
