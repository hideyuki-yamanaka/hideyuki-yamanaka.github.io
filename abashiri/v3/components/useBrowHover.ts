"use client";

/*
 * 人物イラストにカーソル（指）が乗っているかを返す hook。
 *
 * イラストは pointer-events-none（クリックがすり抜ける）のままにしたいので、
 * CSS の :hover は使えない。使うと後ろのキービジュアルのボタンを
 * イラストが覆ってしまう。なので window でカーソルを監視して、
 * イラストの矩形に入ったかどうかを自前で判定している。
 *
 * スマホは指で触っている間だけ true になる（離すと false）。
 * prefers-reduced-motion の時はずっと false のまま。
 */
import { useEffect, useRef, useState } from "react";

export function useBrowHover(
  ref: React.RefObject<HTMLElement | null>,
  /** 反応する範囲をイラストの外に広げる量(px) */
  hoverPad = 0,
): boolean {
  const [over, setOver] = useState(false);
  /* 値が変わるたびにリスナーを付け直さなくていいように ref で持つ */
  const pad = useRef(hoverPad);
  pad.current = hoverPad;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let pending: { x: number; y: number } | null = null;
    let touching = false;

    const flush = () => {
      raf = 0;
      const el = ref.current;
      const r = el?.getBoundingClientRect();
      let next = false;
      if (pending && r?.width) {
        const p = pad.current;
        next =
          pending.x >= r.left - p && pending.x <= r.right + p &&
          pending.y >= r.top - p && pending.y <= r.bottom + p;
      }
      setOver((prev) => (prev === next ? prev : next));
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
    /* カーソルがウィンドウの外に出たら戻す */
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

  return over;
}
