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
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { SpotDetail } from "./spotDetailData";
import SiteFooter from "./SiteFooter";
import GlobalNav from "./GlobalNav";

/* ゆったり共通のイージング（既存サイトと同じ緩急） */
export const EASE = [0.22, 1, 0.36, 1] as const;
/* 画面に入ったらブラーが晴れて浮き上がる（reveal）。トップページと同じ質感 */
export const reveal = {
  hidden: { opacity: 0, y: 40, filter: "blur(16px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.2, ease: EASE },
  },
};

/* ───────────────────────── 共通の部品 ───────────────────────── */

/* 詳細ページの共通ヘッダー。
   【2026-09-20 ヒデさん指示】「トップへ戻るボタンはなくして、
     ヘッダーが消えてしまっているのでヘッダーを入れてあげてください」
   → 旧 BackPill（左上の「トップへ戻る」）を廃止し、トップと同じナビを出す。
     「ホーム」を押せばトップへ戻れるので、戻る導線は失われない。

   ⚠️ 詳細ページは main が自前でスクロールする箱。fixed はその外（画面）に
      貼りつくので、スクロールしても位置は動かない。
   ⚠️ 文字は白。どの案も先頭は写真なのでその上で読めるが、白い本文の面が
      乗り上げてくると読みにくくなるため、上端に薄い黒のグラデで足場を作る。 */
