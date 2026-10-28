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
import InlineSvg from "./InlineSvg";
import { navigateTo } from "./PageTransition";
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
    /* スマホのトップ（MobileTop）にいる時は、場面の切り替えをお願いする
       （スマホのトップには PC のスクロールの箱が無い。2026-09-26 フッター差し替えで追加） */
    if (window.location.pathname === "/") {
      window.dispatchEvent(new CustomEvent("abashiri:goto-key", { detail: { key } }));
      return;
    }
    /* 他ページからはトップへ戻ってから飛ぶ */
    try {
      sessionStorage.setItem("abashiri-goto", key);
    } catch {}
    navigateTo("/"); /* 2026-09-26 丸ごと読み込み直し(window.location)をやめ、切り替え演出を通す */
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
      /* 【2026-09-26 ヒデさん指示】スマホのフッターでは作字を中央に。PC は左のまま */
      className="relative shrink-0 self-center @min-[1200px]:self-start"
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
        {/* 2026-10-20 画質：img → 図形のまま描く（InlineSvg。縮めて表示してもにじまない） */}
        <InlineSvg
          src="/img/text-kanko-site.svg"
          label="網走市観光サイト"
          className="absolute"
          style={{ left: 215.7, top: 8.3, width: 188.2, height: 36.3 }} /* 4-7例外（「網走市観光サイト」の画像の実寸 188.2×36.3） */
        />
        <InlineSvg
          src={light ? "/img/hero-message.svg" : "/img/hero-message-blue.svg"}
          label="な〜んにもない たまらない"
          className="absolute max-w-none"
          style={{ left: -28, top: 13.1, width: 471, height: 390 }} /* 4-7例外（作字の画像の実寸 471×390） */
        />
      </div>
    </div>
  );
}

/* ── 白→写真のグラデ 5パターン（調整パネル › サイト共通 › バリエーション › フッター › グラデ。2026-10-20）──
   【ヒデさん】「案3をベースに、グラデーションのもうちょっと徐々にかかっていく感じを出したい。5パターンぐらい」
   → どのパターンも、グラデの始まりを体験のカードの下あたりまで引き上げ（上のセクションに重ねる長さ 400px🟡）、
     長めに溶かす（画面の 64〜72%🟡）。違いは「白の濃さの変わり方」と「色・ぼかし」。
   α(t)＝白の濃さ（t＝グラデの頭 0 → 終わり 1）。32段で刻むので、つなぎ目の折れ（帯の筋）が出にくい。
   どの曲線も始まりと終わりの傾きが0＝白からも写真からも、なめらかにつながる。
   （前の「透け方」5通り＝早めに薄く／なめらか S字／霧／白が残る／空色 は、この5パターンに入れ替えた） */
export const FADE_CURVES: Record<number, { name: string; note: string }> = {
  1: { name: "長く、なめらかに", note: "体験のカードの下あたりから白がゆっくり薄くなり始め、真ん中も急がず、終わりはなめらかに消える（やわらかい S字）。いちばん素直" },
  2: { name: "白がゆっくり明ける", note: "白をしばらく保ってから、夜が明けるように少しずつ空が出てくる。白から空への入れ替わりがいちばん穏やか" },
  3: { name: "空色を経由して", note: "1 と同じ曲線で、途中の色を白から淡い空色（Brand_SkyBottom）へ寄せる。白を青に重ねた時の白っぽい濁りが出ず、空に溶け込む" },
  4: { name: "ぼかしながら現れる", note: "白が薄くなるのに合わせて、写真も強いぼかしからだんだんくっきりしていく（霧が晴れるように）" },
  5: { name: "霞が残る", note: "前半で白を半分ほどまで薄くしたあと、うっすらした霞を長く残してから消える。遠くの空気のような奥行き" },
};
/* ── フッターの写真の明るさ 3案（調整パネル › サイト共通 › バリエーション › フッターの写真。2026-10-20）──
   【ヒデさん】「フッターの後ろの写真がすごく暗く見える。3案ぐらい。その中の一つは写真のブライトネスを変えるとか」。
   暗く見える元は2つ：①写真の下半分に重ねた黒い影（35%・文字を読みやすくするため） ②写真そのものの明るさ。
   bright＝写真の明るさ(%)／shade＝下からの影の濃さ(%)／shadeH＝影が下から写真のどこまでかかるか(%)／light＝光を重ねる強さ(%)
   【同日 ヒデさん】「写真が暗い印象になっているところを調整できるところもインジケーターとして調整パネルに」→ 影の濃さ・高さ・明るさ・光の強さ
   【同日 ヒデさん】パネルで 明るさ120%・影0%・影の高さ40% にして「これで変えてほしい。彩度の調整も」→ 案1 をその値にして既定に。sat＝彩度(%) */
