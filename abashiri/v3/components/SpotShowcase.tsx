"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * ぼーっとスポット（v1.2 / カンプ 15415:21494・写真の並びは 15212:24785）
 *
 * キービジュアルの真下。写真が全画面・固定で敷かれ、右下にすりガラスの説明パネル、
 * 左下に3枚のサムネイル（いま出ていないもの）。
 *
 * v1.2 の見せ方（2026-08-21 ヒデさん指示・同日改修）
 *   ・「1スクロールごと」に写真が次へ切り替わる（4枚 → 3回切り替わる）
 *   ・切替はブラーで確定。写真と右下のテキスト群は「同時に」ブラーで出入りする
 *     （テキストを遅らせる仕様は廃止）
 *   ・4枚目のあとは、下へスクロールで送るのではなく「場面ごとブラーで切替」。
 *     5場面目としてグルメ（白背景）がその場に現れる（2026-08-22 ヒデさん指示）
 *   ・サムネイルを押すと、その写真の位置までスクロールが飛ぶ
 *
 * 登場の仕方（従来どおり）
 *   スクロールし始めると KV の背景がブラーで奥へ引く。それと入れ替わりに、
 *   1枚目の写真がブラーから合ってくる（spotTransition.ts の①〜③）。
 *
 * カンプから取った数値（1512x982 ステージ上の px）
 *   すりガラスのパネル … (759, 684) 712x238 / 地 white 10% / backdrop-blur 65px
 *   サムネイル … (40, 805) 3枚 各 164.845x110.442 / 間 14.4px / 角丸なし
 */
import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  mergeSpotTransition,
  totalScroll,
  type SpotTransition,
} from "./spotTransition";

type Spot = {
  id: string;
  /** ナンバリング（小見出しに「ぼーっとスポット 01」と出す） */
  no: string;
  title: string;
  img: string;
  body: string;
};

/* 並び順・写真はカンプ 15212:24785 の左から。
   本文：01・02 はカンプの文言そのまま（2026-08-21 更新版）。
   03・04 はカンプ未記入のため、実在の情報をもとに同じくらいの文字数で
   Claude が作文した（🟡要確認。2026-08-22） */
const SPOTS: Spot[] = [
  {
    id: "notoro",
    no: "01",
    title: "能取岬",
    img: "/img/spot-notoro.jpg",
    body: "オホーツク海に突き出た岬で、突端には灯台と管理事務所があるだけ。ここから西方は能取湖と常呂町の海岸、北方はすべてオホーツク海、東方は遠く知床連山が眺められます。",
  },
  {
    id: "sango",
    no: "02",
    title: "能取湖サンゴ草群落地",
    img: "/img/spot-sangoso.jpg",
    body: "能取湖の南岸、卯原内に位置する「能取湖サンゴ草群生地」は、別名アッケシソウと呼ばれるサンゴ草の日本一を誇る群落地です。",
  },
  {
    id: "eki",
    no: "03",
    title: "網走駅",
    img: "/img/spot-eki.jpg",
    body: "石北本線と釧網本線が乗り入れる、オホーツクの玄関口。縦書きの駅名標には「人生を横道にそれず、まっすぐ歩んでほしい」という願いが込められていると伝わります。",
  },
  {
    id: "ryuhyo",
    no: "04",
    title: "流氷クルーズ",
    img: "/img/spot-ryuhyo.jpg",
    body: "冬のオホーツク海を埋め尽くす流氷は、はるかアムール川から流れ着く自然の贈りもの。砕氷船に乗れば、白い海原を割って進む音と揺れを全身で感じられます。",
  },
];

/* 写真とテキスト群を「同時に」ブラーで出し入れする（2026-08-21 ヒデさん確定） */
const SWITCH = {
  initial: { opacity: 0, filter: "blur(24px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(24px)" },
  transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] as const },
};

