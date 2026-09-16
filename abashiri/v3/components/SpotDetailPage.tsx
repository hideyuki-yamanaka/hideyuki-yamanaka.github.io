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
import {
  V11Margins,
  V12Vertical,
  V13Reel,
  V14Curtain,
  V15Zigzag,
  V16Swap,
  V17Centered,
  V18Mosaic,
  V19ZoomOut,
  V20TextFirst,
  V21SideHead,
  V22StickyHead,
  V23RightColumn,
  V24Indent,
  V25Rules,
} from "./SpotDetailVariants2";

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
  /* 2026-09-16 ヒデさん依頼で追加した10案（案11〜20）。
     「写真が6〜7割・ミニマル・余白を効かせる・写真がさきに目に入る」が共通の狙い。
     名前は【何を変えたか】が分かる言い方にしてある */
  11: {
    name: "案11 余白で読ませる",
    note: "レイアウトを変更。写真は全幅で大きく、文章は細い柱にして左へ。写真と写真の間をたっぷり空けて目を休ませる",
  },
  12: {
    name: "案12 縦書きの見出し",
    note: "文字組みを変更。名前と小見出しを縦書きにして写真の脇に立てる。本文は横書きのまま細い柱に",
  },
  13: {
    name: "案13 横に流れる写真",
    note: "インタラクションを変更。下へスクロールすると、貼りついた写真の列が横へ流れる。縦に読むのをやめて眺める時間を作る",
  },
  14: {
    name: "案14 写真が開く",
    note: "インタラクションを変更。写真が中央から上下に開いて現れる（幕が上がる感じ）。段落は写真のすぐ下に1つずつ",
  },
  15: {
    name: "案15 左右に組む",
    note: "レイアウトを変更。写真7割・文章3割で左右に組み、行ごとに向きを入れ替える",
  },
  16: {
    name: "案16 写真が入れ替わる",
    note: "見せ方を変更。背景の写真を貼りつけたまま、スクロールで入れ替える。写真の占有率がいちばん高い",
  },
  17: {
    name: "案17 中央の静けさ",
    note: "文字組みを変更。すべて中央揃えで字間を広く、文字は小さく。左右に均等な余白が残って静かになる",
  },
  18: {
    name: "案18 写真の格子",
    note: "レイアウトを変更。大小まぜた格子に写真を敷き詰める。一度に複数の写真が目に入る",
  },
  19: {
    name: "案19 引きで見せる",
    note: "インタラクションを変更。寄った写真から始まり、スクロールでゆっくり引いて全景になる",
  },
  20: {
    name: "案20 文字が先、写真が追う",
    note: "見せ方の順番を変更。短い文がさきに出て、少し遅れて写真が現れる",
  },
  /* 2026-09-16 追加の5案。「左に小さく見出し・右に本文」のように、
     余白の取り方そのものをデザインにした案 */
  21: {
    name: "案21 左に見出し、右に本文",
    note: "余白を生かしたレイアウト。小さな見出しを左の柱に、本文は右の細い柱に。間の余白をたっぷり取る",
  },
  22: {
    name: "案22 見出しが貼りつく",
    note: "余白＋インタラクション。本文を読んでいる間、左の小さな見出しが画面に貼りついたまま残る",
  },
  23: {
    name: "案23 右三分の一に本文",
    note: "余白の割り当てを変更。本文を右の1/3に寄せ、左の2/3は写真と余白のために空ける",
  },
  24: {
    name: "案24 余白が広がっていく",
    note: "段が進むほど本文が少しずつ右へ下がり、左の余白が育つ。写真も1枚ごとに右へ寄る",
  },
  25: {
    name: "案25 細い罫線で区切る",
    note: "文字組みを変更。段落の上に細い線を1本、その左に番号と小さな見出し。線と余白だけで整理する",
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
           v4: 案1/8/10 を残して初期3案を復活、他は削除（2026-09-15）
           v5: 案11〜20 を追加（2026-09-16・写真6〜7割のミニマル10案）
           v6: 案11〜20 のテンポをゆったりに＋余白を生かした案21〜25 を追加（2026-09-16） */
        version: 6,
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
                note: "詳細ページ（テンプレ）のデザイン＋スクロール演出。案1〜4・8・10 はこれまでの案、案11〜20 は 2026-09-16 に足した10案（写真が6〜7割・余白を効かせたミニマル）。案21〜25 は余白の取り方そのものをデザインにした5案。名前のうしろが【何を変えたか】です。番号は選定時の呼び方のままなので 5〜7・9 は欠番です。",
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
    11: V11Margins,
    12: V12Vertical,
    13: V13Reel,
    14: V14Curtain,
    15: V15Zigzag,
    16: V16Swap,
    17: V17Centered,
    18: V18Mosaic,
    19: V19ZoomOut,
    20: V20TextFirst,
    21: V21SideHead,
    22: V22StickyHead,
    23: V23RightColumn,
    24: V24Indent,
    25: V25Rules,
  };
  const V = MAP[pattern] ?? V1Parallax;
  return <V key={pattern} spot={spot} />;
}
