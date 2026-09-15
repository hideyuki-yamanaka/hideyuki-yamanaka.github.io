"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクション（グルメの下・V3.0。見出しは「意外とオモロい、網走。」）
 *
 * 2026-09-15 ヒデさん指示で全面作り直し
 *   ・ホバーで全面展開する仕掛けは廃止（5案とも削除）
 *   ・代わりに「レイアウトの見せ方」を10案用意して、調整パネルで選ぶ
 *   ・トップページのトンマナを踏襲：白地 / Noto Sans JP Thin・ExtraLight /
 *     ink の文字 / 余白を大きく取る / 動きは静かに（画面に入ったらブラーが晴れる）
 *
 * カンプ由来で守っているもの（17230:25481）
 *   ・縦書き見出し「意外とオモロい、網走。」Thin(100) 36px 行間1.3
 *   ・タグ / タイトル / 説明の書式（18px Thin / 28px Thin / 14px ExtraLight 行間2 字間0.7px）
 *
 * 🟡仮置き：10案のレイアウト寸法（写真の大きさ・余白）はカンプが無いので、
 *   トップの既存値（余白140、gap5〜24、写真高さ674 など）を基準に決めた
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* ── レイアウト10案（2026-09-15 新規）──
   どれも「白地・余白・ミニマル」を軸に、写真の組み方だけを変えている */
export const EVENT_LAYOUT_EVENT = "abashiri:event-layout";

export const EVENT_LAYOUT_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  1: { name: "案1", note: "右付け一列。縦書き見出しの右に4枚、画面右端までぴったり" },
  2: { name: "案2", note: "中央そろえ。写真を小さめにして、上下にたっぷり余白" },
  3: { name: "案3", note: "階段。4枚が少しずつ下がって、視線が流れる" },
  4: { name: "案4", note: "主役1枚。大きな1枚＋右に小さな3枚" },
  5: { name: "案5", note: "2×2。縦書き見出しの右に、正方形に近い4枚" },
  6: { name: "案6", note: "全幅の帯。画面いっぱいに4枚を低い高さで並べる" },
  7: { name: "案7", note: "縦積み。1枚ずつ大きく、説明が左右交互に付く" },
  8: { name: "案8", note: "額装。白い余白の中に写真を置く、美術館のような静けさ" },
  9: { name: "案9", note: "散らし。高さをずらして非対称に置く" },
  10: { name: "案10", note: "文字主役。見出しを大きく中央に、写真は小さく一列" },
};

type EventItem = { tag: string; title: string; body: string; img: string };

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

/* 画面に入ったらブラーが晴れて浮き上がる（トップページ共通の質感） */
const reveal = {
  hidden: { opacity: 0, y: 32, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const },
  },
};
/* トップの scroller を基準にする（window ではないため） */
const VIEW = { once: true, amount: 0.25 } as const;

/* ── 部品 ───────────────────────────────── */

/** 縦書きの見出し（カンプの書式） */
function VTitle({ className = "" }: { className?: string }) {
  return (
    <h2
      className={`shrink-0 whitespace-nowrap text-title-36 font-thin leading-[1.3] text-ink ${className}`}
      style={{ writingMode: "vertical-rl" }}
    >
      意外とオモロい、網走。
    </h2>
  );
}

/** 横書きの見出し */
function HTitle({ className = "" }: { className?: string }) {
  return (
    <h2
      className={`whitespace-nowrap text-title-36 font-thin leading-[1.8] text-ink ${className}`}
    >
      意外とオモロい、網走。
    </h2>
  );
}

/** 写真の下に置く説明（ミニマル用・小さく静かに） */
function Caption({
  it,
  size = "sm",
  className = "",
}: {
  it: EventItem;
  /** sm=一覧向けの小さい表示 / lg=1枚ずつ見せる時の大きめ表示 */
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <p className="text-body-14 font-extralight leading-[1.2] tracking-[0.7px] text-ink/45">
        {it.tag}
      </p>
      <p
        className={`font-thin leading-[1.4] text-ink ${
          size === "lg" ? "text-title-28" : "text-body-18"
        }`}
      >
        {it.title}
      </p>
      {size === "lg" && (
        <p className="mt-2 text-body-14 font-extralight leading-[2] tracking-[0.7px] text-ink/70">
          {it.body}
        </p>
      )}
    </div>
  );
}

