"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクション｜追加の案（もとは案11〜20 の10案。
 * 2026-09-16 ヒデさんの選定で 12〜15・17〜20 は完全削除し、11 と 16 が残っている）
 * 2026-09-16 ヒデさん依頼:
 *   「このセクションのデザインを改めて考えてほしい。ユーザーが見飽きないような
 *     ユニークなインタラクションや、写真を魅力的に見せるものをそれぞれ。10案」
 *
 * 10案それぞれの「ひと言でいうと」
 *   11 帯がひらく     細い帯から上下に開いて全景になる（マスク）
 *   12 すれちがう     上の段は右へ、下の段は左へ。二段が逆向きに流れる
 *   13 のぞき窓       枠は動かず、中の写真だけがゆっくり流れる
 *   14 一枚ずつ       中央の大きな1枚が、スクロールで順に入れ替わる
 *   15 横にのびる     細い縦帯が横へ広がって全景になる（11の横版）
 *   16 ずれた四列     4列がそれぞれ違う速さで上下に流れる
 *   17 さわると開く   並んだ4枚のうち、カーソルを乗せた1枚だけが広がる
 *   18 大きな番号     写真の上の巨大な 01〜04 が、写真と逆向きに流れる
 *   19 弧からそろう   弧に沿って散らばった4枚が、まっすぐ一列にそろう
 *   20 手で引ける     横に並んだフィルムを、ドラッグやホイールで引ける
 *
 * 全案の約束（EventSection.tsx から引き継ぎ）
 *   ・動かすのは transform / opacity / clip-path だけ。width・height は毎フレーム変えない
 *     （レイアウトし直しでガタつく。2026-09-15 に実際に起きた）
 *   ・useTransform の入力レンジは 0〜1 に収め、必ず増加順（負を渡すとページごと落ちる）
 *   ・p は「画面のちょうど真ん中で 1 になる進捗」。そこがいちばん良く見える状態
 *   ・トップは 1512×982 の固定キャンバスを縮小表示しているので、寸法は px で持つ
 *
 * 🟡仮置き：カンプは無い。寸法・速さはトップの既存値（余白147px・写真560px 等）を基準に決めた
 */
import { useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import {
  Caption,
  CardLink,
  HTitle,
  ITEMS,
  VTitle,
  type EventItem,
} from "./eventParts";

export const EVENT_EXTRA_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  11: { name: "案11 帯がひらく", note: "細い帯から上下に開いて全景になる。閉じた隙間から少しだけ見えている状態から始まるので、開ききった時の気持ちよさが出る" },
  16: { name: "案16 ずれた四列", note: "4列がそれぞれ違う速さで上下に流れる。縦に長い写真を大きく使えて、スクロールするたび並びが変わって見える" },
};

/* 0〜1 に収めた区間。i 番目が少し遅れて始まり、終わりは4枚そろう */
const seg = (i: number, end = 0.62, stagger = 0.07) => {
  const from = Math.max(0, Math.min(end - 0.0001, i * stagger));
  return [from, end] as const;
};

/** 見出し＋中身＋説明の並びを揃えるための外枠 */
function Frame({
  children,
  captions = true,
  vertical = false,
  className = "",
}: {
  children: React.ReactNode;
  captions?: boolean;
  vertical?: boolean;
  className?: string;
}) {
  if (vertical) {
    return (
      <div className="flex w-full items-start gap-8 pl-6 sm:gap-[69px] sm:pl-[147px]">
        <VTitle className="mt-[40px]" />
        <div className={`flex min-w-0 flex-1 flex-col gap-10 ${className}`}>
          {children}
          {captions && <CaptionRow />}
        </div>
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <HTitle className="px-6 sm:px-[147px]" />
      <div className={`flex w-full flex-col gap-10 ${className}`}>
        {children}
        {captions && <CaptionRow className="px-4 sm:px-[40px]" />}
      </div>
    </div>
  );
}

function CaptionRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full gap-5 ${className}`}>
      {ITEMS.map((it) => (
        <Caption key={it.title} it={it} className="min-w-0 flex-1" />
      ))}
    </div>
  );
}

/* ═══════════ 案11 帯がひらく ═══════════
   細い帯（高さの12%だけ見えている）から、上下へ開いて全景になる。
   開くのは clip-path なので、写真そのものは動かない＝ガタつかない */
function BandOpen({ p }: { p: MotionValue<number> }) {
  return (
    <Frame>
      <div className="flex w-full gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <BandCard key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </Frame>
  );
}
function BandCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const [a, b] = seg(i);
  /* 44% → 0% ／ 44% → 0%（上下から閉じている帯が開く） */
  const clip = useTransform(p, [a, b], [44, 0]);
  const path = useTransform(clip, (v) => `inset(${v}% 0% ${v}% 0%)`);
  const s = useTransform(p, [a, b], [1.12, 1]);
  return (
    <div className="min-w-0 flex-1">
      <CardLink it={it} className="h-[560px] w-full">
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full object-cover"
          style={{ clipPath: path, scale: s }}
        />
      </CardLink>
    </div>
  );
}

/* ═══════════ 案16 ずれた四列 ═══════════
   4列がそれぞれ違う速さで上下に流れる。
   縦に長い写真を大きく使えて、スクロールのたび並びが変わって見える */
function DriftColumns({ p }: { p: MotionValue<number> }) {
  return (
    <Frame captions={false}>
      <div className="flex w-full items-start gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <DriftCol key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </Frame>
  );
}
function DriftCol({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 外側の列は大きく、内側は小さく動かすと「揺らぎ」に見える */
  const amp = [150, -90, 110, -140][i];
  const y = useTransform(p, [0, 1], [amp, -amp]);
  return (
    <motion.div className="flex min-w-0 flex-1 flex-col gap-5" style={{ y }}>
      <CardLink it={it} className="h-[660px] w-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
      <Caption it={it} />
    </motion.div>
  );
}


/** 案11・16 の入口。EventSection から番号で呼ばれる */
export function ExtraPattern({ pat, p }: { pat: number; p: MotionValue<number> }) {
  switch (pat) {
    case 11:
      return <BandOpen p={p} />;
    case 16:
      return <DriftColumns p={p} />;
    default:
      return null;
  }
}
