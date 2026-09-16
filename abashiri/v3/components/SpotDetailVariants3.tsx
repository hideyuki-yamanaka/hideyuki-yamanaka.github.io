"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * ぼーっとスポット詳細ページ｜追加の12案（案26〜37）
 * 2026-09-16 ヒデさん依頼を4グループに分けて作った：
 *
 *   A. 案26      サムネイルが「パツッ」と切れず、グラデで白い解説の面に移る
 *   B. 案27〜31  見出しを付けて「左に見出し・右に本文」。余白を生かした5案。
 *                2カラムの案（案3のような組み）も入れる。
 *                ⚠️ 色は付けない。カラムは【罫線と余白だけ】で表す
 *   C. 案32〜36  左カラムに目次。スクロール位置に応じて目次が動く5案
 *   D. 案37      最初は画面いっぱい（100dvh）のサムネ＋左下に名前。
 *                スクロールすると裏がぼけて、白いコンテンツの面になる
 *
 * 全案の共通ルール（案11〜24 から引き継ぎ）
 *   ・動かしてよいのは transform / opacity / filter だけ（幅や高さは動かさない）
 *   ・写真の登場アニメは **内側の img** に掛ける。枠ごと scale すると横にはみ出す
 *   ・このページは自前のスクロール容器。スクロール連動は容器 ref を渡した useScroll で取る
 *   ・トップページと違い、詳細ページは縮小キャンバスの外なので dvh がそのまま使える
 *
 * 🟡仮置き：このページのカンプは無い。数値は既存のトンマナから流用
 *   （Noto Thin/ExtraLight・本文 body-16 行間2.4 字間0.5px・罫線は ink/12）
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  BackPill,
  InfoTable,
  MapEmbed,
  Points,
  HeroTitle,
  EASE,
  type VProps,
} from "./SpotDetailVariants";
import type { SpotDetail } from "./spotDetailData";
import SiteFooter from "./SiteFooter";

/* ═══════════════════════════════════════════════════
   共通のしくみ
   ═══════════════════════════════════════════════════ */

/** 文字のゆっくり登場（案11〜24 と同じ間合い） */
const revealSlow = {
  hidden: { opacity: 0, y: 32, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.9, ease: EASE },
  },
};

/** 写真のゆっくり登場 */
const photoIn = {
  hidden: { opacity: 0, scale: 1.04, filter: "blur(18px)" },
  show: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 1.7, ease: EASE },
  },
};

/** 全案で使うスクロール容器。
    ⚠️ overflow-x-hidden は必須（写真の登場で一瞬 scale を掛けるため） */
function Shell({
  children,
  refEl,
}: {
  children: React.ReactNode;
  refEl: React.RefObject<HTMLElement | null>;
}) {
  return (
    <main
      ref={refEl}
      className="h-dvh overflow-y-auto overflow-x-hidden overscroll-contain bg-white"
    >
      {children}
      <SiteFooter />
    </main>
  );
}

/** 写真1枚。枠は動かさず、中の写真だけをふわっと出す */
function Photo({
  src,
  root,
  className,
}: {
  src: string;
  root: React.RefObject<HTMLElement | null>;
  className: string;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt=""
        className="size-full object-cover"
        variants={photoIn}
        initial="hidden"
        whileInView="show"
        viewport={{ root, once: true, amount: 0.2 }}
      />
    </div>
  );
}

/* ── 見出しを「よしなに」付ける ──────────────────
   【2026-09-16 ヒデさん指示】「コンテンツに見出しをつけて。よしなに」
   本家（visit-abashiri.jp）の本文は、最初の段落に見出しが無いことが多い。
   そこで次の順で埋める：
     1. データに heading があればそれを使う（本家の見出しが最優先）
     2. 1段落目 → カテゴリで言い分ける（場所なら「この場所のこと」）
     3. 2段落目以降 → 「もうすこし詳しく」「ここでの過ごし方」…
   🟡仮置き：この日本語はこちらで考えたもの。本家の見出しではない */
