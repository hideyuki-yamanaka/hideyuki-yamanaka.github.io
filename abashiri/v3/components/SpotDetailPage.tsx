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
import { GOURMET_DETAILS } from "./gourmetDetailData";
import {
  V1Parallax,
  V3Editorial,
} from "./SpotDetailVariants";
import {
  V32TocSlide,
  V35TocDot,
  V36TocNum,
  V40HeroDissolve,
  V37PinnedBlur,
  V38Grid,
  V39FarHead,
} from "./SpotDetailVariants3";

/* tune-panel.js（依存ゼロの素のJS）の必要なところだけの型 */
type PanelLib = {
  create: (cfg: Record<string, unknown>) => { destroy: () => void; sync?: () => void };
};

export const SPOT_DETAIL_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  /* 2026-09-15 ヒデさん選定で 案1 / 案8 / 案10 を残し、
     最初に作った3案（全画面ヒーロー・白エディトリアル・空グラデ没入）を
     案2〜4 として復活。それ以外は削除。
     ⚠番号は選定時の呼び方に合わせて 1・8・10 をそのまま維持している */
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
  /* 2026-09-16 追加の5案。「左に小さく見出し・右に本文」のように、
     余白の取り方そのものをデザインにした案 */
  /* ═══ 2026-09-16 ヒデさん依頼の追加12案（案26〜37）═══
     26        サムネイルがグラデで白い解説の面に溶ける
     27〜31    見出しを付けて「左に見出し・右に本文」。色は使わず罫線と余白だけ
     32〜36    左カラムの目次がスクロール位置に反応する
     37        全画面サムネ → 裏がぼけて白いコンテンツへ */
  32: {
    name: "案32 目次が右へずれる",
    note: "左カラムに目次を追加。いま読んでいる項目が10px右へ動く",
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
  /* ═══ 2026-09-16 ヒデさん依頼「案11 みたいなのをあと3案」═══
     見出しと本文・写真の【置き場所】と【間】を変えた3案 */
  38: {
    name: "案38 グリッドに乗せる",
    note: "置き場所の決め方を変更。見出し・本文・写真を12列の見えない格子に乗せ、写真ごとにまたぐ列をずらす。バラバラに見えて実はそろっている",
  },
  39: {
    name: "案39 見出しをうんと離す",
    note: "見出しと本文の間を変更。見出しを先に大きく置いて、画面の半分ぶん空けてから本文が来る。間そのものが息を吸う場所になる",
  },
  40: {
    name: "案40 写真がぼけて白になじむ",
    note: "写真から白への渡り方ちがい。白い面をかぶせるのではなく、貼りついた写真そのものがぼけながら白くなって、白い本文の面へそのまま溶ける",
  },
};

