"use client";

/*
 * 体験セクション｜奥行きのある3Dカルーセル 2案（案34・35 ＝ パネル表示では案12・13）
 *
 * 2026-09-17 大改修。中身は components/Carousels.tsx に一本化した。
 * ここは「本番のデータ（eventParts の ITEMS）を渡すだけ」の薄い入口。
 *   ⚠️ 以前はこのファイルにも同じ実装のコピーがあり、
 *      Carousels.tsx だけ直すと本番が古いままになる状態だった。
 *      同じものを2か所に持たない。
 *
 * 直した中身（詳しくは Carousels.tsx の先頭コメント）
 *   ・閉じた円環（x=R sinθ / z=R(cosθ−1) / rotateY=θ）で配置と姿勢を一貫させた
 *   ・前面カードは不透明・原寸。奥行きは Z と perspective で作る
 *   ・湾曲は弧の長さを保つ式に。写真は cover 相当の UV 補正で比率を守る
 *   ・ドラッグ／リリース／停止を分け、速度は差分÷時間。dt で慣性を正規化
 *   ・入れ物の幅から寸法を計算。静止中・画面外では描画しない
 */
import { Carousel3D, CarouselBend, type CarouselItem } from "./Carousels";
import { ITEMS } from "./eventParts";
import type { MotionValue } from "framer-motion";

export const EVENT_3D_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  34: {
    name: "案34 奥行きの3Dカルーセル",
    note: "閉じた円環にカードが並び、中央が正面・左右は中央寄りの辺を手前にして奥へ回り込む。中央の後ろからも一部が覗く。ドラッグ／スワイプ／横ホイール／←→キーで回せて、離すと勢いを見込んだ位置へ吸い込まれるように止まる（CSSの3D変形）",
  },
  35: {
    name: "案35 湾曲するカルーセル",
    note: "斜めから見た円筒に、面そのものが湾曲したカードが並ぶ。ドラッグやホイールで流れ、離すと慣性で自然に減速する（Three.js／WebGL。頂点を実際に曲げていて、写真の比率は崩れない）",
  },
};

/** 体験セクションのデータを、カルーセルが読める形にそろえる */
const CARDS: CarouselItem[] = ITEMS.map((it) => ({
  no: it.no,
  tag: it.tag,
  title: it.title,
  img: it.img,
  href: `/spot/${it.slug}`,
}));

/** 案34・35 の入口。EventSection から番号で呼ばれる。
    ⚠️ この2案はスクロール連動ではなく「自分で操作する」カルーセルなので p は使わない */
export function ExtraPattern5({ pat }: { pat: number; p: MotionValue<number> }) {
  switch (pat) {
    case 34:
      return <Carousel3D items={CARDS} />;
    case 35:
      return <CarouselBend items={CARDS} />;
    default:
      return null;
  }
}
