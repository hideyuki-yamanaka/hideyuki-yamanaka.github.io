"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * ぼーっとスポット詳細ページ｜デザイン兼インタラクション 5案
 * （2026-09-15 ヒデさん依頼。旧3案は廃止して新規に作り直し）
 *
 * 共通の考え方
 *   ・主役は写真。文字は写真の邪魔をしない置き方にする
 *   ・スクロールは「速く読ませる」のではなく「ゆっくり眺めさせる」
 *     → 動きはすべて long・ゆるい ease（ぼーっとするサイトのトンマナ）
 *   ・このページは自前のスクロール容器（html/body が overflow:hidden のため）。
 *     スクロール連動はすべて容器 ref を渡した useScroll で取る
 *
 * 🟡仮置き：このページのカンプは無い。数値は既存トンマナから流用
 *   （Noto Thin/ExtraLight・white/10 + blur65 のガラス・空グラデ・brand青・
 *    body-14 行間2 字間0.7px など）
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { SpotDetail } from "./spotDetailData";
import SiteFooter from "./SiteFooter";

/* ゆったり共通のイージング（既存サイトと同じ緩急） */
const EASE = [0.22, 1, 0.36, 1] as const;
/* 画面に入ったらブラーが晴れて浮き上がる（reveal）。トップページと同じ質感 */
const reveal = {
  hidden: { opacity: 0, y: 40, filter: "blur(16px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.2, ease: EASE },
  },
};

/* ───────────────────────── 共通の部品 ───────────────────────── */

export function BackPill({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      href="/"
      className={`fixed left-8 top-8 z-50 flex items-center gap-2 rounded-full px-5 py-2.5 text-body-14 font-light backdrop-blur-[62px] transition-colors duration-300 ease-standard ${
        dark
          ? "bg-ink/10 text-ink hover:bg-ink/20"
          : "bg-white/20 text-white hover:bg-white/35"
      }`}
    >
      <span className="inline-block rotate-180">
        <img
          src={dark ? "/img/icon-view-more-black.svg" : "/img/icon-view-more.svg"}
          alt=""
          className="size-[16px]"
        />
      </span>
      トップへ戻る
    </Link>
  );
}

