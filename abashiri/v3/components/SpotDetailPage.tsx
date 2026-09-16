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
  V3Editorial,
} from "./SpotDetailVariants";
import {
  V11Margins,
  V12Vertical,
  V13Reel,
  V16Swap,
  V18Mosaic,
  V19ZoomOut,
  V20TextFirst,
  V22StickyHead,
  V23RightColumn,
  V24Indent,
} from "./SpotDetailVariants2";
import {
  V26Dissolve,
  V27SideQuiet,
  V28BigHead,
  V29RuleColumns,
  V30Numbered,
  V31Hanging,
  V32TocSlide,
  V33TocRule,
  V34TocInk,
  V35TocDot,
  V36TocNum,
  V37PinnedBlur,
} from "./SpotDetailVariants3";

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
  3: {
    name: "案3",
    note: "白エディトリアル。縦書きの名前＋2カラム、基本情報が右に追従（初期案を復活）",
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
  16: {
    name: "案16 写真が入れ替わる",
    note: "見せ方を変更。背景の写真を貼りつけたまま、スクロールで入れ替える。写真の占有率がいちばん高い",
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
  /* ═══ 2026-09-16 ヒデさん依頼の追加12案（案26〜37）═══
     26        サムネイルがグラデで白い解説の面に溶ける
     27〜31    見出しを付けて「左に見出し・右に本文」。色は使わず罫線と余白だけ
     32〜36    左カラムの目次がスクロール位置に反応する
     37        全画面サムネ → 裏がぼけて白いコンテンツへ */
  26: {
    name: "案26 グラデで白へ",
    note: "サムネイルと本文の境目を変更。写真の下側がそのまま白へ溶けて、どこからが解説か分からないくらいなだらかに本文へ入る（フッターのグラデ案と同じ考え方）",
  },
  27: {
    name: "案27 見出しを離す",
    note: "左右の余白を変更。左の小さな見出しと右の本文を140px離す。目は自然と本文へ行き、見出しは「しおり」として残る",
  },
  28: {
    name: "案28 見出しを大きく",
    note: "文字の大きさの関係を変更。左の見出しを28pxの細見出しにして主役に、本文の柱は460pxまで細くする",
  },
  29: {
    name: "案29 罫線で2カラム",
    note: "カラムの表し方を変更。左右の間に縦の罫線を1本だけ通し、見出しをその線へ右揃え。色は足さず線と余白だけでカラムにする",
  },
  30: {
    name: "案30 番号と横罫線",
    note: "見出しの持ち方を変更。左の柱に01/02/03の番号と見出しを置き、区切りは横に長い罫線だけ。目次のような読み心地",
  },
  31: {
    name: "案31 見出しがぶら下がる",
    note: "見出しの置き方を変更。本文の柱は中央に据えたまま、見出しだけ左の余白へぶら下げる。写真は本文より外へ広がる",
  },
  32: {
    name: "案32 目次が右へずれる",
    note: "左カラムに目次を追加。いま読んでいる項目が10px右へ動く",
  },
  33: {
    name: "案33 目次の罫線が伸びる",
    note: "左カラムに目次を追加。いま読んでいる項目の短い罫線が12px→48pxに伸びる",
  },
  34: {
    name: "案34 目次が濃くなる",
    note: "左カラムに目次を追加。いま読んでいる項目だけ文字が濃くなり、字間がわずかに開く",
  },
  35: {
    name: "案35 印がレールを滑る",
    note: "左カラムに目次を追加。目次の左のレールを、小さな印がスクロールに合わせて滑り降りる",
  },
  36: {
    name: "案36 目次の番号が育つ",
    note: "左カラムに目次を追加。いま読んでいる項目の通し番号が12px→18pxに大きくなる",
  },
  37: {
    name: "案37 ぼかして白へ",
    note: "最初は画面いっぱいの写真＋左下に名前。スクロールすると写真が貼りついたままぼけて遠のき、白いコンテンツの面がグラデを先頭に乗り上げる",
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
           v6: 案11〜20 のテンポをゆったりに＋余白を生かした案21〜25 を追加（2026-09-16）
           v7: ヒデさんの選定で 案2・4・8・10・14・15・17・21・25 を完全削除（2026-09-16）
           v8: 案26〜37 を追加（2026-09-16・グラデ移行／左見出し5案／目次連動5案／全画面ぼかし） */
        version: 8,
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
                note: "詳細ページ（テンプレ）のデザイン＋スクロール演出。案1〜4・8・10 はこれまでの案、案11〜20 は 2026-09-16 に足した10案（写真が6〜7割・余白を効かせたミニマル）。案21〜25 は余白の取り方そのものをデザインにした5案。名前のうしろが【何を変えたか】です。案26 はサムネがグラデで白へ溶ける案、案27〜31 は見出しを付けて左右に組んだ余白の案（色は使わず罫線と余白だけ）、案32〜36 は左の目次がスクロールに反応する案、案37 は全画面写真がぼけて白へ移る案です。番号は選定時の呼び方のままなので 2・4〜10・14・15・17・21・25 は欠番です。",
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
    3: V3Editorial,
    11: V11Margins,
    12: V12Vertical,
    13: V13Reel,
    16: V16Swap,
    18: V18Mosaic,
    19: V19ZoomOut,
    20: V20TextFirst,
    22: V22StickyHead,
    23: V23RightColumn,
    24: V24Indent,
    26: V26Dissolve,
    27: V27SideQuiet,
    28: V28BigHead,
    29: V29RuleColumns,
    30: V30Numbered,
    31: V31Hanging,
    32: V32TocSlide,
    33: V33TocRule,
    34: V34TocInk,
    35: V35TocDot,
    36: V36TocNum,
    37: V37PinnedBlur,
  };
  const V = MAP[pattern] ?? V1Parallax;
  return <V key={pattern} spot={spot} />;
}
