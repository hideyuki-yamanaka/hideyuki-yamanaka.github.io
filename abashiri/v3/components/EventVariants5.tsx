"use client";

/*
 * 体験セクション｜奥行きのある3Dカルーセル（案34）
 *
 * 2026-09-17 大改修。カルーセルの中身は components/Carousels.tsx に一本化した。
 * ここは「本番のデータを渡し、スクロール連動にする」ための入口。
 *   ⚠️ 以前はこのファイルにも同じ実装のコピーがあり、
 *      Carousels.tsx だけ直すと本番が古いままになる状態だった。同じものを2か所に持たない。
 *
 * 【2026-09-17 ヒデさん指示】
 *   「1枚目から4枚目までスクロールすると、右から左に画像が切り替わるようになっていて、
 *     4枚目まで見たら下に行けるようにしてほしい」
 *   → 案34 は画面を固定（PinStage）して、固定している間の進み具合で
 *     1枚目→4枚目まで送る。送り終わると固定が外れて下へ進める。
 *   「写真の比率も切り替えられるように。4:3、3:4 とかのバリエーションで」
 *   → 調整パネルの「カードの縦横比」で切り替える（下の RATIOS）
 */
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { Carousel3D, type CarouselItem } from "./Carousels";
import { ITEMS, PinStage, afterHold } from "./eventParts";

export const EVENT_RATIO_EVENT = "abashiri:event-card-ratio";

/** 選べるカードの縦横比（幅÷高さ）。調整パネルの並びと同じ順番 */
export const CARD_RATIOS: { name: string; value: number }[] = [
  { name: "2:3 たて長（既定）", value: 420 / 610 },
  { name: "3:4 たて長ひかえめ", value: 3 / 4 },
  { name: "1:1 正方形", value: 1 },
  { name: "4:3 よこ長", value: 4 / 3 },
  { name: "16:9 よこ長つよめ", value: 16 / 9 },
];
export const DEFAULT_CARD_RATIO = 0;

export const EVENT_3D_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  34: {
    name: "案34 奥行きの3Dカルーセル",
    note: "閉じた円環にカードが並び、中央が正面・左右は中央寄りの辺を手前にして奥へ回り込む。画面が固定され、スクロールすると写真が右から左へ1枚ずつ切り替わり、4枚目まで見ると下へ進めます。カードの縦横比は下のつまみで変えられます",
  },
};

/** 体験セクションのデータを、カルーセルが読める形にそろえる（写真も説明もそのまま） */
const CARDS: CarouselItem[] = ITEMS.map((it) => ({
  no: it.no,
  tag: it.tag,
  title: it.title,
  body: it.body,
  img: it.img,
  href: `/spot/${it.slug}`,
}));

/** 3Dカルーセル案の大見出し。
    【2026-09-17 ヒデさん指示】「見出しを中央に持ってきて。フォントサイズもアップ」
    → 中央ぞろえ＋ふだんの大見出し（--sec-head）の1.6倍 */
function CenterTitle() {
  return (
    <h2 className="px-6 text-center text-[length:calc(var(--sec-head,36px)*1.6)] font-thin leading-[1.5] text-ink">
      意外とオモロい、網走。
    </h2>
  );
}

/* ⚠️ 調整パネルは「案を34に切り替える」イベントと「縦横比」のイベントを
   同じタイミングで投げる。案が34になって初めてこの部品が現れるので、
   自分が生まれた時にはもう比率のイベントが流れ終わっている（取りこぼす）。
   → モジュールの側で最後の値を覚えておき、生まれた時にそこから読む
   （2026-09-17 実測：パネルは 4:3 なのにカードが 2:3 のままだった） */
let lastRatioIndex = DEFAULT_CARD_RATIO;
if (typeof window !== "undefined") {
  window.addEventListener(EVENT_RATIO_EVENT, (e) => {
    const v = (e as CustomEvent<{ v: number }>).detail?.v;
    if (typeof v === "number" && CARD_RATIOS[v]) lastRatioIndex = v;
  });
}

/** 調整パネルで選んだ縦横比を受け取る */
function useCardRatio() {
  const [i, setI] = useState(lastRatioIndex);
  /* ⚠️ 焼き込みファイルの読み込みは非同期。パネル（ブラウザの保存値）が
     先に届いていたのに、あとから焼き込みの値で【上書きしてしまう】競合があった
     （2026-09-17 実測：パネルは 4:3 なのに 2:3 に戻る）。
     パネルから届いたら、焼き込みはもう当てない */
  const fromPanel = useRef(lastRatioIndex !== DEFAULT_CARD_RATIO);
  useEffect(() => {
    /* 生まれる前に流れていた値を拾う */
    if (lastRatioIndex !== i) {
      fromPanel.current = true;
      setI(lastRatioIndex);
    }
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (fromPanel.current) return;
        const v = d?.events?.cardRatio;
        if (typeof v === "number" && CARD_RATIOS[v]) setI(v);
      })
      .catch(() => {});
    const on = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number" && CARD_RATIOS[v]) {
        fromPanel.current = true;
        lastRatioIndex = v;
        setI(v);
      }
    };
    window.addEventListener(EVENT_RATIO_EVENT, on);
    return () => window.removeEventListener(EVENT_RATIO_EVENT, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return CARD_RATIOS[i]?.value ?? CARD_RATIOS[0].value;
}

/** 貼りついている間の進み具合（MotionValue）を、毎フレーム読める ref に橋渡しする。
    ⚠️ state にすると1フレームごとに React が描き直しになるので ref で渡す */
function Pinned3D({ q, ratio }: { q: MotionValue<number>; ratio: number }) {
  const p = afterHold(q, 0.12, 0.9);
  const progress = useRef(0);
  progress.current = p.get();
  useMotionValueEvent(p, "change", (v) => {
    progress.current = v;
  });
  return (
    /* ⚠️ 見出しも貼りつく中へ入れる。外に置くと、固定している間に
       画面の上へ流れて見えなくなる（2026-09-17 実測） */
    <div className="flex size-full flex-col justify-center gap-8">
      <CenterTitle />
      <Carousel3D items={CARDS} progress={progress} ratio={ratio} heading={false} />
    </div>
  );
}

/** 案34・35 の入口。EventSection から番号で呼ばれる */
export function ExtraPattern5({ pat }: { pat: number; p: MotionValue<number> }) {
  const ratio = useCardRatio();
  if (pat === 34) {
    return (
      /* 4枚ぶん送るのに必要な長さ。送り終わると固定が外れて下へ進める */
      <PinStage length={3.4}>{(q) => <Pinned3D q={q} ratio={ratio} />}</PinStage>
    );
  }
  return null;
}
