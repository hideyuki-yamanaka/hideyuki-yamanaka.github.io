"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクション｜さらに追加した案（もとは案21〜30 の10案。
 * 2026-09-16〜17 のヒデさんの選定で 21・23〜28・30 は完全削除し、22 と 29 が残っている）
 * 2026-09-16 ヒデさん依頼。ご指定のアイデアと、没入・3Dの案を混ぜてある。
 *
 *                       スクロールするごとに1枚ずつ右へはけて、次の場面が出てくる【ご指定】
 *   22 四方に散る       中央に「意外とオモロい、網走。」をジャンプ率高めで置き、その後ろから
 *                       スケール0の写真がランダムな方向へゆったり散る。画面外へは出ない。
 *                       ブロークングリッドの位置でホバーカードとして選べる【ご指定】
 *   29 のぞき穴         白い面に丸い穴が開いていて、穴が広がると写真が全部見える
 *
 * 全案の約束（EventSection.tsx から引き継ぎ）
 *   ・動かすのは transform / opacity / clip-path だけ。width・height は毎フレーム変えない
 *   ・useTransform の入力レンジは 0〜1 に収め、必ず増加順（負を渡すとページごと落ちる）
 *   ・p は「画面のちょうど真ん中で 1 になる進捗」
 *   ・トップは 1512×982 の固定キャンバスを縮小表示しているので、寸法は px で持つ
 *   ・3D は親に perspective、子に transform-style: preserve-3d を付ける。
 *     ⚠️ 3D の親に overflow-hidden を掛けると奥行きが潰れるので、外枠で切る
 *
 * 🟡仮置き：カンプは無い。散らばりの位置・角度はこちらで決めた値
 */
import { useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import {
  Caption,
  CardLink,
  HTitle,
  ITEMS,
  PinStage,
  afterHold,
  type EventItem,
} from "./eventParts";

export const EVENT_EXTRA3_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  22: { name: "案22 四方に散る", note: "中央に大きく「意外とオモロい、網走。」。その後ろからスケール0の写真がゆったり四方へ散り、ばらけた位置（ブロークングリッド）で止まる。触ると持ち上がって選べる" },
  29: { name: "案29 のぞき穴", note: "白い面に小さな丸い穴が開いていて、そこから写真が見えている。スクロールで穴が広がり、全部が見える" },
};

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── 中央の重ね束（案22 の始まりの形）────────────────
   【2026-09-17 ヒデさん指示】「写真が4枚重なっていて、それぞれ角度が違う感じで
     4枚見えるような感じに」
   ⚠️ カンプの座標をそのまま使うとカードがほぼ完全に重なって【1枚に見えた】ので、
      角度の符号を左右に振り、中心を少しずつずらして4枚の縁が出るようにした（🟡調整値） */
const STACK_W = 300;
const STACK_H = 412;
const STACK_START = [
  { x: -34, y: -12, r: -5.7 },
  { x: 30, y: -20, r: 4.4 },
  { x: -12, y: 22, r: -2.7 },
  { x: 10, y: 4, r: 1.2 },
];

/** 大見出し（白い面の案で共通）。中央に置く形も用意する */
function Head({ center = false }: { center?: boolean }) {
  return <HTitle className={center ? "text-center" : "px-6 sm:px-[147px]"} />;
}

/* ═══════════ 案22 四方に散る ═══════════
   【ヒデさん指定】「中央揃えの文字で『意外とオモロい、網走。』がジャンプ率高めで置いてあって、
     その後ろからスケール0の写真たちがスクロールするとランダムに四方八方に飛び散る。ゆったり。
     画面外にはいかない。ランダムに散ったブロークングリッドで配置された
     セクションがホバーカードで選べる」 */