export default function SpotShowcase({
  scrollY,
  tune,
  finale,
}: {
  scrollY: MotionValue<number>;
  /** 入れ替わりのタイミング（spotTransition.ts / 右下パネルで調整） */
  tune?: Partial<SpotTransition> | null;
  /** 5場面目（グルメ）。写真と同じブラーで場面ごと切り替わる */
  finale?: React.ReactNode;
}) {
  const t = mergeSpotTransition(tune);
  /* 場面数 ＝ 写真4枚 ＋ グルメ */
  const sceneCount = SPOTS.length + (finale ? 1 : 0);

  /* いま何枚目か。spotTo（1枚目が晴れきる位置）から stepLen ごとに次へ */
  const [index, setIndex] = useState(0);
  useMotionValueEvent(scrollY, "change", (v) => {
    /* spotTo（1枚目が晴れきる）までは 0 枚目。
       そこから stepLen 進むごとに 1 → 2 → 3 枚目 */
    const idx =
      v < t.spotTo
        ? 0
        : Math.min(sceneCount - 1, Math.floor((v - t.spotTo) / t.stepLen));
    if (idx !== index) setIndex(idx);
  });
  /* 最後の場面（グルメ）かどうか。spot はグルメ中も最後の写真を指したままにする */
  const isFinale = finale != null && index === SPOTS.length;
  const spot = SPOTS[Math.min(index, SPOTS.length - 1)];
  /* サムネイルは「今出ていないもの」を並び順のまま3枚 */
  const thumbs = SPOTS.filter((_, i) => i !== index);

  /* KV の背景がブラーで奥へ引くのと入れ違いになるよう、
     こちらは同じ帯でブラーが晴れながら濃くなる＝クロスで入れ替わって見える */
  const opacity = useTransform(scrollY, [0, t.spotFrom, t.spotTo], [0, 0, 1]);
  const filter = useTransform(
    scrollY,
    [0, t.spotFrom, t.spotTo],
    [`blur(${t.spotBlur}px)`, `blur(${t.spotBlur}px)`, "blur(0px)"]
  );
  /* ほぼ晴れるまでは触れないようにして、KV のボタンを邪魔しない */
  const pointerEvents = useTransform(scrollY, (v) =>
    v > t.spotFrom + (t.spotTo - t.spotFrom) * 0.75 ? "auto" : "none"
  );

  /* サムネイルを押したら、その写真の位置までスクロールを送る */
  const jumpTo = (i: number) => {
    const sc = document.querySelector<HTMLElement>("[data-abashiri-scroller]");
    if (!sc) return;
    const target = i === 0 ? t.spotTo : t.spotTo + t.stepLen * i + 1;
    const step = () => {
      const dy = target - sc.scrollTop;
      if (Math.abs(dy) < 0.5) {
        sc.scrollTop = target;
        return;
      }
      sc.scrollTop += dy * 0.14;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    /* 高さ ＝ 画面ぶん(982) ＋ 総スクロール量（晴れるまで＋切替3回＋余韻）。
       内側が sticky なので、その間このセクションが画面に居座る＝全画面・固定で見える */
    <div
      /* ⚠️ pointer-events-none は必須。
         この入れ物は KV の上に重なる（DOM 順で後ろ＝手前に描かれる）ので、
         付け忘れると透明なまま KV の「ぼーっとしてみる」ボタンのクリックを
         飲み込んでしまう（v1.1 で実際に起きた） */
      className="pointer-events-none relative"
      style={{ marginTop: -982, height: 982 + totalScroll(t, sceneCount) }}
    >
      <motion.section
        id="spot"
        className="sticky top-0 h-[982px] w-full overflow-hidden"
        style={{ opacity, filter, pointerEvents }}
      >
        {/* 全画面の場面。1スクロールごとに次へ、ブラーで切替。
            写真1〜4枚目のあと、5場面目はグルメ（白背景）が同じ切替で現れる */}
        <AnimatePresence initial={false}>
          <motion.div
            key={isFinale ? "finale" : spot.id}
            className="absolute inset-0"
            initial={SWITCH.initial}
            animate={SWITCH.animate}
            exit={SWITCH.exit}
            transition={SWITCH.transition}
          >
            {isFinale ? (
              finale
            ) : (
              <img
                src={spot.img}
                alt={spot.title}
                className="size-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* すりガラスの説明パネル。カンプ 15152:29490。
            写真と「同時に」同じブラーで出入りする（遅れて出す仕様は廃止） */}
        <AnimatePresence initial={false}>
          {!isFinale && (
          <motion.div
            key={spot.id}
            className="absolute right-[41px] top-[684px] flex h-[238px] w-[712px] flex-col justify-center gap-6 bg-white/10 p-11 backdrop-blur-65"
            initial={SWITCH.initial}
            animate={SWITCH.animate}
            exit={SWITCH.exit}
            transition={SWITCH.transition}
          >
            <div className="flex w-full items-end gap-6">
              <div className="flex min-w-px flex-1 flex-col gap-2 font-thin leading-[1.2] text-white">
                <p className="whitespace-nowrap text-body-18 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  ぼーっとスポット {spot.no}
                </p>
                <p className="whitespace-nowrap text-title-36">{spot.title}</p>
              </div>
              <button
                type="button"
                className="flex shrink-0 cursor-pointer items-center gap-1 transition-opacity hover:opacity-70"
              >
                <span className="whitespace-nowrap text-right text-body-16 font-extralight leading-[1.2] text-white">
                  もっと見る
                </span>
                <img src="/img/icon-view-more.svg" alt="" className="size-[18px]" />
              </button>
            </div>
            <p className="w-full text-body-14 font-extralight leading-[2.2] tracking-[0.7px] text-white">
              {spot.body}
            </p>
          </motion.div>
          )}
        </AnimatePresence>

        {/* 左下のサムネイル。押すとその写真の位置までスクロールが飛ぶ。
            グルメ場面ではブラーで見送る */}
        <AnimatePresence initial={false}>
        {!isFinale && (
        <motion.div
          key="thumbs"
          className="absolute left-[40px] top-[805px] flex items-center gap-4"
          initial={SWITCH.initial}
          animate={SWITCH.animate}
          exit={SWITCH.exit}
          transition={SWITCH.transition}
        >
          {thumbs.map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => jumpTo(SPOTS.indexOf(th))}
              aria-label={th.title}
              className="h-[110.442px] w-[164.845px] cursor-pointer overflow-hidden transition-transform duration-500 ease-standard hover:scale-[1.03]"
            >
              <img src={th.img} alt={th.title} className="size-full object-cover" />
            </button>
          ))}
        </motion.div>
        )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
