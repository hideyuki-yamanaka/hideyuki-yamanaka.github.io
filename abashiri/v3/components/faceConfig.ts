/*
 * 人物イラスト（たまんねーっ）の眉がマウスに反応する時のパラメーター
 * /mock/brow の調整パネルから触れる。
 *
 * 単位はカンプ（1512x982 ステージ）上の px ＝ 見た目そのままの px。
 */
export type FaceConfig = {
  /** カーソルが乗った時に眉が持ち上がる量(px) */
  browLift: number;
  /** 眉そのものの置き場所を横にずらす(px)。＋で右 */
  browX: number;
  /** 眉そのものの置き場所を縦にずらす(px)。＋で下 */
  browY: number;
  /** 反応する範囲をイラストの外にどれだけ広げるか(px) */
  hoverPad: number;
  /* ── 口元（ホバーで開いた口になる。カンプ 15410:21336） ── */
  /** 口の左上の横位置(px)。イラスト枠(162x226.8)の中の座標 */
  mouthX: number;
  /** 口の左上の縦位置(px) */
  mouthY: number;
  /** 口の幅(px)。高さは元の比率(9.95:11.15)のまま付いてくる */
  mouthW: number;
  /** 口の黒い線の太さ(px) */
  mouthStroke: number;
  /** 元の眉を隠す肌色パッチの太らせ量（illustMainPaths の単位。120で表示上約3px） */
  patchSpread: number;
};

/* ヒデさん調整値。
   持ち上げ量 12px → 6px（2026-08-20）→ 1px（2026-08-21 パネルで決定）。
   右下の調整パネルでその場で変えられる。 */
export const DEFAULT_FACE: FaceConfig = {
  browLift: 1,
  browX: 0,
  browY: 0,
  hoverPad: 0,
  /* カンプ 15410:21336 の実測値（2026-08-21 更新版。Vector 8 の形） */
  mouthX: 47.9,
  mouthY: 79,
  mouthW: 11.2,
  mouthStroke: 1.5,
  patchSpread: 120,
};

export function mergeFace(partial?: Partial<FaceConfig> | null): FaceConfig {
  return partial ? { ...DEFAULT_FACE, ...partial } : DEFAULT_FACE;
}

export const FACE_STORAGE_KEY = "abashiri-face";
