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

/* ═══════════ 案11 余白で読ませる ═══════════
   変えたところ：レイアウト（余白）
   写真は全幅で大きく、文章は細い柱にして左に寄せる。
   写真と写真の間をたっぷり空けて、目が休むところを作る */
export function V11Margins({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <div className="relative h-[86dvh] w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-[80px] sm:px-[120px] sm:pb-[120px]">
          <HeroTitle spot={spot} size="sm" />
        </div>
      </div>
      {/* 文章は細い柱。右に大きな余白を残して「読む場所」を限定する */}
      <div className="px-6 py-[96px] sm:px-[120px] sm:py-[140px]">
        <div className="w-full max-w-[520px]">
          <Sections spot={spot} root={ref} />
        </div>
      </div>
      {/* 写真は1枚ずつ、間を大きく空けて */}
      <div className="flex flex-col gap-[72px] pb-[120px] sm:gap-[104px]">
        {spot.photos.map((p) => (
          <Photo
            key={p}
            src={p}
            root={ref}
            className="h-[74dvh] w-full sm:h-[86dvh]"
            />
        ))}
      </div>
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[96px] px-6 pb-[180px]">
        <FooterBlocks spot={spot} root={ref} />
      </div>
    </Shell>
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

/* ═══════════ 案16 写真が入れ替わる ═══════════
   変えたところ：見せ方（写真が常に画面いっぱい）
   背景の写真を貼りつけたまま、スクロールに合わせて入れ替える。
   写真の占有率がいちばん高く、文字はその上を静かに流れていく */
export function V16Swap({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: ref, target: stage });
  const shots = [spot.hero, ...spot.photos];
  const n = shots.length;

  return (
    <Shell refEl={ref} dark>
      <BackPill />
      <div ref={stage} className="relative" /* 1枚あたりの滞在を長くして、入れ替わりをゆっくりに（110→170dvh） */
        style={{ height: `${n * 170}dvh` }}>
        <div className="sticky top-0 h-dvh w-full overflow-hidden">
          {shots.map((p, i) => (
            <Swapped key={p + i} src={p} i={i} n={n} p={scrollYProgress} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
          {/* 文字はガラスの札に載せて、写真の上でも読めるように */}
          <div className="absolute inset-x-6 bottom-[72px] sm:inset-x-[120px]">
            <div className="max-w-[560px] bg-white/10 p-7 backdrop-blur-65 sm:p-9">
              <HeroTitle spot={spot} size="sm" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-[640px] max-w-full flex-col gap-[96px] px-6 py-[140px]">
        <Sections spot={spot} root={ref} light />
        <FooterBlocks spot={spot} root={ref} kind="solid" />
      </div>
    </Shell>
  );
}

/** 案16 用：自分の出番の区間だけ見えている1枚 */
function Swapped({
  src,
  i,
  n,
  p,
}: {
  src: string;
  i: number;
  n: number;
  p: import("framer-motion").MotionValue<number>;
}) {
  /* 区間を 0〜1 の中に必ず収める（マイナスや減少順を渡すとページが落ちる） */
  const a = Math.max(0, (i - 0.35) / n);
  const b = i / n;
  const c = Math.min(1, (i + 0.85) / n);
  const d = Math.min(1, (i + 1.1) / n);
  const stops = [a, b, c, d].map((v, k, arr) =>
    k === 0 ? v : Math.max(v, arr[k - 1] + 0.0001)
  );
  const opacity = useTransform(p, stops, i === 0 ? [1, 1, 1, 0] : [0, 1, 1, 0]);
  return (
    <motion.img
      src={src}
      alt=""
      className="absolute inset-0 size-full object-cover"
      style={{ opacity }}
    />
  );
}

/* ═══════════ 案18 写真の格子 ═══════════
   変えたところ：レイアウト（グリッド）
   写真を大小まぜた格子に敷き詰め、文章はその間に小さく挟む。
   一度に複数の写真が目に入るので「場所の空気」がまとめて伝わる */
export function V18Mosaic({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <div className="relative h-[78dvh] w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-[72px] sm:px-[120px] sm:pb-[100px]">
          <HeroTitle spot={spot} size="sm" />
        </div>
      </div>
      <div className="flex flex-col gap-[64px] px-6 py-[84px] sm:px-[60px]">
        {/* 大小まぜた格子。1枚は縦長で背を高く */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {spot.photos.map((p, i) => (
            <Photo
              key={p}
              src={p}
              root={ref}
              className={`w-full ${
                i === 0
                  ? "h-[62dvh] sm:col-span-2 sm:h-[76dvh]"
                  : i === 1
                    ? "h-[52dvh] sm:h-[76dvh]"
                    : "h-[52dvh] sm:col-span-3 sm:h-[64dvh]"
              }`}
            />
          ))}
        </div>
        <div className="mx-auto w-[600px] max-w-full">
          <Sections spot={spot} root={ref} />
        </div>
      </div>
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[96px] px-6 pb-[180px]">
        <FooterBlocks spot={spot} root={ref} />
      </div>
    </Shell>
  );
}

/* ═══════════ 案20 文字が先、写真が追う ═══════════
   変えたところ：見せ方の順番
   短い文がさきに出て、少し遅れて写真が現れる。
   「ことばで期待させてから、写真で見せる」流れ */
export function V20TextFirst({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const late = {
    hidden: { opacity: 0, scale: 1.05, filter: "blur(20px)" },
    show: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: { duration: 1.8, ease: EASE, delay: 0.6 },
    },
  };
  return (
    <Shell refEl={ref}>
      <BackPill />
      <div className="relative h-[88dvh] w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-[80px] sm:px-[120px] sm:pb-[120px]">
          <HeroTitle spot={spot} size="sm" />
        </div>
      </div>
      <div className="flex flex-col gap-[80px] py-[96px]">
        {spot.photos.map((p, i) => (
          <div key={p} className="flex flex-col gap-[36px]">
            {/* さきに文字 */}
            {spot.sections[i] && (
              <motion.div
                className="mx-auto w-[560px] max-w-full px-6"
                variants={revealSlow}
                initial="hidden"
                whileInView="show"
                viewport={{ root: ref, once: true, amount: 0.5 }}
              >
                {spot.sections[i].heading && (
                  <h3 className="mb-4 text-title-24 font-thin leading-[1.5] text-ink">
                    {spot.sections[i].heading}
                  </h3>
                )}
                <p className="text-[length:var(--dt-body)] font-extralight leading-[2.4] tracking-[0.5px] text-ink/90">
                  {spot.sections[i].text}
                </p>
              </motion.div>
            )}
            {/* 少し遅れて写真 */}
            <Photo
              key={p}
              src={p}
              root={ref}
              className="h-[76dvh] w-full sm:h-[86dvh]"
              v={late}
              />
          </div>
        ))}
        {spot.sections.length > spot.photos.length && (
          <div className="mx-auto w-[560px] max-w-full px-6">
            <Sections
              spot={{ ...spot, sections: spot.sections.slice(spot.photos.length) }}
              root={ref}
            />
          </div>
        )}
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

/** 左に小さい見出し、右に本文。余白5案で共通に使う組み方 */
function SideHeadBlock({
  heading,
  text,
  root,
  /** 見出しの柱の幅（案ごとに変える） */
  headW = "sm:w-[200px]",
  /** 本文の柱の幅 */
  bodyW = "sm:max-w-[520px]",
  sticky = false,
}: {
  heading?: string;
  text: string;
  root: React.RefObject<HTMLElement | null>;
  headW?: string;
  bodyW?: string;
  sticky?: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col gap-4 sm:flex-row sm:gap-[80px]"
      variants={revealSlow}
      initial="hidden"
      whileInView="show"
      viewport={{ root, once: true, amount: 0.3 }}
    >
      <div className={`shrink-0 ${headW}`}>
        {heading && (
          <h3
            className={`text-body-14 font-light leading-[1.9] tracking-[0.18em] text-ink/55 ${
              sticky ? "sm:sticky sm:top-[120px]" : ""
            }`}
          >
            {heading}
          </h3>
        )}
      </div>
      <p
        className={`w-full text-[length:var(--dt-body)] font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 ${bodyW}`}
      >
        {text}
      </p>
    </motion.div>
  );
}

/** 余白5案で共通のヒーロー（写真いっぱい・見出しは小さく下に） */
function QuietHero({ spot, h = "h-[88dvh]" }: { spot: SpotDetail; h?: string }) {
  return (
    <div className={`relative w-full overflow-hidden ${h}`}>
      <img src={spot.hero} alt={spot.name} className="size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-6 pb-[80px] sm:px-[120px] sm:pb-[120px]">
        <HeroTitle spot={spot} size="sm" />
      </div>
    </div>
  );
}

/** 余白5案で共通の写真ブロック（枠で包んで、登場の拡大がはみ出さないように） */
function QuietPhoto({
  src,
  root,
  className,
}: {
  src: string;
  root: React.RefObject<HTMLElement | null>;
  className: string;
}) {
  return (
    <Photo src={src} root={root} className={className} />
  );
}

/* ═══════════ 案22 見出しが貼りつく ═══════════
   変えたところ：インタラクション（左の見出しだけ止まる）
   本文を読んでいる間、左の小さな見出しが画面に貼りついたまま残る。
   いま何の話を読んでいるかが、余白の中にずっと置かれている */
export function V22StickyHead({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <QuietHero spot={spot} />
      <div className="flex flex-col gap-[140px] px-6 py-[130px] sm:px-[120px]">
        {spot.sections.map((s, i) => (
          <SideHeadBlock
            key={i}
            heading={s.heading}
            text={s.text}
            root={ref}
            headW="sm:w-[240px]"
            sticky
          />
        ))}
      </div>
      <div className="flex flex-col gap-[72px] pb-[130px]">
        {spot.photos.map((p) => (
          <QuietPhoto
            key={p}
            src={p}
            root={ref}
            className="h-[74dvh] w-full sm:h-[86dvh]"
          />
        ))}
      </div>
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[96px] px-6 pb-[180px]">
        <FooterBlocks spot={spot} root={ref} />
      </div>
    </Shell>
  );
}

/* ═══════════ 案23 右三分の一に本文 ═══════════
   変えたところ：レイアウト（余白の割り当て）
   本文を右の1/3だけに寄せ、左の2/3は写真と余白のために空けておく。
   写真は左いっぱいまで伸びて、文章は右の端に静かに添う */
export function V23RightColumn({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <QuietHero spot={spot} h="h-[92dvh]" />
      <div className="flex flex-col gap-[120px] py-[130px]">
        {spot.photos.map((p, i) => (
          <div key={p} className="flex flex-col gap-10">
            {/* 写真は左端いっぱい・右に余白を残す */}
            <QuietPhoto
              src={p}
              root={ref}
              className="h-[62dvh] w-full sm:h-[82dvh] sm:w-[78%]"
            />
            {spot.sections[i] && (
              <motion.div
                className="flex justify-end px-6 sm:px-[120px]"
                variants={revealSlow}
                initial="hidden"
                whileInView="show"
                viewport={{ root: ref, once: true, amount: 0.3 }}
              >
                <div className="w-full sm:w-[34%]">
                  {spot.sections[i].heading && (
                    <h3 className="mb-4 text-body-13 font-light leading-[1.9] tracking-[0.18em] text-ink/55">
                      {spot.sections[i].heading}
                    </h3>
                  )}
                  <p className="text-[length:var(--dt-body)] font-extralight leading-[2.5] tracking-[0.5px] text-ink/90">
                    {spot.sections[i].text}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        ))}
        {spot.sections.length > spot.photos.length && (
          <div className="flex justify-end px-6 sm:px-[120px]">
            <div className="w-full sm:w-[34%]">
              <Sections
                spot={{ ...spot, sections: spot.sections.slice(spot.photos.length) }}
                root={ref}
              />
            </div>
          </div>
        )}
      </div>
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[96px] px-6 pb-[180px]">
        <FooterBlocks spot={spot} root={ref} />
      </div>
    </Shell>
  );
}
