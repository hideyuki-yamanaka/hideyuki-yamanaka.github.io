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
import Link from "next/link";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";

export const EVENT_LAYOUT_EVENT = "abashiri:event-layout";
/* 体験セクションの下に足す余白（動きを最後まで見るための逃げ）。
   ⚠️ 暫定。ここが最後のセクションのままだと、スクロール進捗が 1 に届かず
   スクロール連動の動きが completar しない（2026-09-15 ヒデさん指摘） */
export const EVENT_TAIL_EVENT = "abashiri:event-tail";
export const DEFAULT_EVENT_TAIL = 982; /* 1画面ぶん */

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
  5: { name: "案5", note: "重なり→2×2。かさなった4枚が、格子にほどけて大きくなる" },
  6: { name: "案6", note: "【候補】重なりがほどける。かさなった4枚が扇のように開いて並ぶ" },
  7: { name: "案7", note: "奥行きの一列。中央の2枚が手前に出て、両端は少し奥へ引く" },
  8: { name: "案8", note: "静かな扇。案6と同じほどけ方で、回転させず平行に開くだけ" },
  9: { name: "案9", note: "上下にほどける。重なりが上下にずれて開く（扇の縦版）" },
  10: { name: "案10", note: "主役1枚＋脇3枚。中央の1枚が大きく育ち、脇は控えめに開く" },
};

type EventItem = {
  tag: string;
  title: string;
  body: string;
  img: string;
  /** 詳細ページの slug（spotDetailData.ts のキー）。4件とも繋いである */
  slug: string;
};

/* 4件とも網走市観光公式サイトの実在ページに対応させ、詳細ページへつないでいる
   （2026-09-15 ヒデさん指示。以前の仮置き文言は廃止） */
