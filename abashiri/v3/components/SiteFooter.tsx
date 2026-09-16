"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 全ページ共通フッター（V3.0・2026-09-16 ヒデさん依頼）
 *
 * デザインは5案。右下の調整パネル（🌐サイト共通）から切り替える。
 * 既定は案1＝いまのサイトのトンマナそのまま（白地・Noto Thin/ExtraLight・
 * ink の文字・余白多め・動きは静か）。
 *
 * 使うアセットは V1 から残してあったもの
 *   ・logo-abashiri.svg（縦の「網走」ロゴ 75×159）
 *   ・sns-ig-circle.svg / sns-x.svg / sns-yt.svg
 *
 * 🟡仮置き
 *   ・SNSのリンク先URL（公式アカウントが確定したら差し替え）
 *   ・問い合わせ先は網走市観光協会の公開情報（0152-44-5849）を使用
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export const FOOTER_EVENT = "abashiri:footer";

export const FOOTER_PATTERNS: Record<number, { name: string; note: string }> = {
  /* どの案も「作字（な〜んにもない／たまらない）をいちばん見せる」ための組み方。
     2026-09-16 ヒデさん指示で、縦ロゴ前提の旧レイアウトから全面的に作り直した */
  1: {
    name: "案1",
    note: "中央に大きく（既定）。作字を真ん中に大きく置き、上下にたっぷり余白。リンクは下に小さく",
  },
  2: {
    name: "案2",
    note: "空に還る。下へ向かって青くなる空の中に、白い作字を大きく。KVの世界で終わる",
  },
  3: {
    name: "案3",
    note: "左に大きく。作字を左に寄せて大きく置き、リンクとSNSは右端にそろえる",
  },
  4: {
    name: "案4",
    note: "ポスター。作字をうんと大きく、下端にリンクを一行。いちばん潔い",
  },
  5: {
    name: "案5",
    note: "作字が中心。リンクを作字の左右に振り分けて、作字が真ん中の軸になる",
  },
  /* 2026-09-16 ヒデさん依頼（カンプ 17420:23293）で作り直した3案。
     考え方はどれも同じ：
       ・背景の写真はページの後ろにずっと居て、スクロールしてもついてくる
       ・上に乗っている白いコンテンツが【グラデーションで薄れて】いくと、
         その下から写真が顔を出す（境目をパッツリ切らない）
       ・フッターの中身はその写真の上に載る
     違うのは「現れ方」と「情報の置き方」だけ */
  6: {
    name: "案6 溶けて現れる",
    note: "白いコンテンツがグラデーションで薄れ、後ろにいた写真が顔を出す。作字は写真の中央、リンクはその下。いちばん素直な形",
  },
  7: {
    name: "案7 引きながら現れる",
    note: "写真が顔を出しながら、少し引いて（ズームアウトして）全景になる。作字は左下に大きく、情報は右下に小さく",
  },
  /* 2026-09-16 ヒデさん依頼：「フッター感がない。サイトマップのように
     大カテゴリの下にコンテンツが並ぶメガフッターで、サイトの要素を全出し」
     → 中身は SITEMAP（スポット5・グルメ4・体験4・ぼーっと体験3）で共通。
        違うのは【地の作り】と【組み方】 */
  8: {
    name: "案8 写真の上にサイトマップ",
    note: "案6の写真の上に、4つの大カテゴリを横に並べてサイトの中身を全部見せる。写真の余韻を残したままフッターらしくする",
  },
  9: {
    name: "案9 白地のメガフッター",
    note: "写真を使わず白地。大カテゴリ4列＋左に作字。いちばん普通のフッターで、情報がいちばん読みやすい",
  },
  10: {
    name: "案10 大見出しでぶら下げる",
    note: "大カテゴリを大きな見出しにして、その下に中身をぶら下げる。縦に長く、余白をたっぷり取って読ませる",
  },
  11: {
    name: "案11 索引（番号つき）",
    note: "01・02… と番号を振った索引の形。細い罫線で区切って、資料の目次のように整理する",
  },
  12: {
    name: "案12 写真＋2段組",
    note: "写真の上に、作字を大きく置いてからサイトマップを2段に。上が世界観、下が案内、と役割を分ける",
  },
};

