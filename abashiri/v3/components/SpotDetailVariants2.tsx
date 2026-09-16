"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * ぼーっとスポット詳細ページ｜追加の10案（案11〜20）
 * 2026-09-16 ヒデさん依頼:
 *   「レイアウト・文字組み・見せ方・インタラクションを変えたパターンを10案。
 *     今のベースでミニマムだけど余白をうまく使い、文字が目に入ってくる。
 *     写真が主役なので、スクロールしても写真がパッと目に入って、
 *     その補足としてテキストが入ってくる。写真が6〜7割を占める形」
 *
 * 全案の共通ルール
 *   ・**写真の占有率 6〜7割**：画面の高さに対して写真の塊が 60〜70% を占めるよう、
 *     写真は 62〜78dvh、文章の柱は最大 520〜640px に抑える
 *   ・動かしてよいのは transform / opacity / clip-path だけ（幅や高さは動かさない）
 *   ・このページは自前のスクロール容器（html/body が overflow:hidden のため）。
 *     スクロール連動は容器 ref を渡した useScroll で取る
 *   ・案ごとの「何を変えたか」が分かる名前を付ける（調整パネルに出る）
 *
 * 🟡仮置き：このページのカンプは無い。数値は既存のトンマナから流用
 *   （Noto Thin/ExtraLight・white/10 + blur65 のガラス・body-14 行間2 字間0.7px）
 */
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  BackPill,
  FooterBlocks,
  HeroTitle,
  Sections,
  reveal,
  EASE,
  type VProps,
} from "./SpotDetailVariants";
import type { SpotDetail } from "./spotDetailData";
import SiteFooter from "./SiteFooter";

/* 画面に入ったら写真がブラーから立ち上がる。
   【2026-09-16 ヒデさん指示】「ゆったりできるのがこのサイトの魅力」なので、
   1.0秒 → 1.7秒 に伸ばした。文字よりわずかに先に立ち上がるのは変えていない */
const photoIn = {
  hidden: { opacity: 0, scale: 1.04, filter: "blur(18px)" },
  show: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 1.7, ease: EASE },
  },
};

/* 文字のゆっくり版。共通の reveal（1.2秒）だと、この10案の間合いには速い。
   ⚠️ 共通の reveal は案1〜10 が使っているので触らず、ここだけ別に持つ */
const revealSlow = {
  hidden: { opacity: 0, y: 32, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.9, ease: EASE },
  },
};


/** 写真1枚。**枠は動かさず、中の写真だけ**をふわっと拡大しながら出す。
    ⚠️ 枠(div)ごと scale すると、枠そのものが左右にはみ出す
    （2026-09-16 実測：案19で30px・案20で38px はみ出していた）。
    overflow-hidden は「中身」を切るので、動かすのは必ず内側の img にする */
function Photo({
  src,
  root,
  className,
  v = photoIn,
}: {
  src: string;
  root: React.RefObject<HTMLElement | null>;
  className: string;
  v?: typeof photoIn;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt=""
        className="size-full object-cover"
        variants={v}
        initial="hidden"
        whileInView="show"
        viewport={{ root, once: true, amount: 0.2 }}
      />
    </div>
  );
}

/** 全案で使うスクロール容器 */
function Shell({
  children,
  refEl,
  dark = false,
}: {
  children: React.ReactNode;
  refEl: React.RefObject<HTMLElement | null>;
  dark?: boolean;
}) {
  return (
    /* ⚠️ overflow-x-hidden は必須。写真の登場アニメで一瞬 scale を掛けるため、
       全幅の写真が左右に数十px はみ出してページごと横スクロールしてしまう
       （2026-09-16 実測：案15で21px・案19で30px・案20で38px） */
    <main
      ref={refEl}
      className={`h-dvh overflow-y-auto overflow-x-hidden overscroll-contain ${dark ? "bg-ink" : "bg-white"}`}
    >
      {children}
      <SiteFooter />
    </main>
  );
}

/* ═══════════ 案12 縦書きの見出し ═══════════
   変えたところ：文字組み
   名前と小見出しを縦書きにして写真の右脇に立てる。
   本文は横書きのまま細い柱に。日本語の縦組みで「静けさ」を出す */
export function V12Vertical({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <div className="relative h-[92dvh] w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/45 to-transparent" />
        {/* 縦書きの名前。右端に立てて、写真の邪魔をしない */}
        <div className="absolute right-6 top-[10dvh] flex items-start gap-5 sm:right-[96px]">
          <h1 className="[writing-mode:vertical-rl] text-title-34 font-thin leading-[1.6] tracking-[0.2em] text-white sm:text-title-56">
            {spot.name}
          </h1>
          <p className="[writing-mode:vertical-rl] text-body-13 font-extralight leading-[2] tracking-[0.3em] text-white/75">
            {spot.category} {spot.no}　{spot.kana}
          </p>
        </div>
        <p className="absolute inset-x-6 bottom-[64px] max-w-[520px] text-body-14 font-extralight leading-[2] tracking-[0.7px] text-white/90 sm:inset-x-[120px]">
          {spot.lead}
        </p>
      </div>
      {/* 本文：小見出しだけ縦書きで右に添える */}
      <div className="flex flex-col gap-[96px] px-6 py-[110px] sm:px-[120px]">
        {spot.sections.map((s, i) => (
          <motion.div
            key={i}
            className="flex justify-between gap-8"
            variants={revealSlow}
            initial="hidden"
            whileInView="show"
            viewport={{ root: ref, once: true, amount: 0.3 }}
          >
            <p className="max-w-[560px] text-[length:var(--dt-body)] font-extralight leading-[2.4] tracking-[0.5px] text-ink/90">
              {s.text}
            </p>
            {s.heading && (
              <h3 className="hidden shrink-0 [writing-mode:vertical-rl] text-title-24 font-thin leading-[1.6] tracking-[0.2em] text-ink sm:block">
                {s.heading}
              </h3>
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex flex-col gap-[56px] pb-[120px]">
        {spot.photos.map((p) => (
          <Photo
            key={p}
            src={p}
            root={ref}
            className="h-[82dvh] w-full"
            />
        ))}
      </div>
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[96px] px-6 pb-[180px]">
        <FooterBlocks spot={spot} root={ref} />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   余白を生かした5案（案21〜25）
   2026-09-16 ヒデさん依頼:
     「例えば左側に小さく見出しがあって、右側に本文があるなど、
       余白を生かしたデザイン案も新たに5案ぐらい」
   共通の考え方
     ・見出しは小さく、左に。本文は右の細い柱に。間に大きな余白を取る
     ・写真は全幅か、それに近い大きさで主役のまま（本編で6〜7割）
     ・動きはすべて長め（写真1.7秒・文字1.9秒）。急がせない
   ═══════════════════════════════════════════════════════════ */