export function InfoTable({
  spot,
  light,
}: {
  spot: SpotDetail;
  light?: boolean;
}) {
  const line = light ? "border-white/25" : "border-ink/10";
  const label = light ? "text-white/70" : "text-ink/50";
  const value = light ? "text-white" : "text-ink";
  return (
    <dl className="w-full">
      {spot.info.map((row) => (
        <div
          key={row.label}
          className={`flex gap-4 border-b py-4 first:border-t sm:gap-6 ${line}`}
        >
          <dt
            className={`w-[72px] shrink-0 text-body-14 font-light leading-[2] sm:w-[96px] ${label}`}
          >
            {row.label}
          </dt>
          <dd
            className={`whitespace-pre-line text-body-14 font-extralight leading-[2] tracking-[0.7px] ${value}`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Points({ spot, light }: { spot: SpotDetail; light?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {spot.points.map((p) => (
        <li
          key={p}
          className={`flex gap-3 text-body-14 font-extralight leading-[2] tracking-[0.7px] ${
            light ? "text-white" : "text-ink"
          }`}
        >
          <span
            className={`mt-[13px] size-[6px] shrink-0 rounded-full ${
              light ? "bg-white/80" : "bg-brand"
            }`}
          />
          {p}
        </li>
      ))}
    </ul>
  );
}

export function MapEmbed({
  spot,
  light,
}: {
  spot: SpotDetail;
  light?: boolean;
}) {
  return (
    <div className="relative w-full">
      <iframe
        title={`${spot.name} 周辺マップ`}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(spot.map.query)}&z=11&hl=ja&output=embed`}
        className={`h-[280px] w-full border-0 sm:h-[420px] ${light ? "rounded-[24px]" : ""}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={spot.map.link}
        target="_blank"
        rel="noreferrer"
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-body-14 font-light text-ink backdrop-blur-[62px] transition-colors duration-300 ease-standard hover:bg-white"
      >
        マップで開く
        <img src="/img/icon-view-more-black.svg" alt="" className="size-[14px]" />
      </a>
    </div>
  );
}

/** 本文（小見出し＋段落）。1段落ずつ画面に入ったら浮き上がる */
function Sections({
  spot,
  light,
  root,
}: {
  spot: SpotDetail;
  light?: boolean;
  root: React.RefObject<HTMLElement | null>;
}) {
  return (
    <div className="flex flex-col gap-[72px]">
      {spot.sections.map((s, i) => (
        <motion.div
          key={i}
          className="flex flex-col gap-5"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ root, once: true, amount: 0.3 }}
        >
          {s.heading && (
            <h3
              className={`text-title-28 font-thin leading-[1.4] ${
                light ? "text-white" : "text-ink"
              }`}
            >
              {s.heading}
            </h3>
          )}
          <p
            className={`text-body-16 font-extralight leading-[2.4] tracking-[0.5px] ${
              light ? "text-white/90" : "text-ink/90"
            }`}
          >
            {s.text}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/** 下部の共通ブロック（ポイント → 基本情報 → 周辺マップ） */
function FooterBlocks({
  spot,
  root,
  kind = "plain",
}: {
  spot: SpotDetail;
  root: React.RefObject<HTMLElement | null>;
  /** plain=白地 / glass=すりガラス / solid=黒の半透明（ブラーなし）
      ⚠️ solid は「固定の全画面写真の上」で使う。そこに backdrop-blur を重ねると
      画面全体を毎フレーム再サンプリングすることになり、実際にタブが落ちた
      （2026-09-15 実測。案2 が確実にクラッシュしていた原因） */
  kind?: "plain" | "glass" | "solid";
}) {
  const light = kind !== "plain";
  const box =
    kind === "glass"
      ? "w-full rounded-16 bg-white/10 p-7 sm:p-[56px] backdrop-blur-65"
      : kind === "solid"
        ? "w-full rounded-16 bg-black/45 p-7 sm:p-[56px]"
        : "flex w-full flex-col gap-6";
  const h = light
    ? "mb-6 text-title-28 font-thin leading-[1.6] text-white"
    : "text-title-36 font-thin leading-[1.8] text-ink";
  const V = {
    variants: reveal,
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: { root, once: true, amount: 0.2 },
  };
  return (
    <>
      <motion.div className={box} {...V}>
        <h2 className={h}>担当者からのおすすめポイント</h2>
        <Points spot={spot} light={light} />
      </motion.div>
      <motion.div className={box} {...V}>
        <h2 className={h}>基本情報</h2>
        <InfoTable spot={spot} light={light} />
      </motion.div>
      <motion.div className={box} {...V}>
        <h2 className={h}>周辺マップ</h2>
        <MapEmbed spot={spot} light={light} />
      </motion.div>
    </>
  );
}

/** ヒーローに重ねる見出し（共通の書式） */
function HeroTitle({
  spot,
  className = "",
  size = "lg",
}: {
  spot: SpotDetail;
  className?: string;
  /** lg=既定（80px） / sm=控えめ（56px）。写真を主役にしたい時は sm */
  size?: "lg" | "sm";
}) {
  const sm = size === "sm";
  return (
    <div
      className={`flex flex-col items-start text-white ${sm ? "gap-3" : "gap-4"} ${className}`}
    >
      <p
        className={`font-thin leading-[1.2] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] ${
          sm ? "text-body-14 text-white/80" : "text-body-18"
        }`}
      >
        {spot.category} {spot.no}
      </p>
      <h1
        className={`font-thin leading-none opacity-95 ${sm ? "text-[34px] sm:text-[56px]" : "text-[40px] sm:text-[80px]"}`}
      >
        {spot.name}
      </h1>
      <p
        className={`font-extralight leading-[2] tracking-[0.7px] text-white/90 ${
          sm ? "text-body-14" : "text-body-16"
        }`}
      >
        {spot.lead}（{spot.kana}）
      </p>
    </div>
  );
}

/* 案ごとの共通の型 */
type VProps = { spot: SpotDetail };

/** 写真の上に薄く敷く暗幕（文字を置く時だけ） */
const VEIL =
  "absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent";

/* ═══════════ 案1 パララックス没入 ═══════════
   写真がゆっくり奥へ引きながら、白い本文の面がその上にせり上がる。
   スクロールしても写真が一気に消えないので「風景に居るまま読む」感じになる */
export function V1Parallax({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ container: ref });
  /* 最初の1画面ぶんで、写真は0.35倍の速さでしか動かない＝視差 */
  /* 視差は控えめに。18%/1.12倍は「効きすぎて酔う」と指摘があったので
     7%/1.04倍まで落とした（2026-09-15 ヒデさん指示） */
  const heroY = useTransform(scrollYProgress, [0, 0.35], ["0%", "7%"]);
  const heroScale = useTransform(scrollYProgress, [0, 0.35], [1, 1.04]);
  const titleOp = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.12], [0, -60]);

  return (
    <main
      ref={ref}
      className="h-dvh overflow-y-auto overscroll-contain bg-white"
    >
      <BackPill />
      {/* ヒーロー：写真は固定気味にゆっくり動く */}
      <div className="relative h-dvh w-full overflow-hidden">
        <motion.img
          src={spot.hero}
          alt={spot.name}
          className="absolute inset-0 size-full object-cover"
          style={{ y: heroY, scale: heroScale }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
        {/* 左下の見出し。小さめ＋下のセクションから離す
            （2026-09-15 ヒデさん指示：文字が大きく、下にくっつきすぎていた） */}
        <motion.div
          className="absolute inset-x-0 bottom-0 px-6 sm:px-[120px] pb-[90px] sm:pb-[180px]"
          style={{ opacity: titleOp, y: titleY }}
        >
          <HeroTitle spot={spot} size="sm" />
        </motion.div>
      </div>
      {/* 白い面が写真の上にせり上がる（角丸で「紙が乗る」感じ） */}
      <div className="relative z-10 -mt-[80px] rounded-t-[48px] bg-white">
        <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[112px] px-6 py-[120px]">
          <Sections spot={spot} root={ref} />
          {/* 写真は1枚ずつ、少しずれて浮き上がる */}
          <div className="flex flex-col gap-6">
            {spot.photos.map((p, i) => (
              <motion.img
                key={p}
                src={p}
                alt=""
                className={`h-[240px] w-full object-cover sm:h-[420px] ${i % 2 ? "self-end" : ""}`}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ root: ref, once: true, amount: 0.25 }}
              />
            ))}
          </div>
          <FooterBlocks spot={spot} root={ref} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════
   最初に作った3案を復活（2026-09-15 ヒデさん指示）。
   案2=全画面ヒーロー / 案3=白エディトリアル / 案4=空グラデ没入
   ═══════════════════════════════════════════════════════════ */

/* ═══════════ 案2 全画面ヒーロー ═══════════
   写真いっぱいのヒーローに浸ってから、白地でゆっくり読む */
export function V2Hero({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <main ref={ref} className="h-dvh overflow-y-auto overscroll-contain bg-white">
      <BackPill />
      <div className="relative h-dvh w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
        <div className="absolute inset-x-0 bottom-0 px-6 sm:px-[120px] pb-[56px] sm:pb-[88px]">
          <HeroTitle spot={spot} />
        </div>
      </div>
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[88px] px-6 py-[120px]">
        <Sections spot={spot} root={ref} />
        <div className="flex gap-2">
          {spot.photos.map((p) => (
            <img key={p} src={p} alt="" className="h-[180px] min-w-0 flex-1 object-cover sm:h-[280px]" />
          ))}
        </div>
        <FooterBlocks spot={spot} root={ref} />
      </div>
      <SiteFooter />
    </main>
  );
}

/* ═══════════ 案3 白エディトリアル ═══════════
   縦書きの名前＋2カラム。右の基本情報がスクロールに追従する */
export function V3Editorial({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <main ref={ref} className="h-dvh overflow-y-auto overscroll-contain bg-white">
      <BackPill dark />
      <div className="mx-auto w-[1200px] max-w-full px-6 pb-[120px] pt-[120px]">
        <div className="flex items-start gap-7 sm:p-[56px]">
          <div className="flex w-full items-start gap-6 pt-2 sm:w-auto sm:shrink-0">
            <h1
              className="text-[36px] font-thin leading-[1.2] text-ink [writing-mode:horizontal-tb] sm:whitespace-nowrap sm:text-[56px] sm:[writing-mode:vertical-rl]"
            >
              {spot.name}
            </h1>
            <p
              className="pt-1 text-body-14 font-extralight tracking-[2px] text-ink/50 [writing-mode:horizontal-tb] sm:whitespace-nowrap sm:[writing-mode:vertical-rl]"
            >
              {spot.category} {spot.no}｜{spot.kana}
            </p>
          </div>
          <div className="relative h-[300px] w-full min-w-0 overflow-hidden sm:h-[560px] sm:flex-1">
            <img src={spot.hero} alt={spot.name} className="absolute inset-0 size-full object-cover" />
          </div>
        </div>
        <p className="mt-10 text-body-18 font-extralight leading-[2.2] tracking-[0.7px] text-ink/80">
          {spot.lead}
        </p>
        <div className="mt-12 flex flex-col items-start gap-10 sm:mt-[88px] sm:flex-row sm:gap-[72px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[72px]">
            <Sections spot={spot} root={ref} />
            <div className="flex flex-col gap-6">
              <h2 className="text-title-28 font-thin leading-[1.6] text-ink">
                担当者からのおすすめポイント
              </h2>
              <Points spot={spot} />
            </div>
            <div className="flex gap-2">
              {spot.photos.map((p) => (
                <img key={p} src={p} alt="" className="h-[150px] min-w-0 flex-1 object-cover sm:h-[240px]" />
              ))}
            </div>
            <div className="flex flex-col gap-6">
              <h2 className="text-title-28 font-thin leading-[1.6] text-ink">周辺マップ</h2>
              <MapEmbed spot={spot} />
            </div>
          </div>
          <aside className="w-full shrink-0 bg-sky-bottom/40 p-6 sm:sticky sm:top-10 sm:w-[360px] sm:p-8">
            <h2 className="mb-4 text-body-18 font-thin text-ink">基本情報</h2>
            <InfoTable spot={spot} />
          </aside>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

/* ═══════════ 案4 空グラデ没入 ═══════════
   体験ページと同じ青の世界。白枠の窓＋すりガラスのカードで読む */
export function V4SkyGlass({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <main
      ref={ref}
      className="h-dvh overflow-y-auto overscroll-contain bg-gradient-to-b from-brand via-brand/80 to-sky-bottom"
    >
      <BackPill />
      <div className="mx-auto flex w-[960px] max-w-full flex-col items-center gap-[72px] px-6 pb-[140px] pt-[120px]">
        <div className="flex w-full flex-col items-center gap-8">
          <p className="text-body-18 font-thin leading-[1.2] text-white/90 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            {spot.category} {spot.no}
          </p>
          <h1 className="text-[36px] font-thin leading-none text-white sm:text-[64px]">{spot.name}</h1>
          <p className="text-body-14 font-extralight tracking-[2px] text-white/70">{spot.kana}</p>
          <div className="relative h-[300px] w-full overflow-hidden rounded-[24px] border-[3px] border-white/60 sm:h-[520px] sm:rounded-[36px]">
            <img src={spot.hero} alt={spot.name} className="absolute inset-0 size-full object-cover" />
          </div>
          <p className="text-body-18 font-extralight leading-[2.2] tracking-[0.7px] text-white/90">
            {spot.lead}
          </p>
        </div>
        <div className="w-full rounded-16 bg-white/10 p-7 sm:p-[56px] backdrop-blur-65">
          <Sections spot={spot} root={ref} light />
        </div>
        <FooterBlocks spot={spot} root={ref} kind="glass" />
      </div>
      <SiteFooter />
    </main>
  );
}

/* ═══════════ 案8 写真が固定、文字が流れる ═══════════
   左半分に写真が貼り付いたまま、右半分の文章だけがスクロールする。
   章が変わると写真が静かに入れ替わる＝写真をいちばん長く見ていられる形 */
export function V8SplitSticky({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const [idx, setIdx] = useState(0);
  const shots = [spot.hero, ...spot.photos];
  /* ファーストビュー → 2カラム への切り替えを、トップページの
     「キービジュアルがブラーで奥へ引く」のと同じ質感で行う
     （2026-09-15 ヒデさん指示）。切り替えの助走は1画面ぶん */
  const { scrollY } = useScroll({ container: ref });
  const [vh, setVh] = useState(900);
  useEffect(() => {
    const el = ref.current;
    if (el) setVh(el.clientHeight || 900);
  }, []);
  const heroBlurPx = useTransform(scrollY, [0, vh * 0.75], [0, 26]);
  const heroFilter = useMotionTemplate`blur(${heroBlurPx}px)`;
  const heroOpacity = useTransform(scrollY, [0, vh * 0.8], [1, 0]);
  const heroScale = useTransform(scrollY, [0, vh * 0.8], [1, 1.06]);
  const colBlurPx = useTransform(scrollY, [vh * 0.25, vh * 0.85], [18, 0]);
  const colFilter = useMotionTemplate`blur(${colBlurPx}px)`;
  const colOpacity = useTransform(scrollY, [vh * 0.25, vh * 0.85], [0, 1]);
  return (
    <main ref={ref} className="h-dvh overflow-y-auto overscroll-contain bg-white">
      <BackPill />
      {/* ファーストビュー：画面に貼り付いたまま、スクロールでブラーになって消える */}
      <motion.div
        className="sticky top-0 h-dvh w-full overflow-hidden"
        style={{ filter: heroFilter, opacity: heroOpacity, scale: heroScale }}
      >
        <img src={spot.hero} alt={spot.name} className="absolute inset-0 size-full object-cover" />
        <div className={VEIL} />
        <div className="absolute inset-x-0 bottom-0 px-6 sm:px-[120px] pb-[56px] sm:pb-[88px]">
          <HeroTitle spot={spot} />
        </div>
      </motion.div>
      {/* 2カラム：入れ替わりにブラーから現れる。
          -mt-[100dvh] でファーストビューに重ねているので、
          「同じ場所で切り替わった」ように見える */}
      <motion.div
        className="relative -mt-[100dvh] flex w-full flex-col items-start sm:flex-row"
        style={{ filter: colFilter, opacity: colOpacity }}
      >
        {/* 左：貼り付く写真（章に合わせてクロスフェード） */}
        <div className="sticky top-0 h-[45dvh] w-full shrink-0 overflow-hidden sm:h-dvh sm:w-1/2">
          {shots.map((src, i) => (
            <motion.img
              key={src + i}
              src={src}
              alt=""
              className="absolute inset-0 size-full object-cover"
              animate={{ opacity: i === idx ? 1 : 0, scale: i === idx ? 1 : 1.04 }}
              transition={{ duration: 1.4, ease: EASE }}
            />
          ))}
        </div>
        {/* 右：流れる文章。章ごとに左の写真を切り替える */}
        <div className="flex w-full flex-col sm:w-1/2">
          {spot.sections.map((s, i) => (
            <motion.div
              key={i}
              className="flex min-h-[70dvh] flex-col justify-center gap-6 px-6 sm:min-h-dvh sm:px-[88px]"
              onViewportEnter={() => setIdx(i % shots.length)}
              viewport={{ root: ref, amount: 0.5 }}
            >
              <motion.div
                className="flex flex-col gap-5"
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ root: ref, once: true, amount: 0.4 }}
              >
                {s.heading && (
                  <h3 className="text-title-28 font-thin leading-[1.4] text-ink">{s.heading}</h3>
                )}
                <p className="text-body-16 font-extralight leading-[2.4] tracking-[0.5px] text-ink/85">
                  {s.text}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <div className="mx-auto flex w-[880px] max-w-[92%] flex-col gap-[88px] py-[140px]">
        <FooterBlocks spot={spot} root={ref} />
      </div>
      <SiteFooter />
    </main>
  );
}

/* ═══════════ 案10 大きな一枚をゆっくり見る ═══════════
   白い余白の中に、大きな写真を1枚ずつ。スクロールで写真が実寸へ育ち、
   文字は写真の横に小さく添えるだけ。いちばん静かで、写真が引き立つ */
export function V10BigQuiet({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const shots = [spot.hero, ...spot.photos];
  return (
    <main ref={ref} className="h-dvh overflow-y-auto overscroll-contain bg-white">
      <BackPill dark />
      {/* 表紙は白地。名前だけ置いて、写真は次から */}
      <div className="flex h-dvh flex-col items-center justify-center gap-5">
        <motion.p
          className="text-body-18 font-thin text-ink/50"
          variants={reveal}
          initial="hidden"
          animate="show"
        >
          {spot.category} {spot.no}
        </motion.p>
        <motion.h1
          className="text-[44px] font-thin leading-none text-ink sm:text-[88px]"
          variants={reveal}
          initial="hidden"
          animate="show"
        >
          {spot.name}
        </motion.h1>
        <motion.p
          className="text-body-14 font-extralight tracking-[4px] text-ink/40"
          variants={reveal}
          initial="hidden"
          animate="show"
        >
          {spot.kana}
        </motion.p>
      </div>
      <div className="flex flex-col items-center gap-[180px] pb-[90px] sm:pb-[180px]">
        {spot.sections.map((s, i) => (
          <div key={i} className="flex w-[1240px] max-w-[94%] flex-col items-start gap-8 sm:flex-row sm:gap-[48px]">
            {/* 写真：枠は固定、中の絵だけ育つ（レイアウトは動かない） */}
            <div className="h-[380px] w-full min-w-0 overflow-hidden sm:h-[680px] sm:flex-1">
              <motion.img
                src={shots[i % shots.length]}
                alt=""
                className="size-full object-cover"
                initial={{ scale: 0.86, opacity: 0.4 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ root: ref, once: true, amount: 0.25 }}
                transition={{ duration: 1.8, ease: EASE }}
              />
            </div>
            {/* 文字は縦書きで小さく添える。写真の面積を奪わない */}
            <motion.div
              className="flex shrink-0 gap-5 pt-2"
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.4 }}
            >
              {s.heading && (
                <h3
                  className="whitespace-nowrap text-title-28 font-thin leading-[1.6] text-ink [writing-mode:horizontal-tb] sm:[writing-mode:vertical-rl]"
                >
                  {s.heading}
                </h3>
              )}
              <p
                className="text-body-14 font-extralight leading-[2.2] tracking-[0.7px] text-ink/70 sm:h-[600px] [writing-mode:horizontal-tb] sm:[writing-mode:vertical-rl]"
              >
                {s.text}
              </p>
            </motion.div>
          </div>
        ))}
        <div className="flex w-[880px] max-w-[92%] flex-col gap-[88px]">
          <FooterBlocks spot={spot} root={ref} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
