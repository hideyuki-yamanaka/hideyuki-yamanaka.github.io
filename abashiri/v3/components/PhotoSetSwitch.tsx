"use client";

/*
 * 写真の「新しい（調整済み）／前の」切り替え（2026-10-20）
 *
 * 【ヒデさん】「調整した画像があるので、これを差し替えてデフォルトにしてほしい。
 *   調整パネル上では前の画像にも戻れるようにしてほしい」
 *   →「キービジュアルの画像をフッターの方でも。関連する下層ページも同じく差し替え」
 *   →「詳しいページの能取岬の写真は、灯台が見えている方に」
 * - 新しい写真は今までと同じファイル名に入れた（＝どのページも何も書き換えずに新しい写真になる）。
 *   前の写真は、同じ場所に「-prev」を付けて控えてある（例：bg-hero.jpg → bg-hero-prev.jpg）
 * - 調整パネル › サイト共通 › バリエーション › 写真 で「前の写真」を選ぶと、トップのパネルが <html data-photo-set="prev"> を立て、
 *   この部品がページの中の該当する <img> を前の写真へ差し替える（ページを移っても・後から出た写真も見張って差し替える）。
 *   パネルの無いページ（詳しいページなど）は、パネルの保存値を読んで同じにする
 * - どちらかに決まったら、この部品ごと外せる（新しい写真なら -prev のファイルと一緒に消すだけ）
 */
import { useEffect } from "react";
import { TOP_TUNE_KEY, TOP_TUNE_VERSION } from "./tuneKeys";

/** 差し替えた写真（今の名前＝新しい写真 → 前の写真の控え）。差し替える写真が増えたらここに1行足す */
export const PHOTO_SWAPS: Record<string, string> = {
  "/img/bg-hero.jpg": "/img/bg-hero-prev.jpg", /* キービジュアル・フッター・メニューの背景 */
  "/img/spot-notoro.webp": "/img/spot-notoro-prev.webp", /* 能取岬（トップ・詳しいページの大きい写真） */
  "/img/spot/notoro-1.webp": "/img/spot/notoro-1-prev.webp", /* 能取岬の詳しいページの写真1枚目（前は海と崖・今は灯台） */
  "/img/spot-sangoso.webp": "/img/spot-sangoso-prev.webp", /* サンゴ草 */
  "/img/spot-ryuhyo.webp": "/img/spot-ryuhyo-prev.webp", /* 流氷 */
  "/img/spot/himawari-1.webp": "/img/spot/himawari-1-prev.webp", /* ひまわり（トップ・詳しいページ・体験ページ） */
};
const REVERSE: Record<string, string> = Object.fromEntries(Object.entries(PHOTO_SWAPS).map(([a, b]) => [b, a]));

/** 1: 新しい写真（既定）／0: 前の写真 */
export const PHOTO_SET_DEFAULT = 1;

const pathOf = (src: string) => {
  try {
    return new URL(src, location.href).pathname;
  } catch {
    return src;
  }
};

export default function PhotoSetSwitch() {
  useEffect(() => {
    const read = (): number => {
      const ds = document.documentElement.dataset.photoSet;
      if (ds === "prev") return 0;
      if (ds === "new") return 1;
      try {
        const saved = JSON.parse(localStorage.getItem(`tp:${TOP_TUNE_KEY}:v${TOP_TUNE_VERSION}`) || "null");
        const v = saved?.photos?.set;
        return typeof v === "number" ? v : PHOTO_SET_DEFAULT;
      } catch {
        return PHOTO_SET_DEFAULT;
      }
    };
    const apply = () => {
      const usePrev = read() === 0;
      document.querySelectorAll<HTMLImageElement>("img[src]").forEach((img) => {
        const p = pathOf(img.getAttribute("src") || "");
        const to = usePrev ? PHOTO_SWAPS[p] : REVERSE[p];
        if (to) img.setAttribute("src", to);
      });
    };
    apply();
    /* パネルの切り替え（html の印）と、ページ移動・後から出た写真の両方を見張る */
    const htmlObs = new MutationObserver(apply);
    htmlObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-photo-set"] });
    let raf = 0;
    const bodyObs = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    });
    bodyObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => {
      htmlObs.disconnect();
      bodyObs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
