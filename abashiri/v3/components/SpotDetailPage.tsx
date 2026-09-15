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
  V2Hero,
  V3Editorial,
  V4SkyGlass,
  V8SplitSticky,
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
  /* 2026-09-15 ヒデさん選定で 案1 / 案8 / 案10 を残し、
     最初に作った3案（全画面ヒーロー・白エディトリアル・空グラデ没入）を
     案2〜4 として復活。それ以外は削除。
     ⚠️ 番号は選定時の呼び方に合わせて 1・8・10 をそのまま維持している */
  1: {
    name: "案1",
    note: "パララックス没入。写真がゆっくり奥へ引き、白い本文の面がせり上がる",
  },
  2: {
    name: "案2",
    note: "全画面ヒーロー。写真に浸ってから白地で読む（初期案を復活）",
  },
  3: {
    name: "案3",
    note: "白エディトリアル。縦書きの名前＋2カラム、基本情報が右に追従（初期案を復活）",
  },
  4: {
    name: "案4",
    note: "空グラデ没入。体験ページと同じ青の世界＋白枠の窓（初期案を復活）",
  },
  8: {
    name: "案8",
    note: "ファーストビューがブラーで切り替わり、左に写真・右に文章の2カラムへ",
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
           v3: 写真主体の案6〜10を追加・案1の視差を弱めた
           v4: 案1/8/10 を残して初期3案を復活、他は削除（2026-09-15） */
        version: 4,
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
                note: "詳細ページ（テンプレ）のデザイン＋スクロール演出。選んだ案1・案8・案10 と、最初に作った3案（案2〜4）を残しています。番号は選定時の呼び方のままなので、5〜7・9 は欠番です。",
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
    2: V2Hero,
    3: V3Editorial,
    4: V4SkyGlass,
    8: V8SplitSticky,
    10: V10BigQuiet,
  };
  const V = MAP[pattern] ?? V1Parallax;
  return <V key={pattern} spot={spot} />;
}
