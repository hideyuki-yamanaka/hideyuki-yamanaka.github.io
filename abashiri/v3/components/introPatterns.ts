/* 出現（ロード時）アニメーションのパターン定義
   ヘッダーがブラーで登場 → キービジュアルがブラーで登場 */
export type IntroPattern = {
  name: string;
  headerDur: number;
  headerBlur: number;
  headerY: number;
  heroDelay: number;
  heroDur: number;
  heroBlur: number;
  heroY: number;
  heroScale: number;
  ease: [number, number, number, number];
};

export const INTRO_PATTERNS: Record<number, IntroPattern> = {
  1: {
    name: "スタンダード（ほどよいブラー・順送り）",
    headerDur: 0.7, headerBlur: 10, headerY: 0,
    heroDelay: 0.45, heroDur: 1.0, heroBlur: 12, heroY: 20, heroScale: 1,
    ease: [0.22, 1, 0.36, 1],
  },
  2: {
    name: "じんわり深め（強いブラーがゆっくり晴れる）",
    headerDur: 1.3, headerBlur: 22, headerY: 0,
    heroDelay: 0.8, heroDur: 1.8, heroBlur: 22, heroY: 0, heroScale: 1,
    ease: [0.22, 1, 0.36, 1],
  },
  3: {
    name: "テンポよく（軽いブラーで小気味よく）",
    headerDur: 0.4, headerBlur: 6, headerY: -8,
    heroDelay: 0.22, heroDur: 0.55, heroBlur: 8, heroY: 26, heroScale: 1,
    ease: [0.25, 0.9, 0.3, 1],
  },
  4: {
    name: "霧が晴れる（少し大きい状態からピントが合う）",
    headerDur: 0.8, headerBlur: 14, headerY: 0,
    heroDelay: 0.5, heroDur: 1.4, heroBlur: 18, heroY: 0, heroScale: 1.07,
    ease: [0.16, 1, 0.3, 1],
  },
  5: {
    name: "下からふわり（浮き上がりながらピントが合う）",
    headerDur: 0.85, headerBlur: 12, headerY: -10,
    heroDelay: 0.6, heroDur: 1.2, heroBlur: 14, heroY: 48, heroScale: 0.98,
    ease: [0.34, 1.2, 0.4, 1],
  },
};
