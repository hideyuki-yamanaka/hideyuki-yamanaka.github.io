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
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

export const EVENT_LAYOUT_EVENT = "abashiri:event-layout";

export const EVENT_LAYOUT_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  1: { name: "案1", note: "育つ一列。小さな4枚が、スクロールにつれて画面幅いっぱいまで伸びる" },
  2: { name: "案2", note: "中央が開く。真ん中の1枚が大きく育ち、両脇がそっと引いていく" },
  3: { name: "案3", note: "横に流れる。写真が横へ送られ、中央に来た1枚だけが大きくなる" },
  4: { name: "案4", note: "グリッド崩し。2×2の小さな組が、ほどけながら大きく広がる" },
  5: { name: "案5", note: "幕が開く。細い帯から上下に開いて写真が現れ、そのまま育つ" },
  6: { name: "案6", note: "重なりがほどける。かさなった4枚が、扇のように開いて並ぶ" },
  7: { name: "案7", note: "縦から横へ。縦長の写真が、スクロールで横長の景色に変わる" },
  8: { name: "案8", note: "通り抜け。1枚に寄っていき、抜けると次の写真が待っている" },
  9: { name: "案9", note: "速さ違い。4枚が別々の速さで上がり、手前の1枚だけ大きく育つ" },
  10: { name: "案10", note: "文字主役。見出しを大きく中央に、写真は小さく一列（現行の採用候補）" },
};

type EventItem = { tag: string; title: string; body: string; img: string };

