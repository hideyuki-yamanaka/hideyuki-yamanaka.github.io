"use client";

/*
 * 一覧ページ（ぼーっとスポット／素朴なグルメ／意外とオモロい体験）
 *
 * 【2026-10-29 ヒデさん】「各コンテンツの下層ページ（一覧のページ）を作りたい。4つのコンテンツをきれいに見せるレイアウトを
 *   静的5つ＋インタラクション5つ」→ 10案を見比べて同日「2×2 のやつでいきましょう」。ほかの9案と見比べの切り替えは外した
 *   （戻す時は git の記録：この日の Auto-save のどれか）。
 *   同日「ぼーっとスポットの上の装飾のグレーの文字はいらない。各カードの下の表記もトップページと同じ（ぼーっとスポット 01）。
 *   コンテンツの左右の余白・画像の比率・グリッドの十字の部分（カードとカードの間）の余白を調整パネルで変えられるように」
 *
 * - 外枠（ヘッダー・フッター・フッターの上の白いグラデ）は詳しいページと同じ部品（DetailHeader・SiteFooter overlap="wide"）
 * - 文字はこのサイトの決まり（見出しは細い Noto・本文 Light）。写真は角丸なし。スマホは1列
 * - 左右の余白・カードの並びの幅（画面に対する %）・写真の比率（%）・横と縦のギャップは CSS 変数（--list-*-pc／-sp）。調整パネル › 一覧ページ › 基本（PC とスマホは別の値）
 * - カードを押すと、その詳しいページへ（リンクは PageTransition の幕を通る）
 */
import Link from "next/link";
import { useEffect, useRef } from "react";
import { DetailHeader } from "./SpotDetailVariants";
import SiteFooter from "./SiteFooter";
import { SPOT_DETAILS, type SpotDetail } from "./spotDetailData";
import { GOURMET_DETAILS, GOURMET_ORDER } from "./gourmetDetailData";
import { attachPhoneMode } from "./phoneMode";
import { useInertiaScroll } from "./inertiaScroll";

export type ListKind = "spot" | "gourmet" | "event";

/** label＝カードの下の表記（トップページと同じ：ぼーっとスポット 01／素朴なグルメ 01／体験 01） */
const KIND: Record<ListKind, { title: string; label: string; slugs: string[]; base: string }> = {
  spot: { title: "ぼーっとスポット", label: "ぼーっとスポット", slugs: ["notoro", "sango", "ryuhyo", "himawari"], base: "/spot/" },
  gourmet: { title: "グルメ", label: "素朴なグルメ", slugs: [...GOURMET_ORDER], base: "/gourmet/" },
  event: { title: "イベント・体験", label: "体験", slugs: ["kangoku", "ryuhyokan", "canoe", "washi"], base: "/spot/" },
};

type Item = SpotDetail & { href: string; idx: number };
type PanelLib = { create: (cfg: Record<string, unknown>) => { destroy: () => void; value?: (key: string) => unknown } };

const num = (i: number) => String(i + 1).padStart(2, "0");