export function DetailHeader() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-black/30 to-transparent" />
      <div className="pointer-events-auto relative flex justify-center pt-[26px]">
        <GlobalNav theme="light" />
      </div>
    </div>
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
      {spot.info.map((row, i) => (
        <div
          /* 「関連サイト」のように同じ見出しが2行あるので index も混ぜる */
          key={`${row.label}-${i}`}
          className={`flex gap-4 border-b py-4 first:border-t sm:gap-6 ${line}`}
        >
          <dt
            className={`w-[72px] shrink-0 text-body-14 font-light leading-[2] sm:w-[96px] ${label}`}
          >
            {row.label}
          </dt>
          {/* ⚠️ min-w-0 と break-words はセットで必須。
             flex の子は既定で「中身の最小幅より縮まない」ので、
             長いURL（https://www.instagram.com/… など）が1語扱いになって
             スマホ幅を突き破り、ページごと横スクロールしていた
             （2026-09-16 実測：375px で31px はみ出し） */}
          <dd
            className={`min-w-0 whitespace-pre-line break-words text-body-14 font-extralight leading-[2] tracking-[0.7px] ${value}`}
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
        className={`h-[280px] w-full border-0 sm:h-[420px] ${light ? "rounded-30" : ""}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {/* ⚠️ 左上は Google 自身の情報カード（店名・住所・評価）の定位置。
         そこに置くと必ず重なるので【右上】へ逃がす（2026-09-16 ヒデさん指摘）。
         左下＝Googleロゴ・サムネ／右下＝操作ボタン／下中央＝利用規約 も避ける。
         見た目はトップページのすりガラス（bg-white/10＋ring＋blur65）と同じ作りだが、
         地図は明るいので、地の白と枠を濃いめにして文字が読めるようにしている */}
      <a
        href={spot.map.link}
        target="_blank"
        rel="noreferrer"
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/55 px-4 py-2 text-body-14 font-light text-ink shadow-floating ring-1 ring-inset ring-white/70 backdrop-blur-65 transition-colors duration-300 ease-standard hover:bg-white/80"
      >
        マップで開く
        <img src="/img/icon-view-more-black.svg" alt="" className="size-[14px]" />
      </a>
    </div>
  );
}

/** 本文（小見出し＋段落）。1段落ずつ画面に入ったら浮き上がる */
export function Sections({
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
              /* 大きさは調整パネルのつまみ（--dt-head）。行間は倍率なので一緒に動く */
              className={`text-[length:var(--dt-head)] font-thin leading-[1.4] ${
                light ? "text-white" : "text-ink"
              }`}
            >
              {s.heading}
            </h3>
          )}
          <p
            /* 大きさは調整パネルのつまみ（--dt-body） */
            className={`text-[length:var(--dt-body)] font-extralight leading-[2.4] tracking-[0.5px] ${
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
export function FooterBlocks({
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
export function HeroTitle({
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
        className={`font-thin leading-none opacity-95 ${sm ? "text-title-34 sm:text-title-56" : "text-title-44 sm:text-hero-90"}`}
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
export type VProps = { spot: SpotDetail };

/** 写真の上に薄く敷く暗幕（文字を置く時だけ） */
export const VEIL =
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
  /* 【2026-09-16 ヒデさん指示】「案1はスクロールしてもヘッダーのタイトルは
     消えなくて大丈夫」→ 消えるフェードをやめ、写真と一緒にそのまま送る */

  return (
    <main
      ref={ref}
      className="h-dvh overflow-y-auto overscroll-contain bg-white"
    >
      <DetailHeader />
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
        <div className="absolute inset-x-0 bottom-0 px-6 pb-[90px] md:px-[56px] lg:px-[120px] lg:pb-[180px]">
          <HeroTitle spot={spot} size="sm" />
        </div>
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

/* ═══════════ 案3 白エディトリアル ═══════════
   縦書きの名前＋2カラム。右の基本情報がスクロールに追従する。

   【2026-09-16 ヒデさん指示】
     「現状のデザインは終点として扱い、最初は全画面で表示されていた写真が
       スクロールすると現状のような切り取られた画像になって下にスクロールできる形に。
       最初の全画面の時はテキスト情報は一切なし。スクロールした先でタイトルが見えてくる」
   → 導入（全画面の写真だけ）→ 終点（いまのエディトリアル）へ、スクロールで移す。
     写真の切り取りを【いまの写真の置き場所とだいたい同じ枠】まで狭めながら、
     入れ替わりに白いエディトリアルの面をかぶせる。
     こうすると「全画面だった写真が、そのまま記事の写真になった」ように見える */
export function V3Editorial({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  /** 記事側の写真の置き場所（空き枠）。ここへ向かってズームアウトする */
  const shot = useRef<HTMLDivElement>(null);
  /** 実際に動く写真。いちばん上に乗っていて、全画面 → 空き枠へ縮む */
  const hero = useRef<HTMLDivElement>(null);
  /** 縮みきったら、貼りついた写真を消して記事側の写真に引き渡す */
  const [landed, setLanded] = useState(false);

  /* 【2026-09-17 ヒデさん指示】
     「最初に出ている写真が Zインデックスで上にあって、下にコンテンツが
       かぶさっている形で表示されていて、スクロールするとズームアウトして、
       その写真が終点の位置・終点のサイズになって進む」
     → 溶暗（クロスフェード）はやめた。写真は【1枚だけ】で、
       最前面のまま全画面から記事の枠へ縮んでいく。記事は最初から下に見えている。

     ⚠️ 縮めるのに transform の scale は使えない。写真は object-cover なので、
        枠の大きさが変わらないと「切り取られ方」が変わらず、
        非等倍で潰れる。枠の width/height を動かす（＝本物のズームアウト）。
        動かすのは position:absolute の1要素だけなので、まわりのレイアウトは動かない。
     ⚠️ framer の useScroll に container と target を渡す書き方は、
        このサイトでは進捗が正しく出ない。スクロール量から直接出す */
  const sp = useMotionValue(0);
  useAnimationFrame(() => {
    const sc = ref.current;
    const st = stage.current;
    const slot = shot.current;
    const h = hero.current;
    if (!sc || !st || !slot || !h) return;
    const travel = Math.max(1, st.offsetHeight - sc.clientHeight);
    const v = Math.max(0, Math.min(1, sc.scrollTop / travel));
    if (Math.abs(v - sp.get()) > 0.0005) sp.set(v);

    /* 0→0.86 で全画面から記事の枠まで縮みきる（最後は少し余韻を残す） */
    const k = Math.min(1, v / 0.86);
    /* 行き先＝記事の空き枠が、いま画面のどこにあるか */
    const r = slot.getBoundingClientRect();
    const mix = (from: number, to: number) => from + (to - from) * k;
    h.style.left = `${mix(0, r.left).toFixed(1)}px`;
    h.style.top = `${mix(0, r.top).toFixed(1)}px`;
    h.style.width = `${mix(sc.clientWidth, r.width).toFixed(1)}px`;
    h.style.height = `${mix(sc.clientHeight, r.height).toFixed(1)}px`;

    /* 枠にぴったり重なったら、記事側の写真に引き渡して貼りつきを終える
       （ぴったり同じ場所なので、入れ替わりは見えない） */
    const done = k >= 0.999;
    if (done !== landed) setLanded(done);
  });

  return (
    /* ⚠️ relative は必須。最前面の写真を absolute で置くので、
       基準になる箱がないとページの左上に飛ぶ */
    <main
      ref={ref}
      className="relative h-dvh overflow-y-auto overscroll-contain bg-white"
    >
      <DetailHeader />

      {/* ── 記事本体。最初から見えていて、上の写真にかぶられている ── */}
      <div className="relative z-0">
      {/* ⚠️ 上に1画面ぶん近い余白を置く。これが無いと、写真が縮みきるころには
          記事が画面の上へ流れてしまい、【着地するところが見えない】
          （2026-09-17 実測：着地時に写真の行き先が y=-708 にあった）。
          写真が縮みきるのは 0.86 × (190dvh − 1画面) ＝ 約78dvh のとき。
          そこで記事の写真が画面の上から 176px に来るように逆算した */}
      <div className="mx-auto w-[1200px] max-w-full px-6 pb-[120px] pt-[calc(78dvh+120px)]">
        <div className="flex items-start gap-7 sm:p-[56px]">
          <div className="flex w-full items-start gap-6 pt-2 sm:w-auto sm:shrink-0">
            <h1
              className="text-title-36 font-thin leading-[1.2] text-ink [writing-mode:horizontal-tb] sm:whitespace-nowrap sm:text-title-56 sm:[writing-mode:vertical-rl]"
            >
              {spot.name}
            </h1>
            <p
              className="pt-1 text-body-14 font-extralight tracking-[2px] text-ink/50 [writing-mode:horizontal-tb] sm:whitespace-nowrap sm:[writing-mode:vertical-rl]"
            >
              {spot.category} {spot.no}｜{spot.kana}
            </p>
          </div>
          {/* 写真の置き場所。導入の間は空けておき、
              上の写真が縮みきったら中身を出す（同じ場所なので切り替えは見えない） */}
          <div
            ref={shot}
            className="relative h-[300px] w-full min-w-0 overflow-hidden bg-white sm:h-[560px] sm:flex-1"
          >
            {landed && (
              <img
                src={spot.hero}
                alt={spot.name}
                className="absolute inset-0 size-full object-cover"
              />
            )}
          </div>
        </div>
        <p className="mt-10 text-body-18 font-extralight leading-[2.2] tracking-[0.7px] text-ink/80">
          {spot.lead}
        </p>
        <div className="mt-12 flex flex-col items-start gap-10 lg:mt-[88px] lg:flex-row lg:gap-[72px]">
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
                <img key={p} src={p} alt="" className="h-[150px] min-w-0 flex-1 object-cover lg:h-[240px]" />
              ))}
            </div>
            <div className="flex flex-col gap-6">
              <h2 className="text-title-28 font-thin leading-[1.6] text-ink">周辺マップ</h2>
              <MapEmbed spot={spot} />
            </div>
          </div>
          <aside className="w-full shrink-0 bg-sky-bottom/40 p-6 lg:sticky lg:top-10 lg:w-[360px] lg:p-8">
            <h2 className="mb-4 text-body-18 font-thin text-ink">基本情報</h2>
            <InfoTable spot={spot} />
          </aside>
        </div>
      </div>
      </div>

      {/* ── 最前面の写真。全画面 → 記事の枠へズームアウトする ──
          ⚠️ z-30。記事（z-0）より必ず上。押せるものは下にあるので当たり判定は外す */}
      <div
        ref={stage}
        className="pointer-events-none absolute inset-x-0 top-0 h-[190dvh]"
      >
        <div className="sticky top-0 h-dvh w-full">
          <div
            ref={hero}
            className="absolute z-30 overflow-hidden"
            style={{
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              visibility: landed ? "hidden" : "visible",
              willChange: "width, height, left, top",
            }}
          >
            <img src={spot.hero} alt="" className="size-full object-cover" />
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

