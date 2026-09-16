"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクション｜さらに10案（案21〜30）
 * 2026-09-16 ヒデさん依頼。ご指定のアイデアと、没入・3Dの案を混ぜてある。
 *
 *   21 机の上           真っ白な画面に、写真が机にパンパンと置かれたように散っている。
 *                       スクロールするごとに1枚ずつ右へはけて、次の場面が出てくる【ご指定】
 *   22 四方に散る       中央に「意外とオモロい、網走。」をジャンプ率高めで置き、その後ろから
 *                       スケール0の写真がランダムな方向へゆったり散る。画面外へは出ない。
 *                       ブロークングリッドの位置でホバーカードとして選べる【ご指定】
 *   23 曲がる帯         写真が1枚の帯になってゆるく湾曲。奥行きのある3Dで手前に迫ってくる
 *   24 めくれる紙       4枚がカードのように奥から起き上がって正面を向く（rotateX）
 *   25 回る柱           4枚が円柱の面に貼られていて、スクロールで柱がゆっくり回る
 *   26 奥から前へ       遠くにあった4枚が、奥行きを保ったまま手前へ進んでくる
 *   27 しおりが開く     本のページのように、左右から観音開きで開く（rotateY）
 *   28 白に浮かぶ       真っ白な面に写真が影だけで浮き、スクロールで静かに定位置へ降りる
 *   29 のぞき穴         白い面に丸い穴が開いていて、穴が広がると写真が全部見える
 *   30 重ねて配る       中央で重なっていた4枚が、トランプを配るように順に置かれる
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
  type EventItem,
} from "./eventParts";

export const EVENT_EXTRA3_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  21: { name: "案21 机の上", note: "真っ白な画面に、写真が机にパンパンと置かれたように少しずつ傾いて散っている。スクロールするごとに1枚ずつ右へはけて、次の写真が出てくる" },
  22: { name: "案22 四方に散る", note: "中央に大きく「意外とオモロい、網走。」。その後ろからスケール0の写真がゆったり四方へ散り、ばらけた位置（ブロークングリッド）で止まる。触ると持ち上がって選べる" },
  23: { name: "案23 曲がる帯", note: "4枚が1本の帯につながって、ゆるく湾曲しながら手前に迫ってくる。3Dの奥行きで真ん中がいちばん近い" },
  24: { name: "案24 めくれる紙", note: "奥に倒れていた4枚が、紙が起き上がるように正面を向く（横軸の回転）。立ち上がりきった時がいちばん良く見える" },
  25: { name: "案25 回る柱", note: "4枚が見えない円柱の面に貼られていて、スクロールに合わせて柱がゆっくり回る。奥の写真は小さく暗く見える" },
  26: { name: "案26 奥から前へ", note: "遠くに小さくあった4枚が、前後の差を保ったまま手前へ進んでくる。まっすぐ近づいてくる没入感" },
  27: { name: "案27 しおりが開く", note: "本を開くように、左右2枚ずつが観音開きで正面を向く（縦軸の回転）。閉じた状態から開ききるまでが見どころ" },
  28: { name: "案28 白に浮かぶ", note: "真っ白な面に、写真が影だけで浮いている。スクロールで静かに定位置へ降りて影が薄くなる。いちばん静かな案" },
  29: { name: "案29 のぞき穴", note: "白い面に小さな丸い穴が開いていて、そこから写真が見えている。スクロールで穴が広がり、全部が見える" },
  30: { name: "案30 重ねて配る", note: "中央で重なっていた4枚が、トランプを配るように1枚ずつ定位置へ置かれる。置かれるたび少し傾く" },
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** 大見出し（白い面の案で共通）。中央に置く形も用意する */
function Head({ center = false }: { center?: boolean }) {
  return <HTitle className={center ? "text-center" : "px-6 sm:px-[147px]"} />;
}

/* ═══════════ 案21 机の上 ═══════════
   【ヒデさん指定】「真っ白な画面で、カードが積み重なった形。写真が机の上に
     パンパンパンってランダムに置いてあるような形。スクロールするごとに
     写真が右にはけて、次の場面が出てくる」
   → 4枚を少しずつずらして重ね置き。スクロールが進むごとに、上の1枚が
     右へすーっとはけて、下の1枚が主役になる */
