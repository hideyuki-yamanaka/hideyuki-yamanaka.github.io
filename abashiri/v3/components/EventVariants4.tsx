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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  motionValue,
  useAnimationFrame,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { EvNav } from "./EventNav";
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
  31: { name: "案31 流れる文字と重ね写真", note: "【ラフ再現】白い面に写真が重なって置かれ（いちばん上が体験①、その下に②③④）、その後ろを「意外とオモロい、網走。」が右から左へ流れ続ける。写真の束の下の丸いボタン2つで入れ替える（スクロールでは入れ替わらない・2026-10-14）。右のボタン＝いちばん上の1枚が右へシャッと出て、束のいちばん下へ潜り込む（トランプを切るように）。左のボタン＝いちばん下の1枚が右へ引き出されて上へ乗る（行きの逆回し）。端は無く、何回でも回せる。速さとメリハリは下のつまみで。カードにカーソルを乗せると影が乗って情報が出る" },
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
        <p className="text-body-14 font-extralight leading-[1.9] tracking-[0.05em] text-white/85">
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
/* 2026-10-14：前の ShuffleCard（「1回スクロール＝1枚」で、配列の後ろ＝④がいちばん上）は、
   左右のボタンで回す LoopCard（下の案31 の所・体験①がいちばん上）に置き換えて削除した */

/* ═══════════ 案32：重なった写真が1枚ずつ右へめくれる ═══════════
   （2026-09-26 まで案31 も同じ動きだった。案31 は 2026-10-14 から LoopCard＝左右のボタンで切る）
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

/* ═══════════ 案31 流れる文字と重ね写真（左右のボタンで切る）═══════════
   【2026-10-14 ヒデさん指示】
     「スクロールが気持ちいい体験になっていないので、スクロールではなくて、縦長写真の左右に
       カルーセルっぽくボタンを置いて自由に動かせるように。スクロールでの入れ替わりはなくす。
       カルーセルで任意で入れ替える形に」「体験の1番が一番上で、2、3、4と重なっている形に」
   → ・貼りつき（PinStage）と「1回スクロール＝1枚」（useStepCards）はやめた。場面は1画面ぶんの
       ふつうの箱で、スクロールはそのまま上下へ流れる（下へ行かせない見張りも無い）
     ・写真の束の左右に丸いボタン（場所えらびと同じ部品 CarouselArrow・白い地用の色）
       → 【同日 ヒデさん】「左右のボタンは文字のカルーセルスライドショーに被るのでやめたい」
         束の左右・上下の真ん中＝後ろを流れる文字の帯と同じ高さだった。送りボタンは束の下へ移した。
         形は5案を調整パネルで見比べて、同日「案4（丸いボタンを下に）」に決定。ほかの案は消した（EventNav.tsx）
       次へ：いちばん上の1枚が右へ出て、束のいちばん下へ潜る（2026-09-26 の動きのまま）
       前へ：いちばん下の1枚が右へ引き出されて、上へ乗る（行きの逆回し）
     ・重ね順は 体験①（ITEMS[0]）がいちばん上、その下に②③④
     ・端は無く、ぐるぐる回る（🟡仮置き：最後の④のあとも①へ続けて切れる）
   動きの作り：pos＝「何回切ったか」（小数＝切っている途中。前へで減る）。1つの値で全カードを動かす。
     各カードの「上から何番目か」は (自分の番号 − 切った回数) を4で割った余り。切っている途中の1枚だけ
     ①右へ出る → ②裏へ回っていちばん下へ（ShuffleCard と同じカーブ・同じ秒数とメリハリのつまみ） */