/** 調整パネル（一覧ページ・ほかのページとは別の保存先）。左右の余白・写真の比率・横と縦のギャップ */
function useListPanel() {
  const made = useRef(false);
  useEffect(() => {
    if (made.current) return;
    let panel: { destroy: () => void; value?: (key: string) => unknown } | null = null;
    /* PC の値は params、スマホの値は spDefault（スマホモードで上書き）。🟡 既定は見比べの時の値のまま */
    /* 2026-10-29 ヒデさんの設定ファイル（abashiri-list-tune-settings (1).json）を焼き込み：パディング 40・幅 86%・見出しとカード 80・写真 64%・ギャップ 横44／縦64・番号と名前 0・名前と説明 4 */
    const params = { list: { padX: 40, w: 86, headGap: 80, ratio: 64, gapX: 44, gapY: 64, gapName: 0, gapLead: 4 } };
    const SP = { padX: 24, w: 100, headGap: 40, ratio: 75, gapX: 16, gapY: 64, gapName: 4, gapLead: 4 };
    const STORAGE_KEY = "abashiri-list-tune";
    const VERSION = 1;
    const readSp = (k: keyof typeof SP) => {
      if (document.documentElement.classList.contains("phone-mode")) {
        const v = panel?.value?.(`list.${k}`);
        if (typeof v === "number") return v;
      }
      try {
        const mb = JSON.parse(localStorage.getItem(`tp:${STORAGE_KEY}:v${VERSION}:mb`) || "{}");
        if (typeof mb[`list.${k}`] === "number") return mb[`list.${k}`];
      } catch {}
      return SP[k];
    };
    const apply = () => {
      const r = document.documentElement.style;
      const phone = window.matchMedia("(max-width: 600px)").matches;
      for (const k of ["padX", "w", "headGap", "ratio", "gapX", "gapY", "gapName", "gapLead"] as const) {
        const name = { padX: "pad-x", w: "w", headGap: "head-gap", ratio: "ratio", gapX: "gap-x", gapY: "gap-y", gapName: "gap-name", gapLead: "gap-lead" }[k];
        if (!phone) r.setProperty(`--list-${name}-pc`, String(params.list[k]));
        r.setProperty(`--list-${name}-sp`, String(phone ? params.list[k] : readSp(k)));
      }
    };
    const build = () => {
      const lib = (window as unknown as { TunePanel?: PanelLib }).TunePanel;
      if (!lib || made.current) return;
      made.current = true;
      panel = lib.create({
        title: "調整パネル",
        storageKey: STORAGE_KEY,
        version: VERSION,
        position: { right: 20, bottom: 20 },
        tabs: true,
        params,
        defaults: structuredClone(params),
        schema: [
          {
            cat: "一覧ページ",
            open: true,
            items: [
              /* 余白・大きさなので 基本（6-13・6-18）。PC とスマホは別の値 */
              { sub: "カードの並び（2×2）", grp: "basic" },
              { slider: "パディング（左右）", path: "list.padX", min: 0, max: 240, step: 4, unit: "px", spDefault: SP.padX, immediate: true, hint: "画面が狭くなっても、左右にこれだけは必ず空ける余白。スマホの上書きが無い間は 24px。" },
              /* 2026-10-29 ヒデさん「数値を変えたらカードが広がって画面を埋めていくように」「ピクセルでなく、レスポンシブを想定した調整パネルに」
                 → カードの並びの幅を「画面の幅に対する %」にした。どの画面幅でも同じ割合で伸び縮みする。100% で画面いっぱい（左右はパディング分だけ残る） */
              { slider: "幅（画面に対して）", path: "list.w", min: 40, max: 100, step: 1, unit: "%", spDefault: SP.w, immediate: true, hint: "カードの並び全体の幅を、画面の幅に対する割合で。上げるほどカードが広がり、100% で画面いっぱい（左右はパディング分だけ）。画面の幅が変わっても同じ割合のまま。" },
              /* 2026-10-29 ヒデさん「タイトルとコンテンツのギャップをもう少し詰めたい。調整パネルで指定できるように」→ 96→64px（スマホ 64→40px・🟡） */
              { slider: "ギャップ（見出しとカード）", path: "list.headGap", min: 0, max: 160, step: 4, unit: "px", spDefault: SP.headGap, immediate: true, hint: "大見出し（ぼーっとスポットなど）と、その下のカードの並びの間。スマホの上書きが無い間は 40px。" },
              { slider: "写真の高さ（幅に対して）", path: "list.ratio", min: 40, max: 150, step: 1, unit: "%", spDefault: SP.ratio, immediate: true, hint: "写真の縦横の比率。75% で 4:3、56% で 16:9、100% で正方形、133% で縦長 3:4。" },
              { slider: "ギャップ（横）", path: "list.gapX", min: 0, max: 160, step: 4, unit: "px", spDefault: SP.gapX, immediate: true, hint: "左右に並んだカードの間（十字の縦の線）。スマホは1列なので効かない。" },
              { slider: "ギャップ（縦）", path: "list.gapY", min: 0, max: 200, step: 4, unit: "px", spDefault: SP.gapY, immediate: true, hint: "上下に並んだカードの間（十字の横の線）。スマホの上書きが無い間は 64px。" },
              /* 2026-10-29 ヒデさん「カードの下の文字（素朴なグルメ 01／横山蒲鉾店／その下の文章）の上下の余白を変えられるように」「詰める」→ どちらも 8→4px（🟡） */
              { sub: "カードの文字", grp: "basic" },
              { slider: "ギャップ（番号と名前）", path: "list.gapName", min: 0, max: 64, step: 2, unit: "px", spDefault: SP.gapName, immediate: true, hint: "「素朴なグルメ 01」と、その下の名前（横山蒲鉾店など）の間。" },
              { slider: "ギャップ（名前と説明）", path: "list.gapLead", min: 0, max: 64, step: 2, unit: "px", spDefault: SP.gapLead, immediate: true, hint: "名前と、その下の説明の文章の間。" },
            ],
          },
        ],
        onChange: apply,
        onSettle: apply,
      });
      attachPhoneMode(panel as unknown as Parameters<typeof attachPhoneMode>[0]);
      apply();
    };
    /* ページ移動の幕と重ならないよう、手が空いてから組み立てる（詳しいページと同じ・2026-10-29）。値の既定は globals.css にある */
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let idle = 0;
    const start = () => {
      if ((window as unknown as { TunePanel?: PanelLib }).TunePanel) build();
      else {
        const s = document.createElement("script");
        s.src = "/tune-panel.js";
        s.onload = build;
        document.head.appendChild(s);
      }
    };
    const to = window.setTimeout(() => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(start, { timeout: 1500 });
      else start();
    }, 1600);
    return () => {
      window.clearTimeout(to);
      if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
      panel?.destroy();
    };
  }, []);
}

