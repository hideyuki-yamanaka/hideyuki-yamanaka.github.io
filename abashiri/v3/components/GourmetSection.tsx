"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 素朴なグルメ（v1.2 / カンプ 15415:21597）
 *
 * ぼーっとスポットが終わったあとのセクション。
 *   ・見出しテキストがブラーで出てくる（サイト共通の reveal）
 *   ・カードのカルーセルが右から左へゆっくり流れ続ける（自動・無限ループ）
 *   ・カードにカーソルを乗せると、下から黒のグラデーションがかかって
 *     文字（小見出し・店名・もっと見る・説明）が出る
 *     ＝カンプの「ラーメンだるまや」のカードがホバー時の見本
 *
 * カンプ実測（v2.0 / 15490:21764。2026-08-22 更新版に差し替え）
 *   見出し … Noto Sans JP Thin 36px (Title_36px) / 行間1.8 / 黒 / 2行
 *   見出し行の幅 1300・右端に「もっと見る」（ExtraLight 16px ＋ 18px アイコン・間4）
 *   見出し → カルーセルの間 140px
 *   カード … 588 x 504（カンプ 586.73x504.38 を4の倍数に丸め）/ 枠線なし・角丸なし / 間 8px
 *   ホバー … 黒グラデ rgba(0,0,0,0.2)→0.8 / 余白 左右44・上下24
 *     小見出し「素朴なグルメ 03」ExtraLight 16px（cap詰め）/ 店名 Thin 28px (Title_28px) / 間8px
 *     もっと見る ExtraLight 16px 白 / 説明 ExtraLight 14px (Body_14px) 行間2 字間0.7px
 *   ※「もっと見る」はカンプ 17px → 偶数ルールで 16px に丸め（Body_16px に統一）
 *
 * 2026-08-22 改修（ヒデさん指示）
 *   ・白背景。ページを下に送るのではなく、スポットの5場面目として
 *     「場面ごとブラーで切り替わって」現れる（SpotShowcase の finale として描画）
 *   ・店名・説明文はカンプ 15421:23369 の実文言（4店ぶん）
 *   ・小見出しに「素朴なグルメ 01」のナンバリング
 *   ・出る順番：場面がブラーで替わる → 見出しの文字 → カルーセル
 *
 * 🟡仮置き
 *   ・カルーセルの速さ（1周40秒）はカンプに指定が無いため仮
 *   ・番号の表記はスポットの「ぼーっとスポット 01」に合わせて半角スペース入り
 */
import { motion } from "framer-motion";

type GourmetCard = {
  id: string;
  no: string;
  title: string;
  img: string;
  body: string;
};

/* 店名・説明文はカンプ 15421:23369 の実文言（左から順） */
const CARDS: GourmetCard[] = [
  {
    id: "yokoyama",
    no: "01",
    title: "横山蒲鉾店",
    img: "/img/gourmet-new-1.jpg",
    body: "近海で水揚げされるお魚と厳選された食材を使用し、手作りにこだわる小さなかまぼこ工場で作られるちぎり揚げが特に人気です。おかずに、おやつに食べやすい一口サイズが嬉しいですね。",
  },
  {
    id: "matsuo",
    no: "02",
    title: "松尾ジンギスカン 呼人支店",
    img: "/img/gourmet-new-2.jpg",
    body: "昭和45年創業。現在は札幌で積んだ3代目店主が切り盛りするジンギスカン店です。にんにく不使用の特製甘だれは、果物の自然な甘みが肉の旨味を引き立て、幅広い客層に支持されています。",
  },
  {
    id: "darumaya",
    no: "03",
    title: "ラーメンだるまや",
    img: "/img/gourmet-new-3.jpg",
    body: "2015年にオープンの人気ラーメン店。カウンター席、テーブル席、小上がり席を備え、お一人様からファミリー、女性グループなど幅広い客層に人気です。イチオシは、麺に絡みつくほど濃厚な醤油とんこつの「どろらーめん」です。",
  },
  {
    id: "tonton",
    no: "04",
    title: "酒縁酒場 屯々",
    img: "/img/gourmet-new-4.jpg",
    body: "2013年にオープンした居酒屋「屯々（とんとん）」。店名は「たむろ」と読む「屯」と、新しい扉を開くノックの音「トントン」に由来し、「人が集まり、ご縁やチャンスが生まれる場所」として「人との繋がり」を大切にしています。",
  },
];