export default function SpotDetailPage({ slug }: { slug: string }) {
  /* ぼーっとスポット／体験と、素朴なグルメを同じテンプレで出す
     （2026-09-20 ヒデさん指示「グルメも同じテンプレのフォーマットの詳細ページでOK」）。
     slug は両方あわせて重複が無いので、まとめて引ける */
  const spot = SPOT_DETAILS[slug] ?? GOURMET_DETAILS[slug];
  const [pattern, setPattern] = useState(1);
  const madeRef = useRef(false);

  /* 右下の調整パネル（tune-panel.js）。案の切替だけの小さいパネル */
  useEffect(() => {
    if (madeRef.current) return;
    let panel: { destroy: () => void; sync?: () => void } | null = null;

    /* 文字の大きさは CSS 変数で持つ（つまみを動かすたびに React を描き直さないため）。
       値の住み家：①globals.css の :root ②ここの params ③ブラウザ保存
       ——3つとも同じ数にしておくこと。

       【2026-09-16 ヒデさん指示】「各案で個別に設定できるように。連動しない」
       → 案ごとの値を sizes に持つ。つまみ（headSize / bodySize）は
         「いま選んでいる案の値」を映す窓で、動かすと sizes の その案の欄だけ書き換わる。
         案を切り替えると、その案がおぼえている値をつまみへ読み戻す。 */
    const SIZE0 = { head: 26, body: 15 };
    const sizes: Record<string, { head: number; body: number }> = {};
    Object.keys(SPOT_DETAIL_PATTERNS).forEach((k) => {
      sizes[k] = { ...SIZE0 };
    });
    const params = {
      /* 【2026-09-24 ヒデさん指示】「ブラーで白くなる案を採用していきたい」
         → 既定を値40（写真そのものがぼけて白くなり、白い本文へ溶ける）に。
           それまでの既定は値36（白い面が写真の手前に乗り上げる）。
         ⚠️ 既定を変えたら version も上げる。上げないと、前の案を
            おぼえているブラウザ（＝ヒデさんの手元）では変わらない */
      detail: {
        pattern: 40,
        headSize: SIZE0.head,
        bodySize: SIZE0.body,
        sizes,
        /* 写真から本文への渡り。単位は「画面の高さの何%」。
           住み家は globals.css の :root とここの2つ（同じ数にしておくこと） */
        fv: { pc: 88, sp: 52 },
        fade: { pc: 12, sp: 8 },
      },
    };
    const applyType = () => {
      const r = document.documentElement;
      r.style.setProperty("--dt-head", params.detail.headSize + "px");
      r.style.setProperty("--dt-body", params.detail.bodySize + "px");
      /* 写真から本文への渡り。PC とスマホで別々に持つ
         （画面の広さで気持ちのいい長さが違うため） */
      r.style.setProperty("--dt-fv-pc", String(params.detail.fv.pc));
      r.style.setProperty("--dt-fade-pc", String(params.detail.fade.pc));
      r.style.setProperty("--dt-fv-sp", String(params.detail.fv.sp));
      r.style.setProperty("--dt-fade-sp", String(params.detail.fade.sp));
    };
    /* つまみ → その案の欄へ書き戻す */
    const rememberSize = () => {
      const k = String(params.detail.pattern);
      params.detail.sizes[k] = {
        head: params.detail.headSize,
        body: params.detail.bodySize,
      };
    };
    /* その案の欄 → つまみへ読み戻す */
    const recallSize = () => {
      const k = String(params.detail.pattern);
      const v = params.detail.sizes[k] ?? SIZE0;
      params.detail.headSize = v.head;
      params.detail.bodySize = v.body;
      panel?.sync?.();
    };

    const build = () => {
      const lib = (window as unknown as { TunePanel?: PanelLib }).TunePanel;
      if (!lib || madeRef.current) return;
      madeRef.current = true;
      panel = lib.create({
        title: "調整パネル", /* 2026-09-20 anyflow と同じ名称にそろえる */
        storageKey: "abashiri-spot-detail-tune",
        /* ⚠案を入れ替えたら必ず上げる（古い保存値が自動で捨てられる）。
           v2: 旧3案 → 5案に作り直し
           v3: 写真主体の案6〜10を追加・案1の視差を弱めた
           v4: 案1/8/10 を残して初期3案を復活、他は削除（2026-09-15）
           v5: 案11〜20 を追加（2026-09-16・写真6〜7割のミニマル10案）
           v6: 案11〜20 のテンポをゆったりに＋余白を生かした案21〜25 を追加（2026-09-16）
           v7: ヒデさんの選定で 案2・4・8・10・14・15・17・21・25 を完全削除（2026-09-16）
           v8: 案26〜37 を追加（2026-09-16・グラデ移行／左見出し5案／目次連動5案／全画面ぼかし）
           v9: ヒデさんの選定で 案13・19・24・27・28・29・30 を完全削除（2026-09-16）
           v10: 本文・見出しの大きさのつまみを追加（2026-09-16）
           v11: 案11 の系統をもう3案（案38〜40）追加（2026-09-16）
           v12: ヒデさんの選定で 案11・16・18・20・22・23・31・34・40 を完全削除（2026-09-16）
           v13: 文字の大きさを案ごとに別々に持つようにした（2026-09-16）
           v14: ヒデさんの選定で 案12・26・33 を完全削除（2026-09-17）
           v15: 既定を案5(値36)に変更（2026-09-20） */
        version: 16, /* 2026-09-24 既定をブラー案(値40)に変更＋渡りのつまみを追加。古い保存値を破棄する */
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
                note: "詳細ページ（テンプレ）のデザイン＋スクロール演出。いま残っているのは17案です。案1・3 は最初からの案、案11〜23 は写真が6〜7割のミニマル、案26 はサムネがグラデで白へ溶ける案、案31 は左に見出し・右に本文（色は使わず罫線と余白だけ）、案32〜36 は左の目次がスクロール位置に反応する案、案37 は全画面写真がぼけて白へ移る案、案38〜40 は案11（余白で読ませる）の系統で見出しと本文の置き場所・間を変えた3案。名前のうしろが【何を変えたか】です。番号は選定時の呼び方のままなので欠番があります。"
              },
              {
                pills: "デザインと動きの案",
                path: "detail.pattern",
                immediate: true,
                /* 案を消したら、残った数に応じて 案1 から振り直す（2026-09-16 ヒデさん指示） */
                autoNum: "案",
                options: Object.entries(SPOT_DETAIL_PATTERNS).map(([v, p]) => ({
                  name: p.name,
                  value: Number(v),
                  swatch: "#0070c9",
                  desc: p.note,
                })),
              },
            ],
          },
          {
            cat: "📐 写真から本文への渡り",
            open: true,
            items: [
              {
                note: "ファーストビューの写真から、白い本文へ移るまでの長さ。【ブラー案（写真がぼけて白になじむ）だけに効きます】。短くするほど早く本文が読めます。⚠️「写真の高さ」＋「渡る長さ」が 100 を下回ると、止まっている時点で画面の下に白い帯が見えます。",
              },
              { sub: "パソコン", deep: true },
              {
                slider: "写真の高さ",
                path: "detail.fv.pc",
                min: 70,
                max: 100,
                step: 1,
                unit: "%",
                immediate: true,
              },
              {
                slider: "渡る長さ",
                path: "detail.fade.pc",
                min: 4,
                max: 40,
                step: 1,
                unit: "%",
                immediate: true,
              },
              { sub: "スマホ", deep: true },
              {
                slider: "写真の高さ",
                path: "detail.fv.sp",
                min: 40,
                max: 100,
                step: 1,
                unit: "%",
                immediate: true,
              },
              {
                slider: "渡る長さ",
                path: "detail.fade.sp",
                min: 4,
                max: 40,
                step: 1,
                unit: "%",
                immediate: true,
              },
            ],
          },
          {
            cat: "🔠 文字の大きさ",
            open: true,
            items: [
              {
                note: "本文と見出しの大きさ。行間は倍率で持っているので、大きさを変えると行間も一緒に動きます。【案ごとに別々の値を持ちます】。案を切り替えると、その案でいじった値に戻ります（他の案には影響しません）。",
              },
              {
                slider: "本文の大きさ",
                path: "detail.bodySize",
                min: 12,
                max: 20,
                step: 0.5,
                unit: "px",
                immediate: true,
              },
              {
                slider: "見出しの大きさ",
                path: "detail.headSize",
                min: 16,
                max: 40,
                step: 1,
                unit: "px",
                immediate: true,
              },
            ],
          },
        ],
        onChange: (info?: { path?: string }) => {
          /* 案を切り替えた時だけ読み戻す。つまみを動かした時は書き戻す
             （こうしないと、案ごとの値がすぐ上書きされて連動してしまう） */
          if (info?.path === "detail.pattern") recallSize();
          else rememberSize();
          applyType();
          setPattern(params.detail.pattern);
        },
        onSettle: (info?: { path?: string }) => {
          if (info?.path === "detail.pattern") recallSize();
          else rememberSize();
          applyType();
          setPattern(params.detail.pattern);
        },
      });
      /* 保存値を読んだ直後の状態を、いま選んでいる案の値にそろえる */
      recallSize();
      applyType();
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
    32: V32TocSlide,
    35: V35TocDot,
    36: V36TocNum,
    40: V40HeroDissolve,
    37: V37PinnedBlur,
    38: V38Grid,
    39: V39FarHead,
  };
  const V = MAP[pattern] ?? V1Parallax;
  return <V key={pattern} spot={spot} />;
}
