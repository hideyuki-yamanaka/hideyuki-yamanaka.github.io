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
import { useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { SpotDetail } from "./spotDetailData";

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
          className={`flex gap-6 border-b py-4 first:border-t ${line}`}
        >
          <dt
            className={`w-[96px] shrink-0 text-body-14 font-light leading-[2] ${label}`}
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
        className={`h-[420px] w-full border-0 ${light ? "rounded-[24px]" : ""}`}
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
      ? "w-full rounded-16 bg-white/10 p-[56px] backdrop-blur-65"
      : kind === "solid"
        ? "w-full rounded-16 bg-black/45 p-[56px]"
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
}: {
  spot: SpotDetail;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-start gap-4 text-white ${className}`}>
      <p className="text-body-18 font-thin leading-[1.2] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {spot.category} {spot.no}
      </p>
      <h1 className="text-[80px] font-thin leading-none opacity-95">
        {spot.name}
      </h1>
      <p className="text-body-16 font-extralight leading-[2] tracking-[0.7px] text-white/90">
        {spot.lead}（{spot.kana}）
      </p>
    </div>
  );
}

/* 案ごとの共通の型 */
type VProps = { spot: SpotDetail };

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
        <motion.div
          className="absolute inset-x-0 bottom-0 px-[120px] pb-[88px]"
          style={{ opacity: titleOp, y: titleY }}
        >
          <HeroTitle spot={spot} />
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
                className={`h-[420px] w-full object-cover ${i % 2 ? "self-end" : ""}`}
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
    </main>
  );
}

/* ═══════════ 案2 背景クロスフェード ═══════════
   背景は常に全画面写真。スクロールで写真が静かに入れ替わり、
   文章は右の細いカラムを流れていく。ずっと写真の中にいられる */
export function V2Crossfade({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ container: ref });
  const shots = [spot.hero, ...spot.photos];
  /* 進捗を写真の枚数で割って、順番にクロスフェード */
  const n = shots.length;

  return (
    <main
      ref={ref}
      className="relative h-dvh overflow-y-auto overscroll-contain bg-ink"
    >
      <BackPill />
      {/* 背面：固定の写真スタック（スクロール連動で入れ替わる） */}
      <div className="pointer-events-none fixed inset-0">
        {shots.map((src, i) => (
          <BgShot key={src} src={src} i={i} n={n} p={scrollYProgress} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/50" />
      </div>
      {/* 前面：右カラムを流れる文章 */}
      <div className="relative z-10">
        <div className="flex h-dvh items-end px-[120px] pb-[120px]">
          <HeroTitle spot={spot} />
        </div>
        <div className="ml-auto mr-[120px] flex w-[560px] max-w-[calc(100%-48px)] flex-col gap-[120px] pb-[160px]">
          <div className="w-full rounded-16 bg-black/45 p-[56px]">
            <Sections spot={spot} root={ref} light />
          </div>
          <FooterBlocks spot={spot} root={ref} kind="solid" />
        </div>
      </div>
    </main>
  );
}

/** 背景写真1枚ぶん。自分の担当区間だけ濃くなる */
function BgShot({
  src,
  i,
  n,
  p,
}: {
  src: string;
  i: number;
  n: number;
  p: MotionValue<number>;
}) {
  /* ⚠️ 入力の範囲は必ず 0〜1 に収め、かつ増加する並びにすること。
     マイナスを含む範囲を渡すと、ブラウザのアニメーションAPIが
     「オフセットは減ってはいけない」で例外を投げてページごと落ちる
     （2026-09-15 実測。この案が確実にクラッシュしていた原因） */
  const peak = n > 1 ? i / (n - 1) : 0; /* 1枚目=0 … 最後=1 でいちばん濃い */
  const span = n > 1 ? 1 / (n - 1) : 1;
  const from = Math.max(0, peak - span);
  const to = Math.min(1, peak + span);
  const inRange =
    i === 0
      ? [0, 0.0001, to]
      : i === n - 1
        ? [from, 0.9999, 1]
        : [from, peak, to];
  const outRange =
    i === 0 ? [1, 1, 0] : i === n - 1 ? [0, 1, 1] : [0, 1, 0];
  const opacity = useTransform(p, inRange, outRange);
  /* ゆっくり寄る。範囲は 0〜1 のまま（全体を通して少しだけ動く） */
  const scale = useTransform(p, [0, 1], [1.08, 1]);
  return (
    <motion.img
      src={src}
      alt=""
      className="absolute inset-0 size-full object-cover"
      style={{ opacity, scale }}
    />
  );
}

/* ═══════════ 案3 横に流れるギャラリー ═══════════
   途中に「縦スクロールが横の写真送りになる」区間がある。
   手を止めずに、景色が横に流れていくのを眺められる */
export function V3Gallery({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: railP } = useScroll({
    container: ref,
    target: railRef,
    offset: ["start start", "end end"],
  });
  const shots = [spot.hero, ...spot.photos, spot.hero];
  /* 横移動：画面幅ぶん×枚数 を進む */
  const x = useTransform(railP, [0, 1], ["0%", `-${(shots.length - 1) * 100}%`]);

  return (
    <main
      ref={ref}
      className="h-dvh overflow-y-auto overscroll-contain bg-white"
    >
      <BackPill />
      <div className="relative h-dvh w-full overflow-hidden">
        <img
          src={spot.hero}
          alt={spot.name}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
        <div className="absolute inset-x-0 bottom-0 px-[120px] pb-[88px]">
          <HeroTitle spot={spot} />
        </div>
      </div>
      {/* 本文 */}
      <div className="mx-auto w-[880px] max-w-full px-6 py-[120px]">
        <Sections spot={spot} root={ref} />
      </div>
      {/* 横送り区間：この高さぶんスクロールする間、中身が横に流れる */}
      <div ref={railRef} className="relative h-[400dvh] w-full">
        <div className="sticky top-0 h-dvh w-full overflow-hidden">
          <motion.div className="flex h-full w-max" style={{ x }}>
            {shots.map((src, i) => (
              <div key={i} className="h-full w-screen shrink-0 p-2">
                <img
                  src={src}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[88px] px-6 py-[120px]">
        <FooterBlocks spot={spot} root={ref} />
      </div>
    </main>
  );
}

/* ═══════════ 案4 余白ミニマル ═══════════
   白い余白をたっぷり取り、写真を1枚ずつ大きく置く。
   文字も写真も、画面に入るたびにブラーから静かに現れる */
export function V4Minimal({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const shots = [spot.hero, ...spot.photos];

  return (
    <main
      ref={ref}
      className="h-dvh overflow-y-auto overscroll-contain bg-white"
    >
      <BackPill dark />
      {/* 表紙：白地に名前だけ。写真はまだ出さない＝「間」をつくる */}
      <div className="flex h-dvh flex-col items-center justify-center gap-6">
        <motion.p
          className="text-body-18 font-thin leading-[1.2] text-ink/50"
          variants={reveal}
          initial="hidden"
          animate="show"
        >
          {spot.category} {spot.no}
        </motion.p>
        <motion.h1
          className="text-[96px] font-thin leading-none text-ink"
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
      {/* 写真と文章が交互に、たっぷりの余白で続く */}
      <div className="flex flex-col items-center gap-[200px] pb-[200px]">
        {spot.sections.map((s, i) => (
          <div key={i} className="flex w-full flex-col items-center gap-[120px]">
            <motion.img
              src={shots[i % shots.length]}
              alt=""
              className="h-[620px] w-[1080px] max-w-[92%] object-cover"
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.2 }}
            />
            <motion.div
              className="flex w-[680px] max-w-[88%] flex-col gap-5"
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.4 }}
            >
              {s.heading && (
                <h3 className="text-title-28 font-thin leading-[1.4] text-ink">
                  {s.heading}
                </h3>
              )}
              <p className="text-body-16 font-extralight leading-[2.4] tracking-[0.5px] text-ink/90">
                {s.text}
              </p>
            </motion.div>
          </div>
        ))}
        <div className="flex w-[880px] max-w-[92%] flex-col gap-[88px]">
          <FooterBlocks spot={spot} root={ref} />
        </div>
      </div>
    </main>
  );
}

/* ═══════════ 案5 窓がひらく ═══════════
   体験ページの「窓」の意匠。最初は白枠の小さな窓の中に風景があり、
   スクロールすると窓がゆっくり全画面へ広がって、景色の中に入っていく */
export function V5Window({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: gp } = useScroll({
    container: ref,
    target: gateRef,
    offset: ["start start", "end end"],
  });
  /* 窓の大きさ・角丸・枠の太さがスクロールに連れて広がる */
  const w = useTransform(gp, [0, 0.85], ["46%", "100%"]);
  const h = useTransform(gp, [0, 0.85], ["52%", "100%"]);
  const radius = useTransform(gp, [0, 0.85], [36, 0]);
  const border = useTransform(gp, [0, 0.85], [3, 0]);
  const scale = useTransform(gp, [0, 0.85], [1.18, 1]);
  const titleOp = useTransform(gp, [0, 0.35], [1, 0]);

  return (
    <main
      ref={ref}
      className="h-dvh overflow-y-auto overscroll-contain bg-gradient-to-b from-brand via-brand/80 to-sky-bottom"
    >
      <BackPill />
      {/* 窓がひらく区間 */}
      <div ref={gateRef} className="relative h-[260dvh] w-full">
        <div className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden">
          <motion.div
            className="relative overflow-hidden border-white/60"
            style={{
              width: w,
              height: h,
              borderRadius: radius,
              borderWidth: border,
            }}
          >
            <motion.img
              src={spot.hero}
              alt={spot.name}
              className="absolute inset-0 size-full object-cover"
              style={{ scale }}
            />
          </motion.div>
          {/* 窓の外に置いた見出し。窓が広がるにつれて消える */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-[10%] flex flex-col items-center gap-4 text-white"
            style={{ opacity: titleOp }}
          >
            <p className="text-body-18 font-thin leading-[1.2]">
              {spot.category} {spot.no}
            </p>
            <h1 className="text-[64px] font-thin leading-none">{spot.name}</h1>
            <p className="text-body-14 font-extralight tracking-[4px] text-white/70">
              {spot.kana}
            </p>
          </motion.div>
        </div>
      </div>
      {/* 窓をくぐった先：青の世界でガラスカードを読む */}
      <div className="mx-auto flex w-[960px] max-w-full flex-col gap-[72px] px-6 pb-[160px] pt-[40px]">
        <motion.p
          className="text-body-18 font-extralight leading-[2.2] tracking-[0.7px] text-white/90"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ root: ref, once: true, amount: 0.5 }}
        >
          {spot.lead}
        </motion.p>
        <motion.div
          className="w-full rounded-16 bg-white/10 p-[56px] backdrop-blur-65"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ root: ref, once: true, amount: 0.15 }}
        >
          <Sections spot={spot} root={ref} light />
        </motion.div>
        <FooterBlocks spot={spot} root={ref} kind="glass" />
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════
   写真が主役の5案（2026-09-15 追加）
   ヒデさん指示：「写真が引き立ち、インタラクションがそれを下支えする」
   → 文字は控えめ・小さく、動きは写真の見え方を助けるためだけに使う。
     視差は弱め（酔わない範囲）、拡大は transform のみでレイアウトは動かさない
   ═══════════════════════════════════════════════════════════ */

/** 写真の上に薄く敷く暗幕（文字を置く時だけ） */
const VEIL = "absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent";

/* ═══════════ 案6 写真だけで語る ═══════════
   全画面の写真が続き、文字は写真と写真のあいだに短く挟まるだけ。
   写真は画面に入るとゆっくり実寸へ寄る（1.06→1.00）だけの静かな動き */
export function V6PhotoOnly({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const shots = [spot.hero, ...spot.photos, spot.hero];
  return (
    <main ref={ref} className="h-dvh overflow-y-auto overscroll-contain bg-ink">
      <BackPill />
      <div className="relative h-dvh w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="absolute inset-0 size-full object-cover" />
        <div className={VEIL} />
        <div className="absolute inset-x-0 bottom-0 px-[120px] pb-[88px]">
          <HeroTitle spot={spot} />
        </div>
      </div>
      {spot.sections.map((s, i) => (
        <div key={i}>
          {/* 文字は白地の細い帯。読ませすぎず、写真へすぐ返す */}
          <motion.div
            className="mx-auto w-[720px] max-w-[88%] py-[120px]"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ root: ref, once: true, amount: 0.4 }}
          >
            {s.heading && (
              <h3 className="mb-5 text-title-28 font-thin leading-[1.4] text-white">
                {s.heading}
              </h3>
            )}
            <p className="text-body-16 font-extralight leading-[2.4] tracking-[0.5px] text-white/80">
              {s.text}
            </p>
          </motion.div>
          <QuietShot src={shots[(i + 1) % shots.length]} root={ref} />
        </div>
      ))}
      <div className="mx-auto flex w-[880px] max-w-[92%] flex-col gap-[88px] py-[140px]">
        <FooterBlocks spot={spot} root={ref} kind="solid" />
      </div>
    </main>
  );
}

/** 全画面の1枚。画面に入るとゆっくり実寸へ寄る（弱い動きで写真を邪魔しない） */
function QuietShot({
  src,
  root,
  h = "h-dvh",
}: {
  src: string;
  root: React.RefObject<HTMLElement | null>;
  h?: string;
}) {
  return (
    <div className={`w-full overflow-hidden ${h}`}>
      <motion.img
        src={src}
        alt=""
        className="size-full object-cover"
        initial={{ scale: 1.06, opacity: 0.6 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ root, once: true, amount: 0.3 }}
        transition={{ duration: 1.8, ease: EASE }}
      />
    </div>
  );
}

/* ═══════════ 案7 写真がひらく ═══════════
   細い帯から上下に開いて写真が現れる。開ききると全画面。
   clip-path なのでレイアウトは動かず、写真の“登場”だけが際立つ */
export function V7Reveal({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const shots = [spot.hero, ...spot.photos];
  return (
    <main ref={ref} className="h-dvh overflow-y-auto overscroll-contain bg-white">
      <BackPill />
      <div className="relative h-dvh w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="absolute inset-0 size-full object-cover" />
        <div className={VEIL} />
        <div className="absolute inset-x-0 bottom-0 px-[120px] pb-[88px]">
          <HeroTitle spot={spot} />
        </div>
      </div>
      <div className="flex flex-col gap-[160px] py-[160px]">
        {spot.sections.map((s, i) => (
          <div key={i} className="flex flex-col gap-[80px]">
            <OpenShot src={shots[i % shots.length]} root={ref} />
            <motion.div
              className="mx-auto flex w-[760px] max-w-[88%] flex-col gap-5"
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
          </div>
        ))}
        <div className="mx-auto flex w-[880px] max-w-[92%] flex-col gap-[88px]">
          <FooterBlocks spot={spot} root={ref} />
        </div>
      </div>
    </main>
  );
}

function OpenShot({
  src,
  root,
}: {
  src: string;
  root: React.RefObject<HTMLElement | null>;
}) {
  return (
    <motion.div
      className="h-[70dvh] w-full overflow-hidden"
      initial={{ clipPath: "inset(42% 0% 42% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ root, once: true, amount: 0.35 }}
      transition={{ duration: 1.6, ease: EASE }}
    >
      <motion.img
        src={src}
        alt=""
        className="size-full object-cover"
        initial={{ scale: 1.12 }}
        whileInView={{ scale: 1 }}
        viewport={{ root, once: true, amount: 0.35 }}
        transition={{ duration: 2.2, ease: EASE }}
      />
    </motion.div>
  );
}

/* ═══════════ 案8 写真が固定、文字が流れる ═══════════
   左半分に写真が貼り付いたまま、右半分の文章だけがスクロールする。
   章が変わると写真が静かに入れ替わる＝写真をいちばん長く見ていられる形 */
export function V8SplitSticky({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const [idx, setIdx] = useState(0);
  const shots = [spot.hero, ...spot.photos];
  return (
    <main ref={ref} className="h-dvh overflow-y-auto overscroll-contain bg-white">
      <BackPill />
      <div className="relative h-dvh w-full overflow-hidden">
        <img src={spot.hero} alt={spot.name} className="absolute inset-0 size-full object-cover" />
        <div className={VEIL} />
        <div className="absolute inset-x-0 bottom-0 px-[120px] pb-[88px]">
          <HeroTitle spot={spot} />
        </div>
      </div>
      <div className="flex w-full items-start">
        {/* 左：貼り付く写真（章に合わせてクロスフェード） */}
        <div className="sticky top-0 h-dvh w-1/2 shrink-0 overflow-hidden">
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
        <div className="flex w-1/2 flex-col">
          {spot.sections.map((s, i) => (
            <motion.div
              key={i}
              className="flex min-h-dvh flex-col justify-center gap-6 px-[88px]"
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
      </div>
      <div className="mx-auto flex w-[880px] max-w-[92%] flex-col gap-[88px] py-[140px]">
        <FooterBlocks spot={spot} root={ref} />
      </div>
    </main>
  );
}

/* ═══════════ 案9 写真が重なって送られる ═══════════
   写真が画面いっぱいに積み重なり、次の1枚が下から覆いかぶさる。
   1枚ずつ必ず全画面で見ることになるので、写真がいちばん強く出る */
export function V9Stack({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const shots = [spot.hero, ...spot.photos];
  return (
    <main ref={ref} className="h-dvh overflow-y-auto overscroll-contain bg-ink">
      <BackPill />
      <div className="relative w-full" style={{ height: `${shots.length * 100}dvh` }}>
        {shots.map((src, i) => (
          <StackCard key={src + i} src={src} i={i} n={shots.length} root={ref} spot={spot} />
        ))}
      </div>
      <div className="mx-auto flex w-[880px] max-w-[92%] flex-col gap-[100px] py-[140px]">
        <Sections spot={spot} root={ref} light />
        <FooterBlocks spot={spot} root={ref} kind="solid" />
      </div>
    </main>
  );
}

function StackCard({
  src,
  i,
  n,
  root,
  spot,
}: {
  src: string;
  i: number;
  n: number;
  root: React.RefObject<HTMLElement | null>;
  spot: SpotDetail;
}) {
  return (
    <div
      className="sticky top-0 h-dvh w-full overflow-hidden"
      style={{ zIndex: i + 1 }}
    >
      <motion.img
        src={src}
        alt=""
        className="size-full object-cover"
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ root, once: true, amount: 0.3 }}
        transition={{ duration: 2.4, ease: EASE }}
      />
      {i === 0 && (
        <>
          <div className={VEIL} />
          <div className="absolute inset-x-0 bottom-0 px-[120px] pb-[88px]">
            <HeroTitle spot={spot} />
          </div>
        </>
      )}
      {/* 何枚目かの控えめな表示（写真の邪魔をしない小ささ） */}
      <p className="font-num absolute right-[56px] top-[56px] text-body-14 font-extralight text-white/70">
        {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
      </p>
    </div>
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
          className="text-[88px] font-thin leading-none text-ink"
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
      <div className="flex flex-col items-center gap-[180px] pb-[180px]">
        {spot.sections.map((s, i) => (
          <div key={i} className="flex w-[1240px] max-w-[94%] items-start gap-[48px]">
            {/* 写真：枠は固定、中の絵だけ育つ（レイアウトは動かない） */}
            <div className="h-[680px] min-w-0 flex-1 overflow-hidden">
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
                  className="whitespace-nowrap text-title-28 font-thin leading-[1.6] text-ink"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {s.heading}
                </h3>
              )}
              <p
                className="h-[600px] text-body-14 font-extralight leading-[2.2] tracking-[0.7px] text-ink/70"
                style={{ writingMode: "vertical-rl" }}
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
    </main>
  );
}
