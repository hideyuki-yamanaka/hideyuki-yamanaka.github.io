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
 */
export function useIsMobile(query = "(max-width: 900px)") {
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