const FILL_HEADS = [
  "もうすこし詳しく",
  "ここでの過ごし方",
  "知っておくと楽しい",
  "あわせて読みたい",
];

function headsOf(spot: SpotDetail): { heading: string; text: string }[] {
  const first = spot.category.includes("体験")
    ? "この体験のこと"
    : "この場所のこと";
  let fill = 0;
  return spot.sections.map((s, i) => ({
    heading:
      s.heading ?? (i === 0 ? first : FILL_HEADS[fill++ % FILL_HEADS.length]),
    text: s.text,
  }));
}

/** 目次に出す項目（本文の見出し＋下の3ブロック） */
function tocOf(spot: SpotDetail) {
  return [
    ...headsOf(spot).map((s, i) => ({ id: `s${i}`, label: s.heading })),
    { id: "pt", label: "おすすめポイント" },
    { id: "info", label: "基本情報" },
    { id: "map", label: "周辺マップ" },
  ];
}

/* ── スクロール位置から「いま読んでいる項目」を出す ──────
   ⚠️ このページは html/body ではなく自前の容器がスクロールするので、
      IntersectionObserver の root も getBoundingClientRect の基準も
      容器そのものにする（window 基準だと1つもヒットしない） */
function useSpy(root: React.RefObject<HTMLElement | null>, count: number) {
  const [active, setActive] = useState(0);

  const scan = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const base = el.getBoundingClientRect().top;
    /* 画面の上から 38% の高さを「読んでいる線」とする */
    const line = el.clientHeight * 0.38;
    let cur = 0;
    for (let i = 0; i < count; i++) {
      const n = el.querySelector<HTMLElement>(`[data-sec="${i}"]`);
      if (n && n.getBoundingClientRect().top - base <= line) cur = i;
    }
    setActive(cur);
  }, [root, count]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
    };
    scan();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [root, scan]);

  return active;
}

/** 目次をクリックしたらそこまで滑らかに移動する */
function useJump(root: React.RefObject<HTMLElement | null>) {
  return useCallback(
    (i: number) => {
      const el = root.current;
      const n = el?.querySelector<HTMLElement>(`[data-sec="${i}"]`);
      if (!el || !n) return;
      const y =
        n.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop -
        el.clientHeight * 0.18;
      el.scrollTo({ top: y, behavior: "smooth" });
    },
    [root],
  );
}

