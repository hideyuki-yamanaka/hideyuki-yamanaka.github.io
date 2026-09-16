"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクション（グルメの下・V3.0。見出しは「意外とオモロい、網走。」）
 *
 * 2026-09-15（2回目の作り直し）ヒデさん指示
 *   ・主役は写真。「最初は控えめ → スクロールにつれて写真が育つ」を全案の芯にする
 *   ・案10（文字主役）だけは気に入ってもらえたのでそのまま残し、案1〜9を差し替え
 *   ・トップのトンマナは維持：白地 / Noto Sans JP Thin・ExtraLight / ink の文字 / 余白多め
 *
 * 動きの作り方（重要）
 *   ・拡大は transform: scale だけで行い、場所（レイアウト）は最初から確保しておく。
 *     width/height を毎フレーム変えるとブラウザがレイアウトし直してガタつく
 *     （2026-09-15 に実際に起きた問題。同じ轍は踏まない）
 *   ・トップページは window ではなく [data-abashiri-scroller] の中がスクロールするので、
 *     スクロール連動は必ずその要素を container に渡して取る
 *   ・useTransform の入力レンジは 0〜1 に収め、増加順で書く
 *     （負の値を渡すとブラウザのアニメーションAPIが例外を投げてページごと落ちる）
 *
 * 🟡仮置き：寸法・拡大率はカンプが無いので、トップの既存値を基準に決めた
 */
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  Caption,
  CardLink,
  HTitle,
  ITEMS,
  VTitle,
  type EventItem,
} from "./eventParts";
import { EVENT_EXTRA_PATTERNS, ExtraPattern } from "./EventVariants2";
import { EVENT_EXTRA3_PATTERNS, ExtraPattern3 } from "./EventVariants3";
import { EVENT_KV_PATTERNS, ExtraPattern4 } from "./EventVariants4";
import { EVENT_3D_PATTERNS, ExtraPattern5 } from "./EventVariants5";

export const EVENT_LAYOUT_EVENT = "abashiri:event-layout";
/* 体験セクションの下に足す余白。もともとは「動きを最後まで見るための逃げ」だったが、
   下にフッターが入ったので不要になった（2026-09-16 ヒデさん指示で既定 0）。
   調整パネルのつまみ（events.tailPad）で足せる */
export const EVENT_TAIL_EVENT = "abashiri:event-tail";
/* 【2026-09-16 ヒデさん指示】「暫定で入れた下の余白は一旦なくす」→ 既定は 0。
   動きを最後まで見たい時は調整パネル（🏠トップ → 体験セクション → 下の余白）で足す */
export const DEFAULT_EVENT_TAIL = 0;

export const EVENT_LAYOUT_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  /* 全案とも「画面の真ん中に来た時がいちばん良く見える」設計。
     案1・案6 が採用候補で、他はその2つから広げたバリエーション */
  1: { name: "案1", note: "【候補】育つ一列。小さな4枚が、中央に来るまでに実寸まで伸びる" },
  2: { name: "案2", note: "育つ一列（縦書き見出し）。案1と同じ育ち方で、見出しを縦書きに" },
  3: { name: "案3", note: "中央から開く一列。内側に寄っていた4枚が、外へ広がりながら育つ" },
  4: { name: "案4", note: "縦に伸びる一列。低い帯から上下に開いて、背の高い写真になる" },
  9: { name: "案9", note: "上下にほどける。重なりが上下にずれて開く（扇の縦版）" },
  /* 【2026-09-16 ヒデさん依頼】「デザインを改めて考えてほしい。見飽きない
     ユニークなインタラクションと、写真を魅力的に見せるもの。10案」→ 案11〜20。
     中身は EventVariants2.tsx */
  ...EVENT_EXTRA_PATTERNS,
  /* 【2026-09-16 ヒデさん依頼】さらに10案。机の上／四方に散る はご指定のアイデア、
     残りは没入と3Dトランスフォームで。中身は EventVariants3.tsx */
  ...EVENT_EXTRA3_PATTERNS,
  /* 【2026-09-17】ヒデさんのラフ（Figmaカンプ）からの3案。中身は EventVariants4.tsx */
  ...EVENT_KV_PATTERNS,
  /* 【2026-09-17】奥行きの3Dカルーセル2案。中身は EventVariants5.tsx */
  ...EVENT_3D_PATTERNS,
};

/* ── 動きの土台 ─────────────────────────────
   写真の「場所」は最初から最終サイズで確保しておき、
   中の絵だけ scale で小さい状態から実寸へ育てる。
   こうするとレイアウトが一切動かないので、なめらかに見える */
