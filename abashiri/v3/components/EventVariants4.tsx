"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクション｜ヒデさんのラフ（Figmaカンプ）からの3案（案31〜33）
 * 2026-09-17。カンプ: U07rJcREH0yxxL25PzKhbA
 *   案31 = 2289:5977（流れる文字＋重なった写真）
 *   案32 = 2289:5978（左右に文字。動きは案31と同じ）
 *   案33 = 2289:5994（中央コピー → 写真が四方へ飛び出す）
 *
 * ── カンプから取った値（スペック表）──────────────────
 *  フレーム 1512×920
 *  案31 流れる文字 : Noto Sans JP Thin(100) / 80px / leading-none / 黒 / 不透明度.8 / nowrap
 *                    位置 x=-398 y=398（幅2640＝3回くり返し）
 *  案32 左の文字   : Noto Sans JP ExtraLight(200) / 70px / 行間1.6 / 不透明度.8
 *                    「意外と／オモロい、」 x=133 y=333（350×224）
 *  案32 右の文字   : Noto Sans JP Thin(100) / 90px / leading-none / 不透明度.8
 *                    「網走」 x=1135 y=394（180×90）
 *  案33 コピー     : Noto Sans JP ExtraLight(200) / 60px / 行間1.6 / 中央 / 不透明度.8
 *                    x=426 y=412（660×96）
 *  カード（案31・32 共通）: 420×616。カンプの外形から回転角を逆算した
 *    1枚目 中心(773,478) 0°     2枚目 中心(836,478) 2.66°
 *    3枚目 中心(765,519) 5.68°  4枚目 中心(844,478) 4.43°
 *  案33 写真: 始点は4枚とも x≈680 y=395（166×115）＝コピーの裏
 *    終点A x=-66  y=593（326×228）   終点B x=943  y=-72（396×274）
 *    終点C x=1200 y=558（370×257）   終点D x=97   y=65 （338×234）
 *    ※カンプでは画面の外へ少しはみ出す位置に置かれている（そのまま再現）
 *
 * 🟡仮置き：カンプに無いもの＝はける時の移動量・速さ・ホバーの中身。
 *   ホバーはグルメのカードと同じ言葉遣い（黒グラデ＋下から文字が上がる）にした
 */
import Link from "next/link";
import { useRef } from "react";
import { cubicBezier, motion, useTransform, type MotionValue } from "framer-motion";
import {
  ITEMS,
  PinStage,
  afterHold,
  useConstantSpeed,
  useReportProgress,
  type EventItem,
} from "./eventParts";

export const EVENT_KV_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  31: { name: "案31 流れる文字と重ね写真", note: "【ラフ再現】白い面に写真が重なって置かれ、その後ろを「意外とオモロい、網走。」が右から左へ流れ続ける。スクロールすると上の1枚ずつ右へめくれて剥がれていく。中央のカードにカーソルを乗せると影が乗って情報が出る" },
  32: { name: "案32 左右に文字", note: "【ラフ再現】動きは案31と同じ。文字組みだけ違い、左に「意外と／オモロい、」右に「網走」を置いて、その間に写真の束がある" },
  33: { name: "案33 コピーから飛び出す", note: "【ラフ再現】中央に「意外とオモロい、網走。」。スクロールすると、その裏に隠れていた写真が大きくなりながら四方へ飛び出して散る" },
};

/* ── カンプの実測値 ───────────────────────── */
const FRAME_W = 1512;
const FRAME_H = 920;
/** カード（420×616）の置き方。中心座標と回転角。
    【2026-09-17】カンプ（2283:5923）を画素でトレースして【数値フィッティング】で求めた。
    手順：カンプの輪郭（左右の縁を10px刻み・上下の縁を10px刻み）を取り、
          4枚の中心と回転を動かして輪郭のズレが最小になる組み合わせを探した。
          結果、カンプの輪郭との**平均ズレ 1.45px**。
    ⚠️ Figma のフレームの外形（bbox）から逆算した値は当てにならなかった
       （フレームの中で画像が余白を持っているため）。輪郭の実測が正しい。
    奥から手前の順（配列の後ろほど手前） */
const STACK = [
  { cx: 763.7, cy: 477.5, rot: -5.5 },
  { cx: 800.8, cy: 475.5, rot: 3.5 },
  { cx: 809.5, cy: 477.0, rot: 2.53 },
  { cx: 783.5, cy: 483.2, rot: 2.48 },
];
const CARD_W = 420;
const CARD_H = 616;

