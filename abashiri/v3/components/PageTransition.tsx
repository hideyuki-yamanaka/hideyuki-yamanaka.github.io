"use client";

/*
 * ページ遷移の演出（V3.0・2026-09-16 ヒデさん依頼）
 *
 * サイトの雰囲気（ぼーっと・ブラーで溶ける）に合わせて、ブラー主体の5案を用意した。
 * 右下の調整パネルから選べる。既定は案1。
 *
 * 仕組み
 *   ・next/navigation の pathname が変わったら、幕（オーバーレイ）を一度かぶせて外す
 *   ・幕は position:fixed で画面全体。中身に触れないよう pointer-events-none
 *   ・ブラーは backdrop-filter（後ろの画面をぼかす）。
 *     ⚠️ backdrop-filter の値を毎フレーム変えると非常に重い（TopPage で実測済み）。
 *     なので「ブラー量は固定して、幕の不透明度だけを動かす」作りにしてある
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export const PAGE_TRANSITION_EVENT = "abashiri:page-transition";

export type PageTransitionPattern = {
  name: string;
  note: string;
  /** 幕が出てから消えるまでの合計(ms) */
  dur: number;
  /** 固定のブラー量(px)。0ならブラー無し */
  blur: number;
  /** 幕の色（空グラデ / 白 / 黒のうすい膜） */
  veil: string;
  /** 幕自体の動き方 */
  motion: "fade" | "rise" | "zoom" | "wipe";
};

export const PAGE_TRANSITION_PATTERNS: Record<number, PageTransitionPattern> = {
  1: {
    name: "案1",
    note: "溶ける（既定）。空の色の膜がブラーごとふわっと覆って、すっと引く",
    dur: 900,
    blur: 20,
    veil: "bg-gradient-to-b from-brand/85 via-brand/70 to-sky-bottom/85",
    motion: "fade",
  },
  2: {
    name: "案2",
    note: "白くかすむ。白い霧がかかって晴れる。いちばん静かで軽い",
    dur: 800,
    blur: 16,
    veil: "bg-white/75",
    motion: "fade",
  },
  3: {
    name: "案3",
    note: "下から霧。空色の膜が下からせり上がってきて、上へ抜けていく",
    dur: 1000,
    blur: 18,
    veil: "bg-gradient-to-t from-brand/90 to-brand/60",
    motion: "rise",
  },
  4: {
    name: "案4",
    note: "近づいてぼやける。膜がわずかに迫りながらブラーが深くなる",
    dur: 1100,
    blur: 26,
    veil: "bg-brand/70",
    motion: "zoom",
  },
  5: {
    name: "案5",
    note: "横に流れる。霧が左から右へ流れて、景色が入れ替わる",
    dur: 950,
    blur: 18,
    veil: "bg-gradient-to-r from-brand/85 via-brand/70 to-brand/85",
    motion: "wipe",
  },
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** 案ごとの「入り」と「抜け」 */
function variantsOf(p: PageTransitionPattern) {
  switch (p.motion) {
    case "rise":
      return {
        initial: { opacity: 0, y: "35%" },
        animate: { opacity: 1, y: "0%" },
        exit: { opacity: 0, y: "-35%" },
      };
    case "zoom":
      return {
        initial: { opacity: 0, scale: 1.08 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
      };
    case "wipe":
      return {
        initial: { opacity: 0, x: "-25%" },
        animate: { opacity: 1, x: "0%" },
        exit: { opacity: 0, x: "25%" },
      };
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
}

export default function PageTransition() {
  const pathname = usePathname();
  const [pat, setPat] = useState(1);
  const [show, setShow] = useState(false);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 焼き込み値を読む＋パネルからのライブ切替を受ける */
  useEffect(() => {
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.pageTrans?.pattern;
        if (typeof v === "number" && PAGE_TRANSITION_PATTERNS[v]) setPat(v);
      })
      .catch(() => {});
    const onTune = (e: Event) => {
      const detail = (e as CustomEvent<{ v: number; preview?: boolean }>).detail;
      if (typeof detail?.v === "number" && PAGE_TRANSITION_PATTERNS[detail.v]) {
        setPat(detail.v);
        /* パネルで選んだら、その場で一度見せる（遷移しなくても確かめられる） */
        if (detail.preview) {
          setShow(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(
            () => setShow(false),
            PAGE_TRANSITION_PATTERNS[detail.v].dur * 0.5
          );
        }
      }
    };
    window.addEventListener(PAGE_TRANSITION_EVENT, onTune);
    return () => {
      window.removeEventListener(PAGE_TRANSITION_EVENT, onTune);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  /* ページが変わったら幕を出して、すぐ引く */
  useEffect(() => {
    if (first.current) {
      first.current = false; /* 最初の表示では出さない */
      return;
    }
    const p = PAGE_TRANSITION_PATTERNS[pat] ?? PAGE_TRANSITION_PATTERNS[1];
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), p.dur * 0.45);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const p = PAGE_TRANSITION_PATTERNS[pat] ?? PAGE_TRANSITION_PATTERNS[1];
  const v = variantsOf(p);
  const half = p.dur / 1000 / 2;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="page-veil"
          aria-hidden
          /* ⚠️ ブラー量は固定。毎フレーム変えると極端に重くなる */
          className={`pointer-events-none fixed inset-0 z-[100] ${p.veil}`}
          style={p.blur ? { backdropFilter: `blur(${p.blur}px)` } : undefined}
          initial={v.initial}
          animate={v.animate}
          exit={v.exit}
          transition={{ duration: half, ease: EASE }}
        />
      )}
    </AnimatePresence>
  );
}
