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
  /* フッターのデザインは【写真の上にサイトマップ】で確定（2026-09-16）。
     ここで選ぶのは「サイトマップの親子の階層をどう見せるか」。
     A〜C は最初の3案、D〜F は 2026-09-16 に足した3案 */
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
  4: {
    name: "階層D 番号でぶら下げる",
    note: "子の先頭に 01・02… の小さい番号を振る。数があることが分かり、目で追いやすい",
  },
  5: {
    name: "階層E 親をタグにする",
    note: "親をすりガラスの小さなタグで囲み、子は素の文字で下に。親が「見出し」だとひと目で分かる",
  },
  6: {
    name: "階層F 親に引き出し線",
    note: "親の前に短い横線を置いて始まりを示し、子は字下げだけで続ける。線が細く上品",
  },
};

/* 【2026-09-16 ヒデさん指示】「ぼーっと体験」の別扱い5案（FOOTER_SPECIALS）は撤去した。
   「区切り線などもなしで普通に入れちゃう感じで大丈夫」「ぼーっと疑似体験というタイトルに」
   → ぼーっとスポットの一覧のいちばん下に、ほかの項目と同じ見た目で並べる */

/** フッターの組み方（左右の余白・カラムの幅）。2026-09-16 ヒデさん依頼で追加。
    きっかけ：「メガフッターがきつい。作字とサイトマップが近い」 */
