"use client";

/*
 * 調整パネル共通シェル
 * - ヘッダーをドラッグして好きな位置に移動できる
 * - 右下の「◢」をドラッグしてサイズを変えられる（中身が長い時はスクロール）
 * - 「たたむ/ひらく」で折りたためる
 * - 隠しモード（2026-08-21 ヒデさん指示）：最初は見えない。
 *   画面右上の透明ボックス（64px）をクリックすると出る/隠れる。
 *   出した状態は同じタブの間だけ覚える（調整中のリロードで消えない）
 * 今後の調整パネルは必ずこれで作る（ヒデさんルール）
 */
import { useRef, useState } from "react";

const SECRET_KEY = "tp-secret-react";

export default function TunePanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SECRET_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleShown = () => {
    setShown((s) => {
      try {
        sessionStorage.setItem(SECRET_KEY, s ? "0" : "1");
      } catch {}
      return !s;
    });
  };
  const [open, setOpen] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number | null }>({
    w: 300,
    h: null,
  });

  const startDrag = (e: React.PointerEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    const off = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const move = (ev: PointerEvent) =>
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - rect.width, ev.clientX - off.x)),
        y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - off.y)),
      });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = panel.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const w0 = rect.width;
    const h0 = rect.height;
    /* 右上基準(right指定)のままだと広げた時に左に伸びて戸惑うので、位置を固定してから広げる */
    if (!pos) setPos({ x: rect.left, y: rect.top });
    const move = (ev: PointerEvent) =>
      setSize({
        w: Math.max(240, Math.min(600, w0 + ev.clientX - sx)),
        h: Math.max(180, Math.min(window.innerHeight - 24, h0 + ev.clientY - sy)),
      });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <>
      {/* 隠しスイッチ：画面右上の透明ボックス。見た目は何もないがクリックでパネルが出る */}
      <div
        onClick={toggleShown}
        className="fixed right-0 top-0 z-[81] h-16 w-16"
        aria-hidden
      />
      {shown && (
    <div
      ref={panelRef}
      className="fixed z-[80]"
      style={{
        width: size.w,
        ...(pos ? { left: pos.x, top: pos.y } : { right: 12, top: 12 }),
      }}
    >
      <div className="relative rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
        <div
          className="mb-1 flex cursor-move select-none items-center justify-between"
          onPointerDown={startDrag}
          title="ドラッグで移動"
        >
          <p className="text-[14px] font-black text-[#0070c9]">{title}</p>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpen((o) => !o)}
            className="cursor-pointer rounded-full bg-[#e6f3ff] px-2 py-0.5 text-[11px] font-bold text-[#0070c9]"
          >
            {open ? "たたむ" : "ひらく"}
          </button>
        </div>
        {open && (
          <div
            className="overflow-y-auto pr-1"
            style={size.h ? { maxHeight: size.h - 64 } : undefined}
          >
            {children}
          </div>
        )}
        {open && (
          <div
            onPointerDown={startResize}
            title="ドラッグでサイズ変更"
            className="absolute bottom-1 right-1 flex h-5 w-5 cursor-nwse-resize items-end justify-end text-[#9db9d1]"
          >
            <svg viewBox="0 0 10 10" className="h-3 w-3" fill="currentColor">
              <path d="M9 1v8H1l2-2h4V3l2-2Z" opacity="0.7" />
            </svg>
          </div>
        )}
      </div>
    </div>
      )}
    </>
  );
}
