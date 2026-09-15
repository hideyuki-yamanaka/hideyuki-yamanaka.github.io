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
           v2: 旧3案 → 写真主体の5案に作り直し（2026-09-15） */
        version: 2,
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
                note: "詳細ページ（テンプレ）のデザイン＋スクロール演出の5案。選ぶとその場で切り替わります。どれも写真が主役で、ゆっくり眺める速さにしてあります。",
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
  const V =
    pattern === 2
      ? V2Crossfade
      : pattern === 3
        ? V3Gallery
        : pattern === 4
          ? V4Minimal
          : pattern === 5
            ? V5Window
            : V1Parallax;
  return <V key={pattern} spot={spot} />;
}
