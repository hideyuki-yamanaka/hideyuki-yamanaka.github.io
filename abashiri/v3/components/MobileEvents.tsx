"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * スマホのトップ（MobileTop）の体験セクション。PC の案1〜5 をスマホの縦長1画面に組み直したもの
 *
 * 【2026-09-26 ヒデさん指示】
 *   「レスポンシブ対応も、今採用されていない案に関しても基本的にやっておいてほしい」
 *   それまでスマホは 2×2 の1種類だけで、調整パネルで案を切り替えても変わらなかった。
 *   → PC と同じ番号（1・31・32・33・34）で出し分ける。考え方は PC の各案のまま：
 *     案1  育つ一列 …… 2×2 に並べ、場面に入ったら4枚が小さい状態から順に実寸へ育つ
 *     案31 カードを切る … 束＋後ろを流れる文字。上へ1回スワイプ＝1枚切る（PC と同じ部品）
 *     案32 左右に文字 …… 「意外と／オモロい、」を束の上、「網走」を束の下。1回＝1枚めくれる
 *     案33 飛び出す …… 中央のコピーの裏から4枚が四隅へ飛び出す（場面に入った時に再生）
 *     案34 3Dカルーセル … 中央に1枚、左右は奥へ回り込む。1回＝1枚送る
 *   1回＝1枚の案は、MobileTop のスワイプが gate を呼ぶ。カードを動かしたら true を返し、
 *   その回は場面を切り替えない。4枚見終わったら（または戻しきったら）false＝場面を切り替える。
 *
 * 🟡仮置き：スマホの寸法・文字の大きさはカンプが無いので、PC の比率とスマホの既存の組みから決めた
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ITEMS, type EventItem } from "./eventParts";
import { EVENT_LAYOUT_EVENT, EVENT_LAYOUT_PATTERNS } from "./EventSection";
import { MobileStack } from "./EventVariants4";
import { Carousel3D } from "./Carousels";
import { CARDS, useCardRatio } from "./EventVariants5";
import { navigateTo } from "./PageTransition";

export type EventsGate = React.RefObject<((dir: 1 | -1) => boolean) | null>;

const EASE = [0.22, 1, 0.36, 1] as const;

/** いま選ばれている案（焼き込み → 調整パネルの順で上書き。PC の EventSection と同じ受け方） */
function useEventPattern() {
  const [pat, setPat] = useState(1);
  useEffect(() => {
    let fromPanel = false;
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.events?.pattern;
        if (!fromPanel && typeof v === "number" && EVENT_LAYOUT_PATTERNS[v]) setPat(v);
      })
      .catch(() => {});
    const on = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number" && EVENT_LAYOUT_PATTERNS[v]) {
        fromPanel = true;
        setPat(v);
      }
    };
    window.addEventListener(EVENT_LAYOUT_EVENT, on);
    return () => window.removeEventListener(EVENT_LAYOUT_EVENT, on);
  }, []);
  return pat;
}

/** 画面の大きさ（束の縮め方を決める） */
function useViewport() {
  const [v, setV] = useState({ w: 390, h: 844 });
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return v;
}

/** 見出し（スマホの既存の組みと同じ） */
function Title({ className = "" }: { className?: string }) {
  return (
    <h2 className={`text-body-20 font-thin leading-[1.7] text-ink tab:text-title-34 ${className}`}>
      意外とオモロい、網走。
    </h2>
  );
}

/** いま一番上のカードの説明。タップで詳細ページへ */
function NowCaption({ it }: { it: EventItem }) {
  return (
    <button
      type="button"
      onClick={() => navigateTo(`/spot/${it.slug}`)}
      className="flex w-full items-end justify-between gap-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-body-12 font-extralight leading-[1.4] text-ink/50 tab:text-body-14">
          {it.tag} {it.no}
        </span>
        <span className="mt-1 block text-body-16 font-light leading-[1.5] text-ink tab:text-body-20">
          {it.title}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 pb-1 text-body-12 font-extralight text-ink/70 tab:text-body-14">
        もっと見る
        <img src="/img/icon-view-more-black.svg" alt="" className="size-[14px]" />
      </span>
    </button>
  );
}

export default function MobileEvents({
  active,
  gate,
}: {
  /** この場面がいま表示中か（出てくる動きの再生に使う） */
  active: boolean;
  gate: EventsGate;
}) {
  const pat = useEventPattern();
  /* 1回＝1枚を持たない案では、スワイプはそのまま場面の切り替えに回す */
  useEffect(() => {
    if (pat === 1 || pat === 33) gate.current = null;
  }, [pat, gate]);
  switch (pat) {
    case 31:
      return <StackScene key="31" kind="shuffle" gate={gate} />;
    case 32:
      return <StackScene key="32" kind="peel" gate={gate} />;
    case 33:
      return <Burst active={active} />;
    case 34:
      return <Ring key="34" gate={gate} />;
    default:
      return <Grow active={active} />;
  }
}