function LoopCard({
  it,
  i,
  pos,
  pow,
}: {
  it: EventItem;
  i: number;
  /** 切った回数（小数＝途中） */
  pos: MotionValue<number>;
  pow: number;
}) {
  const N = ITEMS.length;
  /* いまの段（0＝いちばん下〜N-1＝いちばん上）・右へ出ている量・束の裏にいるか */
  const at = (p: number) => {
    const k = Math.floor(p);
    const u = p - k;
    const d = (((i - k) % N) + N) % N; /* k 回切った時の上からの順番（0＝いちばん上） */
    if (d === 0) {
      /* 切られて下へ潜る1枚（前へ戻す時は、下から上へ戻ってくる1枚） */
      const s = sunk(u, pow);
      const away = u <= SHUF_SPLIT ? easePow(u / SHUF_SPLIT, pow) : 1 - s;
      return { r: (N - 1) * (1 - s), away, under: u > SHUF_SPLIT };
    }
    /* ほかのカードは、上の1枚が潜るのに合わせて1段ずつ繰り上がる */
    return { r: N - 1 - d + sunk(u, pow), away: 0, under: false, d };
  };
  const x = useTransform(pos, (v: number) => {
    const a = at(v);
    return slotAt(a.r).cx - STACK_CX + a.away * SHUF_OUT;
  });
  const y = useTransform(pos, (v: number) => {
    const a = at(v);
    return slotAt(a.r).cy - STACK_CY + a.away * SHUF_DRIFT;
  });
  const rot = useTransform(pos, (v: number) => {
    const a = at(v);
    return slotAt(a.r).rot + a.away * SHUF_SPIN;
  });
  /* 重なり順：右へ出ている間はいちばん手前、裏へ回ったらいちばん奥。
     ほかは上の順番どおり（上ほど手前） */
  const z = useTransform(pos, (v: number) => {
    const a = at(v);
    if ("d" in a && a.d !== undefined) return N - a.d;
    return a.under ? 0 : N * 2;
  });
  return (
    <motion.div
      className="group absolute"
      style={{
        left: STACK_CX - CARD_W / 2,
        top: STACK_CY - CARD_H / 2,
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

/** 束を回す仕組み（PC とスマホで同じ）。
    pos＝切った回数（小数＝切っている途中）。押した先（target）へ一定の速さで進める。
    続けて押した時も、今いる所から次の行き先へそのまま進む（途中で止まらない）。
    top＝いちばん上に来る体験（行き先で数える＝押した瞬間に変わる。スマホの説明の文に使う） */
export type DeckApi = { step: (dir: 1 | -1) => void };
function useLoopDeck() {
  const pos = useMemo(() => motionValue(0), []);
  const target = useRef(0);
  const [top, setTop] = useState(0);
  const api = useMemo<DeckApi>(
    () => ({
      /** 1枚送る（1）／戻す（-1） */
      step: (dir) => {
        const N = ITEMS.length;
        target.current += dir;
        const dist = Math.abs(target.current - pos.get());
        animate(pos, target.current, { duration: readShuf().dur * dist, ease: "linear" });
        setTop(((target.current % N) + N) % N);
      },
    }),
    [pos]
  );
  return { pos, top, ...api };
}

/** 送りボタンと束のすき間(px)。束のいちばん下の角から、ボタンの上の縁まで（🟡仮置き） */
const NAV_GAP = 32;
/** 束のいちばん下の角が、束の中心から何px下か（カードの回転を含む・カードの大きさ100%の時＝約326px） */
const STACK_BOTTOM =
  Math.max(
    ...STACK.map((s) => {
      const r = (s.rot * Math.PI) / 180;
      return s.cy + (CARD_W / 2) * Math.abs(Math.sin(r)) + (CARD_H / 2) * Math.cos(r);
    })
  ) - STACK_CY;

function MarqueeStack() {
  const { pos, step } = useLoopDeck();
  const pow = useShufPow();
  /* カードの大きさ（--ev-shuf-card）を変えても、ボタンは束の下に同じすき間で付いてくる。
     大きくしすぎてボタンが画面の下へはみ出す時は、フレームの下から64pxの所で止める */
  const navTop = `min(calc(${STACK_CY.toFixed(1)}px + ${STACK_BOTTOM.toFixed(1)}px * var(--ev-shuf-card, 1) + ${NAV_GAP}px), ${FRAME_H - 64}px)`;
  return (
    /* ⚠️ -mt-[180px]：体験セクションの上パディングを打ち消して、場面をちょうど画面いっぱい（1512×982）に
       （前は PinStage がやっていた。貼りつけはしないので、高さは1画面ぶんだけ） */
    <div className="relative -mt-[180px] h-[982px] w-full overflow-hidden bg-white" /* 4-7例外（PCのキャンバス 1512×982 の高さ） */>
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
        {/* カードの大きさは束の中心を基準に束ごと拡大縮小（--ev-shuf-card。右へ出る距離も比例） */}
        <div
          className="absolute inset-0"
          style={{
            transform: "scale(var(--ev-shuf-card, 1))",
            transformOrigin: `${STACK_CX}px ${STACK_CY}px`,
          }}
        >
          {ITEMS.map((it, i) => (
            <LoopCard key={it.title} it={it} i={i} pos={pos} pow={pow} />
          ))}
        </div>
        {/* 送りボタン：丸いボタン2つを、束の下の真ん中に並べる。カードより手前 */}
        <div
          className="absolute z-50 flex -translate-x-1/2 justify-center"
          style={{ left: STACK_CX, top: navTop, width: `calc(${CARD_W}px * var(--ev-shuf-card, 1))` }}
        >
          <EvNav onStep={step} />
        </div>
      </Frame>
    </div>
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
        className="pointer-events-none absolute whitespace-nowrap text-[72px] font-extralight leading-[1.6] text-black/80"
        style={{ left: 133, top: 333, width: 348 }}
      >
        意外と
        <br />
        オモロい、
      </p>
      <p
        className="pointer-events-none absolute whitespace-nowrap text-hero-88 font-thin leading-none text-black/80"
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
      <div className="relative size-full overflow-hidden bg-white shadow-[0_8px_24px_rgba(0,0,0,.12)] transition-shadow duration-500 ease-out group-hover:shadow-[0_24px_64px_rgba(0,0,0,.3)]">
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

/* ═══════════ スマホ用：重ね写真の束だけ（案31・32）═══════════
   【2026-09-26 ヒデさん指示】「レスポンシブ対応も、今採用されていない案に関しても」
   スマホのトップ（MobileTop）は1画面ずつ切り替わる作りなので、PC の貼りつき（PinStage）は使えない。
   → PC と【同じカードの部品】を、束の中心を基準に縮めて置く（動き・重なり方は PC と完全に同じ）。
     1回のスワイプ＝1枚は、MobileTop のスワイプから gate を呼んでもらう。
     文字（流れる文字・左右の文字）はスマホの縦長に合わせて MobileEvents 側で組む */
export function MobileStack({
  kind,
  gate,
  scale,
  onTop,
  api,
}: {
  /** shuffle＝案31 カードを切る ／ peel＝案32 右へめくれる */
  kind: "shuffle" | "peel";
  gate: React.RefObject<((dir: 1 | -1) => boolean) | null>;
  /** 束の縮め方（カンプの 420×616 に対する倍率） */
  scale: number;
  /** いちばん上に来たカードの番号（ITEMS の添字）を知らせる */
  onTop?: (i: number) => void;
  /** 案31：送りボタン（束の外＝MobileEvents 側に置く）から束を回すための入口 */
  api?: React.RefObject<DeckApi | null>;
}) {
  const q = useMemo(() => motionValue(1), []);
  const pinned = useRef(true);
  const hold = useRef(0);
  const out = useRef(0);
  const inner = useRef<((dir: 1 | -1) => boolean) | null>(null);
  const { ts, nudges, flow } = useStepCards(
    q,
    pinned,
    hold,
    out,
    kind === "shuffle" ? () => ({ duration: readShuf().dur }) : undefined,
    inner
  );
  const pow = useShufPow();
  /* 何枚進めたか（いちばん上のカード＝ITEMS の後ろから数えて n 枚目） */
  const n = useRef(0);
  const onTopRef = useRef(onTop);
  onTopRef.current = onTop;
  /* 案31：PC と同じ LoopCard で、体験①がいちばん上・その下に②③④（2026-10-14 ヒデさん「体験の1番が一番上で、
     2、3、4と重なっている形に」）。入れ替えも PC と同じ送りボタン（同日 ヒデさん「スマホもボタンに」）。
     ボタンは束の下（MobileEvents の StackScene）に置き、api から回す（束の左右に置くと、後ろを流れる文字に
     重なったため・同日）。上下のスワイプではカードを切らず、いつも場面の切り替えだけ（gate は渡さない）。
     端は無く、ぐるぐる回る（🟡） */
  const deck = useLoopDeck();
  const loopPos = deck.pos;
  useEffect(() => {
    if (kind === "shuffle") onTopRef.current?.(deck.top);
  }, [kind, deck.top]);
  useEffect(() => {
    if (!api || kind !== "shuffle") return;
    api.current = { step: deck.step };
    return () => {
      api.current = null;
    };
  }, [api, kind, deck.step]);
  /* ⚠️ gate は effect の中で渡す。描画中に書くと、案を切り替えた時に
     消える側の後片付けが新しい方の gate を消してしまう */
  useEffect(() => {
    if (kind === "shuffle") return; /* 案31 はボタンで入れ替える。スワイプは場面の切り替えへそのまま流す */
    const fn = (dir: 1 | -1) => {
      const moved = inner.current?.(dir) ?? false;
      if (moved) {
        n.current = Math.max(0, Math.min(ITEMS.length - 1, n.current + dir));
        onTopRef.current?.(ITEMS.length - 1 - n.current);
      }
      return moved;
    };
    gate.current = fn;
    return () => {
      if (gate.current === fn) gate.current = null;
    };
  }, [gate]);
  return (
    <div className="pointer-events-none relative size-full">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          /* 束の中心を、この箱の中心へ。縮めるのも束の中心が基準 */
          transform: `translate(${-STACK_CX}px, ${-STACK_CY}px) scale(${scale})`,
          transformOrigin: `${STACK_CX}px ${STACK_CY}px`,
        }}
      >
        <div
          className="pointer-events-auto absolute inset-0"
          style={
            kind === "shuffle"
              ? { transform: "scale(var(--ev-shuf-card, 1))", transformOrigin: `${STACK_CX}px ${STACK_CY}px` }
              : undefined
          }
        >
          {ITEMS.map((it, i) =>
            kind === "shuffle" ? (
              <LoopCard key={it.title} it={it} i={i} pos={loopPos} pow={pow} />
            ) : (
              <StackCard key={it.title} it={it} i={i} t={ts[i]} nudge={nudges[i]} flow={flow} />
            )
          )}
        </div>
      </div>
    </div>
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
