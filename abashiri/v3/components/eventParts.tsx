"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクションの共通部品（EventSection.tsx と EventVariants2.tsx が使う）
 * 2026-09-16 に EventSection.tsx から切り出した。
 * 案が増えてファイルが太ってきたので、データ・文字組み・カードの枠だけをここに置く。
 */
import Link from "next/link";

export type EventItem = {
  /* 【2026-09-16 ヒデさん指示】他のセクションと同じく通し番号を振る。
     表示は「体験 01」。「イベント」の語は使わない */
  no: string;
  tag: string;
  title: string;
  body: string;
  img: string;
  /** 詳細ページの slug（spotDetailData.ts のキー）。4件とも繋いである */
  slug: string;
};

/* 4件とも網走市観光公式サイトの実在ページに対応させ、詳細ページへつないでいる
   （2026-09-15 ヒデさん指示。以前の仮置き文言は廃止） */
export const ITEMS: EventItem[] = [
  {
    no: "01",
    tag: "体験",
    title: "博物館 網走監獄",
    body: "実際に使われていた監獄の建物を移築・復原した野外博物館。重要文化財の舎房や、受刑者が食べている「監獄食」を味わえる食堂もあります。",
    img: "/img/spot/kangoku-1.jpg",
    slug: "kangoku",
  },
  {
    no: "02",
    tag: "体験",
    title: "オホーツク流氷館",
    body: "天都山の頂上にある、流氷を一年中体感できる施設。マイナス15度の流氷体感テラスや、クリオネなど流氷の生きものに会えます。",
    img: "/img/spot/ryuhyokan-1.jpg",
    slug: "ryuhyokan",
  },
  {
    no: "03",
    tag: "体験",
    title: "カヌー体験",
    body: "網走川や網走湖を、ガイドと一緒にゆっくり漕ぎ出す水の上のさんぽ。鳥の声と水の音だけの静かな時間が待っています。",
    img: "/img/spot/canoe-1.jpg",
    slug: "canoe",
  },
  {
    no: "04",
    tag: "体験",
    title: "オジロワシ・オオワシウォッチング",
    body: "冬の網走に渡ってくる大型のワシを、ガイドと探しにいくツアー。流氷の上や河口の木々にとまる姿は迫力満点です。",
    img: "/img/spot/washi-1.jpg",
    slug: "washi",
  },
];

export const EASE = [0.22, 1, 0.36, 1] as const;
export const reveal = {
  hidden: { opacity: 0, y: 32, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.1, ease: EASE },
  },
};
export const VIEW = { once: true, amount: 0.25 } as const;

/* ── 文字の部品（カンプの書式） ───────────────── */

export function VTitle({ className = "" }: { className?: string }) {
  return (
    <h2
      className={`shrink-0 whitespace-nowrap text-title-36 font-thin leading-[1.3] text-ink ${className}`}
      style={{ writingMode: "vertical-rl" }}
    >
      意外とオモロい、網走。
    </h2>
  );
}

export function HTitle({ className = "" }: { className?: string }) {
  return (
    <h2
      className={`whitespace-nowrap text-title-36 font-thin leading-[1.8] text-ink ${className}`}
    >
      意外とオモロい、網走。
    </h2>
  );
}

export function Caption({
  it,
  size = "sm",
  className = "",
}: {
  it: EventItem;
  size?: "sm" | "lg";
  className?: string;
}) {
  /* 説明ごと詳細ページへのリンクにする（2026-09-15 ヒデさん指示「全部つなぎ込む」） */
  return (
    <Link
      href={`/spot/${it.slug}`}
      className={`group flex flex-col gap-2 ${className}`}
    >
      <p className="text-body-14 font-extralight leading-[1.2] tracking-[0.7px] text-ink/45 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {it.tag} {it.no}
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
      <span className="mt-1 flex items-center gap-1 text-body-14 font-extralight leading-[1.2] text-ink/60 transition-transform duration-300 ease-standard group-hover:translate-x-[6px]">
        もっと見る
        <img src="/img/icon-view-more-black.svg" alt="" className="size-[14px]" />
      </span>
    </Link>
  );
}

/** カードのリンク枠。カード全体がホバー領域で、中の写真が枠内で拡大する。
    グルメのカードと同じ言葉遣い（1.06倍・700ms・ease-out）。
    ⚠️ 拡大はこの枠に掛ける。中の写真は framer が transform を直接書くので、
    写真側に hover クラスを足しても上書きされて効かない（2026-09-16） */
export function CardLink({
  it,
  className = "",
  style,
  children,
}: {
  it: EventItem;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden ${className}`} style={style}>
      <Link
        href={`/spot/${it.slug}`}
        className="block size-full transition-transform duration-700 ease-out hover:scale-[1.06]"
      >
        {children}
      </Link>
    </div>
  );
}