/* ── 下の3ブロック（色を使わず、罫線と余白だけで組む）────── */
function QuietBlocks({
  spot,
  root,
  from,
}: {
  spot: SpotDetail;
  root: React.RefObject<HTMLElement | null>;
  /** data-sec の通し番号の続き（目次と合わせるため） */
  from: number;
}) {
  const V = {
    variants: revealSlow,
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: { root, once: true, amount: 0.2 },
  };
  const head =
    "text-title-28 font-thin leading-[1.6] text-ink [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";
  return (
    <>
      <motion.section
        data-sec={from}
        className="flex flex-col gap-7 border-t border-ink/12 pt-10"
        {...V}
      >
        <h2 className={head}>担当者からのおすすめポイント</h2>
        <Points spot={spot} />
      </motion.section>
      <motion.section
        data-sec={from + 1}
        className="flex flex-col gap-7 border-t border-ink/12 pt-10"
        {...V}
      >
        <h2 className={head}>基本情報</h2>
        <InfoTable spot={spot} />
      </motion.section>
      <motion.section
        data-sec={from + 2}
        className="flex flex-col gap-7 border-t border-ink/12 pt-10"
        {...V}
      >
        <h2 className={head}>周辺マップ</h2>
        <MapEmbed spot={spot} />
      </motion.section>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   A. 案26  グラデで白へ移る
   変えたところ：サムネイルと本文の境目
   写真の下側をそのまま白へ溶かして、どこからが解説か分からないくらい
   なだらかに本文の面へ入る。フッターのグラデ案と同じ考え方
   ═══════════════════════════════════════════════════ */
export function V26Dissolve({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  return (
    <Shell refEl={ref}>
      <BackPill />
      {/* 写真は 155dvh。白へ溶けはじめるのを **画面の折り返しより下**（93dvh）
          にしてあるので、最初の1画面は写真だけがきれいに出る。
          スクロールしてはじめて白がにじみ出てくる（2026-09-16 実測で調整）*/}
      <div className="relative h-[155dvh] w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="size-full object-cover" />
        {/* 文字を置くための薄い暗幕。グラデの掛かる下側までは伸ばさない */}
        <div className="absolute inset-x-0 top-0 h-[33%] bg-gradient-to-b from-black/35 to-transparent" />
        <div className="absolute inset-x-0 top-[16dvh] px-6 sm:px-[120px]">
          <HeroTitle spot={spot} size="sm" />
        </div>
        {/* ── 白へ溶ける本体 ──
            ⚠️ bottom を -2px にしてあるのは、拡大率によっては写真の
               最下1pxがグラデの下に覗くため（フッターで実測した現象と同じ） */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[-2px] h-[40%]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 34%, rgba(255,255,255,0.62) 62%, rgba(255,255,255,0.92) 84%, #fff 100%)",
          }}
        />
      </div>

      {/* 白い解説の面。グラデの続きなので上に余白は置かない */}
      <div className="-mt-px bg-white px-6 pb-[120px] sm:px-[120px]">
        <div className="mx-auto flex max-w-[980px] flex-col gap-[88px]">
          {heads.map((s, i) => (
            <motion.section
              key={i}
              data-sec={i}
              className="flex flex-col gap-4 sm:flex-row sm:gap-[80px]"
              variants={revealSlow}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.3 }}
            >
              <h3 className="shrink-0 text-body-14 font-light leading-[1.9] tracking-[0.18em] text-ink/55 sm:w-[200px]">
                {s.heading}
              </h3>
              <p className="w-full whitespace-pre-line text-body-16 font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 sm:max-w-[560px]">
                {s.text}
              </p>
            </motion.section>
          ))}

          {/* 途中の写真も同じ「溶ける」扱いにして、面の変わり目を作らない */}
          {spot.photos.map((p, i) => (
            <Photo
              key={i}
              src={p}
              root={ref}
              className="h-[62dvh] w-full rounded-16"
            />
          ))}

          <QuietBlocks spot={spot} root={ref} from={heads.length} />
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════
   B. 案27〜31  左に見出し・右に本文（余白を生かす5案）
   ⚠️ 5案とも **色は一切足さない**。カラムの区切りは罫線と余白だけ
   ═══════════════════════════════════════════════════ */

/** 5案で共通のヒーロー（写真いっぱい・見出しは小さく下に） */
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

/* ── 案27 見出しは小さく、うんと離す ──────────────
   変えたところ：左右の間（余白）
   見出しは本文よりずっと小さくして、間を 140px も空ける。
   目は自然と右の本文へ行き、左の見出しは「しおり」として残る */
export function V27SideQuiet({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <QuietHero spot={spot} />
      <div className="px-6 py-[130px] sm:px-[120px]">
        <div className="mx-auto flex max-w-[1060px] flex-col gap-[110px]">
          {heads.map((s, i) => (
            <motion.section
              key={i}
              data-sec={i}
              className="flex flex-col gap-5 sm:flex-row sm:gap-[140px]"
              variants={revealSlow}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.3 }}
            >
              <h3 className="shrink-0 text-body-14 font-light leading-[1.9] tracking-[0.2em] text-ink/50 sm:w-[150px] sm:pt-[6px]">
                {s.heading}
              </h3>
              <p className="w-full whitespace-pre-line text-body-16 font-extralight leading-[2.5] tracking-[0.5px] text-ink/90 sm:max-w-[540px]">
                {s.text}
              </p>
            </motion.section>
          ))}
          {spot.photos.map((p, i) => (
            <Photo key={i} src={p} root={ref} className="h-[64dvh] w-full" />
          ))}
          <QuietBlocks spot={spot} root={ref} from={heads.length} />
        </div>
      </div>
    </Shell>
  );
}