/* フッターのリンク。トップ内のセクションは GlobalNav と同じ飛び方をさせる */
const LINKS: { label: string; href?: string; jump?: "spotAt" | "gourmetAt" | "eventsAt" }[] = [
  { label: "ホーム", href: "/" },
  { label: "ぼーっとスポット", jump: "spotAt" },
  { label: "グルメ", jump: "gourmetAt" },
  { label: "体験", jump: "eventsAt" },
];

/* ───────── サイトマップ（メガフッター用・2026-09-16 ヒデさん依頼）─────────
   「ぼーっとスポットという大カテゴリがあって、その下に中のコンテンツが並んでいる」
   形にするための一覧。**サイトにある要素を全部出す**のが狙い。
   ⚠️ ここは各セクションの一覧と同じ中身を手で写している（データ源が
      TopPage / SpotShowcase / EventSection に散っているため）。
      向こうを増やしたらここも足すこと。 */
export type SiteNode = {
  label: string;
  /** 下層ページがあるものはリンク先。無ければトップの該当セクションへ飛ぶ */
  href?: string;
  jump?: "spotAt" | "gourmetAt" | "eventsAt";
};
export const SITEMAP: { title: string; jump?: "spotAt" | "gourmetAt" | "eventsAt"; href?: string; items: SiteNode[] }[] = [
  {
    title: "ぼーっとスポット",
    jump: "spotAt",
    items: [
      { label: "能取岬", href: "/spot/notoro" },
      { label: "能取湖サンゴ草群落地", href: "/spot/sango" },
      { label: "網走駅", href: "/spot/eki" },
      { label: "流氷クルーズ", href: "/spot/ryuhyo" },
      { label: "大曲湖畔園地ひまわり畑", href: "/spot/himawari" },
    ],
  },
  {
    title: "素朴なグルメ",
    jump: "gourmetAt",
    items: [
      { label: "わかさぎの唐揚げ", jump: "gourmetAt" },
      { label: "浜の海鮮焼き", jump: "gourmetAt" },
      { label: "地魚の御膳", jump: "gourmetAt" },
      { label: "浜のちゃんこ鍋", jump: "gourmetAt" },
    ],
  },
  {
    title: "意外とオモロい体験",
    jump: "eventsAt",
    items: [
      { label: "博物館 網走監獄", href: "/spot/kangoku" },
      { label: "オホーツク流氷館", href: "/spot/ryuhyokan" },
      { label: "カヌー体験", href: "/spot/canoe" },
      { label: "オジロワシ・オオワシウォッチング", href: "/spot/washi" },
    ],
  },
  {
    title: "ぼーっと体験",
    href: "/experience",
    items: [
      { label: "ぼーっとしてみる", href: "/experience" },
      { label: "場所をえらぶ", href: "/experience" },
      { label: "ぼーっとタイマー", href: "/experience" },
    ],
  },
];

/* 🟡仮置き：公式アカウントが確定したら差し替える */
const SNS = [
  { icon: "/img/sns-ig-circle.svg", label: "Instagram", href: "https://www.instagram.com/" },
  { icon: "/img/sns-x.svg", label: "X", href: "https://x.com/" },
  { icon: "/img/sns-yt.svg", label: "YouTube", href: "https://www.youtube.com/" },
];

/** トップ内のセクションへ飛ぶ（GlobalNav と同じ仕掛け） */
function jumpTo(key: "spotAt" | "gourmetAt" | "eventsAt") {
  const sc = document.querySelector<HTMLElement>("[data-abashiri-scroller]");
  const at =
    key === "eventsAt"
      ? document.querySelector<HTMLElement>("#events")?.offsetTop
      : sc?.dataset[key];
  if (!sc || at == null) {
    /* 他ページからはトップへ戻ってから飛ぶ */
    try {
      sessionStorage.setItem("abashiri-goto", key);
    } catch {}
    window.location.href = "/";
    return;
  }
  window.dispatchEvent(
    new CustomEvent("abashiri:scroll-to", { detail: { y: Number(at) } })
  );
}

/* ── 部品 ───────────────────────────────── */

/** サイトロゴ＝キービジュアルの作字「な〜んにもない／たまらない」
    （2026-09-16 ヒデさん指示で「網走」の縦ロゴから差し替え）。
    ⚠️ 元アセットは「白い吹き出し＋青文字／白のたまらない」で濃い背景用。
    白地では消えてしまうので、白⇄青を入れ替えた反転版
    hero-message-blue.svg を使う（light=濃い背景のときだけ元のまま） */
