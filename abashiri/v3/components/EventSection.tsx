"use client";

/*
 * 体験セクション（グルメの下・V3.0。見出しは「意外とオモロい、網走。」）
 *
 * カンプ：通常時 17230:25481 ／ ホバー時 17230:25703
 *   ・縦書き見出し「意外とオモロい、網走。」Noto Sans JP Thin(100) 36px 行間1.3
 *   ・写真4枚 gap5px・高さ674px
 *   ・ホバーした写真が全面に展開し、グラデ118°黒60%→透明＋キャプションが乗る
 *   ・展開面の padding 左右60・上下44 / キャプション幅536
 *   ・キャプション：タグ18px Thin / タイトル28px Thin / もっと見る17px ExtraLight＋18px矢印 /
 *     説明 14px ExtraLight 行間2 字間0.7px
 *
 * レイアウト（2026-09-15 ヒデさん指示）
 *   ・コンテンツは右付け。写真列は画面右端にぴったり付ける（右の余白なし）
 *   ・見出しの右から画面右端までを4枚で等分に埋める
 *
 * ホバーの作り（2026-09-15 作り直し）
 *   旧実装は各タイルの width を毎フレーム変えていたため、ブラウザが毎フレーム
 *   レイアウトし直して「グラグラ」した。新実装は
 *     ① 4枚のタイルは絶対に動かさない（位置・サイズ固定）
 *     ② 展開は「上に重ねた全面レイヤー」を opacity / transform / clip-path だけで見せる
 *   の2点で、レイアウトを一切発生させない＝カクつきようがない構造にしている。
 */
import { useEffect, useState } from "react";

/* ── ホバーの見せ方5案（2026-09-15 新規。調整パネルから切替）──
   すべて「タイルは動かさず、全面レイヤーの見せ方だけを変える」方式。
   使うのは opacity / transform / clip-path のみ（レイアウトを起こさない） */
export const EVENT_HOVER_EVENT = "abashiri:event-hover";

export type EventHoverPattern = {
  name: string;
  note: string;
  /** 全面レイヤーが出るまで(ms) */
  dur: number;
  ease: string;
  /** 見せ方の種類 */
  kind: "fade" | "grow" | "curtain" | "zoom" | "slide";
  /** 下のタイルを暗く沈ませる量（0〜1。0=そのまま） */
  dim: number;
  /** 展開中、全面写真をゆっくり寄せる（1=なし） */
  drift?: number;
};

export const EVENT_HOVER_PATTERNS: Record<number, EventHoverPattern> = {
  1: {
    name: "案1",
    note: "溶けこみ。写真はまったく動かず、全面の絵がふわっと浮かび上がる（いちばん静か）",
    dur: 900,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    kind: "fade",
    dim: 0.5,
    drift: 1.04,
  },
  2: {
    name: "案2",
    note: "その場から広がる。選んだ1枚の位置から左右へすーっと全面に広がる",
    dur: 1000,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    kind: "grow",
    dim: 0.35,
  },
  3: {
    name: "案3",
    note: "カーテン。左から右へ、幕が開くように全面の絵が現れる",
    dur: 1100,
    ease: "cubic-bezier(0.33, 0, 0.2, 1)",
    kind: "curtain",
    dim: 0.35,
  },
  4: {
    name: "案4",
    note: "奥から寄る。全面の絵が少し大きい状態から、ゆっくり実寸に収まる",
    dur: 1200,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    kind: "zoom",
    dim: 0.45,
  },
  5: {
    name: "案5",
    note: "横すべり。選んだ写真の側から、全面の絵がすっと滑りこむ",
    dur: 950,
    ease: "cubic-bezier(0.33, 0, 0.2, 1)",
    kind: "slide",
    dim: 0.45,
  },
};

type EventItem = {
  tag: string;
  title: string;
  body: string;
  img: string;
  /** 詳細ページができたら差す（テンプレ運用を想定） */
  href?: string;
};

