"use client";

/*
 * 体験セクション 案2（カードを切る）の送りボタン：束の下に丸いボタンを2つ並べる
 *
 * 【2026-10-14 ヒデさん指示】
 *   「左右のボタンは文字のカルーセルスライドショーに被るのでやめたいです。5バリエーションぐらい
 *     カルーセルの左右ボタンのアイデアをください。丸くボタンになってない形でもいいと思います。
 *     位置を変えてもいいと思います」
 *   → 束の左右（上下の真ん中）に置いていた丸いボタンは、後ろを流れる「意外とオモロい、網走。」の
 *     帯とちょうど同じ高さだった。帯から離れた「束の下」に置く5案を作り、調整パネルで見比べてもらった
 *     （番号と矢印／番号のタブ／カーソルが矢印に／丸いボタンを下に／細い線の矢印）
 *   → 同日「案4が良さそうですね。これで実装してデプロイ」＝案4 丸いボタンを下に に決定
 *   → 同日「消して案4だけにする」＝ほかの4案と、調整パネルの「送りボタン」の行は消した
 *     （戻す時は git の記録 e4050933「送りボタンを束の下へ（5案から選べる…）」に5案ぶんの作りがある）
 *
 * 部品は場所えらびと同じ丸いボタン（CarouselArrow・白い地用の色）。PC は md（68px）・スマホは sm（48px）
 * 置き場所（束の下・束の幅の箱の真ん中）は使う側（EventVariants4 の MarqueeStack／MobileEvents の StackScene）が決める
 *
 * 🟡仮置き（カンプが無いので Claude が決めた所）：
 *   ・置き場所：束のいちばん下の角から 32px 下（PC・スマホとも）
 *   ・2つのボタンの間：16px
 */
import CarouselArrow from "./CarouselArrow";

export function EvNav({
  onStep,
  sp = false,
}: {
  /** 1枚送る（1）／戻す（-1） */
  onStep: (dir: 1 | -1) => void;
  /** スマホの大きさ（48px） */
  sp?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <CarouselArrow dir="left" label="前の体験へ" tone="onLight" size={sp ? "sm" : "md"} onClick={() => onStep(-1)} />
      <CarouselArrow dir="right" label="次の体験へ" tone="onLight" size={sp ? "sm" : "md"} onClick={() => onStep(1)} />
    </div>
  );
}