/* 1枚目のタグ・タイトルはカンプ実測（網走刑務所めし）。2〜4枚目は🟡仮置き */
const ITEMS: EventItem[] = [
  {
    tag: "体験・イベント",
    title: "網走刑務所めし",
    body: "博物館 網走監獄では、実際の刑務所で出されている食事を再現した「監獄食」を味わえます。麦飯にホッケ、みそ汁。質素なのに、なぜかクセになるおいしさです。",
    img: "/img/omoroi-1.jpg",
  },
  {
    tag: "景色・どうぶつ",
    title: "流氷とアザラシ",
    body: "冬のオホーツク海にやってくるのは流氷だけではありません。氷の上でのんびり休むアザラシに出会えることも。防寒をしっかりして、双眼鏡を持って探してみてください。",
    img: "/img/omoroi-2.jpg",
  },
  {
    tag: "体験・イベント",
    title: "網走湖カヌー体験",
    body: "湖と川がつながる網走ならではの、水の上のさんぽ。ガイドと一緒にゆっくり漕ぎ出せば、鳥の声と水の音だけの静かな時間が待っています。初めてでも大丈夫。",
    img: "/img/omoroi-3.jpg",
  },
  {
    tag: "景色・どうぶつ",
    title: "オオワシに会う冬",
    body: "翼を広げると2mを超えるオオワシ・オジロワシが、冬の網走に渡ってきます。流氷の上や河口の木々にとまる姿は迫力満点。カメラを持って出かけたくなります。",
    img: "/img/omoroi-4.jpg",
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
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
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
    <div className={`overflow-hidden ${className}`} style={style}>
      <motion.img
        src={it.img}
        alt={it.title}
        className="size-full object-cover"
        style={{ scale: s, opacity: o, transformOrigin: origin }}
      />
    </div>
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

function Pattern({ pat, p }: { pat: number; p: MotionValue<number> }) {
  switch (pat) {
    /* 案1 育つ一列：小さな4枚 →（スクロール）→ 画面幅いっぱいまで伸びる */
    case 1:
      return (
        <div className="flex w-full flex-col gap-[90px]">
          <HTitle className="px-[147px]" />
          <div className="flex w-full gap-[5px] px-[40px]">
            {ITEMS.map((it, i) => {
              const [a, b] = seg(i, 4, 0.3);
              return (
                <div key={it.title} className="flex min-w-0 flex-1 flex-col gap-5">
                  <GrowShot
                    it={it}
                    p={p}
                    from={a}
                    to={b}
                    start={0.55}
                    className="h-[560px] w-full"
                  />
                  <Caption it={it} />
                </div>
              );
            })}
          </div>
        </div>
      );

    /* 案2 中央が開く：真ん中の1枚が大きく育ち、両脇はそっと引く */
    case 2:
      return <CenterOpens p={p} />;

    /* 案3 横に流れる：中央に来た1枚だけが大きくなる */
    case 3:
      return <SideScroll p={p} />;

    /* 案4 グリッド崩し：2×2の小さな組が、ほどけながら広がる */
    case 4:
      return <GridUnfold p={p} />;

    /* 案5 幕が開く：細い帯から上下に開いて現れ、そのまま育つ */
    case 5:
      return <CurtainOpen p={p} />;

    /* 案6 重なりがほどける：かさなった4枚が扇のように開く */
    case 6:
      return <FanOut p={p} />;

    /* 案7 縦から横へ：縦長の写真が横長の景色に変わる */
    case 7:
      return <TallToWide p={p} />;

    /* 案8 通り抜け：1枚に寄って抜けると、次の写真が待っている */
    case 8:
      return <PassThrough p={p} />;

    /* 案9 速さ違い：4枚が別々の速さで上がり、手前の1枚が大きく育つ */
    case 9:
      return <SpeedLayers p={p} />;

    /* 案10 文字主役（そのまま据え置き） */
    case 10:
      return (
        <div className="mx-auto flex w-[1100px] max-w-[92%] flex-col items-center gap-[120px]">
          <motion.h2
            className="text-center text-[64px] font-thin leading-[1.6] text-ink"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={VIEW}
          >
            意外とオモロい、網走。
          </motion.h2>
          <div className="flex w-full gap-5">
            {ITEMS.map((it) => (
              <div key={it.title} className="flex min-w-0 flex-1 flex-col gap-4">
                <motion.img
                  src={it.img}
                  alt={it.title}
                  className="h-[260px] w-full object-cover"
                  variants={reveal}
                  initial="hidden"
                  whileInView="show"
                  viewport={VIEW}
                />
                <Caption it={it} />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

/* 案2 中央が開く */
function CenterOpens({ p }: { p: MotionValue<number> }) {
  const mid = useTransform(p, [0.1, 0.75], [0.62, 1]);
  const side = useTransform(p, [0.1, 0.75], [1, 0.82]);
  const sideOp = useTransform(p, [0.1, 0.75], [1, 0.45]);
  return (
    <div className="flex w-full flex-col gap-[90px]">
      <HTitle className="px-[147px]" />
      <div className="flex w-full items-center gap-6 px-[60px]">
        <motion.div
          className="h-[360px] min-w-0 flex-1 overflow-hidden"
          style={{ scale: side, opacity: sideOp }}
        >
          <img src={ITEMS[0].img} alt="" className="size-full object-cover" />
        </motion.div>
        <div className="flex w-[640px] shrink-0 flex-col gap-6">
          <motion.div
            className="h-[560px] w-full overflow-hidden"
            style={{ scale: mid }}
          >
            <img src={ITEMS[1].img} alt="" className="size-full object-cover" />
          </motion.div>
          <Caption it={ITEMS[1]} size="lg" />
        </div>
        <motion.div
          className="h-[360px] min-w-0 flex-1 overflow-hidden"
          style={{ scale: side, opacity: sideOp }}
        >
          <img src={ITEMS[2].img} alt="" className="size-full object-cover" />
        </motion.div>
      </div>
    </div>
  );
}

/* 案3 横に流れる（中央のものが大きい） */
function SideScroll({ p }: { p: MotionValue<number> }) {
  const x = useTransform(p, [0, 1], ["8%", "-42%"]);
  return (
    <div className="flex w-full flex-col gap-[90px]">
      <HTitle className="px-[147px]" />
      <div className="w-full overflow-hidden">
        <motion.div className="flex w-max items-center gap-8 px-[20%]" style={{ x }}>
          {ITEMS.map((it, i) => {
            const [a, b] = seg(i, 4, 0.25);
            return (
              <div key={it.title} className="flex w-[520px] shrink-0 flex-col gap-5">
                <GrowShot
                  it={it}
                  p={p}
                  from={a}
                  to={b}
                  start={0.7}
                  className="h-[420px] w-full"
                />
                <Caption it={it} />
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

/* 案4 グリッド崩し */
function GridUnfold({ p }: { p: MotionValue<number> }) {
  const spread = useTransform(p, [0.1, 0.8], [0, 1]);
  const gap = useTransform(spread, (v) => 8 + v * 56);
  const s = useTransform(spread, [0, 1], [0.7, 1]);
  return (
    <div className="mx-auto flex w-[1180px] max-w-[92%] items-start gap-[80px]">
      <VTitle />
      <motion.div
        className="grid min-w-0 flex-1 grid-cols-2"
        style={{ gap }}
      >
        {ITEMS.map((it) => (
          <div key={it.title} className="flex flex-col gap-5">
            <motion.div
              className="h-[340px] w-full overflow-hidden"
              style={{ scale: s }}
            >
              <img src={it.img} alt="" className="size-full object-cover" />
            </motion.div>
            <Caption it={it} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* 案5 幕が開く（clip-path で上下から） */
function CurtainOpen({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-[90px]">
      <HTitle className="px-[147px]" />
      <div className="flex w-full flex-col gap-[70px] px-[60px]">
        {ITEMS.map((it, i) => {
          const [a, b] = seg(i, 4, 0.2);
          return <CurtainRow key={it.title} it={it} p={p} from={a} to={b} />;
        })}
      </div>
    </div>
  );
}
function CurtainRow({
  it,
  p,
  from,
  to,
}: {
  it: EventItem;
  p: MotionValue<number>;
  from: number;
  to: number;
}) {
  const clip = useTransform(p, [from, to], ["inset(45% 0% 45% 0%)", "inset(0% 0% 0% 0%)"]);
  const s = useTransform(p, [from, to], [1.12, 1]);
  return (
    <div className="flex items-end gap-10">
      <motion.div className="h-[380px] min-w-0 flex-1 overflow-hidden" style={{ clipPath: clip }}>
        <motion.img src={it.img} alt="" className="size-full object-cover" style={{ scale: s }} />
      </motion.div>
      <Caption it={it} className="w-[300px] shrink-0 pb-2" />
    </div>
  );
}

/* 案6 重なりがほどける（扇） */
function FanOut({ p }: { p: MotionValue<number> }) {
  const open = useTransform(p, [0.1, 0.8], [0, 1]);
  return (
    <div className="flex w-full flex-col items-center gap-[90px]">
      <HTitle />
      <div className="relative h-[520px] w-full">
        {ITEMS.map((it, i) => (
          <FanCard key={it.title} it={it} i={i} open={open} />
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
}: {
  it: EventItem;
  i: number;
  open: MotionValue<number>;
}) {
  /* 閉じている時は中央に重なり、開くと左右へ広がる */
  const offs = [-540, -180, 180, 540];
  const rots = [-6, -2, 2, 6];
  const x = useTransform(open, [0, 1], [0, offs[i]]);
  const rot = useTransform(open, [0, 1], [0, rots[i]]);
  const s = useTransform(open, [0, 1], [0.8, 1]);
  return (
    <motion.div
      className="absolute left-1/2 top-0 h-[520px] w-[340px] overflow-hidden"
      style={{ x, rotate: rot, scale: s, marginLeft: -170, zIndex: 10 - i }}
    >
      <img src={it.img} alt={it.title} className="size-full object-cover" />
    </motion.div>
  );
}

/* 案7 縦から横へ */
function TallToWide({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-[90px]">
      <HTitle className="px-[147px]" />
      <div className="flex w-full flex-col gap-[80px] px-[60px]">
        {ITEMS.slice(0, 3).map((it, i) => {
          const [a, b] = seg(i, 3, 0.2);
          return <MorphRow key={it.title} it={it} p={p} from={a} to={b} />;
        })}
      </div>
    </div>
  );
}
function MorphRow({
  it,
  p,
  from,
  to,
}: {
  it: EventItem;
  p: MotionValue<number>;
  from: number;
  to: number;
}) {
  /* 縦長（幅を絞った状態）→ 横長（全幅）へ。clip-path なのでレイアウトは動かない */
  const clip = useTransform(
    p,
    [from, to],
    ["inset(0% 33% 0% 33%)", "inset(0% 0% 0% 0%)"]
  );
  const s = useTransform(p, [from, to], [1.15, 1]);
  return (
    <div className="flex flex-col gap-5">
      <motion.div className="h-[460px] w-full overflow-hidden" style={{ clipPath: clip }}>
        <motion.img src={it.img} alt="" className="size-full object-cover" style={{ scale: s }} />
      </motion.div>
      <Caption it={it} />
    </div>
  );
}

/* 案8 通り抜け（ズームスルー） */
function PassThrough({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-[90px]">
      <HTitle className="px-[147px]" />
      <div className="flex w-full flex-col gap-[48px] px-[40px]">
        {ITEMS.map((it, i) => {
          const [a, b] = seg(i, 4, 0.22);
          return <ThroughRow key={it.title} it={it} p={p} from={a} to={b} />;
        })}
      </div>
    </div>
  );
}
function ThroughRow({
  it,
  p,
  from,
  to,
}: {
  it: EventItem;
  p: MotionValue<number>;
  from: number;
  to: number;
}) {
  const mid = (from + to) / 2;
  /* 小さく現れ → 実寸を通り過ぎ → わずかに寄って見送る */
  const s = useTransform(p, [from, mid, to], [0.78, 1, 1.06]);
  const o = useTransform(p, [from, mid, to], [0.3, 1, 0.85]);
  return (
    <div className="flex flex-col gap-5">
      <div className="h-[520px] w-full overflow-hidden">
        <motion.img
          src={it.img}
          alt=""
          className="size-full object-cover"
          style={{ scale: s, opacity: o }}
        />
      </div>
      <Caption it={it} />
    </div>
  );
}

/* 案9 速さ違い（手前の1枚だけ大きく育つ） */
function SpeedLayers({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full items-start gap-[69px] px-[120px]">
      <VTitle className="mt-[40px]" />
      <div className="flex min-w-0 flex-1 items-start gap-8">
        {ITEMS.map((it, i) => (
          <SpeedCol key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </div>
  );
}
function SpeedCol({
  it,
  i,
  p,
}: {
  it: EventItem;
  i: number;
  p: MotionValue<number>;
}) {
  const speeds = [-90, -30, -150, -60];
  const y = useTransform(p, [0, 1], [0, speeds[i]]);
  /* 3枚目（i=2）だけ主役として大きく育つ */
  const s = useTransform(p, [0.1, 0.8], i === 2 ? [0.72, 1.06] : [0.85, 1]);
  const h = i === 2 ? 520 : 360;
  return (
    <motion.div className="flex min-w-0 flex-1 flex-col gap-5" style={{ y }}>
      <div className="w-full overflow-hidden" style={{ height: h }}>
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full object-cover"
          style={{ scale: s }}
        />
      </div>
      <Caption it={it} />
    </motion.div>
  );
}

/* ── 本体 ───────────────────────────────── */

export default function EventSection() {
  const [pat, setPat] = useState(10); /* 気に入ってもらえた案10を既定に */
  useEffect(() => {
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.events?.pattern;
        if (typeof v === "number" && EVENT_LAYOUT_PATTERNS[v]) setPat(v);
      })
      .catch(() => {});
    const onTune = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number" && EVENT_LAYOUT_PATTERNS[v]) setPat(v);
    };
    window.addEventListener(EVENT_LAYOUT_EVENT, onTune);
    return () => window.removeEventListener(EVENT_LAYOUT_EVENT, onTune);
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
    /* ⚠️ relative z-10 は必須。前の兄弟（背景写真やKVの sticky＝positioned要素）が
       描画順で上に来るため、無いと白背景と見出しが青背景の下に沈む（2026-09-14 実測） */
    <section
      id="events"
      className="relative z-10 w-full overflow-x-clip bg-white py-[180px]"
    >
      {ready ? (
        <Scrolled pat={pat} container={scRef} />
      ) : (
        /* 箱が見つからない時は動きなしで素直に置く */
        <Pattern pat={10} p={zero} />
      )}
    </section>
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
  /* このセクションが「下から入り始め → 上へ抜けきる」までを 0〜1 にする */
  const { scrollYProgress } = useScroll({
    container,
    target: ref,
    offset: ["start end", "end start"],
  });
  return (
    <div ref={ref} className="w-full">
      <Pattern pat={pat} p={scrollYProgress} />
    </div>
  );
}
