"use client";

/*
 * 人物イラストの眉をマウス（指）に反応させるための hook。
 *
 * イラストは pointer-events-none（クリックがすり抜ける）のままにしたいので、
 * CSS の :hover は使えない。使うと後ろのキービジュアルのボタンを
 * イラストが覆ってしまう。なので window でカーソルを監視して、
 * イラストの矩形に入ったかどうかを自前で判定している。
 *
 * - PC : カーソルがイラストに乗っている間だけ眉が持ち上がる
 * - スマホ: 指で触っている間だけ持ち上がる（離すと戻る）
 * - prefers-reduced-motion では動かさない
 */
import { useEffect, useRef, useState } from "react";
import type { FaceConfig } from "./faceConfig";

export function useFaceReaction(
  ref: React.RefObject<HTMLElement | null>,
  config: FaceConfig,
): number {
  /** 眉の持ち上げ量（画面px）。0 で元の位置 */
  const [lift, setLift] = useState(0);
  /* 設定が変わるたびにリスナーを付け直さなくていいように ref で持つ */
  const cfg = useRef(config);
  cfg.current = config;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let pending: { x: number; y: number } | null = null;
    let touching = false;

    const isOver = (x: number, y: number) => {
      const el = ref.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const p = cfg.current.hoverPad;
      return x >= r.left - p && x <= r.right + p && y >= r.top - p && y <= r.bottom + p;
    };

    const flush = () => {
      raf = 0;
      const next =
        pending && isOver(pending.x, pending.y) ? cfg.current.browLift : 0;
      setLift((prev) => (prev === next ? prev : next));
    };
    const queue = (pt: { x: number; y: number } | null) => {
      pending = pt;
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || touching) queue({ x: e.clientX, y: e.clientY });
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      touching = true;
      queue({ x: e.clientX, y: e.clientY });
    };
    const onUp = () => {
      touching = false;
      queue(null);
    };
    /* カーソルがウィンドウの外に出たら休める */
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) queue(null);
    };

    const opt = { passive: true } as const;
    window.addEventListener("pointermove", onMove, opt);
    window.addEventListener("pointerdown", onDown, opt);
    window.addEventListener("pointerup", onUp, opt);
    window.addEventListener("pointercancel", onUp, opt);
    document.addEventListener("pointerout", onOut, opt);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerout", onOut);
    };
  }, [ref]);

  return lift;
}
