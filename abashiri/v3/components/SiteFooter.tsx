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
    /* ⚠️ 2026-09-20 まで「わかさぎの唐揚げ」等の料理名が並んでいて、
       押してもグルメの場面へ飛ぶだけだった。実際のセクションは【お店】が4件なので、
       店名にそろえて、新設した詳細ページへつなぐ */
    items: [
      { label: "横山蒲鉾店", href: "/gourmet/yokoyama" },
      { label: "松尾ジンギスカン 呼人支店", href: "/gourmet/matsuo" },
      { label: "ラーメンだるまや", href: "/gourmet/darumaya" },
      { label: "酒縁酒場 屯々", href: "/gourmet/tonton" },
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
/** サイトロゴ＝キービジュアルの作字ブロックそのもの。
    【2026-09-17 ヒデさん指示】「網走市観光サイトという文字が抜けている。
      キービジュアルの作字と全く同じ位置関係で、吹き出しの右上に入れて」
    → KV（TopPage）の実測値をそのまま持ってくる：
        作字ブロック        415 x 379
        網走市観光サイト     (215.7, 8.3) 188.2 x 36.3   ← 吹き出しの右上
        作字（471x390のSVG） (-28, 13.1)                 ← SVGの余白ぶん左上へずらす
      ブロックごと拡大縮小するので、位置関係は崩れない */
const LOGO_W = 415;
const LOGO_H = 379;
function Logo({ light = false }: { light?: boolean }) {
  return (
    <div
      className="relative shrink-0 self-start"
      style={{
        /* 高さはつまみ（--ft-logo-h）。幅は比率から出す */
        height: "var(--ft-logo-h)",
        width: `calc(var(--ft-logo-h) * ${LOGO_W / LOGO_H})`,
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: LOGO_W,
          height: LOGO_H,
          transformOrigin: "top left",
          /* 倍率は単位なしの CSS 変数で受け取る（長さどうしの割り算はCSSでできない） */
          transform: "scale(var(--ft-logo-scale, 0.686))",
        }}
      >
        <img
          src="/img/text-kanko-site.svg"
          alt="網走市観光サイト"
          className="absolute"
          style={{ left: 215.7, top: 8.3, width: 188.2, height: 36.3 }}
        />
        <img
          src={light ? "/img/hero-message.svg" : "/img/hero-message-blue.svg"}
          alt="な〜んにもない たまらない"
          className="absolute max-w-none"
          style={{ left: -28, top: 13.1, width: 471, height: 390 }}
        />
      </div>
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
  const [cfg, setCfg] = useState({ stageH: 120, fadeH: 80, solid: 6 });

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
          stageH: num("--ft-stage-h", 120),
          fadeH: num("--ft-fade-h", 80),
          solid: num("--ft-fade-solid", 6),
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
  /* スマホ幅かどうか。フッターの組み方を変えるのに使う（2026-09-24） */
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const stageH = cfg.stageH / 100;
  const fadeH = cfg.fadeH / 100;
  const solid = cfg.solid;

  return (
    <div
      ref={ref}
      className="relative w-full"
      /* 高さ＝スクロール量。短くすると体験セクションからフッターまでが早く終わる。
         ⚠️ スマホは中身が1画面に入りきらないので、高さを決めない（中身なりに伸ばす） */
      style={{ height: isNarrow ? undefined : H * stageH }}
    >
      {/* ① 後ろの写真。画面に止まったまま、コンテンツだけが流れていく。
         1枚を画面いっぱいに引き延ばす（object-cover なので繰り返さない） */}
      <div
        className={`w-full overflow-hidden ${isNarrow ? "absolute inset-0" : "sticky top-0"}`}
        style={{ height: isNarrow ? undefined : H }}
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
          /* ⚠️ スマホは中身なりの高さになるので、1画面基準で伸ばすと
             作字までグラデが覆ってしまう。短めに抑える（2026-09-24） */
          height: (isNarrow ? Math.min(H * fadeH, 110) : H * fadeH) + 3,
          /* 白のまま保つ割合（solid）から先を、少しずつ透明にしていく。
             solid を小さくすると早く写真が出る＝境目がやわらかくなる */
          background: `linear-gradient(to bottom, #ffffff 0%, #ffffff ${solid}%, rgba(255,255,255,0.96) ${solid + (100 - solid) * 0.2}%, rgba(255,255,255,0.86) ${solid + (100 - solid) * 0.38}%, rgba(255,255,255,0.68) ${solid + (100 - solid) * 0.55}%, rgba(255,255,255,0.44) ${solid + (100 - solid) * 0.72}%, rgba(255,255,255,0.2) ${solid + (100 - solid) * 0.87}%, rgba(255,255,255,0) 100%)`,
        }}
      />

      {/* ③ フッターの中身は写真の上 */}
      {/* 【2026-09-24 ヒデさん指摘】
           「フッターの白セクションのグラデーションと被って、作字の部分が
             見えていない感じでデザインが破綻している」
         実測すると、スマホでは中身（作字260px＋サイトマップ3カテゴリ＋SNS）が
         1画面に収まらず、上へあふれて作字が画面外に出ていた（実測: 作字 -216〜52）。
         → スマホでは高さを固定せず【中身の分だけ伸ばす】。
            PC は今までどおり1画面にぴったり収める。 */}
      {/* ⚠️ スマホでは absolute をやめる。absolute のままだと中身が
         親の高さに数えられず、フッターの高さが 0 になって
         前のセクションと重なってしまう（2026-09-24 実測: 高さ0・作字 -459）。 */}
      <div
        className={`flex flex-col ${
          isNarrow
            ? "relative z-10 px-6 pb-[56px] pt-[128px]"  /* 作字がグラデに埋もれないよう上を空ける */
            : "absolute inset-x-0 bottom-0"
        } ${
          isNarrow
            ? ""
            : pad === "wide"
              ? "px-6 sm:px-[var(--ft-pad-x)]"
              : "px-6 sm:px-[120px]"
        } ${
          isNarrow
            ? ""
            : align === "end"
              ? "justify-end pb-[56px] sm:pb-[var(--ft-pad-bottom)]"
              : "justify-center"
        }`}
        style={{ height: isNarrow ? undefined : H }}
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
          <Logo light />
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
