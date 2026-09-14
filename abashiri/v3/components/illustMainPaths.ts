/*
 * 人物イラストの眉毛のベクターデータ。
 *
 * イラスト本体は public/img/illust-main.png をそのまま使う（元絵の質感を落とさないため）。
 * 動かしたいのは眉毛だけなので、眉の形だけ potrace でトレースして切り出してある。
 * 生成スクリプトは scripts/illust-brow-trace.py。手で書き換えないこと。
 *
 * 座標系: 元PNGと同じ 648x1067。FLIP を掛けた内側で使う（potrace のY反転ぶん）。
 *
 * 重ね方（下 → 上）:
 *   illust-main.png → 元の眉を隠す肌色パッチ（動かない） → 動く眉
 * パッチは眉と同じ形を少し太らせたもの。眉が上がった時に、元の眉の跡が残らない。
 */

/** potrace 出力（10倍・Y反転）を元PNGの座標系に戻す変換 */
export const ILLUST_FLIP = "translate(0,1067) scale(0.1,-0.1)";

export const ILLUST_VIEWBOX = { w: 648, h: 1067 } as const;

/** 眉の色（元絵の眉の平均色） */
export const BROW_FILL = "#12100E";

/** 元の眉を隠すパッチの色（眉のすぐ上の額の色） */
export const SKIN_FILL = "#FEDFCA";

/**
 * パッチをどれだけ太らせるか。ILLUST_FLIP の中の単位なので、
 * 画面上では ×0.1 ×(表示幅/648) になる。
 * 120 ＝ 元画像で約12px、本番表示(162px幅)で約3.0px ぶん。
 */
export const PATCH_SPREAD = 120;

export const BROW_D = {
  left: [
    "M1940 8646 c0 -72 343 -288 375 -236 11 18 -15 40 -100 80 -51 24 -112 65 -163 109 -87 76 -112 86 -112 47z",
  ],
  right: [
    "M3390 8323 c-51 -15 -243 -19 -425 -10 -40 2 -50 -1 -53 -15 -6 -30 43 -40 223 -45 234 -8 365 17 365 69 0 22 -32 22 -110 1z",
  ],
} as const;

/** 左右まとめた眉のパス */
export const BROW_ALL: readonly string[] = [...BROW_D.left, ...BROW_D.right];