function GrowShot({
  it,
  p,
  from,
  to,
  /** 育ち始めの倍率（0.55 なら 55% の大きさから始まる） */
  start = 0.6,
  className = "",
  style,
  origin = "center",
}: {
  it: EventItem;
  p: MotionValue<number>;
  /** このカットが育つスクロール区間（0〜1） */
  from: number;
  to: number;
  start?: number;
  className?: string;
  style?: React.CSSProperties;
  origin?: string;
}) {
  const s = useTransform(p, [from, to], [start, 1]);
  const o = useTransform(p, [from, (from + to) / 2], [0.35, 1]);
  return (
    <CardLink it={it} className={className} style={style}>
      <motion.img
        src={it.img}
        alt={it.title}
        className="size-full object-cover"
        style={{ scale: s, opacity: o, transformOrigin: origin }}
      />
    </CardLink>
  );
}

/* 0〜1 に収めた区間を作る小道具（負や1超えを絶対に作らない） */
const seg = (i: number, n: number, pad = 0.12) => {
  const w = 1 / n;
  const from = Math.max(0, Math.min(1, i * w));
  const to = Math.max(from + 0.0001, Math.min(1, (i + 1) * w + pad));
  return [from, to] as const;
};

/* 【2026-09-16 ヒデさん指示】「3・4枚目も1・2枚目と同じ大きさで100%になってほしい」
   これまでは1枚ずつ順番に終わる区間（seg）だったので、4枚目はセクションが
   ぴったり中央に来るまで小さいままだった。
   → 出はじめだけ少しずらして、**終わりは4枚とも同じ**にする。
     こうすると、まだ中央に来る手前（p=0.62）で4枚とも実寸にそろう。 */
const segTogether = (i: number, end = 0.62, stagger = 0.07) => {
  const from = Math.max(0, Math.min(end - 0.0001, i * stagger));
  return [from, end] as const;
};

/* ── 案の中身 ───────────────────────────── */

/* ── 案の中身 ─────────────────────────────
   ⚠️ ここに来る p は「画面中央で 1 になる進捗」。
   セクションが画面の真ん中に来た時がいちばん良く見える状態で、
   そこから先は 1 のまま保たれる（通り過ぎてから育つ挙動を 2026-09-15 に是正） */

function Pattern({ pat, p }: { pat: number; p: MotionValue<number> }) {
  switch (pat) {
    /* 案1【採用候補】育つ一列：小さな4枚が、中央に来るまでに実寸へ伸びる */
    case 1:
      return (
        <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
          <HTitle className="px-6 sm:px-[147px]" />
          <div className="flex w-full gap-[5px] px-4 sm:px-[40px]">
            {ITEMS.map((it, i) => {
              const [a, b] = segTogether(i);
              return (
                <div key={it.title} className="flex min-w-0 flex-1 flex-col gap-5">
                  <GrowShot it={it} p={p} from={a} to={b} start={0.55} className="h-[560px] w-full" />
                  <Caption it={it} />
                </div>
              );
            })}
          </div>
        </div>
      );

    /* ── ここから下は 案1 の系統から広げたバリエーション ── */

    /* 案2 育つ一列（縦書き見出し）：案1と同じ育ち方で、見出しだけ縦書き＋右付け */
    case 2:
      return (
        <div className="flex w-full items-start gap-8 sm:gap-[69px] pl-6 sm:pl-[147px]">
          <VTitle className="mt-[40px]" />
          <div className="flex min-w-0 flex-1 gap-[5px]">
            {ITEMS.map((it, i) => {
              const [a, b] = segTogether(i);
              return (
                <div key={it.title} className="flex min-w-0 flex-1 flex-col gap-5">
                  <GrowShot it={it} p={p} from={a} to={b} start={0.55} className="h-[600px] w-full" />
                  <Caption it={it} />
                </div>
              );
            })}
          </div>
        </div>
      );

    /* 案3 中央から左右へ開く一列：真ん中にかたまった4枚が、外へ広がりながら育つ */
    case 3:
      return <SpreadRow p={p} />;

    /* 案4 縦に伸びる一列：低い帯だった4枚が、中央で背の高い写真になる */
    case 4:
      return <TallGrowRow p={p} />;

    /* 案9 上下にほどける：重なりが上下にずれて開く */
    case 9:
      return <FanVertical p={p} />;

    /* 案11・16=Variants2 ／ 21〜30=Variants3 ／ 31〜33=Variants4 ／ 34・35=Variants5 */
    default:
      if (pat >= 34) return <ExtraPattern5 pat={pat} p={p} />;
      if (pat >= 31) return <ExtraPattern4 pat={pat} p={p} />;
      if (pat >= 21) return <ExtraPattern3 pat={pat} p={p} />;
      return <ExtraPattern pat={pat} p={p} />;
  }
}

