/*
 * ぼーっと体験ページのガラスのボタン（「次へ進む」「この場所にする」）の見た目
 *
 * 【2026-10-28 ヒデさん】「このボタン（次へ進む）のスタイリングを細かく変えられるような調整パネルを。線の太さ、背景ブラー、塗りの透過率など」
 *   → 塗りの不透明度・線の太さ・線の不透明度・背景のブラーを CSS 変数で持ち、調整パネルから変える
 *     （調整パネル › サイト共通 › エフェクト＆テクスチャ › ガラスのボタン（ぼーっと体験の 次へ進む・この場所にする）。
 *      最初は ぼーっと体験ページ のタブに置いたが、同日ヒデさん「サイト共通に入れて大丈夫です」で移した）。
 *     同じ作りのボタン2つ（次へ進む・この場所にする）が一緒に変わる。PC とスマホは別の値（-pc／-sp）
 *   既定は今までの見た目のまま：PC＝塗り 白10%・線 1px 白40%・ブラー 65px（キービジュアルの「ぼーっとしてみる」と同じ）
 *                              スマホ＝塗り 白10%・線 1px 白45%・ブラー 16px
 *   値の住み家：ここ（var の予備の値）／globals.css の --exp-btn-*／TopTunePanel の DEFAULTS（expBtn・スマホは spDefault）
 */
import type { CSSProperties } from "react";

export function expGlassStyle(sfx: "pc" | "sp"): CSSProperties {
  const d = sfx === "pc" ? { fill: 10, w: 1, a: 40, blur: 65 } : { fill: 10, w: 1, a: 45, blur: 16 };
  const blur = `blur(calc(var(--exp-btn-blur-${sfx}, ${d.blur}) * 1px))`;
  return {
    backgroundColor: `rgb(255 255 255 / calc(var(--exp-btn-fill-${sfx}, ${d.fill}) * 1%))`,
    boxShadow: `inset 0 0 0 calc(var(--exp-btn-line-w-${sfx}, ${d.w}) * 1px) rgb(255 255 255 / calc(var(--exp-btn-line-a-${sfx}, ${d.a}) * 1%))`,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
  };
}
