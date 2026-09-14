/*
 * キービジュアル → ぼーっとスポット の「入れ替わり」パラメーター
 *
 * ヒデさんの希望（2026-08-18）:
 *   スクロールしていくと
 *     ① 作字（な〜んにもない たまらない）が消えていく
 *     ② 背景の写真がブラーになる
 *     ③ その流れでスポットの写真もブラーで入ってきて、だんだん晴れてくる
 *     ④ ブラーが解けた段階で一回「固定ビュー」になる（ここでサムネイルを押して切り替えられる）
 *     ⑤ 固定が終わったら、また下へスクロールできる（次のセクション用の余地）
 *
 * すべて「スクロール量(px)」で並んでいるので、上から下に読むと時間の流れになる。
 * 数値は /mock/spot-tune の調整パネルで触って決められる（ヒデさんルール）。
 */
export type SpotTransition = {
  /* ── ① 作字 ───────────────────────────── */
  /** 作字とボタンが完全に消えきるまでのスクロール量(px) */
  kvOut: number;

  /* ── ② 背景写真（灯台のカット） ─────────── */
  /** 背景写真がボケ始める位置(px) */
  bgFrom: number;
  /** 背景写真のボケが最大になる位置(px) */
  bgTo: number;
  /** 背景写真の最大ブラー(px) */
  bgBlur: number;

  /* ── ③ スポット写真 ───────────────────── */
  /** スポット写真が出はじめる位置(px) */
  spotFrom: number;
  /** スポット写真のブラーが解けきる位置(px)。ここから固定ビューが始まる */
  spotTo: number;
  /** スポット写真の最初のブラー(px) */
  spotBlur: number;

  /* ── ④ 写真の切替と余韻 ─────────────────── */
  /** 1枚の写真から次の写真へ進むのに必要なスクロール量(px)。
   *  「1スクロールごとに切替」＝およそ1画面ぶん(982)が基準 */
  stepLen: number;
  /** 最後の写真が出そろってから、セクションを抜けるまでの余韻(px) */
  hold: number;
};

/* 仮置きの初期値（2026-08-18）。
   ⚠️ この4つの並び順（作字 → 背景 → スポット → 固定）だけが決まりごとで、
      具体的な px はカンプに書かれていないため仮。/mock/spot-tune で詰める */
export const DEFAULT_SPOT_TRANSITION: SpotTransition = {
  kvOut: 320,

  bgFrom: 120,
  bgTo: 420,
  bgBlur: 16,

  spotFrom: 260,
  spotTo: 620,
  spotBlur: 30,

  stepLen: 982,
  hold: 500,
};

export function mergeSpotTransition(
  partial?: Partial<SpotTransition> | null
): SpotTransition {
  return { ...DEFAULT_SPOT_TRANSITION, ...partial };
}

/** 総スクロール量(px)。ブラーが解けるまで ＋ (枚数-1)回の切替 ＋ 余韻 */
export function totalScroll(t: SpotTransition, photoCount = 1): number {
  return t.spotTo + t.stepLen * Math.max(0, photoCount - 1) + t.hold;
}

export const SPOT_TRANSITION_STORAGE_KEY = "abashiri-spot-transition";
