"use client";

/* スマホモード（実機ライブ同期）の「スマホ側」と、PC のスマホ枠の「中身側」の、網走だけの手当て。
 *
 * 【2026-09-27 調整パネルを共通部品 v2.0.0 に上げた（ヒデさん決定）】
 *   受け取り（中継サーバから保存値をもらって、書いて、読み直す）は、共通の
 *   phone-mode.client.js が受け持つようになった（つなぎは components/phoneMode.ts）。
 *   ここに残すのは、共通の仕組みに無い網走だけの3つ：
 *   ・?preview=1 / ?tp-preview=1 … PC のスマホ枠の中身。<html class="pp-inner"> を付ける
 *   ・PC が別のページを開いていたら、スマホも同じページへ移る（PATH_KEY）
 *   ・読み直しの前後でスクロール位置を保つ（網走はページではなく中の箱がスクロールするため、
 *     共通の仕組みの window.scrollY では戻らない）
 * ⚠️ 開発（localhost / 同じ Wi-Fi のアドレス）でだけ動く。本番では何もしない。
 */
import { useEffect } from "react";
import { PATH_KEY } from "./phoneMode";

const isDevHost = (h: string) =>
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
  h.endsWith(".local");

/* スクロールする箱（ページごとに違う） */
const scroller = () =>
  document.querySelector<HTMLElement>("[data-abashiri-scroller]") ||
  document.querySelector<HTMLElement>("main");

const SCROLL_KEY = "abashiri-live-scroll";

export default function LivePhone() {
  useEffect(() => {
    if (!isDevHost(location.hostname)) return;
    const q = new URLSearchParams(location.search);
    const root = document.documentElement;

    if (q.get("preview") === "1" || q.get("tp-preview") === "1") {
      root.classList.add("pp-inner");
      return;
    }
    if ((q.get("live") || "").toLowerCase() !== "phone") return;

    /* PC が別のページを開いていたら、そちらへ */
    try {
      const want = localStorage.getItem(PATH_KEY);
      if (want && want !== location.pathname) {
        sessionStorage.removeItem(SCROLL_KEY);
        location.replace(want + "?live=phone");
        return;
      }
    } catch {}

    /* 読み直す前のスクロール位置に戻す */
    try {
      const sv = sessionStorage.getItem(SCROLL_KEY);
      if (sv != null) {
        const y = +sv;
        setTimeout(() => {
          const el = scroller();
          if (el) el.scrollTop = y;
        }, 400);
      }
    } catch {}
    const save = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(scroller()?.scrollTop || 0));
      } catch {}
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);
  return null;
}