/* ── 案28 見出しを大きく、本文を細く ────────────────
   変えたところ：文字の大きさの関係
   左の見出しを 28px の細見出しにして主役に。本文は柱を 460px まで細くする。
   見出しが「章タイトル」として立ち、本文は静かに添う */
export function V28BigHead({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <QuietHero spot={spot} h="h-[92dvh]" />
      <div className="px-6 py-[130px] sm:px-[120px]">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-[120px]">
          {heads.map((s, i) => (
            <motion.section
              key={i}
              data-sec={i}
              className="flex flex-col gap-6 sm:flex-row sm:gap-[100px]"
              variants={revealSlow}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.3 }}
            >
              <h3 className="shrink-0 text-title-28 font-thin leading-[1.5] tracking-[0.02em] text-ink sm:w-[300px] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                {s.heading}
              </h3>
              <p className="w-full whitespace-pre-line text-body-14 font-extralight leading-[2.6] tracking-[0.6px] text-ink/80 sm:max-w-[460px]">
                {s.text}
              </p>
            </motion.section>
          ))}
          {spot.photos.map((p, i) => (
            <Photo key={i} src={p} root={ref} className="h-[68dvh] w-full" />
          ))}
          <QuietBlocks spot={spot} root={ref} from={heads.length} />
        </div>
      </div>
    </Shell>
  );
}

/* ── 案29 罫線で2カラム ───────────────────────
   変えたところ：カラムの表し方（案3のような2カラム組み）
   左右の間に縦の細い罫線を1本だけ通す。色は使わず ink/12 の線と余白だけ。
   見出しはその線に向かって右揃えにして、線を境に文字が向かい合う */
export function V29RuleColumns({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <QuietHero spot={spot} />
      <div className="px-6 py-[120px] sm:px-[120px]">
        <div className="mx-auto max-w-[1040px]">
          {heads.map((s, i) => (
            <motion.section
              key={i}
              data-sec={i}
              className="flex flex-col gap-5 border-t border-ink/12 py-[68px] first:border-t-0 first:pt-0 sm:flex-row sm:gap-0"
              variants={revealSlow}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.3 }}
            >
              {/* 左：罫線に向かって右揃え */}
              <h3 className="shrink-0 text-body-14 font-light leading-[1.9] tracking-[0.18em] text-ink/55 sm:w-[260px] sm:pr-[48px] sm:text-right">
                {s.heading}
              </h3>
              {/* 縦の罫線。これがカラムの境目（色は足さない） */}
              <div className="hidden w-px shrink-0 self-stretch bg-ink/12 sm:block" />
              <p className="w-full whitespace-pre-line text-body-16 font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 sm:max-w-[560px] sm:pl-[48px]">
                {s.text}
              </p>
            </motion.section>
          ))}
          <div className="flex flex-col gap-[90px] pt-[40px]">
            {spot.photos.map((p, i) => (
              <Photo key={i} src={p} root={ref} className="h-[62dvh] w-full" />
            ))}
            <QuietBlocks spot={spot} root={ref} from={heads.length} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── 案30 番号と横罫線 ──────────────────────
   変えたところ：見出しの持ち方（通し番号を振る）
   左の柱に 01 / 02 / 03 の番号、その下に見出し。
   区切りは横に長く引いた1本の罫線だけ。目次のような読み心地になる */