export default function ListPage({ kind }: { kind: ListKind }) {
  const k = KIND[kind];
  const data: Record<string, SpotDetail> = kind === "gourmet" ? GOURMET_DETAILS : SPOT_DETAILS;
  const items: Item[] = k.slugs.filter((s) => data[s]).map((s, idx) => ({ ...data[s], href: k.base + s, idx }));
  useListPanel();
  /* 慣性スクロール（サイト共通・2026-10-29。値は inertiaScroll.ts） */
  const mainRef = useRef<HTMLElement>(null);
  useInertiaScroll(mainRef);
  return (
    <main ref={mainRef} className="h-dvh overflow-y-auto overflow-x-hidden overscroll-contain bg-white [container-type:inline-size]">
      <DetailHeader />
      {/* 白い地は下から --ft-overlap-wide の所まで。その下は透明にして、裏に潜り込ませたフッターのグラデを見せる（詳しいページと同じ作り） */}
      <div
        className="relative z-10 pb-8 pt-[120px] tab:pb-[80px] tab:pt-[160px] lg:pb-[112px] lg:pt-[184px]"
        style={{
          paddingInline: "var(--list-pad-x)",
          background: "linear-gradient(to bottom, #fff calc(100% - var(--ft-overlap-wide, 0px)), transparent calc(100% - var(--ft-overlap-wide, 0px)))",
        }}
      >
        {/* 幅は画面（main）の幅に対する %。cqw＝画面の幅の 1%。パディングより外には出ない */}
        <div className="mx-auto" style={{ width: "min(100%, calc(var(--list-w-n) * 1cqw))" }}>
          <h1 className="text-title-44 font-thin leading-[1.3] text-ink tab:text-title-56" style={{ marginBottom: "var(--list-head-gap)" }}>{k.title}</h1>
          <div className="grid grid-cols-1 tab:grid-cols-2" style={{ columnGap: "var(--list-gap-x)", rowGap: "var(--list-gap-y)" }}>
            {items.map((it) => (
              <Link key={it.slug} href={it.href} className="group flex flex-col gap-6">
                <div className="relative overflow-hidden bg-ink/5" style={{ aspectRatio: "100 / var(--list-ratio-n)" }}>
                  <img
                    src={it.hero}
                    alt={it.name}
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-col text-ink">
                  {/* トップページのカードと同じ表記（ぼーっとスポット 01 など） */}
                  <span className="text-body-14 font-extralight tracking-[0.05em] opacity-70">
                    {k.label} {num(it.idx)}
                  </span>
                  <h3 className="text-title-24 font-thin leading-[1.4] tab:text-title-28" style={{ marginTop: "var(--list-gap-name)" }}>{it.name}</h3>
                  <p className="text-body-14 font-light leading-[1.8] opacity-80" style={{ marginTop: "var(--list-gap-lead)" }}>{it.lead}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter overlap="wide" />
    </main>
  );
}