function Logo({ cls, light = false }: { cls: string; light?: boolean }) {
  return (
    <img
      src={light ? "/img/hero-message.svg" : "/img/hero-message-blue.svg"}
      alt="な〜んにもない たまらない"
      /* 高さはクラスで指定（スマホでは小さく。style だと切り替えられない）。
         ⚠️ object-contain は保険。縦並び(flex-col)の中に置くと、img は
            枠の幅いっぱいに引き伸ばされて作字が歪む（2026-09-16 実測：
            471×390 が 1272×120 になっていた）。置き場所側でも self-start を付ける */
      className={`w-auto object-contain ${cls}`}
    />
  );
}

function NavLinks({
  light = false,
  className = "",
  only,
}: {
  light?: boolean;
  className?: string;
  /** 案5用：作字の左右に振り分けるとき、前半／後半だけを出す */
  only?: "left" | "right";
}) {
  const c = light
    ? "text-white/85 hover:text-white"
    : "text-ink/70 hover:text-ink";
  const half = Math.ceil(LINKS.length / 2);
  const items =
    only === "left" ? LINKS.slice(0, half) : only === "right" ? LINKS.slice(half) : LINKS;
  return (
    <nav className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-8 ${className}`}>
      {items.map((l) =>
        l.href ? (
          <Link
            key={l.label}
            href={l.href}
            className={`whitespace-nowrap text-body-14 font-light leading-[1.2] transition-colors duration-300 ease-standard ${c}`}
          >
            {l.label}
          </Link>
        ) : (
          <button
            key={l.label}
            type="button"
            onClick={() => l.jump && jumpTo(l.jump)}
            className={`cursor-pointer whitespace-nowrap text-body-14 font-light leading-[1.2] transition-colors duration-300 ease-standard ${c}`}
          >
            {l.label}
          </button>
        )
      )}
    </nav>
  );
}

function SnsRow({ light = false, size = 20 }: { light?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-5">
      {SNS.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          aria-label={s.label}
          className="transition-opacity duration-300 ease-standard hover:opacity-60"
        >
          <img
            src={s.icon}
            alt=""
            style={{ height: size }}
            className={`w-auto ${light ? "" : "[filter:brightness(0)] opacity-70"}`}
          />
        </a>
      ))}
    </div>
  );
}

/** 案6〜8 の土台。
    後ろに居る写真（画面に止まる）／その手前の白いグラデーション／
    写真の上に載るフッターの中身、の3枚を重ねる。

    ⚠️ 高さに dvh（画面の高さ）を使ってはいけない。
       トップページは 1512×982 の紙を画面に合わせて【縮小して】表示しているので、
       dvh と実際の見た目の高さが一致しない。写真が画面を埋めきらず、
       下に地が出て「画像が繰り返している」ように見える（2026-09-16 実測：
       画面756pxに対して写真が582pxしかなかった）。
       → スクロールしている箱の clientHeight を測って px で組む。

    zoom: スクロールに合わせて写真が少し引く（案8）
    align: 中身を中央に置くか、下寄せにするか */
function PhotoStage({
  children,
  zoom = false,
  align = "center",
}: {
  children: React.ReactNode;
  zoom?: boolean;
  align?: "center" | "end";
}) {
  const ref = useRef<HTMLDivElement>(null);
  /** 1画面ぶんの高さ（スクロールしている箱の内寸・CSS px） */
  const [vh, setVh] = useState(0);
  /** 写真がどれくらい顔を出したか 0〜1 */
  const [t, setT] = useState(0);

  useEffect(() => {
    /* このフッターが入っているスクロールの箱を探す
       （トップページは [data-abashiri-scroller]、詳細ページは main） */
    const findScroller = () => {
      let el: HTMLElement | null = ref.current?.parentElement ?? null;
      while (el) {
        const o = getComputedStyle(el).overflowY;
        if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight) return el;
        el = el.parentElement;
      }
      return null;
    };
    let id = 0;
    const tick = () => {
      const el = ref.current;
      const sc = findScroller();
      if (el && sc) {
        const H = sc.clientHeight;
        setVh((p) => (Math.abs(p - H) > 1 ? H : p));
        /* ⚠️ 進み具合は getBoundingClientRect（縮小後のpx）ではなく、
           offsetTop と scrollTop（どちらも縮小前のpx）で出す。混ぜると比率が狂う */
        const top = el.offsetTop - sc.scrollTop;
        const v = 1 - top / Math.max(1, H);
        const next = Math.max(0, Math.min(1, v));
        setT((p) => (Math.abs(p - next) > 0.004 ? next : p));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  /* 高さが測れるまでは 1画面ぶんを仮に置く（描画のちらつき防止） */
  const H = vh || 900;

  return (
    <div ref={ref} className="relative w-full" style={{ height: H * 1.55 }}>
      {/* ① 後ろの写真。画面に止まったまま、コンテンツだけが流れていく。
         1枚を画面いっぱいに引き延ばす（object-cover なので繰り返さない） */}
      <div
        className="sticky top-0 w-full overflow-hidden"
        style={{ height: H }}
      >
        <img
          src="/img/bg-hero.jpg"
          alt=""
          className="size-full object-cover"
          /* 案8：顔を出しながら少し引く。動かすのは transform だけ */
          style={zoom ? { transform: `scale(${1.12 - 0.12 * t})` } : undefined}
        />
        {/* 文字が読めるよう、下側だけわずかに沈ませる */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      </div>

      {/* ② 手前の白。箱ではなく「だんだん透明になる面」。
         【2026-09-16 ヒデさん指摘】境目が急だったので、1画面ぶん近くまで伸ばし、
         途中の濃さも細かく刻んで、ゆっくり風景に入れ替わるようにした */}
      {/* ⚠️ top を少し上にはみ出させる。ぴったり 0 だと、小数点のまるめで
         写真の上端が1pxだけのぞいて、うすい水色のすじになる（2026-09-16 実測） */}
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: -3,
          height: H * 0.95 + 3,
          background:
            "linear-gradient(to bottom, #ffffff 0%, #ffffff 22%, rgba(255,255,255,0.96) 38%, rgba(255,255,255,0.86) 52%, rgba(255,255,255,0.68) 65%, rgba(255,255,255,0.44) 78%, rgba(255,255,255,0.2) 90%, rgba(255,255,255,0) 100%)",
        }}
      />

      {/* ③ フッターの中身は写真の上 */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col px-6 sm:px-[120px] ${
          align === "end" ? "justify-end pb-[72px] sm:pb-[100px]" : "justify-center"
        }`}
        style={{ height: H }}
      >
        {children}
      </div>
    </div>
  );
}