function ScatterOut() {
  /* 【2026-09-17 ヒデさん指示】
     「中央に来た時にビューポートが中央に来て、真ん中に来た後に四方に飛び散る。
       一旦画面の固定が入った方がいい」
     → 画面いっぱいの場面を貼りつけ、ためを置いてから散らす。
     「写真が4枚重なっていて、それぞれ角度が違う感じで4枚見える」
     → 始まりは中央の重ね束。カンプと同じ「角度違いで4枚の縁が見える」置き方 */
  return (
    <PinStage length={2.6}>
      {(q) => <ScatterScene q={q} />}
    </PinStage>
  );
}
function ScatterScene({ q }: { q: MotionValue<number> }) {
  const p = afterHold(q, 0.2, 0.92);
  return (
    <div className="relative size-full">
      {ITEMS.map((it, i) => (
        <ScatterCard key={it.title} it={it} i={i} p={p} />
      ))}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <ScatterTitle p={p} />
      </div>
    </div>
  );
}
function ScatterTitle({ p }: { p: MotionValue<number> }) {
  /* 写真が散ったら、見出しは少しだけ引いて主役を写真へ渡す */
  const s = useTransform(p, [0, 0.55], [1, 0.86]);
  const o = useTransform(p, [0, 0.6, 1], [1, 1, 0.75]);
  return (
    <motion.h2
      className="whitespace-nowrap text-center text-[76px] font-thin leading-[1.25] tracking-[-0.01em] text-ink"
      style={{ scale: s, opacity: o }}
    >
      意外とオモロい、
      <br />
      網走。
    </motion.h2>
  );
}
function ScatterCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 始まり：中央で4枚が重なっている。角度と少しのズレで4枚ぶんの縁が見える
     （カンプの重ね置きと同じ考え方。数値は実際の見え方に合わせた🟡） */
  const start = STACK_START[i];
  /* 終わり：四方八方へ。きれいに揃えず、大きさも角度もバラバラ（ブロークングリッド）
     ⚠️ 画面の外へは出さない。中央から見た距離は max 480px に収めている */
  const spot = [
    { x: -430, y: -210, r: -5.5, w: 290, h: 380 },
    { x: 400, y: -250, r: 4.2, w: 250, h: 330 },
    { x: -330, y: 250, r: 3.0, w: 330, h: 240 },
    { x: 440, y: 215, r: -3.6, w: 280, h: 350 },
  ][i];
  /* ゆったり順に散る */
  const from = 0.08 + i * 0.09;
  const to = Math.min(1, from + 0.5);
  const x = useTransform(p, [from, to], [start.x, spot.x]);
  const y = useTransform(p, [from, to], [start.y, spot.y]);
  const w = useTransform(p, [from, to], [STACK_W, spot.w]);
  const h = useTransform(p, [from, to], [STACK_H, spot.h]);
  const rot = useTransform(p, [from, to], [start.r, spot.r]);
  const mx = useTransform(w, (v) => -v / 2);
  const my = useTransform(h, (v) => -v / 2);
  return (
    <motion.div
      className="group absolute left-1/2 top-1/2 z-10"
      style={{
        x,
        y,
        rotate: rot,
        width: w,
        height: h,
        marginLeft: mx,
        marginTop: my,
      }}
    >
      {/* 触ると持ち上がって、説明が出る＝ホバーカード */}
      <div className="size-full transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-[1.04]">
        <CardLink
          it={it}
          className="size-full"
          style={{ boxShadow: "0 16px 44px rgba(0,0,0,.16)" }}
        >
          <img src={it.img} alt={it.title} className="size-full object-cover" />
        </CardLink>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <p className="text-body-12 font-extralight leading-[1.4] text-white/75">
            {it.tag} {it.no}
          </p>
          <p className="text-body-16 font-thin leading-[1.4] text-white">
            {it.title}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════ 案29 のぞき穴 ═══════════
   白い面に小さな丸い穴が開いていて、そこから写真が見えている。
   スクロールで穴が広がって全部が見える */
function Keyhole({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 bg-white sm:gap-[90px]">
      <Head />
      <div className="flex w-full gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <HoleCard key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
      <div className="flex w-full gap-5 px-4 sm:px-[40px]">
        {ITEMS.map((it) => (
          <Caption key={it.title} it={it} className="min-w-0 flex-1" />
        ))}
      </div>
    </div>
  );
}
function HoleCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const from = Math.min(0.45, i * 0.08);
  const r = useTransform(p, [from, 0.72], [8, 82]);
  /* circle(半径% at 中央)。100% を超えると角まで届く */
  const clip = useTransform(r, (v) => `circle(${v.toFixed(1)}% at 50% 50%)`);
  const s = useTransform(p, [from, 0.72], [1.18, 1]);
  return (
    <div className="min-w-0 flex-1">
      <CardLink it={it} className="h-[560px] w-full bg-white">
        {/* ⚠️ 切り取り（clip-path）と寄り（scale）は別の要素に掛ける。
            同じ要素だと切り取った絵ごと拡大されて縁が出る（2026-09-16 実測） */}
        <motion.div className="size-full overflow-hidden" style={{ clipPath: clip }}>
          <motion.img
            src={it.img}
            alt={it.title}
            className="size-full object-cover"
            style={{ scale: s }}
          />
        </motion.div>
      </CardLink>
    </div>
  );
}

/** 案22・29 の入口。EventSection から番号で呼ばれる */
export function ExtraPattern3({ pat, p }: { pat: number; p: MotionValue<number> }) {
  switch (pat) {
    case 22:
      return <ScatterOut />;
    case 29:
      return <Keyhole p={p} />;
    default:
      return null;
  }
}
