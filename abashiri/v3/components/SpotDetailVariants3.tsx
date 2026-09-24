"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * ぼーっとスポット詳細ページ｜追加の12案（案26〜37）
 * 2026-09-16 ヒデさん依頼を4グループに分けて作った：
 *
 *   B. 案31      見出しを付けて「左に見出し・右に本文」。余白を生かした案。
 *                ⚠️ 色は付けない。区切りは【罫線と余白だけ】で表す
 *                （同じ組で出した案27〜30 は 2026-09-16 に完全削除）
 *   C. 案32〜36  左カラムに目次。スクロール位置に応じて目次が動く5案
 *   D. 案37      最初は画面いっぱい（100dvh）のサムネ＋左下に名前。
 *                スクロールすると裏がぼけて、白いコンテンツの面になる
 *   E. 案38〜40  案11（余白で読ませる）の系統をもう3案。
 *                12列グリッド／見出しと本文をうんと離す／斜めに離す
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
import { motion, useAnimationFrame, useScroll, useTransform } from "framer-motion";
import {
  InfoTable,
  MapEmbed,
  Points,
  HeroTitle,
  DetailHeader,
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
      {/* 共通ヘッダー（部品は SpotDetailVariants.tsx の DetailHeader） */}
      <DetailHeader />
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
    "text-[length:var(--dt-head)] font-thin leading-[1.6] text-ink [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";
  return (
    <>
      {/* 【罫線のルール（2026-09-20 ヒデさん指示）】
            ・見出しの上下には罫線を入れない
              （担当者からのおすすめポイント／基本情報／周辺マップ すべて）
            ・基本情報の表は「行と行の区切り」だけ。表の一番上と一番下の線は入れない
          → 区切りは罫線ではなく【余白】でつける（pt-10 → pt-[88px]） */}
      <motion.section data-sec={from} className="flex flex-col gap-7" {...V}>
        <h2 className={head}>担当者からのおすすめポイント</h2>
        <Points spot={spot} />
      </motion.section>
      <motion.section
        data-sec={from + 1}
        className="flex flex-col gap-7 pt-[88px]"
        {...V}
      >
        <h2 className={head}>基本情報</h2>
        <InfoTable spot={spot} />
      </motion.section>
      <motion.section
        data-sec={from + 2}
        className="flex flex-col gap-7 pt-[88px]"
        {...V}
      >
        <h2 className={head}>周辺マップ</h2>
        <MapEmbed spot={spot} />
      </motion.section>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   B. 案31  左に見出し・右に本文（余白を生かす案）
   ⚠️ **色は一切足さない**。区切りは罫線と余白だけ
   【2026-09-16 ヒデさん依頼】この組の案27・28・29・30 は完全削除した
   ═══════════════════════════════════════════════════ */

/** 案31 と目次5案で共通のヒーロー（写真いっぱい・見出しは小さく下に） */
function QuietHero({ spot, h = "h-[88dvh]" }: { spot: SpotDetail; h?: string }) {
  return (
    <div className={`relative w-full overflow-hidden ${h}`}>
      <img src={spot.hero} alt={spot.name} className="size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-6 pb-[80px] lg:px-[120px] lg:pb-[120px]">
        <HeroTitle spot={spot} size="sm" />
      </div>
    </div>
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
  const box = useRef<HTMLElement>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  /* 印を置く位置＝選んでいる行の「まんなか」。行の高さは文字の折り返しで
     変わるので、決め打ちではなく毎回そこから測る */
  const [dotY, setDotY] = useState(8);
  useEffect(() => {
    const el = rows.current[active];
    if (!el) return;
    setDotY(el.offsetTop + el.offsetHeight / 2 - 2.5);
  }, [active, items.length, kind]);

  return (
    <nav ref={box} className="relative flex flex-col gap-[18px]">
      {/* 案35（dot）だけ、目次の左に1本レールを引いて印が滑る。
          【2026-09-16 ヒデさん指示】「レールの線と文字がちょっとずれている」
          → 決め打ちの行送り（38px）で位置を出していたのが原因。
            文字が折り返すと行の高さが変わるので合わなくなる。
            いまは各行の実測位置（offsetTop＋高さの半分）へ合わせている */}
      {kind === "dot" && (
        <span className="absolute inset-y-[6px] left-0 w-px bg-ink/12" />
      )}
      {kind === "dot" && (
        <motion.span
          className="absolute left-[-2px] size-[5px] rounded-full bg-ink"
          animate={{ top: dotY }}
          transition={{ duration: 0.55, ease: EASE }}
        />
      )}
      {items.map((t, i) => {
        const on = i === active;
        return (
          <button
            key={t.id}
            type="button"
            ref={(el) => {
              rows.current[i] = el;
            }}
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
              className={`block origin-left text-body-14 font-light leading-[1.7] text-ink ${
                kind === "dot" ? "pl-4" : ""
              }`}
              animate={{
                /* 案32：10px 右へずれる（ヒデさんの例そのまま） */
                x: kind === "slide" && on ? 10 : 0,
                /* 案35：印が来た行の文字も少し大きくする（2026-09-16 ヒデさん指示） */
                scale: kind === "dot" && on ? 1.12 : 1,
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

/** 目次5案で共通の枠組み（左に目次・右に本文）
    pinnedHero: 写真を画面いっぱいに貼りつけたまま、白い面が上にかぶさってくる形にする
      【2026-09-20 ヒデさん指示】
        「最初は画像がVH100で表示されていて、スクロールするとグラデーションの
          白色の背景が出てきて、写真は固定でずっと動かずに、
          白背景のものが上にかぶさってスクロールされていくようなイメージ」
      ⚠️ 案37（ぼかして白へ）と違い、写真は【ぼかさない・動かさない】。
         貼りついたまま一切変化せず、白い面だけが乗り上げる */
function TocLayout({
  spot,
  kind,
  heroH = "h-[86dvh]",
  pinnedHero = false,
  heroMode = "gradient",
}: {
  spot: SpotDetail;
  kind: TocKind;
  heroH?: string;
  pinnedHero?: boolean;
  /** 写真から白へ渡す方法
      gradient … 白いグラデの面が手前に乗り上げてくる（写真はそのまま）
      blur     … 写真そのものがぼけながら白くなって、白い面へ溶ける
                 （2026-09-24 ヒデさん依頼で追加） */
  heroMode?: "gradient" | "blur";
}) {
  const ref = useRef<HTMLElement>(null);
  const blurHero = pinnedHero && heroMode === "blur";
  const heads = headsOf(spot);
  const items = tocOf(spot);
  const active = useSpy(ref, items.length);
  const jump = useJump(ref);

  /* 左下の名前は、白い面が上がってくるのに合わせて消す。
     ⚠️ 写真そのものには一切さわらない（固定したまま）。消えるのは名前だけ。
        目安は画面1つぶんのスクロール＝白い面の先頭が画面上端に来るころ。 */
  const { scrollY } = useScroll({ container: ref });
  const [vh, setVh] = useState(0);
  useEffect(() => {
    const el = ref.current;
    const read = () => setVh(el?.clientHeight || window.innerHeight || 0);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  const titleO = useTransform(
    scrollY,
    [0, Math.max(1, vh * 0.22), Math.max(2, vh * 0.55)],
    [1, 1, 0]
  );
  /* blur モード用。写真が「ぼけながら白くなる」進み具合。
     ⚠️ 終わる位置は決め打ちにしない。白い面の上端が画面の上まで来る
        スクロール量を【実測】して、そこより少し手前で白くなりきるようにする。
        （スマホは写真を 60dvh、PC は 100dvh 見せるので、決め打ちだとどちらかがズレる） */
  const panel = useRef<HTMLDivElement>(null);
  const [panelTop, setPanelTop] = useState(0);
  useEffect(() => {
    const read = () => setPanelTop(panel.current?.offsetTop || 0);
    read();
    const t = setTimeout(read, 60); /* フォント読み込み後にもう一度測る */
    window.addEventListener("resize", read);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", read);
    };
  }, [heroMode]);
  const span = panelTop || Math.max(1, vh);
  const fadeIn = Math.max(1, span * 0.12);
  const fadeOut = Math.max(2, span * 0.9);
  const heroBlur = useTransform(
    scrollY,
    [0, fadeIn, fadeOut],
    ["blur(0px)", "blur(0px)", "blur(26px)"]
  );
  /* 白くなる度合い。写真の上に白を重ねる（写真自体は動かさない） */
  const heroWhite = useTransform(scrollY, [0, fadeIn, fadeOut], [0, 0, 1]);
  /* ぼかすと縁が透けるので、わずかに拡大して縁を画面の外へ逃がす */
  const heroScale = useTransform(scrollY, [0, fadeOut], [1, 1.06]);

  /* ヘッダー（ナビ・サウンド）の色を、この案が自分で決めて知らせる。
     【2026-09-24 実測で判明した不具合】
       これまでは DetailHeader 側が「画面の上から1/3の点に白い物があるか」を
       elementFromPoint で調べていたが、写真の層は pointer-events:none なので
       この調べ方では【素通り】して、いつも奥の白い main に当たってしまう。
       その結果、写真の上なのにナビが黒くなることがあった（案36 でも再現）。
     → 位置が分かっているこちら側で決める。白グラデの箱の位置を実測し、
        画面の上1/3が白に覆われたら黒へ。blur 案は写真自体が白くなるので、
        その白さ（heroWhite）が半分を超えた時点でも黒へ。
     ⚠️ data-hdr-owned を立てている間、DetailHeader は自分で判定しない。 */
  const grad = useRef<HTMLDivElement>(null);
  useAnimationFrame(() => {
    if (!pinnedHero) return;
    const el = ref.current;
    const g = grad.current;
    if (!el || !g) return;
    const line = el.clientHeight * 0.33; /* この高さまで白が来たら白背景とみなす */
    const r = g.getBoundingClientRect();
    /* グラデは上が透明・下が白なので、真ん中あたりで「白」と見なす */
    const covered = r.top + r.height * 0.55 <= line;
    const whitened = blurHero && heroWhite.get() >= 0.5;
    const white = covered || whitened;
    const root = document.documentElement;
    const now = white ? "1" : "";
    if (root.dataset.headerDark !== now) root.dataset.headerDark = now;
    if (root.dataset.hdrOwned !== "1") root.dataset.hdrOwned = "1";
  });
  useEffect(() => {
    if (!pinnedHero) return;
    return () => {
      document.documentElement.dataset.hdrOwned = "";
      document.documentElement.dataset.headerDark = "";
    };
  }, [pinnedHero]);

  return (
    <Shell refEl={ref}>
      {pinnedHero ? (
        <>
          {/* 【2026-09-20→21 ヒデさん指示】
               「後ろに画像が固定であって、Zインデックスで上の白背景のセクションが
                 スクロールで上がっていく。写真の位置などは一切変わらず」
             → 写真は【画面に貼りつけたまま一切動かさない】。
                以前は sticky で貼りつけていたが、その仕組みでは
                「貼りつく区間」を抜けると写真が上へ流れてしまう。
                position:fixed なら、区間という考え自体が無くなり、
                最後まで1pxも動かない。

             ⚠️ ここで fixed が使えるのは、詳細ページが【main を自前でスクロール
                させている】から。トップページのように body ごと拡大している画面では
                fixed は使えない（ズレる）。詳細ページ専用の手。
             ⚠️ z-0（いちばん奥）。白い面は z-10 で手前に重なる。 */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            {/* blur モードのときだけ、写真そのものをぼかして白へ寄せる。
                【2026-09-24 ヒデさん指示】
                  「ファーストビュー自体がブラーで白に変化していくことで、
                    スクロールしていくと白いセクションにきれいになじんでいく」
                ⚠️ 位置は動かさない（貼りついたまま）。変えるのは見え方だけ。
                ⚠️ ぼかすと写真の縁が薄くなって下地が透けるので、
                   ほんの少し拡大して縁を画面の外へ逃がす。 */}
            <motion.img
              src={spot.hero}
              alt={spot.name}
              className="size-full object-cover"
              style={
                blurHero
                  ? { filter: heroBlur, scale: heroScale, willChange: "filter" }
                  : undefined
              }
            />
            {/* 地名を読ませるための影。⚠️ 下端は【写真が見えている範囲の下端】に
                合わせる。画面いっぱい（inset-0）にすると、スマホでは一番濃い所が
                白い面の裏に隠れてしまい、地名が白い船体の上に白抜きで乗って
                読めなかった（2026-09-24 実測） */}
            <div className="absolute inset-x-0 bottom-[40dvh] top-0 bg-gradient-to-t from-black/50 via-black/5 to-black/20 lg:bottom-0" />
            {/* スマホだけ、地名のうしろをもう一段だけ暗くする。
                写真が明るい（白い船体・雪）と白抜きの字が沈むため */}
            <div className="absolute inset-x-0 bottom-[40dvh] h-[26dvh] bg-gradient-to-t from-black/55 via-black/28 to-transparent lg:hidden" />
            {blurHero && (
              /* 白の膜。写真の上に重ねて、だんだん真っ白にする */
              <motion.div
                className="absolute inset-0 bg-white"
                style={{ opacity: heroWhite }}
              />
            )}
            {/* 地名は【写真が見えている範囲の下】に置く。
                ⚠️ 2026-09-24 実測で判明：画面の一番下（bottom-0）に置いていたため、
                   スマホ（写真は 60dvh まで）では白い面の裏に入って
                   地名がまったく見えていなかった。PC は写真が1画面ぶんなので
                   今までどおり一番下でよい。 */}
            <motion.div
              className="absolute inset-x-0 bottom-[40dvh] px-6 pb-[28px] lg:bottom-0 lg:px-[120px] lg:pb-[120px]"
              style={{ opacity: titleO }}
            >
              <HeroTitle spot={spot} size="sm" />
            </motion.div>
          </div>
          {/* 白い面。最初は画面の1つ下に置いておき、スクロールすると
              写真の手前を上がってくる（写真そのものは動かない） */}
          {/* 【2026-09-24 ヒデさん指示】
                「ファーストビューは100VHにする必要はなくて、画面縦幅の60%ぐらい」
                「白セクションが出てくるのも余白が多くて、無駄にスクロールする印象」
              → スマホは写真を 60dvh ぶん見せてから白い面が来る。
                 PC は今までどおり1画面ぶん見せる（大きい画面では余白が気にならない） */}
          <div className="relative z-10 pt-[60dvh] lg:pt-[100dvh]">
            {/* 白い面の上端。ここが画面の上まで来る量を上で実測している */}
            <div ref={panel} className="h-0 w-full" />
            {/* ⚠️ 2026-09-20 ヒデさん指摘「上部の部分は白を多めに。急に空が来すぎ」
                → 変化が急だったので、丈を 46dvh → 70dvh に伸ばし、
                  白の立ち上がりを早めて刻みも細かくした（上に行くほど写真が
                  すこしずつ顔を出す形にする） */}
            <div
              ref={grad}
              className={
                blurHero
                  ? "h-[16dvh] w-full lg:h-[22dvh]"
                  : "h-[34dvh] w-full lg:h-[70dvh]"
              }
              style={{
                background: blurHero
                  ? /* blur モード：写真側がもう白いので、継ぎ目を消すだけの短いグラデ */
                    "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0.92) 78%, #fff 100%)"
                  : "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 12%, rgba(255,255,255,0.34) 26%, rgba(255,255,255,0.54) 40%, rgba(255,255,255,0.72) 54%, rgba(255,255,255,0.86) 68%, rgba(255,255,255,0.95) 82%, rgba(255,255,255,0.99) 92%, #fff 100%)",
              }}
            />
            <div className="-mt-px bg-white" />
          </div>
        </>
      ) : (
        <QuietHero spot={spot} h={heroH} />
      )}
      <div
        className={`px-6 py-[56px] md:px-[56px] md:py-[80px] lg:px-[100px] lg:py-[110px] ${
          /* 白い面の続き。写真(z-0)より手前に置く */
          pinnedHero ? "relative z-10 -mt-px bg-white pt-0" : ""
        }`}
      >
        <div className="mx-auto flex max-w-[1180px] flex-col gap-[60px] lg:flex-row lg:gap-[110px]">
          {/* 左カラム：目次。本文を読んでいる間ずっと画面に残る */}
          <aside className="shrink-0 lg:w-[230px]">
            <div className="lg:sticky lg:top-[110px]">
              <p className="mb-7 text-body-14 font-light tracking-[0.2em] text-ink/35">
                目次
              </p>
              <Toc items={items} active={active} onJump={jump} kind={kind} />
            </div>
          </aside>

          {/* 右カラム：本文 */}
          <div className="flex min-w-0 flex-1 flex-col gap-[56px] lg:gap-[96px]">
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
                <h3 className="text-[length:var(--dt-head)] font-thin leading-[1.5] text-ink [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  {s.heading}
                </h3>
                <p className="whitespace-pre-line text-[length:var(--dt-body)] font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 lg:max-w-[620px]">
                  {s.text}
                </p>
              </motion.section>
            ))}
            {spot.photos.map((p, i) => (
              <Photo key={i} src={p} root={ref} className="aspect-[3/2] w-full" />
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
/** 案34 目次の文字が濃くなる */
/** 案35 印がレールを滑る */
export function V35TocDot({ spot }: VProps) {
  return <TocLayout spot={spot} kind="dot" />;
}
/** 案36 目次の番号が大きくなる
    【2026-09-20 ヒデさん指示】この案のスクロールだけ案37 の方式に。
      最初は写真が画面いっぱい（100dvh）、スクロールすると写真は貼りついたまま
      動かず、白いグラデの面が上にかぶさって流れていく */
export function V36TocNum({ spot }: VProps) {
  return <TocLayout spot={spot} kind="num" pinnedHero />;
}

/** 案40 写真がぼけて白になじむ（案36 の写真の渡り方ちがい）
    【2026-09-24 ヒデさん依頼】
      「今は白いグラデのオブジェクトが上に重なっていく感じだが、そうではなく
        ファーストビュー自体がブラーで白に変化していくことで、
        スクロールしていくと白いセクションにきれいになじんでいく形にしたい」
    → 中身（目次の番号が育つ・本文の並び）は案36 とまったく同じ。
       ちがうのは写真から白への【渡り方】だけ。
       案36＝白い面が写真の手前に乗り上げる／案40＝写真そのものがぼけて白くなる */
export function V40HeroDissolve({ spot }: VProps) {
  return <TocLayout spot={spot} kind="num" pinnedHero heroMode="blur" />;
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
            className="absolute inset-x-0 bottom-0 px-6 pb-[86px] lg:px-[120px] lg:pb-[110px]"
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
        <div className="-mt-px bg-white px-6 pb-[120px] md:px-[56px] lg:px-[120px]">
          <div className="mx-auto flex max-w-[1000px] flex-col gap-[96px]">
            {heads.map((s, i) => (
              <motion.section
                key={i}
                data-sec={i}
                className="flex flex-col gap-4 lg:flex-row lg:gap-[90px]"
                variants={revealSlow}
                initial="hidden"
                whileInView="show"
                viewport={{ root: ref, once: true, amount: 0.3 }}
              >
                <h3 className="shrink-0 text-body-14 font-light leading-[1.9] tracking-[0.18em] text-ink/55 lg:w-[190px]">
                  {s.heading}
                </h3>
                <p className="w-full whitespace-pre-line text-[length:var(--dt-body)] font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 lg:max-w-[560px]">
                  {s.text}
                </p>
              </motion.section>
            ))}
            {spot.photos.map((p, i) => (
              <Photo key={i} src={p} root={ref} className="aspect-[3/2] w-full" />
            ))}
            <QuietBlocks spot={spot} root={ref} from={heads.length} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════
   E. 案38〜40  案11（余白で読ませる）の系統をもう3案
   【2026-09-16 ヒデさん依頼】
   「案11みたいなアイディアがあるといいですね。見出しと、なんかちょっと
     若干グリッドっぽくなっている感じ。見出しとすごく離して本文みたいな形もいい」
   → 解釈：①見出し・本文・写真が見えない12列のグリッドに乗る
          ②見出しと本文の【間】そのものをデザインにする
   3案とも案11 と同じ約束（写真は全幅で大きく／本文は細い柱／色は足さない）
   ═══════════════════════════════════════════════════ */

/** 12列のグリッド。列のまたぎ方だけを案ごとに変える */
function Grid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-4 gap-x-5 lg:grid-cols-12 lg:gap-x-6 ${className}`}>
      {children}
    </div>
  );
}

/* ── 案38 グリッドに乗せる ──────────────────────
   変えたところ：置き場所の決め方（12列のグリッド）
   見出しは1〜3列、本文は5〜10列。写真も列にそろえて、1枚ごとに
   またぐ列をずらす。目に見えない格子に全部が乗っているので、
   バラバラに見えて実はそろっている */
export function V38Grid({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  /* 写真がまたぐ列。1枚ごとにずらして、右だけ・左だけの余白を作る */
  const span = [
    "lg:col-start-2 lg:col-end-13",
    "lg:col-start-1 lg:col-end-9",
    "lg:col-start-5 lg:col-end-13",
    "lg:col-start-3 lg:col-end-11",
  ];
  return (
    <Shell refEl={ref}>
      <QuietHero spot={spot} h="h-[88dvh]" />

      <div className="px-6 py-[120px] md:px-[56px] lg:px-[80px]">
        <Grid className="gap-y-[104px]">
          {heads.map((s, i) => (
            <motion.section
              key={i}
              data-sec={i}
              className="col-span-4 grid grid-cols-subgrid lg:col-span-12"
              variants={revealSlow}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.3 }}
            >
              <h3 className="col-span-4 mb-4 text-body-14 font-light leading-[1.9] tracking-[0.18em] text-ink/55 lg:col-start-1 lg:col-end-4 lg:mb-0">
                {s.heading}
              </h3>
              <p className="col-span-4 whitespace-pre-line text-[length:var(--dt-body)] font-extralight leading-[2.4] tracking-[0.5px] text-ink/90 lg:col-start-5 lg:col-end-11">
                {s.text}
              </p>
            </motion.section>
          ))}
        </Grid>
      </div>

      {/* 写真も同じ格子に乗せる。またぐ列を1枚ずつずらす */}
      <div className="px-6 pb-[120px] md:px-[56px] lg:px-[80px]">
        <Grid className="gap-y-[96px]">
          {spot.photos.map((p, i) => (
            <div key={p} className={`col-span-4 ${span[i % span.length]}`}>
              <Photo src={p} root={ref} className="aspect-[3/2] w-full" />
            </div>
          ))}
        </Grid>
      </div>

      <div className="px-6 pb-[160px] md:px-[56px] lg:px-[80px]">
        <Grid>
          <div className="col-span-4 flex flex-col gap-[72px] lg:col-start-3 lg:col-end-11">
            <QuietBlocks spot={spot} root={ref} from={heads.length} />
          </div>
        </Grid>
      </div>
    </Shell>
  );
}

/* ── 案39 見出しをうんと離す ────────────────────
   変えたところ：見出しと本文の【間】
   見出しだけを先に大きく置いて、ひと呼吸ぶん空けてから本文が来る。
   間そのものが「息を吸う場所」になる。案11 の余白をもっと極端にした形 */
export function V39FarHead({ spot }: VProps) {
  const ref = useRef<HTMLElement>(null);
  const heads = headsOf(spot);
  return (
    <Shell refEl={ref}>
      <QuietHero spot={spot} h="h-[90dvh]" />

      <div className="px-6 py-[120px] md:px-[56px] lg:px-[120px]">
        <div className="flex flex-col gap-[64px]">
          {heads.map((s, i) => (
            <motion.section
              key={i}
              data-sec={i}
              variants={revealSlow}
              initial="hidden"
              whileInView="show"
              viewport={{ root: ref, once: true, amount: 0.25 }}
            >
              <h3 className="text-[length:var(--dt-head)] font-thin leading-[1.5] tracking-[0.04em] text-ink [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                {s.heading}
              </h3>
              {/* ここが「間」。【2026-09-16 ヒデさん指示】「離しすぎなので、
                  もう少し近づけて」→ 42dvh→16dvh（スマホは 24→10dvh）に詰めた */}
              <div className="h-[10dvh] lg:h-[16dvh]" />
              <p className="max-w-[520px] whitespace-pre-line text-[length:var(--dt-body)] font-extralight leading-[2.5] tracking-[0.5px] text-ink/90 lg:ml-auto lg:mr-[60px]">
                {s.text}
              </p>
            </motion.section>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[96px] pb-[120px]">
        {spot.photos.map((p) => (
          <Photo key={p} src={p} root={ref} className="h-[68dvh] w-full lg:h-[84dvh]" />
        ))}
      </div>

      <div className="mx-auto flex w-[860px] max-w-full flex-col gap-[80px] px-6 pb-[170px]">
        <QuietBlocks spot={spot} root={ref} from={heads.length} />
      </div>
    </Shell>
  );
}
