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
import { useEffect, useState } from "react";

/* ── ホバー挙動の5案（2026-09-14 ヒデさん依頼。調整パネルから切替） ──
   幅の開き方（時間・緩急・閉じた写真の残し方・写真の寄り）だけを変え、
   レイアウトはカンプ通りのまま */
export const EVENT_HOVER_EVENT = "abashiri:event-hover";
export type EventHoverPattern = {
  name: string;
  note: string;
  /** 開閉にかける時間(ms) */
  dur: number;
  ease: string;
  /** 閉じた写真を何pxの帯で残すか（0=完全に閉じる） */
  closed: number;
  /** true: 開いている間、写真がゆっくり寄る（scale 1→1.06） */
  zoom?: boolean;
};
export const EVENT_HOVER_PATTERNS: Record<number, EventHoverPattern> = {
  1: {
    name: "案1",
    note: "するり。0.7秒でなめらかに開く（いまの基準）",
    dur: 700,
    ease: "cubic-bezier(0.33, 0, 0.2, 1)",
    closed: 0,
  },
  2: {
    name: "案2",
    note: "ゆったり。1.2秒かけて開き、写真がゆっくり寄ってくる",
    dur: 1200,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    closed: 0,
    zoom: true,
  },
  3: {
    name: "案3",
    note: "きびきび。0.3秒でパッと切り替わる",
    dur: 320,
    ease: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    closed: 0,
  },
  4: {
    name: "案4",
    note: "帯のこし。閉じた3枚が48pxの帯で残り、帯にホバーすると乗り換えられる",
    dur: 700,
    ease: "cubic-bezier(0.33, 0, 0.2, 1)",
    closed: 48,
  },
  5: {
    name: "案5",
    note: "ばね。少し行き過ぎて戻る、弾みのある開き方",
    dur: 900,
    ease: "cubic-bezier(0.34, 1.3, 0.64, 1)",
    closed: 0,
  },
};

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
            /* 開いた幅は「見える幅1261」から帯の分を引く（案4は帯48px×3が残る） */
            const width =
              hover === null ? 335 : opened ? 1261 - 3 * P.closed : P.closed;
            return (
              <div
                key={it.title}
                onMouseEnter={() => setHover(i)}
                className="relative h-[674px] shrink-0 cursor-pointer overflow-hidden"
                style={{
                  width,
                  transition: `width ${P.dur}ms ${P.ease}`,
                }}
              >
                {/* 写真は枠の中央を見せたまま幅だけ変える（object-cover）。
                    案2は開いている間ゆっくり寄る（scale） */}
                <img
                  src={it.img}
                  alt={it.title}
                  className="absolute inset-0 size-full object-cover"
                  style={{
                    transform: P.zoom && opened ? "scale(1.06)" : "scale(1)",
                    transition: `transform ${Math.round(P.dur * 2)}ms ${P.ease}`,
                  }}
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