/* 1枚目のタグ・タイトルはカンプ実測（網走刑務所めし）。2〜4枚目は🟡仮置き */
const ITEMS: EventItem[] = [
  {
    tag: "体験・イベント",
    title: "網走刑務所めし",
    body: "博物館 網走監獄では、実際の刑務所で出されている食事を再現した「監獄食」を味わえます。麦飯にホッケ、みそ汁。質素なのに、なぜかクセになるおいしさです。",
    img: "/img/omoroi-1.jpg",
  },
  {
    tag: "景色・どうぶつ",
    title: "流氷とアザラシ",
    body: "冬のオホーツク海にやってくるのは流氷だけではありません。氷の上でのんびり休むアザラシに出会えることも。防寒をしっかりして、双眼鏡を持って探してみてください。",
    img: "/img/omoroi-2.jpg",
  },
  {
    tag: "体験・イベント",
    title: "網走湖カヌー体験",
    body: "湖と川がつながる網走ならではの、水の上のさんぽ。ガイドと一緒にゆっくり漕ぎ出せば、鳥の声と水の音だけの静かな時間が待っています。初めてでも大丈夫。",
    img: "/img/omoroi-3.jpg",
  },
  {
    tag: "景色・どうぶつ",
    title: "オオワシに会う冬",
    body: "翼を広げると2mを超えるオオワシ・オジロワシが、冬の網走に渡ってきます。流氷の上や河口の木々にとまる姿は迫力満点。カメラを持って出かけたくなります。",
    img: "/img/omoroi-4.jpg",
  },
];