export const PHOTO_TONES: Record<number, { name: string; note: string; values: Record<string, number> }> = {
  0: { name: "前の暗いまま", note: "写真そのまま＋下半分に黒い影35%（2026-10-20 までの形）", values: { "footer.bright": 100, "footer.sat": 100, "footer.shade": 35, "footer.shadeH": 50, "footer.light": 0 } },
  1: { name: "写真を明るく", note: "【既定】黒い影なし（0%）・写真の明るさ 100%（加工なし）。2026-10-21 写真そのものの色を元の写真に合わせたので、明るさのフィルターは外した（前は 120%）", values: { "footer.bright": 100, "footer.sat": 100, "footer.shade": 0, "footer.shadeH": 40, "footer.light": 0 } },
  2: { name: "影を海の青に", note: "下の影を黒ではなく深い海の青（Shadow_Base #005fb3）にする。暗くならずに青が深まり、文字も読める。写真も少し明るく（108%）", values: { "footer.bright": 108, "footer.sat": 100, "footer.shade": 40, "footer.shadeH": 50, "footer.light": 0 } },
  3: { name: "光を重ねる", note: "写真の上に、空の色の光（上 Brand_SkyBottom → 下 Brand_SkyTop）をスクリーンで重ねて、全体を明るく爽やかに。黒い影はごく薄く（12%）", values: { "footer.bright": 100, "footer.sat": 100, "footer.shade": 12, "footer.shadeH": 50, "footer.light": 35 } },
};
/** 写真の上に重ねる「影」と「光」。PC・スマホ・タブレットの写真で共通 */
function PhotoTone({ tone, shade, shadeH = 50, light }: { tone: number; shade: number; shadeH?: number; light: number }) {
  const sh = Math.max(0, shade) / 100;
  /* 影：下から上へ、写真の shadeH%（既定は半分）で消える（前の bg-gradient-to-t from-black/35 via-transparent と同じ形）。
     案2 は黒ではなく Shadow_Base（#005fb3） */
  const c = tone === 2 ? "0,95,179" : "0,0,0";
  const L = Math.max(0, light) / 100;
  return (
    <>
      {sh > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(to top, rgba(${c},${sh}) 0%, rgba(${c},0) ${Math.max(1, shadeH)}%)` }}
        />
      )}
      {tone === 3 && L > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(181,215,255,${L}) 0%, rgba(53,195,234,${(L * 0.6).toFixed(3)}) 100%)`,
            mixBlendMode: "screen",
          }}
        />
      )}
    </>
  );
}
/** 写真の明るさ・彩度（どちらも 100% の時はフィルターを付けない＝絵に焼かれてにじむのを避ける・FIXLOG 2026-10-20） */
const photoFilterOf = (bright: number, sat: number) =>
  [bright !== 100 ? `brightness(${bright / 100})` : "", sat !== 100 ? `saturate(${sat / 100})` : ""].filter(Boolean).join(" ");
const photoFilter = (bright: number, sat = 100) => photoFilterOf(bright, sat) || undefined;

/** パターンごとの最初の値（調整パネルのグラデのピルで切り替えた時に入る値・🟡仮置き）。
    グラデの長さ＝画面の高さの%／重ねる長さ＝体験の下へ潜らせる px／助走＝体験セクション下のパディング px。
    重ねる長さを 240→400 に増やした分、グラデの頭が上へ伸びるので、1・3・4 はグラデを 64% にして
    ページの終わりまでのスクロールを前の案3 と同じに保つ（グラデの終わり＝体験の下端から 228px 下・前は 231px）。
    2 と 5 は白が長く残る形なので 72%（スクロールは約 80px 長くなる）*/