/* ── ホバーの中身（グルメのカードと同じ言葉遣い）───────── */
function HoverInfo({ it }: { it: EventItem }) {
  return (
    <Link
      href={`/spot/${it.slug}`}
      className="group/hover absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-black/10 to-black/80 px-8 py-7 opacity-0 transition-opacity duration-500 ease-standard hover:opacity-100"
    >
      <div className="flex w-full translate-y-[18px] flex-col gap-3 opacity-0 transition-all delay-75 duration-500 ease-standard group-hover/hover:translate-y-0 group-hover/hover:opacity-100">
        <p className="whitespace-nowrap text-body-14 font-extralight leading-[1.2] text-white/80 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
          {it.tag} {it.no}
        </p>
        <p className="text-title-28 font-thin leading-[1.3] text-white">
          {it.title}
        </p>
        <p className="text-body-14 font-extralight leading-[1.9] tracking-[0.7px] text-white/85">
          {it.body}
        </p>
        <span className="mt-1 flex items-center gap-1 text-body-14 font-extralight leading-[1.2] text-white transition-transform duration-300 ease-standard group-hover/hover:translate-x-[6px]">
          もっと見る
          <img src="/img/icon-view-more.svg" alt="" className="size-[16px]" />
        </span>
      </div>
    </Link>
  );
}

/* ═══════════ 案31・32 共通：重なった写真が1枚ずつ右へめくれる ═══════════
   いちばん上（配列の最後）から順に、右へ回りながら抜けていく。
   最後の1枚は残す＝束が空にならない */
function StackCard({
  it,
  i,
  p,
}: {
  it: EventItem;
  i: number;
  p: MotionValue<number>;
}) {
  const s = STACK[i % STACK.length];
  /* めくる順番：上に乗っているもの（i が大きい）が先に抜ける。
     【2026-09-17 ヒデさん指示】「右に行く挙動が素早すぎる。もっとゆったり」
     → 1枚あたりの区間を 0.2 → 0.3 に広げ、始まりの間隔も 0.2 → 0.22 に。
       あわせて PinStage の長さも 2.6 → 3.6画面ぶんに伸ばしてある。
       これで1枚が抜けきるまでのスクロール量が約2倍になる */
  /* 【2026-09-20 ヒデさん指示】
       「今2枚目見終わったら下にスクロールできる感じになっているので、
         ちゃんと4枚目まで見た後に、見終わったら下にスクロールできる感じに」
     実測すると、貼りついている間の前半5割で1枚も剥がれず（死に区間）、
     残り5割に4枚ぶんを詰め込んでいたため、剥がれきる前に貼りつきが切れていた
     （実測: 進み0.95 の時点で剥がれたのは2枚だけ）。
     → 始まりを早め（0.08→0.03）、間隔と1枚あたりの区間を詰めて、
       【進み 0.82 までに3枚とも剥がれ終わる】ようにする。
       残りの 0.18 は「4枚目をゆっくり見る」ための余韻。 */
  /* 【2026-09-24 ヒデさん報告】「謎に3スクロールぐらい無駄にしないと下に行けない」
     原因＝剥がれの配置と、関所をあける判定がズレていた。
       ・実際に3枚とも剥がれ終わるのは進み具合 0.59
       ・なのに関所は 0.96 まで開かない
       → その差 0.37 のあいだ、スクロールしても進まない（実測: 1859ms の空待ち）
     直し方＝【剥がれ終わり＝関所があく瞬間】になるよう、
       3枚を区間いっぱい（0.96 まで）に広げて配る。
       order 0→0.02〜0.49 / 1→0.255〜0.725 / 2→0.49〜0.96 */
  const order = ITEMS.length - 1 - i;
  const from = Math.min(0.5, 0.02 + order * 0.235);
  const to = Math.min(0.98, from + 0.47);
  const last = i === 0; /* 台紙になる1枚は残す */
  /* 直線だと機械的に見えるので、出だしと終わりをやわらげる */
  const EASE_OUT = cubicBezier(0.32, 0, 0.2, 1);
  const x = useTransform(p, [from, to], [0, last ? 0 : FRAME_W * 0.86], { ease: EASE_OUT });
  const rot = useTransform(p, [from, to], [s.rot, last ? s.rot : s.rot + 10], { ease: EASE_OUT });
  /* 消えるのは移動より遅らせる＝流れていくのが見える */
  const o = useTransform(p, [from + (to - from) * 0.45, to], [1, last ? 1 : 0]);
  return (
    <motion.div
      className="group absolute"
      style={{
        left: s.cx - CARD_W / 2,
        top: s.cy - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        x,
        rotate: rot,
        opacity: o,
        zIndex: i + 1,
      }}
    >
      {/* カーソルを乗せると影が乗る（カンプの「シャドウが乗って文字が出る」） */}
      <div className="relative size-full overflow-hidden bg-white shadow-[0_2px_10px_rgba(0,0,0,.06)] transition-shadow duration-500 ease-out group-hover:shadow-[0_24px_60px_rgba(0,0,0,.28)]">
        <img
          src={it.img}
          alt={it.title}
          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <HoverInfo it={it} />
      </div>
    </motion.div>
  );
}

