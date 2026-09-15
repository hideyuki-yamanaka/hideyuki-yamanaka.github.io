"use client";

/*
 * ぼーっとスポット詳細ページ（テンプレ・V3.0）
 *
 * ・データは spotDetailData.ts（CMS のつもり）。ページはデータの型しか知らない
 * ・見せ方は SpotDetailVariants.tsx の5案。右下の調整パネルで切り替える
 *   （2026-09-15 ヒデさん依頼で、旧3案を廃止して写真主体の5案に作り直し）
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SPOT_DETAILS } from "./spotDetailData";
import {
  V1Parallax,
  V2Crossfade,
  V3Gallery,
  V4Minimal,
  V5Window,
  V6PhotoOnly,
  V7Reveal,
  V8SplitSticky,
  V9Stack,
  V10BigQuiet,
} from "./SpotDetailVariants";

/* tune-panel.js（依存ゼロの素のJS）の必要なところだけの型 */
type PanelLib = {
  create: (cfg: Record<string, unknown>) => { destroy: () => void };
};

export const SPOT_DETAIL_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  1: {
    name: "案1",
    note: "パララックス没入。写真がゆっくり奥へ引き、白い本文の面がせり上がる",
  },
  2: {
    name: "案2",
    note: "背景クロスフェード。ずっと全画面写真の中。文章は右の列を流れる",
  },
  3: {
    name: "案3",
    note: "横に流れるギャラリー。途中で縦スクロールが横の写真送りになる",
  },
  4: {
    name: "案4",
    note: "余白ミニマル。白地に大きな写真を1枚ずつ。間をたっぷり取る",
  },
  5: {
    name: "案5",
    note: "窓がひらく。小さな窓が全画面へ広がり、景色の中に入っていく",
  },
  /* ここから下は「写真が主役・動きはその下支え」で作った5案（2026-09-15 追加） */
  6: {
    name: "案6",
    note: "写真だけで語る。全画面の写真が続き、文字は短く挟まるだけ",
  },
  7: {
    name: "案7",
    note: "写真がひらく。細い帯から上下に開いて、写真が大きく現れる",
  },
  8: {
    name: "案8",
    note: "写真は貼り付いたまま。左に写真、右の文章だけが流れ、章ごとに写真が替わる",
  },
  9: {
    name: "案9",
    note: "重なって送られる。全画面の写真が次々に覆いかぶさる",
  },
  10: {
    name: "案10",
    note: "大きな一枚を静かに。白い余白に大きな写真、文字は縦書きで小さく添える",
  },
};

export default function SpotDetailPage({ slug }: { slug: string }) {
  const spot = SPOT_DETAILS[slug];
  const [pattern, setPattern] = useState(1);
  const madeRef = useRef(false);

  /* 右下の調整パネル（tune-panel.js）。案の切替だけの小さいパネル */
  useEffect(() => {
    if (madeRef.current) return;
    let panel: { destroy: () => void } | null = null;
    const params = { detail: { pattern: 1 } };

    const build = () => {
      const lib = (window as unknown as { TunePanel?: PanelLib }).TunePanel;
      if (!lib || madeRef.current) return;
      madeRef.current = true;
      panel = lib.create({
        title: "⚙️ スポット詳細 調整パネル",
        storageKey: "abashiri-spot-detail-tune",
        /* ⚠️ 案を入れ替えたら必ず上げる（古い保存値が自動で捨てられる）。
           v2: 旧3案 → 5案に作り直し
           v3: 写真主体の案6〜10を追加・案1の視差を弱めた（2026-09-15） */
        version: 3,
        startClosed: true,
        position: { right: 20, bottom: 20 },
        params,
        defaults: structuredClone(params),
        schema: [
          {
            cat: "📍 スポット詳細",
            open: true,
            items: [
              {
                note: "詳細ページ（テンプレ）のデザイン＋スクロール演出。案1〜5は最初に作った版（案1の視差は弱めました）、案6〜10は「写真が引き立ち、動きがそれを下支えする」方向で作り直した版です。",
              },
              {
                pills: "デザインと動きの案",
                path: "detail.pattern",
                immediate: true,
                options: Object.entries(SPOT_DETAIL_PATTERNS).map(([v, p]) => ({
                  name: p.name,
                  value: Number(v),
                  swatch: "#0070c9",
                  desc: p.note,
                })),
              },
            ],
          },
        ],
        onChange: () => setPattern(params.detail.pattern),
        onSettle: () => setPattern(params.detail.pattern),
      });
      setPattern(params.detail.pattern);
    };

    if ((window as unknown as { TunePanel?: PanelLib }).TunePanel) build();
    else {
      const s = document.createElement("script");
      s.src = "/tune-panel.js";
      s.onload = build;
      document.head.appendChild(s);
    }
    return () => panel?.destroy();
  }, []);

  if (!spot) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white text-ink">
        <p className="text-title-28 font-thin">このスポットはまだ準備中です</p>
        <Link href="/" className="text-body-16 font-light text-brand underline">
          トップへ戻る
        </Link>
      </main>
    );
  }

  /* 案ごとにスクロール容器そのものが変わるので、key で作り直す */
  const MAP: Record<number, (p: { spot: typeof spot }) => React.ReactElement> = {
    1: V1Parallax,
    2: V2Crossfade,
    3: V3Gallery,
    4: V4Minimal,
    5: V5Window,
    6: V6PhotoOnly,
    7: V7Reveal,
    8: V8SplitSticky,
    9: V9Stack,
    10: V10BigQuiet,
  };
  const V = MAP[pattern] ?? V1Parallax;
  return <V key={pattern} spot={spot} />;
}