/* 案9 上下にほどける */
function FanVertical({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full items-start gap-8 sm:gap-[69px] px-6 sm:px-[120px]">
      <VTitle className="mt-[40px]" />
      <div className="relative h-[620px] min-w-0 flex-1">
        {ITEMS.map((it, i) => (
          <VFanCard key={it.title} it={it} i={i} open={p} />
        ))}
      </div>
    </div>
  );
}
function VFanCard({
  it,
  i,
  open,
}: {
  it: EventItem;
  i: number;
  open: MotionValue<number>;
}) {
  const xs = [-480, -160, 160, 480];
  const ys = [40, -40, 40, -40];
  const x = useTransform(open, [0, 1], [0, xs[i]]);
  const y = useTransform(open, [0, 1], [0, ys[i]]);
  const s = useTransform(open, [0, 1], [0.78, 1]);
  return (
    <motion.div
      className="absolute left-1/2 top-[40px] h-[460px] w-[300px]"
      style={{ x, y, scale: s, marginLeft: -150, zIndex: 10 - i }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/* 案3 中央から左右へ開く一列 */
function SpreadRow({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <HTitle className="px-6 sm:px-[147px]" />
      <div className="flex w-full justify-center gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <SpreadCell key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </div>
  );
}
function SpreadCell({
  it,
  i,
  p,
}: {
  it: EventItem;
  i: number;
  p: MotionValue<number>;
}) {
  /* 内側へ寄っていた状態から、定位置へ戻りながら育つ */
  const pulls = [180, 60, -60, -180];
  const x = useTransform(p, [0, 1], [pulls[i], 0]);
  const s = useTransform(p, [0, 1], [0.6, 1]);
  const o = useTransform(p, [0, 0.5], [0.4, 1]);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <CardLink it={it} className="h-[540px] w-full">
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full object-cover"
          style={{ x, scale: s, opacity: o }}
        />
      </CardLink>
      <Caption it={it} />
    </div>
  );
}

/* 案4 縦に伸びる一列（低い帯 → 背の高い写真） */
function TallGrowRow({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <HTitle className="px-6 sm:px-[147px]" />
      <div className="flex w-full gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <TallCell key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </div>
  );
}
function TallCell({
  it,
  i,
  p,
}: {
  it: EventItem;
  i: number;
  p: MotionValue<number>;
}) {
  const [a, b] = seg(i, 4, 0.35);
  /* 上下だけを開く（clip-path なのでレイアウトは動かない） */
  const clip = useTransform(p, [a, b], ["inset(35% 0% 35% 0%)", "inset(0% 0% 0% 0%)"]);
  const s = useTransform(p, [a, b], [1.14, 1]);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <motion.div className="h-[620px] w-full overflow-hidden" style={{ clipPath: clip }}>
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full object-cover"
          style={{ scale: s }}
        />
      </motion.div>
      <Caption it={it} />
    </div>
  );
}

function GridCell({
  it,
  i,
  p,
}: {
  it: EventItem;
  i: number;
  p: MotionValue<number>;
}) {
  /* 中央に重なった状態 → 2×2 の定位置へ */
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = useTransform(p, [0, 1], [0, col === 0 ? -230 : 230]);
  const y = useTransform(p, [0, 1], [0, row === 0 ? -210 : 210]);
  const s = useTransform(p, [0, 1], [0.72, 1]);
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 h-[380px] w-[440px]"
      style={{ x, y, scale: s, marginLeft: -220, marginTop: -190, zIndex: 10 - i }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

function DepthCell({
  it,
  i,
  p,
}: {
  it: EventItem;
  i: number;
  p: MotionValue<number>;
}) {
  /* 中央寄りの2枚は大きく、外側の2枚は少し小さく落ち着く */
  const near = i === 1 || i === 2;
  const s = useTransform(p, [0, 1], [0.66, near ? 1.04 : 0.92]);
  const o = useTransform(p, [0, 0.6], [0.35, near ? 1 : 0.8]);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <CardLink it={it} className="h-[560px] w-full">
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full object-cover"
          style={{ scale: s, opacity: o }}
        />
      </CardLink>
      <Caption it={it} />
    </div>
  );
}

export default function EventSection() {
  const [pat, setPat] = useState(1); /* 案10は完全削除したので案1を既定に（2026-09-16） */
  const [tail, setTail] = useState(DEFAULT_EVENT_TAIL);
  useEffect(() => {
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.events?.pattern;
        if (typeof v === "number" && EVENT_LAYOUT_PATTERNS[v]) setPat(v);
        const t = d?.events?.tailPad;
        if (typeof t === "number") setTail(t);
      })
      .catch(() => {});
    const onTune = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number" && EVENT_LAYOUT_PATTERNS[v]) setPat(v);
    };
    const onTail = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number") setTail(v);
    };
    window.addEventListener(EVENT_LAYOUT_EVENT, onTune);
    window.addEventListener(EVENT_TAIL_EVENT, onTail);
    return () => {
      window.removeEventListener(EVENT_LAYOUT_EVENT, onTune);
      window.removeEventListener(EVENT_TAIL_EVENT, onTail);
    };
  }, []);

  /* スクロール連動は「トップの箱」を基準に取る。
     箱が見つかってから中身を描く（ref が空のまま useScroll に渡さないため） */
  const scRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    scRef.current = document.querySelector<HTMLElement>("[data-abashiri-scroller]");
    setReady(Boolean(scRef.current));
  }, []);
  /* ⚠️ フックは条件分岐の外で呼ぶ（分岐の中で呼ぶとReactの規則違反になる） */
  const zero = useConstZero();

  return (
    <>
    {/* ⚠️ relative z-10 は必須。前の兄弟（背景写真やKVの sticky＝positioned要素）が
        描画順で上に来るため、無いと白背景と見出しが青背景の下に沈む（2026-09-14 実測） */}
    {/* ⚠️ -mt-[2px] は必須。前のグルメ場面は filter(blur) の合成レイヤーの中にあり、
        その縁が薄い水色のヘアラインとして残る。2px重ねて隠している
        （2026-09-16 ヒデさん指摘。赤背景テストで「背景の透け」ではないことは確認済み） */}
    <section
      id="events"
      className="relative z-10 -mt-[2px] w-full overflow-x-clip bg-white pt-[90px] pb-[90px] sm:pt-[180px] sm:pb-[var(--ev-pad-bottom)]"
    >
      {ready ? (
        <Scrolled pat={pat} container={scRef} />
      ) : (
        /* 箱が見つからない時は動きなしで素直に置く */
        <Pattern pat={10} p={zero} />
      )}
    </section>
    {/* ⚠️ 暫定の余白。体験セクションがページ最後なので、これが無いと
        「セクションが画面の上へ抜けきる」ところまでスクロールできず、
        スクロール連動の動きが最後まで再生されない。
        必ず section の“外”に置くこと（中に入れるとセクションの終点も一緒に
        下がってしまい、逃げにならない＝2026-09-15 に実際やらかした）。
        下に別のセクション（フッター等）が入ったら、この余白は外してよい */}
    <div aria-hidden className="relative z-10 w-full bg-white" style={{ height: tail }} />
    </>
  );
}

