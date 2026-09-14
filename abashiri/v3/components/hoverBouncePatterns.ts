/*
 * カーソルを人物イラストに乗せた時の「縦バウンス」5案（2026-08-21 ヒデさん依頼）。
 * 表情の変化（眉・口・たまらねー・キラキラ）と同時に、からだが縦に弾む。
 *
 * ホバーのたびに1回だけ再生する（Web Animations API）。
 * スイングや登場アニメとは別のラッパーに掛けるので、互いに干渉しない。
 */
export type HoverBouncePattern = {
  key: string;
  label: string;
  note: string;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

export const HOVER_BOUNCE_PATTERNS: HoverBouncePattern[] = [
  {
    key: "pyoko",
    label: "案1  ぴょこっ",
    note: "ひとつだけ素直に弾む。いちばん控えめ",
    keyframes: [
      { transform: "translateY(0)" },
      { transform: "translateY(-14px)", offset: 0.4 },
      { transform: "translateY(3px)", offset: 0.75 },
      { transform: "translateY(0)" },
    ],
    options: { duration: 450, easing: "ease-out" },
  },
  {
    key: "nido",
    label: "案2  ぴょこぴょこ（2度）",
    note: "大→小と2回弾む。うれしそうな感じ",
    keyframes: [
      { transform: "translateY(0)" },
      { transform: "translateY(-16px)", offset: 0.28 },
      { transform: "translateY(0)", offset: 0.52 },
      { transform: "translateY(-7px)", offset: 0.72 },
      { transform: "translateY(0)" },
    ],
    options: { duration: 620, easing: "ease-in-out" },
  },
  {
    key: "purun",
    label: "案3  プルン（ゼリー）",
    note: "跳ねて、着地でからだが少しつぶれて戻る。かわいさ重視",
    keyframes: [
      { transform: "translateY(0) scale(1, 1)" },
      { transform: "translateY(-10px) scale(0.97, 1.04)", offset: 0.35 },
      { transform: "translateY(0) scale(1.05, 0.94)", offset: 0.6 },
      { transform: "translateY(0) scale(0.99, 1.02)", offset: 0.8 },
      { transform: "translateY(0) scale(1, 1)" },
    ],
    options: { duration: 550, easing: "ease-out" },
  },
  {
    key: "hop",
    label: "案4  ちょんちょん（小刻み）",
    note: "小さく素早く2回。反応のよさ・軽さ重視",
    keyframes: [
      { transform: "translateY(0)" },
      { transform: "translateY(-6px)", offset: 0.25 },
      { transform: "translateY(0)", offset: 0.5 },
      { transform: "translateY(-3px)", offset: 0.72 },
      { transform: "translateY(0)" },
    ],
    options: { duration: 350, easing: "ease-in-out" },
  },
  {
    key: "jump",
    label: "案5  大きくジャンプ",
    note: "高く跳んで、弾んで収まる。いちばんリアクション大きめ",
    keyframes: [
      { transform: "translateY(0) rotate(0deg)" },
      { transform: "translateY(-24px) rotate(-2deg)", offset: 0.32 },
      { transform: "translateY(4px) rotate(1deg)", offset: 0.62 },
      { transform: "translateY(-8px) rotate(-0.5deg)", offset: 0.8 },
      { transform: "translateY(0) rotate(0deg)" },
    ],
    options: { duration: 700, easing: "ease-in-out" },
  },
];

/** 0/null = バウンスなし。1〜5 = 案番号 */
export function findHoverBounce(
  n?: number | null
): HoverBouncePattern | null {
  if (!n) return null;
  return HOVER_BOUNCE_PATTERNS[Number(n) - 1] ?? null;
}