/** 写真1枚（画面に入ったら静かに現れる）。i で少しずつ遅らせる */
function Shot({
  it,
  i = 0,
  className = "",
  imgClassName = "",
  imgStyle,
}: {
  it: EventItem;
  i?: number;
  className?: string;
  imgClassName?: string;
  /** 高さを変数で決めたい時に使う（Tailwind の動的クラスは効かないため） */
  imgStyle?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={VIEW}
      transition={{ delay: i * 0.12 }}
    >
      <img
        src={it.img}
        alt={it.title}
        className={`w-full object-cover ${imgClassName}`}
        style={imgStyle}
      />
    </motion.div>
  );
}

/* 案ごとの中身。section の外枠（白地・余白）は共通で持つ */
function Layout({ pat }: { pat: number }) {
  switch (pat) {
    /* 案1 右付け一列：縦書き見出し＋4枚が画面右端までぴったり */
    case 1:
      return (
        <div className="flex w-full items-start gap-[69px] pl-[147px]">
          <VTitle />
          <div className="flex min-w-0 flex-1 gap-[5px]">
            {ITEMS.map((it, i) => (
              <div key={it.title} className="flex min-w-0 flex-1 flex-col gap-5">
                <Shot it={it} i={i} imgClassName="h-[674px]" />
                <Caption it={it} />
              </div>
            ))}
          </div>
        </div>
      );

    /* 案2 中央そろえ：写真を小さく、上下左右にたっぷり余白 */
    case 2:
      return (
        <div className="mx-auto flex w-[1080px] max-w-[88%] flex-col items-center gap-[100px]">
          <HTitle className="text-center" />
          <div className="flex w-full gap-6">
            {ITEMS.map((it, i) => (
              <div key={it.title} className="flex min-w-0 flex-1 flex-col gap-5">
                <Shot it={it} i={i} imgClassName="h-[340px]" />
                <Caption it={it} />
              </div>
            ))}
          </div>
        </div>
      );

    /* 案3 階段：4枚が順に下へずれて、視線が流れる */
    case 3:
      return (
        <div className="flex w-full items-start gap-[69px] px-[147px]">
          <VTitle />
          <div className="flex min-w-0 flex-1 items-start gap-8">
            {ITEMS.map((it, i) => (
              <div
                key={it.title}
                className="flex min-w-0 flex-1 flex-col gap-5"
                style={{ marginTop: i * 64 }}
              >
                <Shot it={it} i={i} imgClassName="h-[420px]" />
                <Caption it={it} />
              </div>
            ))}
          </div>
        </div>
      );

    /* 案4 主役1枚：左に大きな1枚、右に小さな3枚 */
    case 4:
      return (
        <div className="mx-auto flex w-[1220px] max-w-[92%] flex-col gap-[80px]">
          <HTitle />
          <div className="flex gap-10">
            <div className="flex w-[620px] max-w-[52%] flex-col gap-6">
              <Shot it={ITEMS[0]} imgClassName="h-[620px]" />
              <Caption it={ITEMS[0]} size="lg" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-8">
              {ITEMS.slice(1).map((it, i) => (
                <div key={it.title} className="flex items-center gap-6">
                  <Shot
                    it={it}
                    i={i + 1}
                    className="w-[240px] shrink-0"
                    imgClassName="h-[160px]"
                  />
                  <Caption it={it} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    /* 案5 2×2：縦書き見出しの右に、正方形に近い4枚 */
    case 5:
      return (
        <div className="mx-auto flex w-[1180px] max-w-[92%] items-start gap-[80px]">
          <VTitle />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-8 gap-y-14">
            {ITEMS.map((it, i) => (
              <div key={it.title} className="flex flex-col gap-5">
                <Shot it={it} i={i} imgClassName="h-[380px]" />
                <Caption it={it} />
              </div>
            ))}
          </div>
        </div>
      );

    /* 案6 全幅の帯：画面いっぱい・低い高さで4枚。いちばん潔い並べ方 */
    case 6:
      return (
        <div className="flex w-full flex-col gap-[80px]">
          <HTitle className="px-[147px]" />
          <div className="flex w-full">
            {ITEMS.map((it, i) => (
              <Shot
                key={it.title}
                it={it}
                i={i}
                className="min-w-0 flex-1"
                imgClassName="h-[420px]"
              />
            ))}
          </div>
          <div className="flex w-full px-[147px]">
            {ITEMS.map((it) => (
              <Caption key={it.title} it={it} className="min-w-0 flex-1" />
            ))}
          </div>
        </div>
      );

    /* 案7 縦積み：1枚ずつ大きく、説明が左右交互 */
    case 7:
      return (
        <div className="mx-auto flex w-[1220px] max-w-[92%] flex-col gap-[140px]">
          <HTitle />
          {ITEMS.map((it, i) => (
            <div
              key={it.title}
              className={`flex items-end gap-[56px] ${i % 2 ? "flex-row-reverse" : ""}`}
            >
              <Shot
                it={it}
                className="min-w-0 flex-1"
                imgClassName="h-[520px]"
              />
              <Caption it={it} size="lg" className="w-[320px] shrink-0 pb-4" />
            </div>
          ))}
        </div>
      );

    /* 案8 額装：白い余白の中に写真を置く。美術館のような静けさ */
    case 8:
      return (
        <div className="mx-auto flex w-[1180px] max-w-[92%] flex-col items-center gap-[120px]">
          <HTitle className="text-center" />
          <div className="grid w-full grid-cols-2 gap-x-[80px] gap-y-[100px]">
            {ITEMS.map((it, i) => (
              <div
                key={it.title}
                className="flex flex-col items-center gap-8 bg-sky-bottom/25 px-[56px] py-[56px]"
              >
                <Shot it={it} i={i} imgClassName="h-[300px]" />
                <Caption it={it} className="items-center text-center" />
              </div>
            ))}
          </div>
        </div>
      );

    /* 案9 散らし：高さをずらして非対称に置く */
    case 9:
      return (
        <div className="flex w-full items-start gap-[69px] px-[120px]">
          <VTitle className="mt-[60px]" />
          <div className="flex min-w-0 flex-1 items-start gap-10">
            {ITEMS.map((it, i) => {
              const offs = [0, 120, 40, 180];
              const hs = [460, 360, 520, 320];
              return (
                <div
                  key={it.title}
                  className="flex min-w-0 flex-1 flex-col gap-5"
                  style={{ marginTop: offs[i] }}
                >
                  {/* ⚠️ 高さは inline style。Tailwind は変数で組んだクラス名を
                      ビルド時に見つけられないため h-[${...}] は効かない */}
                  <Shot it={it} i={i} imgStyle={{ height: hs[i] }} />
                  <Caption it={it} />
                </div>
              );
            })}
          </div>
        </div>
      );

    /* 案10 文字主役：見出しを大きく中央に、写真は小さく一列 */
    case 10:
      return (
        <div className="mx-auto flex w-[1100px] max-w-[92%] flex-col items-center gap-[120px]">
          <motion.h2
            className="text-center text-[64px] font-thin leading-[1.6] text-ink"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={VIEW}
          >
            意外とオモロい、網走。
          </motion.h2>
          <div className="flex w-full gap-5">
            {ITEMS.map((it, i) => (
              <div key={it.title} className="flex min-w-0 flex-1 flex-col gap-4">
                <Shot it={it} i={i} imgClassName="h-[260px]" />
                <Caption it={it} />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function EventSection() {
  /* レイアウトの案（1〜10）。初期値は焼き込み → パネル操作でライブ更新 */
  const [pat, setPat] = useState(1);
  useEffect(() => {
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.events?.pattern;
        if (typeof v === "number" && EVENT_LAYOUT_PATTERNS[v]) setPat(v);
      })
      .catch(() => {});
    const onTune = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number" && EVENT_LAYOUT_PATTERNS[v]) setPat(v);
    };
    window.addEventListener(EVENT_LAYOUT_EVENT, onTune);
    return () => window.removeEventListener(EVENT_LAYOUT_EVENT, onTune);
  }, []);

  return (
    /* ⚠️ relative z-10 は必須。前の兄弟（背景写真やKVの sticky＝positioned要素）が
       描画順で上に来るため、無いと白背景と見出しが青背景の下に沈む（2026-09-14 実測） */
    <section
      id="events"
      className="relative z-10 w-full overflow-x-clip bg-white py-[180px]"
    >
      <Layout pat={pat} />
    </section>
  );
}