export default function EventSection() {
  const [hover, setHover] = useState<number | null>(null);
  /* ホバー挙動の案（1〜5）。初期値は焼き込み → パネル操作でライブ更新 */
  const [pat, setPat] = useState(1);
  useEffect(() => {
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.events?.pattern;
        if (typeof v === "number" && EVENT_HOVER_PATTERNS[v]) setPat(v);
      })
      .catch(() => {});
    const onTune = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number" && EVENT_HOVER_PATTERNS[v]) setPat(v);
    };
    window.addEventListener(EVENT_HOVER_EVENT, onTune);
    return () => window.removeEventListener(EVENT_HOVER_EVENT, onTune);
  }, []);
  const P = EVENT_HOVER_PATTERNS[pat] ?? EVENT_HOVER_PATTERNS[1];

  const active = hover != null;
  const it = active ? ITEMS[hover as number] : null;
  /* 4等分なので、選んだタイルは左から hover*25% 〜 (hover+1)*25% の帯にいる */
  const leftPct = active ? (hover as number) * 25 : 0;
  const rightPct = active ? (3 - (hover as number)) * 25 : 0;

  /* 全面レイヤーの「隠れている時」の姿を案ごとに決める。
     出る時はすべて素の状態（clip 0 / 変形なし / 不透明）へ戻す */
  const hiddenStyle = (): React.CSSProperties => {
    switch (P.kind) {
      case "grow":
        /* 選んだタイルの帯だけを見せた状態から、左右へ開く */
        return { clipPath: `inset(0 ${rightPct}% 0 ${leftPct}%)`, opacity: 1 };
      case "curtain":
        return { clipPath: "inset(0 100% 0 0)", opacity: 1 };
      case "zoom":
        return { transform: "scale(1.08)", opacity: 0 };
      case "slide":
        /* 選んだ写真が左寄りなら左から、右寄りなら右から滑りこむ */
        return {
          transform: `translateX(${(hover as number) < 2 ? -48 : 48}px)`,
          opacity: 0,
        };
      default:
        return { opacity: 0 };
    }
  };
  const shownStyle = (): React.CSSProperties => ({
    clipPath: "inset(0 0% 0 0%)",
    transform: `scale(${P.drift ?? 1})`,
    opacity: 1,
  });

  return (
    /* ⚠️ relative z-10 は必須。前の兄弟（背景写真やKVの sticky＝positioned要素）が
       描画順で上に来るため、無いと白背景と見出しが青背景の下に沈む（2026-09-14 実測） */
    <section id="events" className="relative z-10 w-full bg-white py-[140px]">
      {/* 右付け：右の余白を持たせず、写真列を画面右端にぴったり付ける
          （2026-09-15 ヒデさん指示） */}
      <div className="flex w-full items-start gap-[69px] pl-[147px]">
        {/* 縦書き見出し（Thin 36px 行間1.3） */}
        <h2
          className="shrink-0 whitespace-nowrap text-title-36 font-thin leading-[1.3] text-ink"
          style={{ writingMode: "vertical-rl" }}
        >
          意外とオモロい、網走。
        </h2>

        {/* 写真列。見出しの右から画面右端までを4枚で等分に埋める。
            ここは「位置が絶対に動かない箱」。展開は上に重ねるレイヤーで見せる */}
        <div
          className="relative h-[674px] min-w-0 flex-1 overflow-hidden"
          onMouseLeave={() => setHover(null)}
        >
          {/* ① 4枚のタイル（常に同じ位置・同じ大きさ） */}
          <div className="absolute inset-0 flex gap-[5px]">
            {ITEMS.map((item, i) => (
              <div
                key={item.title}
                onMouseEnter={() => setHover(i)}
                className="relative min-w-0 flex-1 cursor-pointer overflow-hidden"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="absolute inset-0 size-full object-cover"
                />
                {/* 選ばれていないタイルは静かに沈む（opacity のみ＝軽い） */}
                <div
                  className="absolute inset-0 bg-white"
                  style={{
                    opacity: active && hover !== i ? P.dim : 0,
                    transition: `opacity ${P.dur}ms ${P.ease}`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* ② ホバー中に重なる全面レイヤー。opacity/transform/clip-path だけで動く。
              pointer-events-none にして、下のタイルのホバー判定を邪魔しない
              （キャプション内のリンクだけ auto に戻す） */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              ...(active ? shownStyle() : hiddenStyle()),
              transition: `opacity ${P.dur}ms ${P.ease}, transform ${Math.round(P.dur * 1.6)}ms ${P.ease}, clip-path ${P.dur}ms ${P.ease}`,
              willChange: "opacity, transform, clip-path",
            }}
          >
            {it && (
              <>
                <img
                  src={it.img}
                  alt={it.title}
                  className="absolute inset-0 size-full object-cover"
                />
                {/* カンプ：118° 黒60%→透明 */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(118deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
                  }}
                />
                {/* キャプション（カンプ：px60 py44 / 幅536 / 左上寄せ） */}
                <div
                  className="absolute inset-0 flex flex-col items-start px-[60px] py-[44px]"
                  style={{
                    opacity: active ? 1 : 0,
                    transition: `opacity ${Math.round(P.dur * 0.7)}ms ${P.ease} ${Math.round(P.dur * 0.35)}ms`,
                  }}
                >
                  <div className="pointer-events-auto flex w-[536px] max-w-full flex-col gap-4">
                    <div className="flex w-full items-end justify-between">
                      <div className="flex flex-col gap-2 leading-[1.2] text-white">
                        <p className="whitespace-nowrap text-body-18 font-thin [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                          {it.tag}
                        </p>
                        <p className="whitespace-nowrap text-title-28 font-thin">
                          {it.title}
                        </p>
                      </div>
                      <span className="flex shrink-0 cursor-pointer items-center gap-1 transition-transform duration-300 ease-standard hover:translate-x-[10px]">
                        <span className="whitespace-nowrap text-[17px] font-extralight leading-[1.2] text-white">
                          もっと見る
                        </span>
                        <img
                          src="/img/icon-view-more.svg"
                          alt=""
                          className="size-[18px]"
                        />
                      </span>
                    </div>
                    <p className="w-full text-body-14 font-extralight leading-[2] tracking-[0.7px] text-white">
                      {it.body}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