export function V30Numbered({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <QuietHero spot={spot} h="h-[86dvh]" />
      <div className="px-6 py-[120px] sm:px-[120px]">
        <div className="mx-auto max-w-[1060px]">
          {heads.map((s, i) => (
            <motion.section
              key={i}
              data-sec={i}
              className="flex flex-col gap-6 border-b border-ink/12 pb-[76px] pt-[76px] first:pt-0 sm:flex-row sm:gap-[110px]"
              variants={revealSlow}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.3 }}
            >
              <div className="flex shrink-0 flex-col gap-3 sm:w-[200px]">
                <span className="font-num text-body-14 font-thin tracking-[0.2em] text-ink/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-body-16 font-light leading-[1.8] tracking-[0.1em] text-ink/70">
                  {s.heading}
                </h3>
              </div>
              <p className="w-full whitespace-pre-line text-body-16 font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 sm:max-w-[560px]">
                {s.text}
              </p>
            </motion.section>
          ))}
          <div className="flex flex-col gap-[90px] pt-[90px]">
            {spot.photos.map((p, i) => (
              <Photo key={i} src={p} root={ref} className="h-[64dvh] w-full" />
            ))}
            <QuietBlocks spot={spot} root={ref} from={heads.length} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── 案31 見出しがぶら下がる ──────────────────
   変えたところ：見出しの置き方（本文の外へ出す）
   本文の柱は中央に据えたまま、見出しだけを左の余白へぶら下げる。
   本文の頭に短い罫線を1本置いて、段落のはじまりを示す */