/** 動きなしで描く時のダミー進捗 */
function useConstZero() {
  const [mv] = useState(() => {
    const m = { get: () => 0, set: () => {}, on: () => () => {} };
    return m as unknown as MotionValue<number>;
  });
  return mv;
}

function Scrolled({
  pat,
  container,
}: {
  pat: number;
  container: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /* このセクションが「下から入り始め → 上へ抜けきる」までを 0〜1 にする。
     ⚠️ framer の useScroll に container と target を一緒に渡す書き方は、
     この環境では進捗が 0 のまま動かなかった（2026-09-15 実測）。
     見た目の位置から自分で計算する方が確実なので、こちらで持つ */
  const p = useMotionValue(0);
  /* ⚠️ scroller の scroll イベントはこの構成では拾えなかった（実測で発火0回）。
     毎フレーム位置を読んで進捗にする方式にする。
     やることは矩形1回読み＋MotionValue更新だけなので軽い */
  useAnimationFrame(() => {
    const sc = container.current;
    const el = ref.current;
    if (!sc || !el) return;
    const sr = sc.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const vh = sr.height || 1;
    /* 上端が画面の下にある＝0、下端が画面の上へ抜けた＝1 */
    const topInView = r.top - sr.top;
    const total = vh + r.height || 1;
    const v = (vh - topInView) / total;
    const next = Math.max(0, Math.min(1, v));
    if (Math.abs(next - p.get()) > 0.0005) p.set(next);
  });
  /* ⚠️ ここが肝。p は「入り始め0 → 抜けきり1」の生の進捗なので、
     そのまま使うと“通り過ぎた頃にやっと完成”になる（2026-09-15 ヒデさん指摘）。
     0.5 ＝ セクションが画面のちょうど真ん中に来た瞬間なので、
     そこで 1 に到達して以降は保つカーブへ変換する。
     ＝「画面中央がいちばん良く見える」状態になる */
  const centered = useTransform(p, [0, 0.5], [0, 1]);
  return (
    <div ref={ref} className="w-full">
      <Pattern pat={pat} p={centered} />
    </div>
  );
}