/** カンプの 1512×920 をそのまま置くための枠。
    ⚠️ カンプは「1画面まるごと」なので、体験セクションの上パディング(180px)を
       打ち消して画面いっぱい（1512×982）に広げ、その中央にカンプの面を置く。
       これをやらないと 180+920+80=1180px になり、1画面に収まらない
       （2026-09-17 実測：カードが画面の下に切れて見えた） */
const CANVAS_H = 982;
function Frame({
  children,
  /** カンプの 1512 幅ではなく、画面の横幅いっぱいに置きたいもの
      （案31 の流れる文字。枠の中だと左右で切れて見える）*/
  full,
}: {
  children: React.ReactNode;
  full?: React.ReactNode;
}) {
  return (
    /* ⚠️ 上の余白の打ち消しと画面いっぱいの高さは PinStage 側でやっている。
       ここで二重に -mt を掛けないこと */
    <div className="relative size-full overflow-hidden bg-white">
      {full}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          marginLeft: -FRAME_W / 2,
          marginTop: -FRAME_H / 2,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ═══════════ 案31 流れる文字と重ね写真 ═══════════ */
function MarqueeStack() {
  /* ⚠️ ピン留めが要る。セクションの高さ（1画面ぶん）だけだと、
     セクションが見えた時点で進捗が 0.96 まで進んでいて
     【剥がれ終わった状態からしか見えない】（2026-09-17 実測）。
     貼りつけて“ため”を置くことで、束 → 1枚ずつ剥がれる、が見えるようになる */
  /* 4枚めくり終わるまで下へ行かせない見張り（PinStage の hold）。
     場面の側が毎フレーム「今どこまで流れたか」を書き込む */
  const hold = useRef(0);
  return (
    <PinStage length={4.8} hold={hold}>
      {(q) => <MarqueeScene q={q} hold={hold} />}
    </PinStage>
  );
}
function MarqueeScene({ q, hold }: { q: MotionValue<number>; hold: React.RefObject<number> }) {
  /* スクロールは「どこまで進んでよいか」を決めるだけ。
     実際の流れは一定の速さ（--ev-peel-speed）で追いかける */
  const p = useConstantSpeed(afterHold(q, 0.05, 0.9));
  useReportProgress(p, hold);
  return (
    <Frame
      full={
        /* 後ろを流れ続ける文字。右から左へ無限ループ（CSSアニメ＝スクロールと無関係）。
           【2026-09-17 ヒデさん指示】「セクション自体がちょん切れてる感じ。
             横幅いっぱいに文字が伸びる感じに」→ カンプの1512枠の外に出して、
             画面の横幅いっぱいに流す */
        <div
          className="pointer-events-none absolute inset-x-0 overflow-hidden"
          style={{ top: (CANVAS_H - FRAME_H) / 2 + 398, height: 80 }}
        >
          <div className="tp-marquee flex whitespace-nowrap">
            {[0, 1].map((k) => (
              <span
                key={k}
                className="shrink-0 pr-[0.4em] text-[80px] font-thin leading-none text-black/80"
              >
                意外とオモロい、網走。意外とオモロい、網走。意外とオモロい、網走。
              </span>
            ))}
          </div>
        </div>
      }
    >
      {ITEMS.map((it, i) => (
        <StackCard key={it.title} it={it} i={i} p={p} />
      ))}
    </Frame>
  );
}

/* ═══════════ 案32 左右に文字 ═══════════ */
function SideTextStack() {
  const hold = useRef(0);
  return (
    <PinStage length={4.8} hold={hold}>
      {(q) => <SideTextScene q={q} hold={hold} />}
    </PinStage>
  );
}
function SideTextScene({ q, hold }: { q: MotionValue<number>; hold: React.RefObject<number> }) {
  const p = useConstantSpeed(afterHold(q, 0.05, 0.9));
  useReportProgress(p, hold);
  return (
    <Frame>
      <p
        className="pointer-events-none absolute whitespace-nowrap text-[70px] font-extralight leading-[1.6] text-black/80"
        style={{ left: 133, top: 333, width: 350 }}
      >
        意外と
        <br />
        オモロい、
      </p>
      <p
        className="pointer-events-none absolute whitespace-nowrap text-[90px] font-thin leading-none text-black/80"
        style={{ left: 1135, top: 394, width: 180 }}
      >
        網走
      </p>
      {ITEMS.map((it, i) => (
        <StackCard key={it.title} it={it} i={i} p={p} />
      ))}
    </Frame>
  );
}

/* ═══════════ 案33 コピーから飛び出す ═══════════
   コピーの裏に小さく隠れていた写真が、大きくなりながら四方へ散る。
   終点はカンプの座標そのまま（画面の外へ少しはみ出す） */
const BURST = [
  { x: -66, y: 593, w: 326, h: 228 },
  { x: 943, y: -72, w: 396, h: 274 },
  { x: 1200, y: 558, w: 370, h: 257 },
  { x: 97, y: 65, w: 338, h: 234 },
];
const BURST_FROM = { x: 680, y: 395, w: 166, h: 115 };

function BurstCopy() {
  /* 【2026-09-17 ヒデさん指示】「中央に来た時にビューポートが中央に来て、
     真ん中に来た後に四方に飛び散る。一旦画面の固定が入った方がいい」 */
  return <PinStage length={2.6}>{(q) => <BurstScene q={q} />}</PinStage>;
}
function BurstScene({ q }: { q: MotionValue<number> }) {
  const p = afterHold(q, 0.2, 0.92);
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: FRAME_W,
        height: FRAME_H,
        marginLeft: -FRAME_W / 2,
        marginTop: -FRAME_H / 2,
      }}
    >
      {ITEMS.map((it, i) => (
        <BurstCard key={it.title} it={it} i={i} p={p} />
      ))}
      {/* コピーは写真より前。ジャンプ率はカンプ通り 60px */}
      <p
        className="pointer-events-none absolute z-20 whitespace-nowrap text-center text-[60px] font-extralight leading-[1.6] text-black/80"
        style={{ left: 426, top: 412, width: 660 }}
      >
        意外とオモロい、網走。
      </p>
    </div>
  );
}
function BurstCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const b = BURST[i % BURST.length];
  /* ゆったり順に飛び出す */
  const from = 0.06 + i * 0.08;
  const to = Math.min(1, from + 0.46);
  const x = useTransform(p, [from, to], [BURST_FROM.x, b.x]);
  const y = useTransform(p, [from, to], [BURST_FROM.y, b.y]);
  const w = useTransform(p, [from, to], [BURST_FROM.w, b.w]);
  const h = useTransform(p, [from, to], [BURST_FROM.h, b.h]);
  const o = useTransform(p, [from, from + 0.06], [0, 1]);
  return (
    <motion.div
      className="group absolute z-10"
      style={{ left: x, top: y, width: w, height: h, opacity: o }}
    >
      <div className="relative size-full overflow-hidden bg-white shadow-[0_8px_24px_rgba(0,0,0,.12)] transition-shadow duration-500 ease-out group-hover:shadow-[0_26px_64px_rgba(0,0,0,.3)]">
        <img
          src={it.img}
          alt={it.title}
          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        <HoverInfo it={it} />
      </div>
    </motion.div>
  );
}

/** 案31〜33 の入口。EventSection から番号で呼ばれる */
export function ExtraPattern4({ pat, p }: { pat: number; p: MotionValue<number> }) {
  switch (pat) {
    case 31:
      return <MarqueeStack />;
    case 32:
      return <SideTextStack />;
    case 33:
      return <BurstCopy />;
    default:
      return null;
  }
}
