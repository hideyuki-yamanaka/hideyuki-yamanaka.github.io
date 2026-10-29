"use client";

/*
 * 慣性スクロール（サイト共通）
 *
 * 【2026-10-29 ヒデさん「慣性スクロールの値も調整パネルでいじれるように。サイト全体、サイト共通で」】
 * ホイール・トラックパッドで回した量を「目標の位置」に貯めて、今の位置がそこへ毎コマ少しずつ追いつく（すーっと止まる）。
 * 前はトップページだけにあり、追いかけの速さ（0.12）は TopPage の中に直接書いてあった。
 * 今はここで1つにまとめ、トップ・詳しいページ・一覧ページが同じ値を使う。
 *
 * 値（3つとも同じ値にそろえる＝住み家）：ここの INERTIA_DEFAULT／globals.css の --inertia-*／tune-defaults.json の inertia
 *   on    … 1＝慣性あり／0＝なし（ブラウザのふつうのスクロール）
 *   ease  … 追いかけの速さ（%）。1コマで残りの何%を詰めるか。大きいほどキビキビ、小さいほどゆったり長く滑る
 *   wheel … ホイールの量（%）。1回に回した量に掛ける倍率。大きいほど1回で遠くまで進む
 * 調整パネル › サイト共通 › アニメーション › 慣性スクロール（トップ・体験ページのパネル）が CSS 変数を書き換える。
 * パネルの無いページ（詳しいページ・一覧ページ）は、トップのパネルで保存した値（localStorage）→ CSS の既定 の順で読む。
 * スマホ・タブレットの指のスクロールには掛けない（ホイールだけ）。動きを減らす設定の人にも掛けない。
 */
import { useEffect } from "react";
import { TOP_TUNE_KEY, TOP_TUNE_VERSION } from "./tuneKeys";

export type InertiaTune = { on: number; ease: number; wheel: number };
export const INERTIA_DEFAULT: InertiaTune = { on: 1, ease: 12, wheel: 100 };

let cache: InertiaTune = INERTIA_DEFAULT;
let cachedAt = -1e9;

/** 今の値（0.5秒ごとに読み直す。毎回読むとスタイルの計算が走って重くなるため） */
export function readInertia(): InertiaTune {
  const now = performance.now();
  if (now - cachedAt < 500) return cache;
  cachedAt = now;
  const cs = getComputedStyle(document.documentElement);
  const css = (name: string, d: number) => {
    const x = parseFloat(cs.getPropertyValue(name));
    return isFinite(x) ? x : d;
  };
  let saved: Partial<InertiaTune> | undefined;
  try {
    saved = JSON.parse(localStorage.getItem(`tp:${TOP_TUNE_KEY}:v${TOP_TUNE_VERSION}`) || "null")?.inertia;
  } catch {}
  /* パネルのあるページでは CSS 変数がいちばん新しい（パネルが書く）。無いページは保存した値を使う */
  const panelLive = document.documentElement.dataset.inertiaLive === "1";
  const pick = (k: keyof InertiaTune, name: string) =>
    panelLive ? css(name, INERTIA_DEFAULT[k]) : typeof saved?.[k] === "number" ? (saved[k] as number) : css(name, INERTIA_DEFAULT[k]);
  cache = {
    on: pick("on", "--inertia-on"),
    ease: Math.max(1, Math.min(100, pick("ease", "--inertia-ease"))),
    wheel: Math.max(10, pick("wheel", "--inertia-wheel")),
  };
  return cache;
}

/** パネルで値を変えた時に、すぐ読み直させる */
export function refreshInertia() {
  cachedAt = -1e9;
}

/** ホイール1回の量を px に（行単位・ページ単位で来るブラウザもある） */
export function wheelPx(e: WheelEvent, el: HTMLElement) {
  return e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * el.clientHeight : e.deltaY;
}

/**
 * ふつうのスクロールの箱（詳しいページ・一覧ページの main）に慣性を付ける。
 * スクロールバーをつかむ・キーボード・目次のジャンプなどは今まで通り（その時は目標の位置を今の位置に合わせ直す）。
 */
export function useInertiaScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const sc = ref.current;
    if (!sc) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let target = sc.scrollTop;
    let pos = sc.scrollTop;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const { ease } = readInertia();
      const d = target - pos;
      if (Math.abs(d) > 0.5) {
        pos += d * (ease / 100);
        sc.scrollTop = Math.round(pos);
        raf = requestAnimationFrame(tick);
      } else {
        pos = target;
        sc.scrollTop = Math.round(target);
      }
    };
    /* 中で自分でスクロールする物（調整パネル・地図など）の上では、慣性を掛けない */
    const ownScroller = (t: EventTarget | null) => {
      let el = t instanceof Element ? t : null;
      while (el && el !== sc) {
        if (el.closest(".tp, iframe")) return true;
        const o = getComputedStyle(el).overflowY;
        if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
        el = el.parentElement;
      }
      return false;
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; /* つまんで拡大・横のジェスチャは任せる */
      const { on, wheel } = readInertia();
      if (!on) return;
      if (ownScroller(e.target)) return;
      e.preventDefault();
      if (!raf) {
        /* 止まっていた時は、今の位置から始める（スクロールバーやキーで動いた後でもずれない） */
        target = sc.scrollTop;
        pos = sc.scrollTop;
      }
      const max = sc.scrollHeight - sc.clientHeight;
      target = Math.max(0, Math.min(max, target + wheelPx(e, sc) * (wheel / 100)));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    sc.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      sc.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}
