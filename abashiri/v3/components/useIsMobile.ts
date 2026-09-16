"use client";

import { useEffect, useState } from "react";

/*
 * 「縦長の画面用レイアウトに切り替えるか」の判定（既定 900px 以下）。
 * このサイトのトップは 1512×982 の固定キャンバスで、画面幅に合わせて
 * 縮小表示される。そのため幅が狭いほど文字も小さくなる。
 *   ・768px の縦向きタブレット … 縮小率 0.51 ＝ 本文が実質8px相当で読めない
 *   ・1024px の横向きタブレット … 縮小率 0.68 ＝ 実質11px でぎりぎり読める
 * そこで 900px 以下は、読みやすい縦長用レイアウト（MobileTop 等）に切り替える。
 * 2026-08-24「390px で美しく」／2026-09-16 タブレット確認で 640→900 に拡大。
 *
 * 【2026-09-17 追加】幅だけで決めると、縦長の大きいタブレットが取りこぼされる。
 * 固定キャンバスは「幅 1512・高さ 982」の【横長】なので、画面が縦長だと
 * 幅で縮小率が決まり、高さが大きく余る。実測（本文15pxが実際に何pxで出るか）:
 *   ・Surface Pro 縦 912x1368 … 縮小率 0.603 ＝ 9.0px。上下に 388px の空き帯
 *   ・iPad Pro 13 縦 1024x1366 … 縮小率 0.677 ＝ 10.2px。上下に 350px の空き帯
 *   （横向きは iPad mini 横 1133x744 の 11.2px が最小で、まだ読める）
 * そこで「縦長ならば 1280px まで」を条件に足し、縦長用レイアウトへ回す。
 */
export function useIsMobile(
  query = "(max-width: 900px), (max-width: 1280px) and (orientation: portrait)",
) {
  /* SSR/初回は false（デスクトップ）。クライアントで確定させる */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [query]);
  return isMobile;
}
