"use client";

/*
 * ぼーっとスポット詳細ページ（テンプレ・V3.0）
 *
 * ・データは spotDetailData.ts（CMS のつもり）。ページはデータの型しか知らない
 * ・見せ方は 案1・32・35・36・40 の5案。右下の調整パネルで切り替える
 *   （2026-09-26 ヒデさん指示で 案3・37・38・39 を完全削除）
 *   （2026-09-15 ヒデさん依頼で、旧3案を廃止して写真主体の5案に作り直し）
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SPOT_DETAILS } from "./spotDetailData";
import { GOURMET_DETAILS } from "./gourmetDetailData";
import { attachPhoneMode } from "./phoneMode";
import { V1Parallax } from "./SpotDetailVariants";
import {
  V32TocSlide,
  V35TocDot,
  V36TocNum,
  V40HeroDissolve,
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
  /* 2026-09-16 ヒデさん依頼で追加した10案（案11〜20）。
     「写真が6〜7割・ミニマル・余白を効かせる・写真がさきに目に入る」が共通の狙い。
     名前は【何を変えたか】が分かる言い方にしてある */
  /* 2026-09-16 追加の5案。「左に小さく見出し・右に本文」のように、
     余白の取り方そのものをデザインにした案 */
  /* ═══ 2026-09-16 ヒデさん依頼の追加12案（案26〜37）のうち残っているもの ═══
     32〜36    左カラムの目次がスクロール位置に反応する
     （案37 は 2026-09-26 に完全削除） */
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
    let panel: {
      destroy: () => void;
      sync?: () => void;
      value?: (key: string) => unknown;
    } | null = null;

    /* 文字の大きさ・写真から本文への渡りは CSS 変数で持つ（つまみを動かすたびに React を描き直さないため）。
       値の住み家：①globals.css の :root ②ここの params（と spDefault）③ブラウザ保存 ——①と②は同じ数にしておく。

       【2026-09-27 ヒデさん決定】調整パネルを共通部品 v2.0.0 に上げた。
         ・値は「案ごと × PC/スマホごと」に部品が自動で分ける（ルール6-8）。このタブの主役は案ピルなので、
           タブの中のつまみ（渡り・文字の大きさ）は全部 案ごとの値になる。
           → 2026-09-16 から手作りで持っていた「案ごとの文字の大きさ（sizes・recallSize・rememberSize）」は外した
             （同じ値を書き換える入口が2つになるため。ルール6-2）
         ・「パソコン／スマホ」に分けていた写真の高さ・渡る長さは1本ずつにまとめた（ヒデさん決定）。
           スマホの値はスマホモードの上書き（青い印）で持ち、上書きが無い間は spDefault（写真52%・渡る8%）。
           ⚠️ 画面では今までどおり 1023px 以下でスマホの値を使う（globals.css の --dt-fv-sp）。
              部品がスマホの値を流し込むのは 600px 以下の端末だけなので、PC の画面ではスマホの値を
              保存値（スマホの上書き）から読んで --dt-*-sp に入れる（readSp） */
    const SIZE0 = { head: 24, body: 14 }; /* 2026-09-27 本文 15→14・見出し 26→24（4-7。globals.css の --dt-body・--dt-head と同じ値） */
    const SP_DEFAULT = { fv: 52, fade: 8 };
    const params = {
      /* 【2026-09-24 ヒデさん指示】「ブラーで白くなる案を採用していきたい」
         → 既定を値40（写真そのものがぼけて白くなり、白い本文へ溶ける）に。
         ⚠️ 既定を変えたら version も上げる。上げないと、前の案を
            おぼえているブラウザ（＝ヒデさんの手元）では変わらない */
      detail: {
        pattern: 40,
        headSize: SIZE0.head,
        bodySize: SIZE0.body,
        /* 写真から本文への渡り（PC の値）。単位は「画面の高さの何%」 */
        fv: 100,
        fade: 12,
      },
    };
    const STORAGE_KEY = "abashiri-spot-detail-tune";
    const VERSION = 18;
    /* PC の画面で「スマホで効く値」を読む：スマホモード中は部品に聞き、それ以外は保存値（スマホの上書き）→ 既定 */
    const readSp = (path: "detail.fv" | "detail.fade", def: number) => {
      if (document.documentElement.classList.contains("phone-mode")) {
        const v = panel?.value?.(path);
        if (typeof v === "number") return v;
      }
      try {
        const mb = JSON.parse(localStorage.getItem(`tp:${STORAGE_KEY}:v${VERSION}:mb`) || "{}");
        if (typeof mb[path] === "number") return mb[path];
      } catch {}
      return def;
    };
    const applyType = () => {
      const r = document.documentElement;
      r.style.setProperty("--dt-head", params.detail.headSize + "px");
      r.style.setProperty("--dt-body", params.detail.bodySize + "px");
      /* スマホの端末（600px 以下）では、部品がスマホの値を params に流し込んでいる */
      const phone = window.matchMedia("(max-width: 600px)").matches;
      r.style.setProperty("--dt-fv-pc", String(params.detail.fv));
      r.style.setProperty("--dt-fade-pc", String(params.detail.fade));
      r.style.setProperty("--dt-fv-sp", String(phone ? params.detail.fv : readSp("detail.fv", SP_DEFAULT.fv)));
      r.style.setProperty("--dt-fade-sp", String(phone ? params.detail.fade : readSp("detail.fade", SP_DEFAULT.fade)));
    };

    const build = () => {
      const lib = (window as unknown as { TunePanel?: PanelLib }).TunePanel;
      if (!lib || madeRef.current) return;
      madeRef.current = true;
      panel = lib.create({
        title: "調整パネル", /* 2026-09-20 anyflow と同じ名称にそろえる */
        storageKey: STORAGE_KEY,
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
           v15: 既定を案5(値36)に変更（2026-09-20）
           v16: 既定をブラー案(値40)に変更＋渡りのつまみを追加（2026-09-24）
           v17: 案3・37・38・39 を完全削除（2026-09-26） */
        version: VERSION, /* =18。2026-09-27 共通部品 v2.0.0 へ。渡りを1本ずつにまとめ（fv/fade が数に変わった）、手作りの案ごとの文字の大きさを外したので、形の違う古い保存値を破棄する */
        position: { right: 20, bottom: 20 },
        /* タブ方式で描く（中身がバリエーション／基本／フォントのカードに分かれる。anyflow と同じ）。
           タブが1つだけの時はタブの帯は出さない */
        tabs: true,
        params,
        defaults: structuredClone(params),
        schema: [
          {
            /* 【2026-09-26 ヒデさん指示】anyflow の調整パネルの構成を完全に踏襲。
               タブの中は「バリエーション → 基本 → フォント」のカード。絵文字は付けない。
               （以前は 📍スポット詳細／📐写真から本文への渡り／🔠文字の大きさ の独自3分類だった） */
            cat: "詳細ページ",
            open: true,
            items: [
              /* 【2026-09-28】案ピルは見出しより前に置く＝このタブの主役の案（部品の「バリエーション」）。
                 見出しの中に置くと「その見出しの中だけの選択」扱いになり、渡り・文字の大きさが全案共通のままだった（検査で発覚） */
              {
                pills: "案",
                path: "detail.pattern",
                immediate: true,
                /* 案を消したら、残った数に応じて 案1 から振り直す（2026-09-16 ヒデさん指示） */
                autoNum: "案",
                hint: "詳細ページ（テンプレ）のデザイン＋スクロール演出。いま残っているのは5案です。案1 は最初からの案（写真が奥へ引き、白い本文がせり上がる）、案32〜36 は左の目次がスクロール位置に反応する案、案40 は案36 と同じ中身で、写真そのものがぼけて白へ溶ける案（いまの既定）。名前のうしろが【何を変えたか】です。番号は選定時の呼び方のままなので欠番があります。",
                options: Object.entries(SPOT_DETAIL_PATTERNS).map(([v, p]) => ({
                  name: p.name,
                  value: Number(v),
                  desc: p.note,
                })),
              },
              { sub: "写真から本文への渡り", grp: "basic" },
              {
                note: "ファーストビューの写真から、白い本文へ移るまでの長さ。【ブラー案（写真がぼけて白になじむ）だけに効きます】。短くするほど早く本文が読めます。⚠️「写真の高さ」＋「渡る長さ」が 100 を下回ると、止まっている時点で画面の下に白い帯が見えます。",
              },
              {
                slider: "写真の高さ",
                path: "detail.fv",
                min: 70,
                max: 100,
                step: 1,
                unit: "%",
                spDefault: SP_DEFAULT.fv,
                immediate: true,
                hint: "ファーストビューで写真が占める高さ（画面の高さの何%）。スマホの値は、スマホモードで触ると別に持てます（上書きが無い間は52%）。",
              },
              {
                slider: "渡る長さ",
                path: "detail.fade",
                min: 4,
                max: 40,
                step: 1,
                unit: "%",
                spDefault: SP_DEFAULT.fade,
                immediate: true,
                hint: "写真が白い本文へ移りきるまでのスクロール量（画面の高さの何%）。スマホの上書きが無い間は8%。",
              },
              { sub: "文字の大きさ", grp: "font" },
              {
                note: "本文と見出しの大きさ。行間は倍率で持っているので、大きさを変えると行間も一緒に動きます。【案ごと・PC/スマホごとに別々の値を持ちます】（2026-09-27 から部品が自動で分ける）。",
              },
              {
                slider: "本文",
                path: "detail.bodySize",
                grid: "fontSize", /* 文字サイズ（14・18px も可）。名前だけだと部品が「大きさ」と見分けて4の倍数に寄せるため（2026-09-28） */
                min: 12,
                max: 20,
                step: 0.5,
                unit: "px",
                immediate: true,
              },
              {
                slider: "見出し",
                path: "detail.headSize",
                grid: "fontSize", /* 文字サイズ（14・18px も可）。名前だけだと部品が「大きさ」と見分けて4の倍数に寄せるため（2026-09-28） */
                min: 16,
                max: 40,
                step: 1,
                unit: "px",
                immediate: true,
              },
            ],
          },
        ],
        /* 案ごとの値の出し入れは部品がやる（案を切り替えると、その案の値が params に入ってから呼ばれる） */
        onChange: () => {
          applyType();
          setPattern(params.detail.pattern);
        },
        onSettle: () => {
          applyType();
          setPattern(params.detail.pattern);
        },
      });
      /* スマホモードの QR・実機への反映（共通の phone-mode・開発中だけ） */
      attachPhoneMode(panel as unknown as Parameters<typeof attachPhoneMode>[0]);
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
    32: V32TocSlide,
    35: V35TocDot,
    36: V36TocNum,
    40: V40HeroDissolve,
  };
  const V = MAP[pattern] ?? V1Parallax;
  return <V key={pattern} spot={spot} />;
}