const ITEMS: EventItem[] = [
  {
    tag: "体験・イベント",
    title: "博物館 網走監獄",
    body: "実際に使われていた監獄の建物を移築・復原した野外博物館。重要文化財の舎房や、受刑者が食べている「監獄食」を味わえる食堂もあります。",
    img: "/img/spot/kangoku-1.jpg",
    slug: "kangoku",
  },
  {
    tag: "体験・イベント",
    title: "オホーツク流氷館",
    body: "天都山の頂上にある、流氷を一年中体感できる施設。マイナス15度の流氷体感テラスや、クリオネなど流氷の生きものに会えます。",
    img: "/img/spot/ryuhyokan-1.jpg",
    slug: "ryuhyokan",
  },
  {
    tag: "体験・イベント",
    title: "カヌー体験",
    body: "網走川や網走湖を、ガイドと一緒にゆっくり漕ぎ出す水の上のさんぽ。鳥の声と水の音だけの静かな時間が待っています。",
    img: "/img/spot/canoe-1.jpg",
    slug: "canoe",
  },
  {
    tag: "体験・イベント",
    title: "オジロワシ・オオワシウォッチング",
    body: "冬の網走に渡ってくる大型のワシを、ガイドと探しにいくツアー。流氷の上や河口の木々にとまる姿は迫力満点です。",
    img: "/img/spot/washi-1.jpg",
    slug: "washi",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;
const reveal = {
  hidden: { opacity: 0, y: 32, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.1, ease: EASE },
  },
};
const VIEW = { once: true, amount: 0.25 } as const;

/* ── 文字の部品（カンプの書式） ───────────────── */

function VTitle({ className = "" }: { className?: string }) {
  return (
    <h2
      className={`shrink-0 whitespace-nowrap text-title-36 font-thin leading-[1.3] text-ink ${className}`}
      style={{ writingMode: "vertical-rl" }}
    >
      意外とオモロい、網走。
    </h2>
  );
}

function HTitle({ className = "" }: { className?: string }) {
  return (
    <h2
      className={`whitespace-nowrap text-title-36 font-thin leading-[1.8] text-ink ${className}`}
    >
      意外とオモロい、網走。
    </h2>
  );
}

function Caption({
  it,
  size = "sm",
  className = "",
}: {
  it: EventItem;
  size?: "sm" | "lg";
  className?: string;
}) {
  /* 説明ごと詳細ページへのリンクにする（2026-09-15 ヒデさん指示「全部つなぎ込む」） */
  return (
    <Link
      href={`/spot/${it.slug}`}
      className={`group flex flex-col gap-2 ${className}`}
    >
      <p className="text-body-14 font-extralight leading-[1.2] tracking-[0.7px] text-ink/45">
        {it.tag}
      </p>
      <p
        className={`font-thin leading-[1.4] text-ink ${
          size === "lg" ? "text-title-28" : "text-body-18"
        }`}
      >
        {it.title}
      </p>
      {size === "lg" && (
        <p className="mt-2 text-body-14 font-extralight leading-[2] tracking-[0.7px] text-ink/70">
          {it.body}
        </p>
      )}
      <span className="mt-1 flex items-center gap-1 text-body-14 font-extralight leading-[1.2] text-ink/60 transition-transform duration-300 ease-standard group-hover:translate-x-[6px]">
        もっと見る
        <img src="/img/icon-view-more-black.svg" alt="" className="size-[14px]" />
      </span>
    </Link>
  );
}

/** カードのリンク枠。カード全体がホバー領域で、中の写真が枠内で拡大する。
    グルメのカードと同じ言葉遣い（1.06倍・700ms・ease-out）。
    ⚠️ 拡大はこの枠に掛ける。中の写真は framer が transform を直接書くので、
    写真側に hover クラスを足しても上書きされて効かない（2026-09-16） */
function CardLink({
  it,
  className = "",
  style,
  children,
}: {
  it: EventItem;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden ${className}`} style={style}>
      <Link
        href={`/spot/${it.slug}`}
        className="block size-full transition-transform duration-700 ease-out hover:scale-[1.06]"
      >
        {children}
      </Link>
    </div>
  );
}

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
              const [a, b] = seg(i, 4, 0.3);
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

    /* 案6【採用候補】重なりがほどける：かさなった4枚が扇のように開く */
    case 6:
      return <FanOut p={p} />;

    /* ── ここから下は 案1・案6 の系統から広げたバリエーション ── */

    /* 案2 育つ一列（縦書き見出し）：案1と同じ育ち方で、見出しだけ縦書き＋右付け */
    case 2:
      return (
        <div className="flex w-full items-start gap-8 sm:gap-[69px] pl-6 sm:pl-[147px]">
          <VTitle className="mt-[40px]" />
          <div className="flex min-w-0 flex-1 gap-[5px]">
            {ITEMS.map((it, i) => {
              const [a, b] = seg(i, 4, 0.3);
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

    /* 案5 重なり → 2×2：かさなった4枚が、格子にほどけて大きくなる */
    case 5:
      return <StackToGrid p={p} />;

    /* 案7 奥行きのある一列：中央の1枚が手前に出て、両端は少し奥へ引く */
    case 7:
      return <DepthRow p={p} />;

    /* 案8 静かな扇：案6と同じほどけ方だが、回転させず平行に開くだけ */
    case 8:
      return <FanOut p={p} quiet />;

    /* 案9 上下にほどける：重なりが上下にずれて開く（扇の縦版） */
    case 9:
      return <FanVertical p={p} />;

    /* 案10 主役1枚＋脇3枚：中央の1枚が大きく育ち、脇は控えめに開く */
    case 10:
      return <HeroAndSides p={p} />;

    default:
      return null;
  }
}

/* 案6/案8 重なりがほどける（扇）。quiet=回転なしの静かな開き方 */
function FanOut({ p, quiet = false }: { p: MotionValue<number>; quiet?: boolean }) {
  return (
    <div className="flex w-full flex-col items-center gap-12 sm:gap-[90px]">
      <HTitle />
      <div className="relative h-[520px] w-full">
        {ITEMS.map((it, i) => (
          <FanCard key={it.title} it={it} i={i} open={p} quiet={quiet} />
        ))}
      </div>
      <div className="flex w-[1100px] max-w-[92%] gap-5">
        {ITEMS.map((it) => (
          <Caption key={it.title} it={it} className="min-w-0 flex-1" />
        ))}
      </div>
    </div>
  );
}
function FanCard({
  it,
  i,
  open,
  quiet,
}: {
  it: EventItem;
  i: number;
  open: MotionValue<number>;
  quiet?: boolean;
}) {
  const offs = [-540, -180, 180, 540];
  const rots = [-6, -2, 2, 6];
  const x = useTransform(open, [0, 1], [0, offs[i]]);
  const rot = useTransform(open, [0, 1], [0, quiet ? 0 : rots[i]]);
  const s = useTransform(open, [0, 1], [0.8, 1]);
  return (
    <motion.div
      className="absolute left-1/2 top-0 h-[520px] w-[340px]"
      style={{ x, rotate: rot, scale: s, marginLeft: -170, zIndex: 10 - i }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/* 案9 上下にほどける（扇の縦版） */
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

/* 案5 重なり → 2×2 の格子へ */
function StackToGrid({ p }: { p: MotionValue<number> }) {
  return (
    <div className="mx-auto flex w-[1180px] max-w-[92%] items-start gap-[80px]">
      <VTitle className="mt-[40px]" />
      <div className="relative h-[820px] min-w-0 flex-1">
        {ITEMS.map((it, i) => (
          <GridCell key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
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

/* 案7 奥行きのある一列（中央が手前・両端が奥） */
function DepthRow({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <HTitle className="px-6 sm:px-[147px]" />
      <div className="flex w-full items-center gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <DepthCell key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </div>
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

/* 案10 主役1枚＋脇3枚 */
function HeroAndSides({ p }: { p: MotionValue<number> }) {
  const heroS = useTransform(p, [0, 1], [0.7, 1]);
  const sideS = useTransform(p, [0, 1], [0.6, 1]);
  const sideO = useTransform(p, [0, 0.6], [0.3, 1]);
  return (
    <div className="mx-auto flex w-[1260px] max-w-[94%] flex-col gap-12 sm:gap-[90px]">
      <HTitle />
      <div className="flex items-stretch gap-6">
        <div className="flex w-[660px] max-w-[54%] flex-col gap-6">
          <div className="h-[620px] w-full overflow-hidden">
            <motion.img
              src={ITEMS[0].img}
              alt={ITEMS[0].title}
              className="size-full object-cover"
              style={{ scale: heroS }}
            />
          </div>
          <Caption it={ITEMS[0]} size="lg" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {ITEMS.slice(1).map((it) => (
            <div key={it.title} className="flex flex-col gap-3">
              <CardLink it={it} className="h-[180px] w-full">
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full object-cover"
          style={{ scale: sideS, opacity: sideO }}
        />
      </CardLink>
              <Caption it={it} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function EventSection() {
  const [pat, setPat] = useState(10); /* 気に入ってもらえた案10を既定に */
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
      className="relative z-10 -mt-[2px] w-full overflow-x-clip bg-white py-[90px] sm:py-[180px]"
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
