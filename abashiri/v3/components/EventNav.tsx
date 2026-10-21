"use client";

/*
 * 体験セクション 案2（カードを切る）の送りボタン：束の下に丸いボタンを2つ並べる
 *
 * 【2026-10-14 ヒデさん指示】
 *   「左右のボタンは文字のカルーセルスライドショーに被るのでやめたいです。5バリエーションぐらい
 *     カルーセルの左右ボタンのアイデアをください。丸くボタンになってない形でもいいと思います。
 *     位置を変えてもいいと思います」
 *   → 束の左右（上下の真ん中）に置いていた丸いボタンは、後ろを流れる「意外とオモロい、網走。」の
 *     帯とちょうど同じ高さだった。帯から離れた「束の下」に置く5案を作り、同日「案4 丸いボタンを下に」に決定
 *     （git の記録 e4050933 に5案ぶんの作りがある）
 *
 * 【2026-10-21 ヒデさん指示】形の見比べ（現行＋10案。白い丸／白いすりガラス／白いピル／進み具合の線／番号と矢印／
 *   ガラス5案：うす水色／空色／空のグラデ／青いふち／青い影）→ 同日「ボタンは9番でいきましょう。青い枠線で、シェブロンも青のやつ。
 *   それ以外の案は、調整パネルからも全部削除して大丈夫です」＝案9 青いふちのガラス に決定。ほかの案と調整パネルの「送りボタン」の行は消した
 *   （戻す時は git の記録に10案ぶんの作りがある：この日の Auto-save のどれか）
 *
 * 部品は場所えらびと同じ丸いボタン（CarouselArrow・白い地用の色＝青いふちのガラス）。PC は nav（56px）・スマホは nav-sm（44px）🟡
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
  /** スマホの大きさ（44px） */
  sp?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <CarouselArrow dir="left" label="前の体験へ" tone="onLight" size={sp ? "nav-sm" : "nav"} onClick={() => onStep(-1)} />
      <CarouselArrow dir="right" label="次の体験へ" tone="onLight" size={sp ? "nav-sm" : "nav"} onClick={() => onStep(1)} />
    </div>
  );
}