function Card({ card }: { card: GourmetCard }) {
  return (
    <div className="group relative h-[504px] w-[588px] shrink-0 overflow-hidden">
      <img
        src={card.img}
        alt={card.title}
        className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />
      {/* ホバー：下から黒グラデがかかって文字が出る（既存カードと同じ言葉遣い） */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-black/20 to-black/80 px-11 py-6 opacity-0 transition-opacity duration-500 ease-standard group-hover:opacity-100">
        <div className="flex w-full translate-y-[18px] flex-col gap-4 opacity-0 transition-all delay-75 duration-500 ease-standard group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex w-full items-end justify-between">
            <div className="flex flex-col gap-2 leading-[1.2] text-white">
              <p className="whitespace-nowrap text-body-16 font-extralight [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                素朴なグルメ {card.no}
              </p>
              <p className="whitespace-nowrap text-title-28 font-thin">{card.title}</p>
            </div>
            {/* ホバー＝まるごと右へ10px（案1採用。2026-08-23 ヒデさん決定） */}
            <span className="flex shrink-0 cursor-pointer items-center gap-1 transition-transform duration-300 ease-standard hover:translate-x-[10px]">
              <span className="whitespace-nowrap text-body-16 font-extralight leading-[1.2] text-white">
                もっと見る
              </span>
              <img src="/img/icon-view-more.svg" alt="" className="size-[18px]" />
            </span>
          </div>
          <p className="w-full text-body-14 font-extralight leading-[2] tracking-[0.7px] text-white">
            {card.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GourmetSection() {
  return (
    /* 全画面の1場面（982の中に収まる）。スポットからブラーで切り替わって現れる。
       中身は「見出しの文字 → カルーセル」の順で出る（場面が出てから時間差） */
    <section
      id="gourmet"
      className="flex size-full flex-col justify-center bg-white pb-10 pt-6"
    >
      {/* 見出し行（幅1280・中央）。場面が替わってから一拍おいて出る */}
      <motion.div
        className="mx-auto flex w-[1300px] max-w-full items-end justify-between px-4"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0, y: 24, filter: "blur(14px)" },
          show: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.55 },
          },
        }}
      >
        <p className="whitespace-nowrap text-title-36 font-thin leading-[1.8] text-ink">
          なーんにもない、道東の土地、網走。
          <br />
          そこの味が沁みちゃうんです。
        </p>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="group flex cursor-pointer items-center gap-1 pb-2 transition-transform duration-300 ease-standard hover:translate-x-[10px]"
        >
          <span className="whitespace-nowrap text-body-16 font-extralight leading-[1.2] text-ink">
            もっと見る
          </span>
          {/* 黒シェブロン・線幅1.0（2026-08-22 ヒデさん指定。白版は線幅0.5のまま） */}
          <img src="/img/icon-view-more-black.svg" alt="" className="size-[18px]" />
        </a>
      </motion.div>

      {/* カルーセル：右から左へゆっくり流れ続ける。
          2セット並べて -50% まで動かすと、切れ目なく無限に回る */}
      <motion.div
        className="mt-[140px] w-full overflow-hidden"
        initial="hidden"
        animate="show"
        /* 文字よりさらに一拍あとに出る（場面 → 文字 → カルーセル の順） */
        variants={{
          hidden: { opacity: 0, y: 32, filter: "blur(16px)" },
          show: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 1.0 },
          },
        }}
      >
        <div className="gourmet-marquee flex w-max items-center gap-2 pr-2">
          {[...CARDS, ...CARDS].map((c, i) => (
            <Card key={`${c.id}-${i}`} card={c} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
