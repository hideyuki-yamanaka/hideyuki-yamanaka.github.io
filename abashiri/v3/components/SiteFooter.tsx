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

/* 【2026-09-16 ヒデさん指示】「共通フッターのバリエーション案は今のをデフォルトにして全削除」
   → 階層の見せ方6案（FOOTER_PATTERNS）と組み方3案（FOOTER_LAYOUTS）は撤去し、
     使っていた「階層A 罫線で分ける」＋「組みA ゆったり2カラム」を固定にした。
     余白・間隔・作字の大きさは CSS 変数（--ft-*）のつまみで引き続き調整できる */

/* 【2026-09-16 ヒデさん指示】「ぼーっと体験」の別扱い5案（FOOTER_SPECIALS）は撤去した。
   「区切り線などもなしで普通に入れちゃう感じで大丈夫」「ぼーっと疑似体験というタイトルに」
   → ぼーっとスポットの一覧のいちばん下に、ほかの項目と同じ見た目で並べる */

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
    見せ方は「階層A 罫線で分ける」で確定（2026-09-16 ヒデさん指示で他の5案は削除）。
    大カテゴリの下に細い線を引き、子は少し下げて並べる */
function MapColumn({
  col,
  light = false,
}: {
  col: (typeof SITEMAP)[number];
  light?: boolean;
}) {
  const white = light ? "text-white" : "text-ink";
  const head = `${white} text-body-16 font-light leading-[1.6] tracking-[0.1em]`;
  const item = light ? "text-white/75 hover:text-white" : "text-ink/60 hover:text-ink";
  const line = light ? "border-white/30" : "border-ink/15";

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
      <div className={`border-b pb-3 ${line}`}>{Head}</div>
      <ul className="mt-[var(--ft-head-gap)] flex flex-col gap-[var(--ft-item-gap)] pl-4">
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
                onClick={() => n.jump && jumpTo(n.jump)}
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

/** サイトマップ（3カテゴリを横に並べる） */
function SiteMapGrid({ light = false }: { light?: boolean }) {
  return (
    <div className="grid w-full grid-cols-1 gap-x-8 gap-y-[var(--ft-map-gap-y)] sm:grid-cols-3 sm:gap-x-[var(--ft-map-gap-x)]">
      {SITEMAP.map((c) => (
        <MapColumn key={c.title} col={c} light={light} />
      ))}
    </div>
  );
}

/* ── フッターの中身 ───────────────────────────
   組み方は「組みA ゆったり2カラム」で確定（2026-09-16 ヒデさん指示で他の2案は削除）。
   左に大きい作字ロゴ、右にサイトマップ。余白・間隔・作字の大きさは
   CSS 変数（--ft-*）＝調整パネルのつまみで動かせる */
function Body() {
  return (
    <PhotoStage align="end" pad="wide">
      <div className="flex w-full flex-col gap-14 sm:flex-row sm:items-center sm:justify-between sm:gap-[var(--ft-col-gap)]">
        {/* 左の作字。サイトの顔なので大きく出す。SNS アイコンは無し */}
        <div className="flex shrink-0 flex-col items-start">
          <Logo cls="h-[150px] self-start sm:h-[var(--ft-logo-h)]" light />
        </div>
        <div
          className="min-w-0 flex-1"
          /* 右カラムだけ上下にずらせる（作字との高さを合わせるため）。
             transform なので周りのレイアウトは動かない */
          style={{ transform: "translateY(var(--ft-map-offset-y))" }}
        >
          <SiteMapGrid light />
        </div>
      </div>
    </PhotoStage>
  );
}

export default function SiteFooter() {
  /* デザインはひとつに確定（2026-09-16）。案の切り替えは無いので状態も持たない。
     余白・間隔・作字の大きさは CSS 変数（--ft-*）で、調整パネルから直接変わる */
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
      <Body />
    </footer>
  );
}
