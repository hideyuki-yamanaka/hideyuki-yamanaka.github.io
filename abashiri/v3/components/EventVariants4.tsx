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
import { useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ITEMS,
  PinStage,
  afterHold,
  useStepCards,
  type EvFlow,
  type EventItem,
} from "./eventParts";

export const EVENT_KV_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  31: { name: "案31 流れる文字と重ね写真", note: "【ラフ再現】白い面に写真が重なって置かれ、その後ろを「意外とオモロい、網走。」が右から左へ流れ続ける。1回スクロールするごとに、いちばん上の1枚が右へシャッと出て、束のいちばん下へ潜り込む（トランプを切るように）。残りは1段ずつ繰り上がり、4枚ぜんぶが一番上に来たら下へ進める。上へ戻すと、下の1枚が右へ引き出されて上へ乗る（行きと同じ感触）。速さとメリハリは下のつまみで。中央のカードにカーソルを乗せると影が乗って情報が出る" },
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
/** 束の中心（4枚の中心の平均）。案31 のカードの大きさを変える時の基準点 */
const STACK_CX = STACK.reduce((a, s) => a + s.cx, 0) / STACK.length;
const STACK_CY = STACK.reduce((a, s) => a + s.cy, 0) / STACK.length;

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

/* ═══════════ 案31：トランプを切るように、上の1枚が束の下へ潜る ═══════════
   【2026-09-26 ヒデさん指示】
     「スクロールすると写真が一番後ろに重なっていく演出に。右の方にカードが出ていくのは
       一緒なんですけど、上から順番に、一番下のやつの下に行く。トランプのカードを切る
       みたいなイメージ。上のやつが後ろに潜り込む」
   動きは2段：
     ① 出る（t: 0 → SHUF_SPLIT）… いちばん上の1枚が右へすべり出る。すべり方は「流れ方」の3案
     ② 潜る（t: SHUF_SPLIT → 1）… 束の裏へ回り（重なり順をいちばん下へ）、左へ戻って
        束のいちばん下の位置へ収まる。同時に、残りのカードが1段ずつ繰り上がる
   束の形（STACK＝カンプの重なり方）は変えない。カードは「今が下から何段目か（rank）」に
   応じて STACK の位置へ動く＝形はそのまま、中身だけが入れ替わる。
   ⚠️ 「何段目か」は各カードの進み t から毎フレーム計算する（別に状態を持たない）。
      上へ戻る時は t が 1→0 へ戻るので、そのまま逆回し（下から出て、上へ戻る）になる */
/* 【同日 ヒデさん指示（2回目）】
     「右へずれる挙動がゆったりすぎ。メリハリをつけてシャッと変わる感じに。
       ただ急な感じは出さないで。スクロールバックがすごく不自然なので、
       戻しても同じような体験に」
   → ・①出る／②潜る の2段とも「ゆっくり動き出す → 途中は速い → ゆっくり止まる」の
       左右対称のカーブ（easePow）にした。対称なので、上へ戻す時に逆再生しても
       【まったく同じ感触】になる（戻しは「下から右へ引き出して、上へ乗せる」）
     ・前は ①が「流れ方」の摩擦カーブ（出だしがいちばん速い＝急）で、戻しは時間を
       ゆがめていたため、戻す時に下から急に飛び出して最後にカクッと止まっていた
     ・秒数とメリハリ（途中の速さの強さ）は調整パネル（案2を選んだ時だけ出る）。
       値の住み家：globals.css の --ev-shuf-dur/--ev-shuf-pow／TopTunePanel の既定／
       tune-defaults.json／ここの SHUF_DEFAULT（4つとも同じ値にしておく） */