function OnTheDesk({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 bg-white sm:gap-[90px]">
      <Head />
      <div className="relative mx-auto h-[620px] w-[1100px] max-w-[92%]">
        {ITEMS.map((it, i) => (
          <DeskCard key={it.title} it={it} i={i} p={p} />
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
function DeskCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 机に置いた時の、ちょっとずつ違う置き方 */
  const spot = [
    { x: -24, y: -14, r: -3.4 },
    { x: 18, y: 6, r: 2.2 },
    { x: -10, y: 18, r: -1.4 },
    { x: 26, y: -6, r: 3.1 },
  ][i];
  /* はける順番：上に乗っている（＝i が大きい）ものから右へ消えていく */
  const order = ITEMS.length - 1 - i;
  const from = Math.min(0.9, 0.16 + order * 0.2);
  const to = Math.min(1, from + 0.18);
  /* いちばん下の1枚は最後まで残す */
  const last = i === 0;
  const x = useTransform(p, [from, to], [spot.x, last ? spot.x : 1180]);
  const rot = useTransform(p, [from, to], [spot.r, last ? spot.r : 9]);
  const o = useTransform(p, [from, to], [1, last ? 1 : 0]);
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 h-[560px] w-[400px]"
      style={{
        x,
        y: spot.y,
        rotate: rot,
        opacity: o,
        marginLeft: -200,
        marginTop: -280,
        zIndex: i + 1,
        boxShadow: "0 18px 50px rgba(0,0,0,.14)",
      }}
    >
      <CardLink it={it} className="size-full bg-white">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/* ═══════════ 案22 四方に散る ═══════════
   【ヒデさん指定】「中央揃えの文字で『意外とオモロい、網走。』がジャンプ率高めで置いてあって、
     その後ろからスケール0の写真たちがスクロールするとランダムに四方八方に飛び散る。ゆったり。
     画面外にはいかない。ランダムに散ったブロークングリッドで配置された
     セクションがホバーカードで選べる」 */
function ScatterOut({ p }: { p: MotionValue<number> }) {
  return (
    <div className="relative mx-auto h-[860px] w-full max-w-[1420px] px-4 sm:px-[40px]">
      {/* 散らばる写真（文字より後ろ） */}
      {ITEMS.map((it, i) => (
        <ScatterCard key={it.title} it={it} i={i} p={p} />
      ))}
      {/* 中央の大見出し。ジャンプ率を上げるためここだけ大きく出す */}
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
  /* 四方八方（左上・右上・左下・右下）へ。
     ブロークングリッド＝きれいに揃えず、大きさも角度もバラバラにする。
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
  const x = useTransform(p, [from, to], [0, spot.x]);
  const y = useTransform(p, [from, to], [0, spot.y]);
  const s = useTransform(p, [from, to], [0, 1]);
  const rot = useTransform(p, [from, to], [0, spot.r]);
  return (
    <motion.div
      className="group absolute left-1/2 top-1/2 z-10"
      style={{
        x,
        y,
        scale: s,
        rotate: rot,
        width: spot.w,
        height: spot.h,
        marginLeft: -spot.w / 2,
        marginTop: -spot.h / 2,
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

/* ── 3D の土台 ──────────────────────────────
   ⚠️ 3D の箱に overflow-hidden を掛けると奥行きが潰れる。
      はみ出しは【外側の枠】で切る（section 側に overflow-x-clip がある） */
function Deep({
  children,
  perspective = 1400,
  className = "",
}: {
  children: React.ReactNode;
  perspective?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ perspective: `${perspective}px`, transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

/* ═══════════ 案23 曲がる帯 ═══════════
   4枚が1本の帯につながって、ゆるく湾曲しながら手前に迫ってくる。
   真ん中の2枚がいちばん近く、両端が奥へ逃げる */
function BentStrip({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <Head />
      <Deep className="flex w-full justify-center" perspective={1100}>
        <div className="flex" style={{ transformStyle: "preserve-3d" }}>
          {ITEMS.map((it, i) => (
            <BendCard key={it.title} it={it} i={i} p={p} />
          ))}
        </div>
      </Deep>
      <div className="flex w-full gap-5 px-4 sm:px-[40px]">
        {ITEMS.map((it) => (
          <Caption key={it.title} it={it} className="min-w-0 flex-1" />
        ))}
      </div>
    </div>
  );
}
function BendCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 帯を曲げる：内側ほど手前（Zが大きい）、外側ほど内向きに回る */
  const rotY = [26, 9, -9, -26][i];
  const z = [-150, 0, 0, -150][i];
  const ry = useTransform(p, [0, 0.7], [0, rotY]);
  const tz = useTransform(p, [0, 0.7], [-420, z]);
  const o = useTransform(p, [0, 0.35], [0.25, 1]);
  return (
    <motion.div
      className="h-[520px] w-[330px] shrink-0"
      style={{
        rotateY: ry,
        z: tz,
        opacity: o,
        transformStyle: "preserve-3d",
        boxShadow: "0 24px 60px rgba(0,0,0,.18)",
      }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/* ═══════════ 案24 めくれる紙 ═══════════
   奥に倒れていた4枚が、紙が起き上がるように正面を向く（横軸の回転） */
function PaperFlip({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <Head />
      <Deep className="flex w-full justify-center gap-[10px] px-4 sm:px-[40px]" perspective={1500}>
        {ITEMS.map((it, i) => (
          <FlipCard key={it.title} it={it} i={i} p={p} />
        ))}
      </Deep>
      <div className="flex w-full gap-5 px-4 sm:px-[40px]">
        {ITEMS.map((it) => (
          <Caption key={it.title} it={it} className="min-w-0 flex-1" />
        ))}
      </div>
    </div>
  );
}
function FlipCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const from = Math.min(0.5, i * 0.07);
  const rx = useTransform(p, [from, 0.72], [-72, 0]);
  const ty = useTransform(p, [from, 0.72], [90, 0]);
  const o = useTransform(p, [from, from + 0.2], [0, 1]);
  return (
    <motion.div
      className="h-[560px] min-w-0 flex-1"
      style={{
        rotateX: rx,
        y: ty,
        opacity: o,
        transformOrigin: "bottom center",
        transformStyle: "preserve-3d",
        boxShadow: "0 22px 56px rgba(0,0,0,.16)",
      }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/* ═══════════ 案25 回る柱 ═══════════
   4枚が見えない円柱の面に貼られていて、スクロールで柱がゆっくり回る */
function TurnColumn({ p }: { p: MotionValue<number> }) {
  const rot = useTransform(p, [0, 1], [-46, 46]);
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <Head />
      <Deep className="flex h-[600px] w-full items-center justify-center" perspective={1600}>
        <motion.div
          className="relative size-0"
          style={{ rotateY: rot, transformStyle: "preserve-3d" }}
        >
          {ITEMS.map((it, i) => (
            <ColumnFace key={it.title} it={it} i={i} p={p} />
          ))}
        </motion.div>
      </Deep>
      <div className="flex w-full gap-5 px-4 sm:px-[40px]">
        {ITEMS.map((it) => (
          <Caption key={it.title} it={it} className="min-w-0 flex-1" />
        ))}
      </div>
    </div>
  );
}
function ColumnFace({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 円柱のまわりに4面。半径 620px */
  const angle = -33 + i * 22;
  const s = useTransform(p, [0, 0.4], [0.8, 1]);
  return (
    <motion.div
      className="absolute left-0 top-0 h-[520px] w-[330px]"
      style={{
        scale: s,
        marginLeft: -165,
        marginTop: -260,
        transform: `rotateY(${angle}deg) translateZ(620px)`,
        transformStyle: "preserve-3d",
        boxShadow: "0 24px 60px rgba(0,0,0,.2)",
      }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
      {/* 奥へ回った面は暗くなる（円柱らしさ） */}
      <span
        className="pointer-events-none absolute inset-0 bg-ink"
        style={{ opacity: Math.abs(angle) / 140 }}
      />
    </motion.div>
  );
}

/* ═══════════ 案26 奥から前へ ═══════════
   遠くに小さくあった4枚が、前後の差を保ったまま手前へ進んでくる */
function ComeForward({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <Head />
      <Deep className="flex h-[640px] w-full items-center justify-center" perspective={1200}>
        <div className="relative size-0" style={{ transformStyle: "preserve-3d" }}>
          {ITEMS.map((it, i) => (
            <ForwardCard key={it.title} it={it} i={i} p={p} />
          ))}
        </div>
      </Deep>
      <div className="flex w-full gap-5 px-4 sm:px-[40px]">
        {ITEMS.map((it) => (
          <Caption key={it.title} it={it} className="min-w-0 flex-1" />
        ))}
      </div>
    </div>
  );
}
function ForwardCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const lane = [-520, -175, 175, 520][i];
  const depth = [-260, -90, -90, -260][i];
  const tz = useTransform(p, [0, 0.72], [depth - 1100, depth]);
  const o = useTransform(p, [0, 0.3], [0, 1]);
  return (
    <motion.div
      className="absolute left-0 top-0 h-[520px] w-[320px]"
      style={{
        x: lane,
        z: tz,
        opacity: o,
        marginLeft: -160,
        marginTop: -260,
        transformStyle: "preserve-3d",
        boxShadow: "0 24px 60px rgba(0,0,0,.18)",
      }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/* ═══════════ 案27 しおりが開く ═══════════
   本を開くように、左右2枚ずつが観音開きで正面を向く（縦軸の回転） */
function BookOpen({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <Head />
      <Deep className="flex w-full justify-center" perspective={1700}>
        <div className="flex" style={{ transformStyle: "preserve-3d" }}>
          {ITEMS.map((it, i) => (
            <BookCard key={it.title} it={it} i={i} p={p} />
          ))}
        </div>
      </Deep>
      <div className="flex w-full gap-5 px-4 sm:px-[40px]">
        {ITEMS.map((it) => (
          <Caption key={it.title} it={it} className="min-w-0 flex-1" />
        ))}
      </div>
    </div>
  );
}
function BookCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 内側の2枚を軸に、外側の2枚が開いてくる */
  const start = [78, 38, -38, -78][i];
  const origin = i < 2 ? "right center" : "left center";
  const ry = useTransform(p, [0.05, 0.75], [start, 0]);
  const o = useTransform(p, [0, 0.3], [0.3, 1]);
  return (
    <motion.div
      className="h-[540px] w-[320px] shrink-0"
      style={{
        rotateY: ry,
        opacity: o,
        transformOrigin: origin,
        transformStyle: "preserve-3d",
        boxShadow: "0 22px 56px rgba(0,0,0,.18)",
      }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/* ═══════════ 案28 白に浮かぶ ═══════════
   真っ白な面に写真が影だけで浮いていて、静かに定位置へ降りる */
function FloatOnWhite({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 bg-white sm:gap-[90px]">
      <Head />
      <div className="flex w-full gap-[26px] px-4 sm:px-[80px]">
        {ITEMS.map((it, i) => (
          <FloatCard key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
      <div className="flex w-full gap-5 px-4 sm:px-[80px]">
        {ITEMS.map((it) => (
          <Caption key={it.title} it={it} className="min-w-0 flex-1" />
        ))}
      </div>
    </div>
  );
}
function FloatCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const from = Math.min(0.45, i * 0.08);
  const y = useTransform(p, [from, 0.72], [-90 - i * 18, 0]);
  const s = useTransform(p, [from, 0.72], [1.08, 1]);
  const o = useTransform(p, [from, from + 0.2], [0, 1]);
  /* 浮いている間は影が大きく、降りると小さくなる */
  const sh = useTransform(p, [from, 0.72], [64, 18]);
  const shadow = useTransform(sh, (v) => `0 ${v}px ${v * 2}px rgba(0,0,0,.16)`);
  return (
    <motion.div
      className="h-[560px] min-w-0 flex-1"
      style={{ y, scale: s, opacity: o, boxShadow: shadow }}
    >
      <CardLink it={it} className="size-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
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

/* ═══════════ 案30 重ねて配る ═══════════
   中央で重なっていた4枚が、トランプを配るように1枚ずつ定位置へ置かれる */
function DealOut({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex w-full flex-col gap-12 bg-white sm:gap-[90px]">
      <Head />
      <div className="relative mx-auto h-[600px] w-[1360px] max-w-[94%]">
        {ITEMS.map((it, i) => (
          <DealCard key={it.title} it={it} i={i} p={p} />
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
function DealCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const slot = [-510, -170, 170, 510][i];
  const tilt = [-2.6, 1.6, -1.2, 2.4][i];
  const from = Math.min(0.55, 0.05 + i * 0.13);
  const to = Math.min(1, from + 0.26);
  const x = useTransform(p, [from, to], [0, slot]);
  const rot = useTransform(p, [from, to], [0, tilt]);
  const o = useTransform(p, [from, from + 0.08], [0, 1]);
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 h-[540px] w-[320px]"
      style={{
        x,
        rotate: rot,
        opacity: o,
        marginLeft: -160,
        marginTop: -270,
        zIndex: 10 - i,
        boxShadow: "0 18px 50px rgba(0,0,0,.16)",
      }}
    >
      <CardLink it={it} className="size-full bg-white">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/** 案21〜30 の入口。EventSection から番号で呼ばれる */
export function ExtraPattern3({ pat, p }: { pat: number; p: MotionValue<number> }) {
  switch (pat) {
    case 21:
      return <OnTheDesk p={p} />;
    case 22:
      return <ScatterOut p={p} />;
    case 23:
      return <BentStrip p={p} />;
    case 24:
      return <PaperFlip p={p} />;
    case 25:
      return <TurnColumn p={p} />;
    case 26:
      return <ComeForward p={p} />;
    case 27:
      return <BookOpen p={p} />;
    case 28:
      return <FloatOnWhite p={p} />;
    case 29:
      return <Keyhole p={p} />;
    case 30:
      return <DealOut p={p} />;
    default:
      return null;
  }
}