/* ── 案1 育つ一列 ────────────────────────── */
function Grow({ active }: { active: boolean }) {
  return (
    <div className="flex size-full flex-col justify-center">
      <Title />
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 tab:mt-12 tab:gap-x-6 tab:gap-y-10">
        {ITEMS.map((it, i) => (
          <button
            key={it.slug}
            type="button"
            onClick={() => navigateTo(`/spot/${it.slug}`)}
            className="flex flex-col gap-2 text-left"
          >
            {/* 場所は最初から実寸で取り、中の写真だけ 55% から育てる（PC の GrowShot と同じ考え方） */}
            <div className="flex h-[150px] w-full items-center justify-center tab:h-[300px]">
              <motion.img
                src={it.img}
                alt={it.title}
                className="size-full object-cover"
                initial={false}
                animate={active ? { scale: 1, opacity: 1 } : { scale: 0.55, opacity: 0.5 }}
                transition={{ duration: 1.1, ease: EASE, delay: active ? 0.25 + i * 0.08 : 0 }}
              />
            </div>
            <p className="text-body-12 font-extralight leading-[1.4] text-ink/50 tab:text-body-13">
              {it.tag} {it.no}
            </p>
            <p className="text-body-14 font-light leading-[1.5] text-ink tab:text-body-20">{it.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 案31・32 重ね写真 ────────────────────── */
function StackScene({ kind, gate }: { kind: "shuffle" | "peel"; gate: EventsGate }) {
  const vp = useViewport();
  /* 束（420×616）を画面に収める倍率。幅は5割・高さは46%まで
     （幅6割だと、案31 の後ろを流れる文字がほとんど隠れた。2026-09-26 実測） */
  const scale = Math.min((vp.w * 0.5) / 420, (vp.h * 0.46) / 616);
  const boxH = Math.round(616 * scale * 1.12);
  const [top, setTop] = useState(ITEMS.length - 1);
  return (
    <div className="flex size-full flex-col justify-center gap-6 tab:gap-10">
      {kind === "peel" && (
        <p className="text-[28px] font-extralight leading-[1.5] text-black/80 tab:text-[48px]">
          意外と
          <br />
          オモロい、
        </p>
      )}
      <div className="relative w-full" style={{ height: boxH }}>
        {kind === "shuffle" && (
          /* 後ろを流れる文字。画面の端から端まで（左右の余白の外まで）流す。
             大きさ・速さは PC と同じつまみ（--ev-mq-size の6割／--ev-mq-dur） */
          <div
            className="pointer-events-none absolute -inset-x-6 top-1/2 -translate-y-1/2 overflow-hidden tab:-inset-x-[80px]"
            style={{ height: "calc(var(--ev-mq-size, 80px) * 0.6)" }}
          >
            <div className="tp-marquee flex whitespace-nowrap" style={{ animationDuration: "var(--ev-mq-dur, 34s)" }}>
              {[0, 1].map((k) => (
                <span
                  key={k}
                  className="shrink-0 pr-[0.4em] font-thin leading-none text-black/80"
                  style={{ fontSize: "calc(var(--ev-mq-size, 80px) * 0.6)" }}
                >
                  意外とオモロい、網走。意外とオモロい、網走。意外とオモロい、網走。
                </span>
              ))}
            </div>
          </div>
        )}
        <MobileStack kind={kind} gate={gate} scale={scale} onTop={setTop} />
      </div>
      {kind === "peel" && (
        <p className="self-end text-[40px] font-thin leading-none text-black/80 tab:text-[64px]">網走</p>
      )}
      <NowCaption it={ITEMS[top]} />
    </div>
  );
}

/* ── 案33 コピーから飛び出す ──────────────────
   終点は PC の四隅の配置（左下・右上・右下・左上）を縦長に置き直したもの */
const BURST_TO = [
  { left: "-4%", top: "64%", width: "46%" },
  { left: "52%", top: "9%", width: "52%" },
  { left: "62%", top: "60%", width: "44%" },
  { left: "3%", top: "17%", width: "42%" },
];
const BURST_FROM = { left: "35%", top: "44%", width: "30%" };
function Burst({ active }: { active: boolean }) {
  return (
    <div className="relative -mx-6 h-full tab:-mx-[80px]">
      {ITEMS.map((it, i) => (
        <motion.button
          key={it.slug}
          type="button"
          onClick={() => navigateTo(`/spot/${it.slug}`)}
          className="absolute z-10 aspect-[10/7] overflow-hidden bg-white shadow-[0_8px_24px_rgba(0,0,0,.12)]"
          initial={false}
          animate={active ? { ...BURST_TO[i], opacity: 1 } : { ...BURST_FROM, opacity: 0 }}
          transition={{ duration: 1.2, ease: EASE, delay: active ? 0.3 + i * 0.12 : 0 }}
          aria-label={it.title}
        >
          <img src={it.img} alt={it.title} className="size-full object-cover" />
        </motion.button>
      ))}
      <p className="pointer-events-none absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 text-center text-[22px] font-extralight leading-[1.6] text-black/80 tab:text-[40px]">
        意外とオモロい、網走。
      </p>
    </div>
  );
}

/* ── 案34 奥行きの3Dカルーセル ──────────────── */
function Ring({ gate }: { gate: EventsGate }) {
  const ratio = useCardRatio();
  const progress = useRef(0);
  const n = useRef(0);
  const [top, setTop] = useState(0);
  useEffect(() => {
    const fn = (dir: 1 | -1) => {
      const next = n.current + dir;
      if (next < 0 || next > ITEMS.length - 1) return false;
      n.current = next;
      progress.current = next / (ITEMS.length - 1);
      setTop(next);
      return true;
    };
    gate.current = fn;
    return () => {
      if (gate.current === fn) gate.current = null;
    };
  }, [gate]);
  return (
    <div className="-mx-6 flex size-full flex-col justify-center gap-6 tab:-mx-[80px] tab:gap-10">
      <Title className="text-center" />
      <Carousel3D
        items={CARDS}
        progress={progress}
        ratio={ratio}
        heading={false}
        hint="↑ 上へスワイプすると写真が右から左へ切り替わります"
      />
      <div className="px-6 tab:px-[80px]">
        <NowCaption it={ITEMS[top]} />
      </div>
    </div>
  );
}
