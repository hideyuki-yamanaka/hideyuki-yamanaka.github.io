"use client";

/*
 * 流れ続ける帯（グルメのカルーセル・体験セクションの流れる文字）の速さを「1秒に何px」でそろえる。
 *
 * 【2026-10-29 ヒデさん「グルメセクションのカルーセルスライダーと、下の体験セクションのテキストのカルーセルスライダーの
 *   速度を揃えられるといいですね。PC、SPそれぞれ」】
 *   前は帯ごとに「1周の秒数」で決めていたので、帯の長さ（カードの枚数・文字の長さ）が違うと見た目の速さがばらばらだった。
 *   実測（1秒に動く量）：PC グルメ 60px・文字 22px／スマホ グルメ 34.5px・文字 5.7px
 *   → 速さはここの1か所（px/秒）で決め、帯の長さを測って1周の秒数を出す。
 *     帯は「同じ並びを2つ並べて、半分（-50%）動かしたら先頭へ戻す」作りなので、半分の長さ ÷ 速さ ＝ 1周の秒数。
 *     文字の大きさやカードの枚数を変えても、速さはそろったまま。
 *   値は今のグルメの速さ（PC 1周40秒・スマホ 1周28秒＝ヒデさんが決めた速さ）に合わせた🟡
 */
import { useEffect, useState, type RefObject } from "react";

export const MARQUEE_PXS = {
  /** PC（1512×982 の紙の上の px。画面に合わせて縮むのは紙ごと） */
  pc: 60,
  /** スマホ用の組みの、タブレット（744px 以上。カードが大きい）。前のグルメの速さ 49.7px/秒 */
  tab: 50,
  /** スマホ（744px 未満） */
  sp: 34.5,
} as const;

/** スマホ用の組みで使う速さ（744px 以上ならタブレットの値）。tab: と同じ境目 */
export function useMobileMarqueePxs() {
  const [pxs, setPxs] = useState<number>(MARQUEE_PXS.sp);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 744px)");
    const apply = () => setPxs(mq.matches ? MARQUEE_PXS.tab : MARQUEE_PXS.sp);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return pxs;
}

/** 帯（2つ並べて -50% 動かす要素）の1周の秒数を、速さ pxs（px/秒）になるように決める。
    帯の長さが変わったら（文字の読み込み・大きさのつまみ・画面の幅）測り直す */
export function useMarqueePace(ref: RefObject<HTMLElement | null>, pxs: number) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const half = el.offsetWidth / 2;
      if (half > 0) el.style.animationDuration = `${(half / pxs).toFixed(2)}s`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, pxs]);
}