export const FOOTER_LAYOUTS: Record<number, { name: string; note: string }> = {
  1: {
    name: "組みA ゆったり2カラム",
    note: "いまの2カラムのまま、左右の余白と作字〜サイトマップの間隔を大きく広げる。窮屈さだけを取る",
  },
  2: {
    name: "組みB 上下に分ける",
    note: "作字を上に置き、その下に全幅でサイトマップを4列。左右の取り合いが無くなるので一番ゆったり",
  },
  3: {
    name: "組みC 2列×2段でひろびろ",
    note: "サイトマップを2列×2段にして1列の幅を広く取る。長い項目名（オジロワシ…）が折り返さない",
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
export const SITEMAP: {
  title: string;
  jump?: "spotAt" | "gourmetAt" | "eventsAt";
  href?: string;
  items: SiteNode[];
}[] = [
  {
    title: "ぼーっとスポット",
    jump: "spotAt",
    items: [
      { label: "能取岬", href: "/spot/notoro" },
      { label: "能取湖サンゴ草群落地", href: "/spot/sango" },
      { label: "流氷クルーズ", href: "/spot/ryuhyo" },
      { label: "大曲湖畔園地ひまわり畑", href: "/spot/himawari" },
      /* 動画の疑似体験ページ。区切り線などは付けず、ふつうの項目として並べる */
      { label: "ぼーっと疑似体験", href: "/experience" },
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
  pad = "normal",
}: {
  children: React.ReactNode;
  zoom?: boolean;
  align?: "center" | "end";
  /** wide=左右の余白を広く（メガフッターが窮屈だったため。2026-09-16） */
  pad?: "normal" | "wide";
}) {
  const ref = useRef<HTMLDivElement>(null);
  /** 1画面ぶんの高さ（スクロールしている箱の内寸・CSS px） */
  const [vh, setVh] = useState(0);
  /** 写真がどれくらい顔を出したか 0〜1 */
  const [t, setT] = useState(0);
  /** 調整パネルから変えられる値（CSS変数）。
      高さとグラデはレイアウトに関わるので、変わった時だけ描き直す */
  const [cfg, setCfg] = useState({ stageH: 155, fadeH: 95, solid: 22 });

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
        /* パネルのつまみ（CSS変数）を読み直す。変わった時だけ state を更新する */
        const cs = getComputedStyle(document.documentElement);
        const num = (n: string, d: number) => {
          const x = parseFloat(cs.getPropertyValue(n));
          return isFinite(x) && x > 0 ? x : d;
        };
        const nc = {
          stageH: num("--ft-stage-h", 155),
          fadeH: num("--ft-fade-h", 95),
          solid: num("--ft-fade-solid", 22),
        };
        setCfg((o) =>
          o.stageH === nc.stageH && o.fadeH === nc.fadeH && o.solid === nc.solid
            ? o
            : nc
        );
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  /* 高さが測れるまでは 1画面ぶんを仮に置く（描画のちらつき防止） */
  const H = vh || 900;
  const stageH = cfg.stageH / 100;
  const fadeH = cfg.fadeH / 100;
  const solid = cfg.solid;

  return (
    <div
      ref={ref}
      className="relative w-full"
      /* 高さ＝スクロール量。短くすると体験セクションからフッターまでが早く終わる */
      style={{ height: H * stageH }}
    >
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
          height: H * fadeH + 3,
          /* 白のまま保つ割合（solid）から先を、少しずつ透明にしていく。
             solid を小さくすると早く写真が出る＝境目がやわらかくなる */
          background: `linear-gradient(to bottom, #ffffff 0%, #ffffff ${solid}%, rgba(255,255,255,0.96) ${solid + (100 - solid) * 0.2}%, rgba(255,255,255,0.86) ${solid + (100 - solid) * 0.38}%, rgba(255,255,255,0.68) ${solid + (100 - solid) * 0.55}%, rgba(255,255,255,0.44) ${solid + (100 - solid) * 0.72}%, rgba(255,255,255,0.2) ${solid + (100 - solid) * 0.87}%, rgba(255,255,255,0) 100%)`,
        }}
      />

      {/* ③ フッターの中身は写真の上 */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col ${
          pad === "wide"
            ? "px-6 sm:px-[var(--ft-pad-x)]"
            : "px-6 sm:px-[120px]"
        } ${align === "end" ? "justify-end pb-[72px] sm:pb-[var(--ft-pad-bottom)]" : "justify-center"}`}
        style={{ height: H }}
      >
        {children}
      </div>
    </div>
  );
}

/** サイトマップの1カテゴリぶん（大見出し＋ぶら下がる中身）。
    level で「親子の階層をどう見せるか」を切り替える
      1 罫線で分ける     2 左の縦線     3 大きさと濃さ
      4 番号でぶら下げる  5 親をタグに   6 親に引き出し線 */
function MapColumn({
  col,
  light = false,
  level = 1,
}: {
  col: (typeof SITEMAP)[number];
  light?: boolean;
  level?: number;
  /** 「ぼーっと体験」の見せ方（5案） */
}) {
  const white = light ? "text-white" : "text-ink";
  /* 親の文字。案3だけ大きく */
  const head =
    level === 3
      ? `${white} text-title-24 font-thin leading-[1.5] tracking-[0.06em]`
      : `${white} text-body-16 font-light leading-[1.6] tracking-[0.1em]`;
  /* 子の文字 */
  const item = light
    ? level === 3
      ? "text-white/55 hover:text-white"
      : "text-white/75 hover:text-white"
    : "text-ink/60 hover:text-ink";
  const itemSize = level === 3 ? "text-body-12" : "text-body-13";
  const line = light ? "border-white/30" : "border-ink/15";

  /* 子のまとまりの飾り */
  const listCls =
    level === 1
      ? "mt-[var(--ft-head-gap)] flex flex-col gap-[var(--ft-item-gap)] pl-4"
      : level === 2
        ? `mt-[var(--ft-head-gap)] flex flex-col gap-[var(--ft-item-gap)] border-l pl-4 ${line}`
        : level === 3
          ? "mt-[var(--ft-head-gap)] flex flex-col gap-[var(--ft-item-gap)]"
          : level === 4
            ? "mt-[var(--ft-head-gap)] flex flex-col gap-[var(--ft-item-gap)]"
            : level === 5
              ? "mt-[var(--ft-head-gap)] flex flex-col gap-[var(--ft-item-gap)] pl-1"
              : "mt-[var(--ft-head-gap)] flex flex-col gap-[var(--ft-item-gap)] pl-5";
  const headCls = level === 1 ? `border-b pb-3 ${line}` : "";

  const HeadInner = col.href ? (
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

  /* 親の見せ方。案5＝すりガラスのタグ／案6＝前に短い横線 */
  const Head =
    level === 5 ? (
      <span
        className={`inline-flex items-center px-4 py-2 ${
          light
            ? "bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-65"
            : "bg-ink/5"
        }`}
      >
        {HeadInner}
      </span>
    ) : level === 6 ? (
      <span className="flex items-center gap-3">
        <span
          className={`h-px w-6 shrink-0 ${light ? "bg-white/50" : "bg-ink/30"}`}
        />
        {HeadInner}
      </span>
    ) : (
      HeadInner
    );

  return (
    <div className="flex min-w-0 flex-col">
      <div className={headCls}>{Head}</div>
      <ul className={listCls}>
        {col.items.map((n, i) => {
          const label = n.href ? (
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
          );
          /* 案4だけ、子の前に小さい番号を置く */
          return (
            <li key={n.label} className={level === 4 ? "flex gap-3" : ""}>
              {level === 4 && (
                <span
                  className={`shrink-0 pt-px text-body-12 font-light tracking-[0.1em] ${
                    light ? "text-white/40" : "text-ink/30"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}


/** サイトマップ。cols で1行に並べる数を変える（組みの案で使う） */
function SiteMapGrid({
  light = false,
  level = 1,
  cols = 4,
}: {
  light?: boolean;
  level?: number;
  cols?: 2 | 4;
}) {
  return (
    <div
      className={`grid w-full gap-y-[var(--ft-map-gap-y)] ${
        cols === 4
          ? "grid-cols-1 gap-x-8 sm:grid-cols-3 sm:gap-x-[var(--ft-map-gap-x)]"
          : "grid-cols-2 gap-x-8 sm:gap-x-[var(--ft-map-gap-x)]"
      }`}
    >
      {SITEMAP.map((c) => (
        <MapColumn key={c.title} col={c} light={light} level={level} />
      ))}
    </div>
  );
}

/* ── 案ごとの中身 ─────────────────────────── */

function Body({
  pat,
  layout,
}: {
  pat: number;
  layout: number;
}) {
  /* 左の作字。サイトの顔なので大きく出す（2026-09-16 ヒデさん指示） */
  const logo = (cls: string) => (
    /* 2026-09-16 ヒデさん指示で SNS アイコンは削除。左カラムは作字だけ */
    <div className="flex shrink-0 flex-col items-start">
      <Logo cls={`${cls} self-start`} light />
    </div>
  );

  /* 組みB：作字を上、サイトマップを下に全幅で。左右の取り合いが無いのでいちばん広い */
  if (layout === 2) {
    return (
      <PhotoStage align="end" pad="wide">
        <div className="flex w-full flex-col gap-[var(--ft-col-gap)]">
          {logo("h-[150px] sm:h-[var(--ft-logo-h)]")}
          <div style={{ transform: "translateY(var(--ft-map-offset-y))" }}>
            <SiteMapGrid light level={pat} />
          </div>
        </div>
      </PhotoStage>
    );
  }

  /* 組みC：サイトマップを2列×2段にして、1列の幅を広く取る
     （「オジロワシ・オオワシウォッチング」のような長い名前が折り返さない） */
  if (layout === 3) {
    return (
      <PhotoStage align="end" pad="wide">
        <div className="flex w-full flex-col gap-14 sm:flex-row sm:items-center sm:justify-between sm:gap-[var(--ft-col-gap)]">
          {logo("h-[150px] sm:h-[var(--ft-logo-h)]")}
          <div
            className="min-w-0 flex-1"
            /* 右カラムだけ上下にずらせる（作字との高さを合わせるため）。
               transform なので周りのレイアウトは動かない */
            style={{ transform: "translateY(var(--ft-map-offset-y))" }}
          >
            <SiteMapGrid light level={pat} cols={2} />
          </div>
        </div>
      </PhotoStage>
    );
  }

  /* 組みA（既定）：いまの2カラムのまま、左右の余白と
     作字〜サイトマップの間隔を広げて窮屈さを取る */
  return (
    <PhotoStage align="end" pad="wide">
      <div className="flex w-full flex-col gap-14 sm:flex-row sm:items-center sm:justify-between sm:gap-[var(--ft-col-gap)]">
        {logo("h-[150px] sm:h-[var(--ft-logo-h)]")}
        <div
          className="min-w-0 flex-1"
          style={{ transform: "translateY(var(--ft-map-offset-y))" }}
        >
          <SiteMapGrid light level={pat} />
        </div>
      </div>
    </PhotoStage>
  );
}

export default function SiteFooter() {
  /* 選ぶのは「組み（レイアウト）」3案 と「階層の見せ方」6案。既定は 組みA／階層A */
  const [pat, setPat] = useState(1);
  const [layout, setLayout] = useState(1);
  useEffect(() => {
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.footer?.pattern;
        if (typeof v === "number" && FOOTER_PATTERNS[v]) setPat(v);
        const l = d?.footer?.layout;
        if (typeof l === "number" && FOOTER_LAYOUTS[l]) setLayout(l);
      })
      .catch(() => {});
    const onTune = (e: Event) => {
      const d = (e as CustomEvent<{ v?: number; layout?: number }>)
        .detail;
      if (typeof d?.v === "number" && FOOTER_PATTERNS[d.v]) setPat(d.v);
      if (typeof d?.layout === "number" && FOOTER_LAYOUTS[d.layout]) setLayout(d.layout);
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
      <Body pat={pat} layout={layout} />
    </footer>
  );
}