/** サイトマップの1カテゴリぶん（大見出し＋ぶら下がる中身）。
    light=写真や濃い地の上に置く時（白文字） */
function MapColumn({
  col,
  light = false,
  size = "md",
}: {
  col: (typeof SITEMAP)[number];
  light?: boolean;
  /** md=既定 / lg=大見出しを大きく */
  size?: "md" | "lg";
}) {
  const head = light ? "text-white" : "text-ink";
  const item = light
    ? "text-white/70 hover:text-white"
    : "text-ink/60 hover:text-ink";
  const go = (n: { href?: string; jump?: SiteNode["jump"] }) => () =>
    n.jump ? jumpTo(n.jump) : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* 大カテゴリ。押すとトップのそのセクションへ飛ぶ */}
      {col.href ? (
        <Link
          href={col.href}
          className={`${head} ${size === "lg" ? "text-title-24" : "text-body-16"} font-thin leading-[1.6] tracking-[0.08em]`}
        >
          {col.title}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => col.jump && jumpTo(col.jump)}
          className={`cursor-pointer text-left ${head} ${size === "lg" ? "text-title-24" : "text-body-16"} font-thin leading-[1.6] tracking-[0.08em]`}
        >
          {col.title}
        </button>
      )}
      {/* ぶら下がる中身 */}
      <ul className="flex flex-col gap-2.5">
        {col.items.map((n) => (
          <li key={n.label}>
            {n.href ? (
              <Link
                href={n.href}
                className={`block text-body-13 font-extralight leading-[1.9] transition-colors duration-300 ease-standard ${item}`}
              >
                {n.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={go(n)}
                className={`block cursor-pointer text-left text-body-13 font-extralight leading-[1.9] transition-colors duration-300 ease-standard ${item}`}
              >
                {n.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** サイトマップ4列（PCは横並び・スマホは2列） */
function SiteMapGrid({
  light = false,
  size = "md",
  cols = 4,
}: {
  light?: boolean;
  size?: "md" | "lg";
  cols?: 2 | 4;
}) {
  return (
    <div
      className={`grid w-full gap-x-8 gap-y-12 ${
        cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
      }`}
    >
      {SITEMAP.map((c) => (
        <MapColumn key={c.title} col={c} light={light} size={size} />
      ))}
    </div>
  );
}

/** メガフッターの下段（ホーム・SNS・作字）。どの案でも共通で置く */
function MapFoot({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex w-full flex-col items-start gap-6 border-t pt-8 sm:flex-row sm:items-center sm:justify-between ${
        light ? "border-white/25" : "border-ink/10"
      }`}
    >
      <NavLinks light={light} className="justify-start" />
      <SnsRow light={light} size={18} />
    </div>
  );
}

/* ── 案ごとの中身 ─────────────────────────── */

function Body({ pat }: { pat: number }) {
  switch (pat) {
    /* 案2 空に還る：青い空の中に白の作字。KVと同じ世界で終わらせる */
    case 2:
      return (
        <div className="flex w-full flex-col items-center gap-10 px-6 py-[80px] sm:gap-[64px] sm:py-[130px]">
          <Logo cls="h-[150px] sm:h-[230px]" light />
          <div className="flex flex-col items-center gap-8">
            <NavLinks light className="justify-center" />
            <SnsRow light />
          </div>
        </div>
      );

    /* 案3 左に大きく：作字を左へ寄せ、情報は右端にそろえる（非対称の余白が効く） */
    case 3:
      return (
        <div className="flex w-full flex-col items-center gap-10 px-6 py-[80px] sm:flex-row sm:items-center sm:justify-between sm:gap-[80px] sm:px-[120px] sm:py-[120px]">
          <Logo cls="h-[150px] sm:h-[220px]" />
          <div className="flex flex-col items-center gap-8 sm:items-end">
            <NavLinks className="justify-center sm:justify-end" />
            <SnsRow />
          </div>
        </div>
      );

    /* 案4 ポスター：作字をうんと大きく、下端にリンクを一行だけ */
    case 4:
      return (
        <div className="flex w-full flex-col items-center gap-12 px-6 pb-10 pt-[80px] sm:gap-[100px] sm:px-[120px] sm:pb-[64px] sm:pt-[140px]">
          <Logo cls="h-[170px] sm:h-[300px]" />
          <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
            <NavLinks className="justify-center sm:justify-start" />
            <SnsRow size={18} />
          </div>
        </div>
      );

    /* 案5 作字が中心：リンクを左右に振り分けて、作字を真ん中の軸にする */
    case 5:
      return (
        <div className="flex w-full flex-col items-center gap-10 px-6 py-[80px] sm:gap-[56px] sm:px-[120px] sm:py-[120px]">
          {/* スマホでは左右振り分けをやめて、ロゴの下に一列で置く */}
          <Logo cls="h-[150px] sm:hidden" />
          <NavLinks className="justify-center sm:hidden" />
          <div className="hidden w-full items-center justify-center gap-[72px] sm:flex">
            <NavLinks className="flex-1 justify-end" only="left" />
            <Logo cls="h-[210px]" />
            <NavLinks className="flex-1 justify-start" only="right" />
          </div>
          <SnsRow />
        </div>
      );

    /* ═══════════════════════════════════════════════════════
       案6〜8 共通の考え方（カンプ 17420:23293・2026-09-16）
         ・写真＝ページの後ろにずっと居るレイヤー。スクロールしてもついてくる
         ・白いコンテンツ＝その手前のレイヤー。下端が透明のグラデーションなので、
           スクロールで上へ抜けるにつれ、後ろの写真がじわっと顔を出す
         ・フッターの中身は写真の上に載る
       ⚠️ 写真を position:fixed にはできない。このサイトは html/body ではなく
          自前の箱でスクロールしているので、fixed だとページの最初から
          画面に貼りついてしまう。sticky で「画面に止まる」を作るのが正解
       ⚠️ 白い覆いは【グラデーションの面】であって、白い箱ではない。
          箱にすると境目が線になる（ヒデさん指摘の「パッツリ切らない」）
       ═══════════════════════════════════════════════════════ */

    /* 案6 溶けて現れる：作字は写真の中央、リンクはその下 */
    case 6:
      return (
        <PhotoStage>
          <div className="flex flex-col items-center gap-10 sm:gap-14">
            <Logo cls="h-[140px] sm:h-[220px]" light />
            <div className="flex flex-col items-center gap-7">
              <NavLinks light className="justify-center" />
              <SnsRow light />
            </div>
          </div>
        </PhotoStage>
      );

    /* 案7 引きながら現れる：写真がズームアウトして全景に。作字は左下 */
    case 7:
      return (
        <PhotoStage zoom align="end">
          <div className="flex w-full flex-col items-start gap-10 sm:flex-row sm:items-end sm:justify-between sm:gap-16">
            <Logo cls="h-[140px] sm:h-[230px]" light />
            <div className="flex flex-col items-start gap-6 sm:items-end">
              <NavLinks light className="justify-start sm:justify-end" />
              <SnsRow light />
            </div>
          </div>
        </PhotoStage>
      );

    /* ═══ ここから メガフッター（サイトマップ型）5案 ═══
       中身はどれも SITEMAP（スポット5／グルメ4／体験4／ぼーっと体験3）で同じ。
       違うのは地の作りと組み方だけ */

    /* 案8 写真の上にサイトマップ：案6の写真を残したままフッターらしくする */
    case 8:
      return (
        <PhotoStage align="end">
          <div className="flex w-full flex-col gap-12">
            <Logo cls="h-[90px] self-start sm:h-[120px]" light />
            <SiteMapGrid light />
            <MapFoot light />
          </div>
        </PhotoStage>
      );

    /* 案9 白地のメガフッター：写真を使わず、情報のいちばん読みやすい形 */
    case 9:
      return (
        <div className="flex w-full flex-col gap-14 px-6 py-[80px] sm:px-[120px] sm:py-[110px]">
          <div className="flex flex-col gap-12 sm:flex-row sm:gap-[80px]">
            <div className="shrink-0">
              <Logo cls="h-[110px] sm:h-[150px]" />
            </div>
            <SiteMapGrid />
          </div>
          <MapFoot />
        </div>
      );

    /* 案10 大見出しでぶら下げる：縦に長く、余白をたっぷり */
    case 10:
      return (
        <div className="flex w-full flex-col gap-[72px] px-6 py-[90px] sm:px-[120px] sm:py-[130px]">
          <Logo cls="h-[110px] self-start sm:h-[160px]" />
          <div className="flex flex-col gap-[56px]">
            {SITEMAP.map((c) => (
              <div
                key={c.title}
                className="flex flex-col gap-5 border-t border-ink/10 pt-8 sm:flex-row sm:gap-[80px]"
              >
                <div className="shrink-0 sm:w-[280px]">
                  <MapColumn col={{ ...c, items: [] }} size="lg" />
                </div>
                <ul className="flex flex-wrap gap-x-8 gap-y-3">
                  {c.items.map((n) => (
                    <li key={n.label}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          className="text-body-14 font-extralight leading-[2] text-ink/60 transition-colors duration-300 ease-standard hover:text-ink"
                        >
                          {n.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => n.jump && jumpTo(n.jump)}
                          className="cursor-pointer text-body-14 font-extralight leading-[2] text-ink/60 transition-colors duration-300 ease-standard hover:text-ink"
                        >
                          {n.label}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <MapFoot />
        </div>
      );

    /* 案11 索引（番号つき）：資料の目次のように、細い罫線で整理する */
    case 11:
      return (
        <div className="flex w-full flex-col gap-12 px-6 py-[80px] sm:px-[120px] sm:py-[110px]">
          <div className="flex flex-col items-start gap-10 sm:flex-row sm:items-end sm:justify-between">
            <Logo cls="h-[100px] sm:h-[140px]" />
            <p className="text-body-12 font-light tracking-[0.3em] text-ink/40">
              SITE INDEX
            </p>
          </div>
          <div className="flex flex-col">
            {SITEMAP.map((c, ci) => (
              <div
                key={c.title}
                className="flex flex-col gap-3 border-t border-ink/10 py-7 sm:flex-row sm:gap-[64px]"
              >
                <div className="flex shrink-0 items-baseline gap-4 sm:w-[260px]">
                  <span className="text-body-12 font-light tracking-[0.2em] text-ink/35">
                    {String(ci + 1).padStart(2, "0")}
                  </span>
                  <MapColumn col={{ ...c, items: [] }} />
                </div>
                <ul className="flex flex-col gap-2">
                  {c.items.map((n, i) => (
                    <li key={n.label} className="flex items-baseline gap-4">
                      <span className="text-body-12 font-light tracking-[0.15em] text-ink/30">
                        {String(ci + 1)}-{i + 1}
                      </span>
                      {n.href ? (
                        <Link
                          href={n.href}
                          className="text-body-13 font-extralight leading-[1.9] text-ink/60 transition-colors duration-300 ease-standard hover:text-ink"
                        >
                          {n.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => n.jump && jumpTo(n.jump)}
                          className="cursor-pointer text-body-13 font-extralight leading-[1.9] text-ink/60 transition-colors duration-300 ease-standard hover:text-ink"
                        >
                          {n.label}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <MapFoot />
        </div>
      );

    /* 案12 写真＋2段組：上が世界観（作字）、下が案内（サイトマップ） */
    case 12:
      return (
        <>
          <PhotoStage>
            <div className="flex w-full flex-col items-center gap-8">
              <Logo cls="h-[140px] sm:h-[210px]" light />
            </div>
          </PhotoStage>
          {/* 写真の下に、白地でサイトマップを2段に置く */}
          <div className="flex w-full flex-col gap-12 bg-white px-6 py-[70px] sm:px-[120px] sm:py-[90px]">
            <SiteMapGrid cols={2} />
            <MapFoot />
          </div>
        </>
      );

    /* 案1（既定）中央に大きく：作字を真ん中に、上下にたっぷり余白 */
    default:
      return (
        <div className="flex w-full flex-col items-center gap-12 px-6 py-[80px] sm:gap-[72px] sm:py-[140px]">
          <Logo cls="h-[160px] sm:h-[240px]" />
          <div className="flex flex-col items-center gap-8">
            <NavLinks className="justify-center" />
            <SnsRow />
          </div>
        </div>
      );
  }
}

export default function SiteFooter() {
  /* 既定は案6（写真が溶けて現れる）。2026-09-16 ヒデさん指示 */
  const [pat, setPat] = useState(6);
  useEffect(() => {
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.footer?.pattern;
        if (typeof v === "number" && FOOTER_PATTERNS[v]) setPat(v);
      })
      .catch(() => {});
    const onTune = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number" && FOOTER_PATTERNS[v]) setPat(v);
    };
    window.addEventListener(FOOTER_EVENT, onTune);
    return () => window.removeEventListener(FOOTER_EVENT, onTune);
  }, []);

  /* 案2は空グラデ＋白文字。ほかは白地。
     ⚠️ 案6〜8（写真の案）も【白地のまま】にする。背景を透明にすると、
        上のセクションと2px重ねている所からページの地（うすい水色）が
        すじになって見える（2026-09-16 実測。以前の案1・案5と同じ症状）。
        写真はこの白の上に載るので、白地でも見た目は変わらない */
  const sky = pat === 2;
  return (
    /* ⚠️ フッターは登場アニメを付けない。理由は2つ:
       ①filter/opacity を動かすと要素が合成レイヤーになり、アニメ完了後も
         blur(0.003px)・opacity 0.9997 が残って上の白セクションとの境目に
         薄いヘアラインが出る（2026-09-16 実測）
       ②whileInView はこのページ構成（スクロールする箱の中＋タブ非表示時）で
         発火しないことがあり、その場合フッターが opacity:0 のまま見えなくなる
       ページの末尾なので、素直に常時表示にするのがいちばん確実 */
    /* relative z-10：前の兄弟に sticky があると描画順で上に来て地が沈むため必須。
       -mt-[2px]：上のセクションと2px重ねて継ぎ目を出さない */
    <footer
      className={`relative z-10 -mt-[2px] w-full ${
        sky
          ? "bg-gradient-to-b from-sky-bottom via-brand/80 to-brand"
          : "bg-white"
      }`}
    >
      <Body pat={pat} />
    </footer>
  );
}
