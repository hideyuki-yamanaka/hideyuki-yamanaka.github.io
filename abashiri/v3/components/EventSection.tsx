"use client";

/*
 * イベントセクション（グルメの下・V3.0 新設。見出しは「意外とオモロい、網走。」）
 *
 * カンプ：通常時 17230:25481 ／ ホバー時 17230:25703（2026-09-14 実測）
 *   ・縦書き見出し「意外とオモロい、網走。」Noto Sans JP Thin(100) 36px 行間1.3
 *   ・写真4枚 各335×674 gap5px。列は右へ約94pxはみ出すレイアウト（カンプ通り・clipで隠す）
 *   ・ホバーした写真が幅1261px（列の見える幅いっぱい）へ展開し、他はたたまれる
 *   ・展開面：グラデ118°黒60%→透明 / padding 左右60・上下44 / キャプション幅536
 *   ・キャプション：タグ18px Thin / タイトル28px Thin / もっと見る17px ExtraLight＋18px矢印 /
 *     説明 14px ExtraLight 行間2 字間0.7px
 *
 * 🟡仮置き（カンプから取れない・ダミーだった値）
 *   ・展開アニメ：width 700ms cubic-bezier(0.33,0,0.2,1)（体験ページのダイブと同系の緩急）
 *   ・2〜4枚目のタグ・タイトル・説明文（カンプはかまぼこのダミー文）→ 実在ネタで作文
 *   ・たたまれた写真の幅 0px（スリバーを残さない。戻りはマウスが列から出た時）
 */
import { useState } from "react";

type OmoroiItem = {
  tag: string;
  title: string;
  body: string;
  img: string;
  /** 詳細ページができたら差す（テンプレ運用を想定） */
  href?: string;
};

/* 1枚目のタグ・タイトルはカンプ実測（網走刑務所めし）。2〜4枚目は🟡仮置き */
const ITEMS: OmoroiItem[] = [
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

  return (
    <section id="events" className="w-full bg-white py-[140px]">
      {/* カンプ：left147 / 見出しと画像列の間 69px。列は右へはみ出すので clip */}
      <div className="flex w-full items-start gap-[69px] overflow-x-clip pl-[147px]">
        {/* 縦書き見出し（Thin 36px 行間1.3）。色はトンマナの ink（🟡カンプ表記は black） */}
        <h2
          className="shrink-0 whitespace-nowrap text-title-36 font-thin leading-[1.3] text-ink"
          style={{ writingMode: "vertical-rl" }}
        >
          意外とオモロい、網走。
        </h2>

        <div
          className="flex items-center gap-[5px]"
          onMouseLeave={() => setHover(null)}
        >
          {ITEMS.map((it, i) => {
            const opened = hover === i;
            const width =
              hover === null ? 335 : opened ? 1261 : 0; /* 🟡たたみ幅0 */
            return (
              <div
                key={it.title}
                onMouseEnter={() => setHover(i)}
                className="relative h-[674px] shrink-0 cursor-pointer overflow-hidden transition-[width] duration-700 ease-[cubic-bezier(0.33,0,0.2,1)]"
                style={{ width }}
              >
                {/* 写真は枠の中央を見せたまま幅だけ変える（object-cover） */}
                <img
                  src={it.img}
                  alt={it.title}
                  className="absolute inset-0 size-full object-cover"
                />
                {/* 展開時だけの暗幕（カンプ：118° 黒60%→透明） */}
                <div
                  className={`absolute inset-0 transition-opacity duration-500 ease-standard ${
                    opened ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    backgroundImage:
                      "linear-gradient(118deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
                  }}
                />
                {/* キャプション（カンプ：px60 py44 / 幅536 / 左上寄せ） */}
                <div
                  className={`absolute inset-0 flex flex-col items-start px-[60px] py-[44px] transition-opacity delay-150 duration-500 ease-standard ${
                    opened ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <div className="flex w-[536px] max-w-full flex-col gap-4">
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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
