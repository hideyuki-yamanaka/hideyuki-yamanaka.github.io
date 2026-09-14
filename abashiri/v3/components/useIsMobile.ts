"use client";

import { useEffect, useState } from "react";

/*
 * モバイル幅かどうか（既定 640px 以下）。
 * このサイトは 1512×982 の固定キャンバス（デスクトップ）で作られているので、
 * スマホでは別レイアウト（MobileTop 等）に切り替えるための判定に使う。
 * 2026-08-24 ヒデさん依頼「390px で美しく」より。
 */
export function useIsMobile(query = "(max-width: 640px)") {
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