const SHUF_DEFAULT = { dur: 1.0, pow: 3 };
/** ①出る段の長さ（全体の何割）。残りが②潜る段 */
const SHUF_SPLIT = 0.45;
/** 右へ出る距離(px)。束の右端（約1040）より左端が右へ抜けて、裏へ回れる量 */
const SHUF_OUT = 560;
/** 右へ出る間に右へ回る角度(度)・下へそれる量(px)。🟡仮置き */
const SHUF_SPIN = 10;
const SHUF_DRIFT = 14;
/** 左右対称のなめらかカーブ。pow が大きいほど「動き出しと止まり際はゆっくり・途中はシャッ」 */
const easePow = (u: number, pow: number) => {
  const c = Math.max(0, Math.min(1, u));
  return c < 0.5 ? Math.pow(2 * c, pow) / 2 : 1 - Math.pow(2 - 2 * c, pow) / 2;
};
/** ② 潜る段の進み（0→1）。① の間は 0 */
const sunk = (t: number, pow: number) =>
  t <= SHUF_SPLIT ? 0 : easePow((t - SHUF_SPLIT) / (1 - SHUF_SPLIT), pow);
/** 調整パネルの秒数・メリハリ（CSS 変数）を読む */
function readShuf() {
  const cs = getComputedStyle(document.documentElement);
  const dur = parseFloat(cs.getPropertyValue("--ev-shuf-dur"));
  const pow = parseFloat(cs.getPropertyValue("--ev-shuf-pow"));
  return {
    dur: Number.isFinite(dur) && dur > 0 ? dur : SHUF_DEFAULT.dur,
    pow: Number.isFinite(pow) && pow >= 1 ? pow : SHUF_DEFAULT.pow,
  };
}
function useShufPow() {
  const [pow, setPow] = useState(SHUF_DEFAULT.pow);
  useAnimationFrame(() => {
    const p = readShuf().pow;
    if (p !== pow) setPow(p);
  });
  return pow;
}
/** 下から r 段目（小数も可）の置き場所。STACK の間をなめらかにつなぐ */
function slotAt(r: number) {
  const n = STACK.length - 1;
  const c = Math.max(0, Math.min(n, r));
  const k = Math.min(n - 1, Math.floor(c));
  const f = c - k;
  const a = STACK[k];
  const b = STACK[k + 1];
  return {
    cx: a.cx + (b.cx - a.cx) * f,
    cy: a.cy + (b.cy - a.cy) * f,
    rot: a.rot + (b.rot - a.rot) * f,
  };
}
function ShuffleCard({
  it,
  i,
  ts,
  pow,
}: {
  it: EventItem;
  i: number;
  /** 全カードの進み（何段目かの計算に、他のカードが潜った量も要る） */
  ts: MotionValue<number>[];
  /** メリハリ（easePow の強さ） */
  pow: number;
}) {
  const N = ts.length;
  /* 何段目か（0＝いちばん下）。
     他のカードが1枚潜るたびに1段上がり、自分が潜る時はいちばん下へ（N 段ぶん下げる） */
  const rankOf = (vals: number[]) => {
    let r = i;
    for (let j = 0; j < N; j++) r += sunk(vals[j], pow);
    return r - N * sunk(vals[i], pow);
  };
  /* 右へ出ている量（0→1→0）。①で右へ出て、②で戻りながら潜る。どちらも対称カーブ */
  const away = (tv: number) =>
    tv <= SHUF_SPLIT ? easePow(tv / SHUF_SPLIT, pow) : 1 - sunk(tv, pow);
  const x = useTransform(ts, (v: number[]) => {
    const s = slotAt(rankOf(v));
    return s.cx - STACK[i].cx + away(v[i]) * SHUF_OUT;
  });
  const y = useTransform(ts, (v: number[]) => {
    const s = slotAt(rankOf(v));
    return s.cy - STACK[i].cy + away(v[i]) * SHUF_DRIFT;
  });
  const rot = useTransform(ts, (v: number[]) => {
    const s = slotAt(rankOf(v));
    return s.rot + away(v[i]) * SHUF_SPIN;
  });
  /* 重なり順：潜り始めた瞬間に、まだ潜っていないカードすべての下へ。
     潜ったカードどうしは「あとで潜ったものほど下」＝番号が小さいほど下 */
  const z = useTransform(ts[i], (tv) => (tv > SHUF_SPLIT ? i + 1 : i + 1 + N * 2));
  return (
    <motion.div
      className="group absolute"
      style={{
        left: STACK[i].cx - CARD_W / 2,
        top: STACK[i].cy - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        x,
        y,
        rotate: rot,
        zIndex: z,
      }}
    >
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

/* ═══════════ 案32：重なった写真が1枚ずつ右へめくれる ═══════════
   （2026-09-26 まで案31 も同じ動きだった。案31 は上の ShuffleCard に変更）
   いちばん上（配列の最後）から順に、右へ回りながら抜けていく。
   最後の1枚は残す＝束が空にならない */
function StackCard({
  it,
  i,
  t,
  nudge,
  flow,
}: {
  it: EventItem;
  i: number;
  /** このカードの進み（0＝束の中 → 1＝抜けた）。1回スクロールで時間どおりに進む */
  t: MotionValue<number>;
  /** 束の“しなり”（案2 だけ使う） */
  nudge: MotionValue<number>;
  flow: EvFlow;
}) {
  const s = STACK[i % STACK.length];
  /* 【2026-09-26 作り直し】「1回スクロール＝1枚」
     旧：全カードが1本の進み具合 p を共有し、区間ごとに割り振っていた
         （p はスクロール量で決まるので、強く回すと何枚もまとめて流れた）
     新：カードごとに自分の進み t を持ち、出番が来たら【決まった時間とカーブ】で
         0→1 へ動く。流れ方（カーブ・浮き上がり・回転の遅れ）は EV_FLOWS の3案 */
  const last = i === 0; /* 台紙になる1枚は残す */
  const X = FRAME_W * 0.86;
  /* t＝押してからの経過時間（0→1）。位置・回転・ずれは物理の式（EV_FLOWS）で出す */
  const x = useTransform([t, nudge], ([tv, nv]: number[]) =>
    (last ? 0 : flow.pos(tv) * X) + nv * 14
  );
  /* 案3：回ったぶん少し下へそれる */
  const y = useTransform(t, (tv) => (last ? 0 : flow.pos(tv) * flow.drift));
  /* 右（時計回り）へ少しずつ回る */
  const rot = useTransform([t, nudge], ([tv, nv]: number[]) =>
    s.rot + (last ? 0 : flow.rot(tv) * flow.spin) + nv * 1.6
  );
  /* 消えるのは移動より遅らせる＝流れていくのが見える */
  const o = useTransform(t, [flow.fadeAt, 1], [1, last ? 1 : 0]);
  return (
    <motion.div
      className="group absolute"
      style={{
        left: s.cx - CARD_W / 2,
        top: s.cy - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        x,
        y,
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

/** 重ね写真の案（31・32）の貼りつく長さ（画面の何倍か）。
    1回スクロール＝1枚になり、場面の中のスクロール量は見た目に関係しないので短くてよい */
const STEP_STAGE_LEN = 2;

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
  /* 抜けている枚数（上向きの関所用。下から戻る時に1枚ずつ重ね直す） */
  const out = useRef(0);
  /* ⚠️ ピン留めが要る。セクションの高さ（1画面ぶん）だけだと、
     セクションが見えた時点で進捗が 0.96 まで進んでいて
     【剥がれ終わった状態からしか見えない】（2026-09-17 実測）。
     貼りつけて“ため”を置くことで、束 → 1枚ずつ剥がれる、が見えるようになる */
  /* 4枚めくり終わるまで下へ行かせない見張り（PinStage の hold）。
     場面の側が毎フレーム「今どこまで流れたか」を書き込む */
  const hold = useRef(0);
  /* 2026-09-26：1回スクロール＝1枚になり、場面の中のスクロール量は見た目に
     関係しなくなった。貼りつく長さは短くして、行き帰りの“空スクロール”を減らす */
  return (
    <PinStage length={STEP_STAGE_LEN} hold={hold} out={out}>
      {(q, pinned) => <MarqueeScene q={q} pinned={pinned} hold={hold} out={out} />}
    </PinStage>
  );
}
function MarqueeScene({
  q,
  pinned,
  hold,
  out,
}: {
  q: MotionValue<number>;
  pinned: React.RefObject<boolean>;
  hold: React.RefObject<number>;
  out: React.RefObject<number>;
}) {
  /* 1回スクロール＝1枚。案31 は「カードを切る」動きで、秒数は調整パネルから
     （行きも帰りも同じ秒数・一定の時計。形は ShuffleCard のカーブで作る） */
  const { ts } = useStepCards(q, pinned, hold, out, () => ({ duration: readShuf().dur }));
  const pow = useShufPow();
  return (
    <Frame
      full={
        /* 後ろを流れ続ける文字。右から左へ無限ループ（CSSアニメ＝スクロールと無関係）。
           【2026-09-17 ヒデさん指示】「セクション自体がちょん切れてる感じ。
             横幅いっぱいに文字が伸びる感じに」→ カンプの1512枠の外に出して、
             画面の横幅いっぱいに流す */
        /* 【2026-09-26 ヒデさん指示】「この案を選んだら、後ろのテキストのサイズ感や
             速度感、カードのサイズ感を変えられるように」→ 大きさ・1周の秒数は CSS 変数
             （--ev-mq-size / --ev-mq-dur。調整パネルの「案2 カードを切る」）。
           ⚠️ 大きさを変えても文字の【中心の高さ】はカンプの位置（上から 31+398+40＝469px）に保つ */
        <div
          className="pointer-events-none absolute inset-x-0 overflow-hidden"
          style={{
            top: `calc(${(CANVAS_H - FRAME_H) / 2 + 398 + 40}px - var(--ev-mq-size, 80px) / 2)`,
            height: "var(--ev-mq-size, 80px)",
          }}
        >
          <div
            className="tp-marquee flex whitespace-nowrap"
            style={{ animationDuration: "var(--ev-mq-dur, 34s)" }}
          >
            {[0, 1].map((k) => (
              <span
                key={k}
                className="shrink-0 pr-[0.4em] font-thin leading-none text-black/80"
                style={{ fontSize: "var(--ev-mq-size, 80px)" }}
              >
                意外とオモロい、網走。意外とオモロい、網走。意外とオモロい、網走。
              </span>
            ))}
          </div>
        </div>
      }
    >
      {/* 【2026-09-26】案31 はトランプを切る動き（上の1枚が束の下へ潜る）。
          カードの大きさは束の中心を基準に束ごと拡大縮小（--ev-shuf-card。右へ出る距離も比例） */}
      <div
        className="absolute inset-0"
        style={{
          transform: "scale(var(--ev-shuf-card, 1))",
          transformOrigin: `${STACK_CX}px ${STACK_CY}px`,
        }}
      >
        {ITEMS.map((it, i) => (
          <ShuffleCard key={it.title} it={it} i={i} ts={ts} pow={pow} />
        ))}
      </div>
    </Frame>
  );
}

/* ═══════════ 案32 左右に文字 ═══════════ */
function SideTextStack() {
  const hold = useRef(0);
  const out = useRef(0);
  return (
    <PinStage length={STEP_STAGE_LEN} hold={hold} out={out}>
      {(q, pinned) => <SideTextScene q={q} pinned={pinned} hold={hold} out={out} />}
    </PinStage>
  );
}
function SideTextScene({
  q,
  pinned,
  hold,
  out,
}: {
  q: MotionValue<number>;
  pinned: React.RefObject<boolean>;
  hold: React.RefObject<number>;
  out: React.RefObject<number>;
}) {
  const { ts, nudges, flow } = useStepCards(q, pinned, hold, out);
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
        <StackCard key={it.title} it={it} i={i} t={ts[i]} nudge={nudges[i]} flow={flow} />
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