export const FADE_VALUES: Record<number, Record<string, number>> = {
  1: { "footer.fadeH": 64, "footer.overlap": 400, "footer.evPadBottom": 96, "footer.fadeSolid": 0 },
  2: { "footer.fadeH": 72, "footer.overlap": 400, "footer.evPadBottom": 96, "footer.fadeSolid": 0 },
  3: { "footer.fadeH": 64, "footer.overlap": 400, "footer.evPadBottom": 96, "footer.fadeSolid": 0 },
  4: { "footer.fadeH": 64, "footer.overlap": 400, "footer.evPadBottom": 96, "footer.fadeSolid": 0 },
  5: { "footer.fadeH": 72, "footer.overlap": 400, "footer.evPadBottom": 96, "footer.fadeSolid": 0 },
};
/** 始まりと終わりの傾きが0のなめらかな曲線（0→1） */
const smoother = (u: number) => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * c * (c * (c * 6 - 15) + 10);
};
/** パターンごとの白の濃さ α(t) */
const fadeAlpha = (curve: number, t: number) => {
  if (curve === 2) return 1 - smoother(Math.pow(t, 1.6)); /* 白50%が頭から 65% の所＝白が長く残る */
  if (curve === 5) {
    /* 前半 35% で白 100%→55%、残りで 55%→0（つなぎ目も傾き0） */
    return t <= 0.35 ? 1 - 0.45 * smoother(t / 0.35) : 0.55 * (1 - smoother((t - 0.35) / 0.65));
  }
  return 0.5 + 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t))); /* 1・3・4：やわらかい S字（cos） */
};
/** パターンの番号と「白のままの割合（%）」から、PC のグラデを作る */
function fadeGradient(curve: number, solid: number): string {
  const c = FADE_CURVES[curve] ? curve : 1;
  /* 淡い空色＝Brand_SkyBottom（#b5d7ff）。3 の時だけ途中の色をここへ寄せる */
  const SKY = [0xb5, 0xd7, 0xff];
  const N = 32;
  const stops = ["#ffffff 0%", `#ffffff ${solid}%`];
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const a = fadeAlpha(c, t);
    const col = c === 3 ? SKY.map((v) => Math.round(255 + (v - 255) * t)) : [255, 255, 255];
    stops.push(`rgba(${col.join(",")},${a.toFixed(3)}) ${(solid + (100 - solid) * t).toFixed(2)}%`);
  }
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
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
  overlap = false,
  shortFade = false,
}: {
  children: React.ReactNode;
  zoom?: boolean;
  /** PC の白→写真のグラデを短くする（詳しいページ。--ft-fade-h-short・2026-10-28） */
  shortFade?: boolean;
  /** 上のセクションへ重ねているか（案3 で、中身が重なった所に隠れないよう上を空ける） */
  overlap?: boolean;
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
      高さとグラデはレイアウトに関わるので、変わった時だけ描き直す。
      curve＝グラデのパターン（FADE_CURVES の番号・2026-10-20） */
  const [cfg, setCfg] = useState({ stageH: 120, fadeH: 72, fadeShort: 40, solid: 0, padTop: 64, curve: 1, overlap: 400, tone: 1, bright: 100, sat: 100, shade: 0, shadeH: 40, light: 0 });

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
        /* ⚠️ 白のままの割合は 0 もあり得るので、0 を既定に戻さない読み方にする */
        const num0 = (n: string, d: number) => {
          const x = parseFloat(cs.getPropertyValue(n));
          return isFinite(x) && x >= 0 ? x : d;
        };
        const nc = {
          stageH: num("--ft-stage-h", 120),
          fadeH: num("--ft-fade-h", 80),
          fadeShort: num("--ft-fade-h-short", 40),
          solid: num0("--ft-fade-solid", 6),
          padTop: num0("--ft-pad-top", 64),
          curve: Math.round(num("--ft-fade-curve", 1)),
          overlap: num0("--ft-overlap", 0),
          /* 写真の明るさの案（PHOTO_TONES・2026-10-20） */
          tone: Math.round(num0("--ft-tone", 0)),
          bright: num("--ft-photo-bright", 100),
          sat: num0("--ft-sat", 100),
          shade: num0("--ft-shade", 35),
          shadeH: num("--ft-shade-h", 50),
          light: num0("--ft-light", 0),
        };
        setCfg((o) =>
          o.stageH === nc.stageH &&
          o.fadeH === nc.fadeH &&
          o.solid === nc.solid &&
          o.padTop === nc.padTop &&
          o.fadeShort === nc.fadeShort &&
          o.curve === nc.curve &&
          o.overlap === nc.overlap &&
          o.tone === nc.tone &&
          o.bright === nc.bright &&
          o.sat === nc.sat &&
          o.shade === nc.shade &&
          o.shadeH === nc.shadeH &&
          o.light === nc.light
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
  /* 縦積み（スマホ・タブレット）かどうか。フッターの組み方を変えるのに使う（2026-09-24）。
     【2026-09-26】判定を「画面の幅 639px 以下」から「フッター自身の幅 1200px 未満」に変更。
       ・タブレット幅（640〜1023px）で PC の横並びに押し込まれ、サイトマップが1文字ずつ
         折り返して崩れていた（実測: 820px 幅）
       ・画面の幅で判定すると、PC のトップ（1512px の紙を縮めて表示）の中にあるフッターまで
         小さめの窓で縦積みになってしまう。フッター自身の幅なら紙の中では常に 1512px */
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => setIsNarrow(el.clientWidth < 1200);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const stageH = cfg.stageH / 100;
  const fadeH = cfg.fadeH / 100;
  const solid = cfg.solid;
  /* PC の白→写真のグラデ。solid％までは真っ白、そこから先はグラデのパターン（FADE_CURVES）の曲線で薄くなる */
  const pcFade = fadeGradient(cfg.curve, solid);
  const padCls = pad === "wide" ? "px-6 @min-[640px]:px-[var(--ft-pad-x)]" : "px-6 @min-[640px]:px-[120px]";
  const alignCls = align === "end" ? "justify-end pb-[56px] @min-[640px]:pb-[var(--ft-pad-bottom)]" : "justify-center";

  /* ═══ PC のフッター：案3「ふつうのフッター」（スマホ・タブレットの縦積みは下の return のまま）═══
     【2026-10-20 ヒデさん】「体験セクションからフッターにかけて、余計なスクロールが多い」→ 3案を見比べて
     「案3に近い形で」→「案3をベースに、それ以外の案を削除してOK」。今のまま（止まる写真＋長いグラデ）・
     短くする・幕が上がる は消した（戻す時は git の記録。2026-10-20 の「フッター3案」のコミット）。
     写真の帯は中身の高さだけ。トップでは写真を上の体験セクションの下へ重ね（--ft-overlap）、
     そこからグラデのパターンで少しずつ白が透けていく */
  if (!isNarrow) {
    /* 【2026-10-28 ヒデさん「各スポットの詳細ページのコンテンツが終わってからフッターにたどり着くまでのストロークが長い」】
       詳しいページは上に重ねないので、画面1.3枚分のグラデ（1277px）が丸ごと見えて、中身の終わり→フッターの文字が 1424px あった。
       → 詳しいページだけグラデを画面の 40%（--ft-fade-h-short🟡）に。トップ（重ねる）はそのまま */
    const fadePx = H * (shortFade ? cfg.fadeShort / 100 : fadeH);
    /* パターン4「ぼかしながら現れる」：ぼかした写真を上に重ね、下へ行くほど透明にする（霧が晴れるように）。
       白が薄くなってからぼかしが見えるので、グラデの 60% まではぼかし全開・グラデの終わりを少し過ぎた所（130%）でくっきり。
       ぼかしの縁が透けないよう少し大きく描く（拡大 1.08）。ぼかしは決めた演出なので 0 にはしない */
    const blurMask = `linear-gradient(to bottom, #000 0px, #000 ${Math.round(fadePx * 0.6)}px, transparent ${Math.round(fadePx * 1.3)}px)`;
    /* 上のセクションへ重ねた分は、中身がそこに隠れないよう上を空ける（グラデの長さと重ねる長さの大きい方＋上のパディング） */
    const ov = overlap ? cfg.overlap : 0;
    return (
      <div ref={ref} className="relative w-full overflow-hidden">
        {/* 写真は帯いっぱい（止めない）。帯が横長になるので、水平線と海が残るよう下を基準に切り抜く🟡 */}
        <img
          src="/img/bg-hero.jpg"
          data-kv-photo="" /* 2026-10-21 ヒデさん「フッターはキービジュアルのやつを使って」→ キービジュアルのレタッチ（PhotoRetouch）がフッターにも同じく効く */
          alt=""
          className="absolute inset-0 size-full object-cover object-bottom"
          style={{ filter: photoFilter(cfg.bright, cfg.sat) }}
        />
        {cfg.curve === 4 && (
          <img
            src="/img/bg-hero.jpg"
            data-kv-photo=""
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full object-cover object-bottom"
            style={{
              filter: `blur(24px) ${photoFilterOf(cfg.bright, cfg.sat)}`.trim(),
              transform: "scale(1.08)",
              WebkitMaskImage: blurMask,
              maskImage: blurMask,
            }}
          />
        )}
        {/* 影と光（写真の明るさの案）。前は下半分に黒い影35%で固定（bg-gradient-to-t from-black/35） */}
        <PhotoTone tone={cfg.tone} shade={cfg.shade} shadeH={cfg.shadeH} light={cfg.light} />
        <div className="pointer-events-none absolute inset-x-0" style={{ top: -3, height: fadePx + 3, background: pcFade }} />
        {/* 高さは中身なり：上＝グラデの長さ＋上のパディング／下＝下のパディング */}
        <div
          className={`relative z-10 flex flex-col ${padCls}`}
          style={{ paddingTop: Math.max(fadePx, ov) + cfg.padTop, paddingBottom: "var(--ft-pad-bottom)" }}
        >
          {children}
        </div>
      </div>
    );
  }

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
          data-kv-photo="" /* 2026-10-21 ヒデさん「フッターはキービジュアルのやつを使って」→ キービジュアルのレタッチ（PhotoRetouch）がフッターにも同じく効く */
          alt=""
          className="size-full object-cover"
          /* 案8：顔を出しながら少し引く。動かすのは transform だけ */
          style={{ transform: zoom ? `scale(${1.12 - 0.12 * t})` : undefined, filter: photoFilter(cfg.bright, cfg.sat) }}
        />
        {/* 文字が読めるよう、下側だけわずかに沈ませる（写真の明るさの案で、影の濃さ・色と光が変わる・2026-10-20） */}
        <PhotoTone tone={cfg.tone} shade={cfg.shade} shadeH={cfg.shadeH} light={cfg.light} />
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
          /* 【2026-09-26 ヒデさん指摘】スマホで「グラデが急。もっと自然に」
             → 110px で白から濃い青空へ切り替えていたのが原因。240px に伸ばし、
               薄くなり方もなめらかな曲線（白が長く残って、終わりはごく薄く消える）にした。
               その分、作字を下げて（pt 128→200）白文字が白に埋もれないようにしてある */
          /* 【同日 ヒデさん追加】「作字の部分に被っているので白みを上に」→ 240→180px。
             作字（網走市観光サイトの上端 ≈ 206px）より上で消えきるようにした */
          height: (isNarrow ? 180 : H * fadeH) + 3,
          /* 白のまま保つ割合（solid）から先を、少しずつ透明にしていく。
             solid を小さくすると早く写真が出る＝境目がやわらかくなる */
          background: isNarrow
            ? "linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.97) 12%, rgba(255,255,255,0.9) 24%, rgba(255,255,255,0.78) 36%, rgba(255,255,255,0.62) 48%, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0.29) 72%, rgba(255,255,255,0.16) 83%, rgba(255,255,255,0.06) 92%, rgba(255,255,255,0) 100%)"
            /* 【2026-09-26 ヒデさん指摘】PC「フッター付近のグラデ、最後の方の白みが長い」
               → 旧カーブは前半4割ほど白が 0.86 以上のまま残っていた。
                 前半から早めに薄くなるカーブ（ease-out）に変更。長さ（--ft-fade-h）は変えない */
            : pcFade,

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
            ? "relative z-10 px-6 pb-[56px] pt-[200px] @min-[640px]:px-[64px]"  /* 作字がグラデに埋もれないよう上を空ける（グラデ240pxに合わせて 128→200）。タブレット幅は左右を広めに */
            : "absolute inset-x-0 bottom-0"
        } ${isNarrow ? "" : padCls} ${isNarrow ? "" : alignCls}`}
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
  /* 【2026-10-21 ヒデさん】「ぼーっとスポットの下の能取岬とか、各スポットの文字が薄すぎるので、はっきりと見せて」
     → 白75%・太さ200（いちばん細い）→ 白100%・太さ300 に。スマホでは明るい空の上に乗るので、
       文字のまわりにだけ深い海の青（Shadow_Base #005fb3）をうっすらにじませて形を立たせる🟡
     → 同日 ヒデさん「スマホビューのフッター、スポットだったり子カテゴリ要素にシャドウをかけている気がするので、それはいらない」
       → スマホ（744px 未満）は影なし。白100%・太さ300 はそのまま。744px 以上（タブレット・PC）は影を残す */
  const item = light
    ? "font-light text-white tab:[text-shadow:0_0_4px_rgb(0_95_179/0.5),0_0_12px_rgb(0_95_179/0.3)] hover:opacity-80"
    : "font-light text-ink/80 hover:text-ink";
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
      {/* 【2026-09-26 ヒデさん指示】小項目の字下げ（pl-4）はやめ、見出しと左をそろえる（PC・スマホ共通） */}
      <ul className="mt-[var(--ft-head-gap)] flex flex-col gap-[var(--ft-item-gap)]">
        {col.items.map((n) => (
          <li key={n.label}>
            {n.href ? (
              <Link
                href={n.href}
                className={`block text-body-14 leading-[1.9] max-tab:leading-[1.7] transition-[color,opacity] duration-300 ease-standard ${item}`}
              >
                {n.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => n.jump && jumpTo(n.jump)}
                className={`block cursor-pointer text-left text-body-14 leading-[1.9] max-tab:leading-[1.7] transition-[color,opacity] duration-300 ease-standard ${item}`}
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
    /* 3列にするのはフッターの幅が 640px 以上の時（画面の幅ではなくフッター自身の幅。2026-09-26） */
    <div className="grid w-full grid-cols-1 gap-x-8 gap-y-[var(--ft-map-gap-y)] @min-[640px]:grid-cols-3 @min-[640px]:gap-x-[var(--ft-map-gap-x)]">
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
function Body({ overlap = false, shortFade = false }: { overlap?: boolean; shortFade?: boolean }) {
  return (
    <PhotoStage align="end" pad="wide" overlap={overlap} shortFade={shortFade}>
      {/* 横並び（左に作字・右にサイトマップ）はフッターの幅が 1200px 以上の時だけ（1024px だとサイトマップの列が66pxまで細くなった）。
          それより狭い時は作字を中央・その下にサイトマップ（2026-09-26 タブレット対応） */}
      <div className="flex w-full flex-col gap-14 @min-[1200px]:flex-row @min-[1200px]:items-center @min-[1200px]:justify-between @min-[1200px]:gap-[var(--ft-col-gap)]">
        {/* 左の作字。サイトの顔なので大きく出す。SNS アイコンは無し */}
        <div className="flex shrink-0 flex-col items-center @min-[1200px]:items-start">
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

export default function SiteFooter({
  overlap = false,
  shortFade = false,
}: {
  /** PC の白→写真のグラデを短くする（詳しいページ。中身の終わりからフッターまでを詰める・2026-10-28） */
  shortFade?: boolean;
  /** 上のセクションの下へ潜り込ませる（トップの体験セクションの下だけ・PC。2026-10-20）。
      詳しいページは前のセクションの作りが違うので重ねない */
  overlap?: boolean;
} = {}) {
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
      /* @container：中の組みを「画面の幅」ではなく「フッター自身の幅」で切り替える（2026-09-26） */
      className="@container relative z-10 -mt-[2px] w-full bg-white"
      /* 重ねる時は、重ねる長さだけ上へずらし、上のセクション（z-10）の後ろに回る（--ft-z＝0） */
      style={overlap ? { marginTop: "calc(-2px - var(--ft-overlap, 0px))", zIndex: "var(--ft-z, 10)" as unknown as number } : undefined}
    >
      <Body overlap={overlap} shortFade={shortFade} />
    </footer>
  );
}