export function V31Hanging({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  return (
    <Shell refEl={ref}>
      <BackPill />
      <QuietHero spot={spot} />
      <div className="px-6 py-[130px] sm:px-[200px]">
        <div className="mx-auto flex max-w-[620px] flex-col gap-[104px]">
          {heads.map((s, i) => (
            <motion.section
              key={i}
              data-sec={i}
              className="relative flex flex-col gap-6"
              variants={revealSlow}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.3 }}
            >
              {/* 左の余白へぶら下げる。狭い画面では本文の上に戻す */}
              <h3 className="text-body-14 font-light leading-[1.9] tracking-[0.2em] text-ink/50 sm:absolute sm:left-[-170px] sm:top-[2px] sm:w-[140px] sm:text-right">
                {s.heading}
              </h3>
              <span className="block h-px w-[56px] bg-ink/20" />
              <p className="whitespace-pre-line text-body-16 font-extralight leading-[2.5] tracking-[0.5px] text-ink/90">
                {s.text}
              </p>
            </motion.section>
          ))}
          {spot.photos.map((p, i) => (
            <Photo
              key={i}
              src={p}
              root={ref}
              /* 本文より外へ広げて、写真だけが余白を越える。
                 ⚠️ 広げるのは sm 以上だけ。スマホで幅だけ広げると
                    176px 横にはみ出す（2026-09-16 実測） */
              className="h-[58dvh] w-full sm:-ml-[100px] sm:w-[calc(100%+200px)]"
            />
          ))}
          <QuietBlocks spot={spot} root={ref} from={heads.length} />
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════
   C. 案32〜36  左カラムの目次がスクロールに反応する
   【2026-09-16 ヒデさん指示】
   「左カラムに目次があって、スクロールすると目次がスクロール位置に応じて
     インタラクティブに変わる。Bのところに来たらBが10px右に動くとか、濃くなるとか」
   → 5案それぞれ「反応の仕方」だけを変えてある
   ═══════════════════════════════════════════════════ */

type TocKind = "slide" | "rule" | "ink" | "dot" | "num";

/** 目次そのもの。kind で反応の仕方が変わる */
function Toc({
  items,
  active,
  onJump,
  kind,
}: {
  items: { id: string; label: string }[];
  active: number;
  onJump: (i: number) => void;
  kind: TocKind;
}) {
  return (
    <nav className="relative flex flex-col gap-[18px]">
      {/* 案35（dot）だけ、目次の左に1本レールを引いて印が滑る */}
      {kind === "dot" && (
        <span className="absolute inset-y-[6px] left-0 w-px bg-ink/12" />
      )}
      {kind === "dot" && (
        <motion.span
          className="absolute left-[-2px] size-[5px] rounded-full bg-ink"
          animate={{ top: 8 + active * 38 }}
          transition={{ duration: 0.55, ease: EASE }}
        />
      )}
      {items.map((t, i) => {
        const on = i === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onJump(i)}
            className="group flex items-center gap-3 text-left"
          >
            {/* 案33：短い罫線が伸びる */}
            {kind === "rule" && (
              <motion.span
                className="block h-px shrink-0 bg-ink"
                animate={{ width: on ? 48 : 12, opacity: on ? 1 : 0.28 }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            )}
            {/* 案36：番号が大きくなる */}
            {kind === "num" && (
              <motion.span
                className="block w-[26px] shrink-0 font-num font-thin leading-none text-ink"
                animate={{
                  fontSize: on ? 18 : 12,
                  opacity: on ? 0.9 : 0.32,
                }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {String(i + 1).padStart(2, "0")}
              </motion.span>
            )}
            <motion.span
              className={`block text-body-14 font-light leading-[1.7] text-ink ${
                kind === "dot" ? "pl-4" : ""
              }`}
              animate={{
                /* 案32：10px 右へずれる（ヒデさんの例そのまま） */
                x: kind === "slide" && on ? 10 : 0,
                /* 案34：文字が濃くなる（字間もわずかに開く） */
                opacity: on ? 1 : kind === "ink" ? 0.3 : 0.45,
                letterSpacing: kind === "ink" && on ? "0.12em" : "0.04em",
              }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {t.label}
            </motion.span>
          </button>
        );
      })}
    </nav>
  );
}

/** 目次5案で共通の枠組み（左に目次・右に本文） */
function TocLayout({
  spot,
  kind,
  heroH = "h-[86dvh]",
}: {
  spot: SpotDetail;
  kind: TocKind;
  heroH?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  const items = tocOf(spot);
  const active = useSpy(ref, items.length);
  const jump = useJump(ref);

  return (
    <Shell refEl={ref}>
      <BackPill />
      <QuietHero spot={spot} h={heroH} />
      <div className="px-6 py-[110px] sm:px-[100px]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-[60px] sm:flex-row sm:gap-[110px]">
          {/* 左カラム：目次。本文を読んでいる間ずっと画面に残る */}
          <aside className="shrink-0 sm:w-[230px]">
            <div className="sm:sticky sm:top-[110px]">
              <p className="mb-7 text-body-14 font-light tracking-[0.2em] text-ink/35">
                目次
              </p>
              <Toc items={items} active={active} onJump={jump} kind={kind} />
            </div>
          </aside>

          {/* 右カラム：本文 */}
          <div className="flex min-w-0 flex-1 flex-col gap-[96px]">
            {heads.map((s, i) => (
              <motion.section
                key={i}
                data-sec={i}
                className="flex flex-col gap-5"
                variants={revealSlow}
                initial="hidden"
                whileInView="show"
                viewport={{ root: ref, once: true, amount: 0.3 }}
              >
                <h3 className="text-title-28 font-thin leading-[1.5] text-ink [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  {s.heading}
                </h3>
                <p className="whitespace-pre-line text-body-16 font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 sm:max-w-[620px]">
                  {s.text}
                </p>
              </motion.section>
            ))}
            {spot.photos.map((p, i) => (
              <Photo key={i} src={p} root={ref} className="h-[58dvh] w-full" />
            ))}
            <QuietBlocks spot={spot} root={ref} from={heads.length} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

/** 案32 目次が右へずれる */
export function V32TocSlide({ spot }: VProps) {
  return <TocLayout spot={spot} kind="slide" />;
}
/** 案33 目次の罫線が伸びる */
export function V33TocRule({ spot }: VProps) {
  return <TocLayout spot={spot} kind="rule" />;
}
/** 案34 目次の文字が濃くなる */
export function V34TocInk({ spot }: VProps) {
  return <TocLayout spot={spot} kind="ink" heroH="h-[92dvh]" />;
}
/** 案35 印がレールを滑る */
export function V35TocDot({ spot }: VProps) {
  return <TocLayout spot={spot} kind="dot" />;
}
/** 案36 目次の番号が大きくなる */
export function V36TocNum({ spot }: VProps) {
  return <TocLayout spot={spot} kind="num" heroH="h-[80dvh]" />;
}

/* ═══════════════════════════════════════════════════
   D. 案37  全画面サムネ → ぼかして白へ
   【2026-09-16 ヒデさん指示】
   「最初は画面VHの表示でサムネイルが表示されていて、左下にスポットの名前。
     スクロールしていくと裏がかかって白いエリアのコンテンツになる」
   写真は貼りついたまま、スクロールに合わせて **写真そのもの** がぼけて遠のき、
   白い面がグラデを先頭に乗り上げてくる
   ⚠️ backdrop-filter は使わない。全画面写真の上に敷くと毎フレーム画面全体を
      再サンプリングすることになり、実際にタブが落ちた（2026-09-15 実測）
   ═══════════════════════════════════════════════════ */
export function V37PinnedBlur({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const heads = headsOf(spot);

  /* 写真ステージ（200dvh）の中でのスクロールの進み具合 0→1 */
  const { scrollYProgress } = useScroll({
    container: ref,
    target: stage,
    offset: ["start start", "end start"],
  });
  /* 前半（0→0.5）で白い面が乗り上げる。そこに合わせて写真がぼけていく */
  const blur = useTransform(scrollYProgress, [0, 0.5], ["blur(0px)", "blur(16px)"]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);
  const titleO = useTransform(scrollYProgress, [0, 0.22, 0.4], [1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.4], [0, -60]);

  return (
    <Shell refEl={ref}>
      <BackPill dark={false} />
      {/* 200dvh のステージ。この中で写真が貼りつく */}
      <div ref={stage} className="relative h-[200dvh]">
        <div className="sticky top-0 h-dvh w-full overflow-hidden">
          <motion.img
            src={spot.hero}
            alt={spot.name}
            className="size-full object-cover"
            style={{ filter: blur, scale, willChange: "filter, transform" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-black/20" />
          {/* 左下にスポットの名前 */}
          <motion.div
            className="absolute inset-x-0 bottom-0 px-6 pb-[86px] sm:px-[120px] sm:pb-[110px]"
            style={{ opacity: titleO, y: titleY }}
          >
            <HeroTitle spot={spot} />
          </motion.div>
        </div>
      </div>

      {/* 白い面。ステージの半分（100dvh）の位置から乗り上げる */}
      <div className="relative z-[2] -mt-[100dvh]">
        {/* 先頭のグラデ：ここで写真がだんだん白へ変わる */}
        <div
          className="h-[46dvh] w-full"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 38%, rgba(255,255,255,0.72) 66%, rgba(255,255,255,0.95) 86%, #fff 100%)",
          }}
        />
        <div className="-mt-px bg-white px-6 pb-[120px] sm:px-[120px]">
          <div className="mx-auto flex max-w-[1000px] flex-col gap-[96px]">
            {heads.map((s, i) => (
              <motion.section
                key={i}
                data-sec={i}
                className="flex flex-col gap-4 sm:flex-row sm:gap-[90px]"
                variants={revealSlow}
                initial="hidden"
                whileInView="show"
                viewport={{ root: ref, once: true, amount: 0.3 }}
              >
                <h3 className="shrink-0 text-body-14 font-light leading-[1.9] tracking-[0.18em] text-ink/55 sm:w-[190px]">
                  {s.heading}
                </h3>
                <p className="w-full whitespace-pre-line text-body-16 font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 sm:max-w-[560px]">
                  {s.text}
                </p>
              </motion.section>
            ))}
            {spot.photos.map((p, i) => (
              <Photo key={i} src={p} root={ref} className="h-[62dvh] w-full" />
            ))}
            <QuietBlocks spot={spot} root={ref} from={heads.length} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
