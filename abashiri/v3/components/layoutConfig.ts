/*
 * ステージ内レイアウトの共通パラメーター
 * - tablet: 白モック（タブレット）の位置ずらし
 * - rail:   右側カラム（網走ロゴ・SNS・観光サイト）の位置
 * /mock/layout の調整パネルからいじれる。
 */
export type LayoutTune = {
  /** タブレットの横ずらし(px)。＋で右へ */
  tabletX: number;
  /** タブレットの縦ずらし(px)。−で上へ */
  tabletY: number;
  /** 右カラムの右端からの距離(px) */
  railX: number;
  /** 右カラムの上からの距離(px) */
  railY: number;
};

/* ヒデさん調整値（2026-08-13） */
export const DEFAULT_LAYOUT: LayoutTune = {
  tabletX: -30,
  tabletY: -40,
  railX: 60,
  railY: 80,
};

export function mergeLayout(partial?: Partial<LayoutTune> | null): LayoutTune {
  return { ...DEFAULT_LAYOUT, ...partial };
}

export const LAYOUT_STORAGE_KEY = "abashiri-layout";
