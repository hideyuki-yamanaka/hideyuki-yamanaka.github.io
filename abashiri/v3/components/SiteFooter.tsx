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
  /* 2026-09-16 ヒデさん確定：フッターのデザインは【案8（写真の上にサイトマップ）】
     ひとつに決定。ほかの案（作字ベース1〜5・写真だけ6/7・他のメガフッター9〜12）は削除した。
     ここで選ぶのは「サイトマップの親子の階層をどう見せるか」の3案。 */
  1: {
    name: "階層A 罫線で分ける",
    note: "大カテゴリの下に細い線を引き、子は少し下げて並べる。区切りがはっきりしていちばん読みやすい",
  },
  2: {
    name: "階層B 左の縦線でぶら下げる",
    note: "子のグループの左に縦の細い線を通して、親からぶら下がっているのを見せる。目次らしい形",
  },
  3: {
    name: "階層C 大きさと濃さで分ける",
    note: "線を使わず、親を大きく・明るく、子を小さく・薄くして差をつける。いちばん静かでミニマル",
  },
};

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
    level で「親子の階層をどう見せるか」を切り替える（2026-09-16 ヒデさん依頼）
      1 罫線で分ける     … 親の下に細い線、子は少し下げる
      2 左の縦線でぶら下げる … 子のまとまりの左に縦線
      3 大きさと濃さで分ける … 線なし。親を大きく明るく、子を小さく薄く */
function MapColumn({
  col,
  light = false,
  level = 1,
}: {
  col: (typeof SITEMAP)[number];
  light?: boolean;
  level?: number;
}) {
  const head =
    level === 3
      ? `${light ? "text-white" : "text-ink"} text-title-24 font-thin leading-[1.5] tracking-[0.06em]`
      : `${light ? "text-white" : "text-ink"} text-body-16 font-light leading-[1.6] tracking-[0.1em]`;
  const item = light
    ? level === 3
      ? "text-white/55 hover:text-white"
      : "text-white/75 hover:text-white"
    : "text-ink/60 hover:text-ink";
  const itemSize =
    level === 3 ? "text-body-12" : "text-body-13";
  /* 子のまとまりの飾り。案ごとに変える */
  const listCls =
    level === 1
      ? "mt-4 flex flex-col gap-2.5 pl-4"
      : level === 2
        ? `mt-4 flex flex-col gap-2.5 border-l pl-4 ${light ? "border-white/30" : "border-ink/15"}`
        : "mt-3 flex flex-col gap-2";
  const headCls =
    level === 1
      ? `border-b pb-3 ${light ? "border-white/30" : "border-ink/15"}`
      : "";

  const Head = col.href ? (
    <Link href={col.href} className={head}>
      {col.title}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => col.jump && jumpTo(col.jump)}
      className={`cursor-pointer text-left ${head}`}
    >
      {col.title}
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col">
      <div className={headCls}>{Head}</div>
      <ul className={listCls}>
        {col.items.map((n) => (
          <li key={n.label}>
            {n.href ? (
              <Link
                href={n.href}
                className={`block ${itemSize} font-extralight leading-[1.9] transition-colors duration-300 ease-standard ${item}`}
              >
                {n.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => n.jump && jumpTo(n.jump)}
                className={`block cursor-pointer text-left ${itemSize} font-extralight leading-[1.9] transition-colors duration-300 ease-standard ${item}`}
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
  level = 1,
}: {
  light?: boolean;
  level?: number;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4">
      {SITEMAP.map((c) => (
        <MapColumn key={c.title} col={c} light={light} level={level} />
      ))}
    </div>
  );
}

/* ── 案ごとの中身 ─────────────────────────── */

function Body({ pat }: { pat: number }) {
  return (
    /* フッターのデザインは1つに確定（写真の上にサイトマップ）。
       ・後ろの写真がグラデーションで顔を出す（PhotoStage）
       ・その上に 左＝作字ロゴ＋SNS ／ 右＝サイトマップ の2カラム
       ⚠️ 以前あった下段の「ホーム／ぼーっとスポット／グルメ／体験」の行は、
          右のサイトマップと中身がかぶるので削除した（2026-09-16 ヒデさん指示） */
    <PhotoStage align="end">
      <div className="flex w-full flex-col gap-14 sm:flex-row sm:items-center sm:justify-between sm:gap-[72px]">
        {/* 左：作字ロゴ。サイトの顔なので大きく出す（2026-09-16 ヒデさん指示） */}
        <div className="flex shrink-0 flex-col items-start gap-9">
          <Logo cls="h-[150px] self-start sm:h-[260px]" light />
          <SnsRow light size={18} />
        </div>
        {/* 右：サイトマップ。親子の見せ方はパネルで3案から選ぶ */}
        <div className="min-w-0 flex-1">
          <SiteMapGrid light level={pat} />
        </div>
      </div>
    </PhotoStage>
  );
}

export default function SiteFooter() {
  /* 選ぶのは「サイトマップの階層の見せ方」3案。既定は階層A */
  const [pat, setPat] = useState(1);
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
      /* ⚠️ 地は白のまま。透明にすると、上のセクションと2px重ねている所から
         ページの地（うすい水色）がすじになって見える（2026-09-16 実測）。
         写真はこの白の上に載るので、白地でも見た目は変わらない */
      className="relative z-10 -mt-[2px] w-full bg-white"
    >
      <Body pat={pat} />
    </footer>
  );
}
