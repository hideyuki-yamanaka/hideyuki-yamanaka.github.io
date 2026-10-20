"use client";

/*
 * 図形のファイル（SVG）を、img ではなく図形のままページに描く部品（2026-10-20 画質）
 *
 * 【ヒデさん】「網走市観光サイトみたいなところもボケてるような感じがある」
 *   → img で置いた SVG は、いったん「絵（ビットマップ）」に焼いてから貼り付けられる。
 *     作字の文字は 215.7px のような半端な位置・元より少し縮めた大きさで置いてあり、
 *     さらに PC は紙ごと拡大縮小しているので、焼いた絵を少しずらして・伸び縮みさせて貼ることになり、細い線がにじむ。
 *     図形のまま描けば、最後の位置と大きさで線を描くので、にじまない。
 *   実測（Retina・同じ場所と大きさ）：縁の強さ img 178 → 図形のまま 196（+10%）。ふつうの画面 175 → 202（+15%）
 *
 * 使い方：<InlineSvg src="/img/xxx.svg" label="読み上げ用の名前" className="absolute ..." style={...} />
 *   fit="box"（既定）… 箱の幅と高さいっぱいに（縦横比は保って中央・img と同じ）
 *   fit="width"      … 幅だけ決めて、高さは図形の縦横比から（img の height:auto と同じ）
 * 同じファイルを何か所で使っても、読み込みは1回（中身を覚えておく）
 */
import { useEffect, useRef } from "react";

const cache = new Map<string, Promise<string>>();
const load = (src: string) => {
  let p = cache.get(src);
  if (!p) {
    p = fetch(src).then((r) => (r.ok ? r.text() : ""));
    cache.set(src, p);
  }
  return p;
};

export default function InlineSvg({
  src,
  label,
  className = "",
  style,
  fit = "box",
}: {
  src: string;
  /** 読み上げ用の名前（img の alt にあたる）。飾りなら空 */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  fit?: "box" | "width";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let alive = true;
    load(src).then((text) => {
      const host = ref.current;
      if (!alive || !host || !text) return;
      host.innerHTML = text;
      const svg = host.querySelector("svg");
      if (!svg) return;
      svg.setAttribute("width", "100%");
      if (fit === "box") svg.setAttribute("height", "100%");
      else svg.removeAttribute("height");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.style.display = "block";
    });
    return () => {
      alive = false;
    };
  }, [src, fit]);
  return (
    <span
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={`block ${className}`}
      style={style}
    />
  );
}
