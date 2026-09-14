"use client";

/*
 * ぼーっとスポット詳細ページ（テンプレ・V3.0 新設 2026-09-14）
 *
 * ・データは spotDetailData.ts（CMS のつもり）。ページはデータの型しか知らない
 * ・デザインは現状のトンマナ（Noto Thin/ExtraLight・白ガラス＋blur・空グラデ・brand青）で
 *   3案を用意し、右下の調整パネル（tune-panel.js）で切り替える
 *     案1 全画面ヒーロー … 写真いっぱい＋白地の本文
 *     案2 白エディトリアル … 縦書き見出し＋2カラム（右に基本情報が追従）
 *     案3 空グラデ没入 … 体験ページと同じ青の世界に白枠の窓＋ガラスカード
 * ・🟡仮置き：このページ自体のカンプは無いので、数値は既存トンマナ
 *   （text-title-36 / body-14 行間2 字間0.7px / 白ガラス white/10 blur65 等）から流用
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SPOT_DETAILS, type SpotDetail } from "./spotDetailData";

/* tune-panel.js（依存ゼロの素のJS）の必要なところだけの型 */
type PanelLib = {
  create: (cfg: Record<string, unknown>) => { destroy: () => void };
};

const PATTERNS: Record<number, { name: string; note: string }> = {
  1: { name: "案1", note: "全画面ヒーロー。写真に浸ってから白地で読む" },
  2: { name: "案2", note: "白エディトリアル。縦書き見出し＋基本情報が右に追従" },
  3: { name: "案3", note: "空グラデ没入。体験ページと同じ青の世界で読む" },
};

/* ───────────────────────── 共通の部品 ───────────────────────── */

/** 戻るピル（左上・白ガラス） */
function BackPill({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      href="/"
      className={`fixed left-8 top-8 z-40 flex items-center gap-2 rounded-full px-5 py-2.5 text-body-14 font-light backdrop-blur-[62px] transition-colors duration-300 ease-standard ${
        dark
          ? "bg-ink/10 text-ink hover:bg-ink/20"
          : "bg-white/20 text-white hover:bg-white/35"
      }`}
    >
      <span className="inline-block rotate-180">
        <img
          src={dark ? "/img/icon-view-more-black.svg" : "/img/icon-view-more.svg"}
          alt=""
          className="size-[16px]"
        />
      </span>
      トップへ戻る
    </Link>
  );
}

/** 基本情報の表（行間・字間はトンマナの body-14 系） */
function InfoTable({ spot, light }: { spot: SpotDetail; light?: boolean }) {
  const line = light ? "border-white/25" : "border-ink/10";
  const label = light ? "text-white/70" : "text-ink/50";
  const value = light ? "text-white" : "text-ink";
  return (
    <dl className="w-full">
      {spot.info.map((row) => (
        <div
          key={row.label}
          className={`flex gap-6 border-b py-4 first:border-t ${line}`}
        >
          <dt
            className={`w-[96px] shrink-0 text-body-14 font-light leading-[2] ${label}`}
          >
            {row.label}
          </dt>
          <dd
            className={`whitespace-pre-line text-body-14 font-extralight leading-[2] tracking-[0.7px] ${value}`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** おすすめポイント */
function Points({ spot, light }: { spot: SpotDetail; light?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {spot.points.map((p) => (
        <li
          key={p}
          className={`flex gap-3 text-body-14 font-extralight leading-[2] tracking-[0.7px] ${
            light ? "text-white" : "text-ink"
          }`}
        >
          <span
            className={`mt-[13px] size-[6px] shrink-0 rounded-full ${
              light ? "bg-white/80" : "bg-brand"
            }`}
          />
          {p}
        </li>
      ))}
    </ul>
  );
}

/** 本文（小見出し＋段落） */
function Sections({ spot, light }: { spot: SpotDetail; light?: boolean }) {
  return (
    <div className="flex flex-col gap-10">
      {spot.sections.map((s, i) => (
        <div key={i} className="flex flex-col gap-4">
          {s.heading && (
            <h3
              className={`text-title-28 font-thin leading-[1.4] ${
                light ? "text-white" : "text-ink"
              }`}
            >
              {s.heading}
            </h3>
          )}
          <p
            className={`text-body-16 font-extralight leading-[2.2] tracking-[0.5px] ${
              light ? "text-white/90" : "text-ink/90"
            }`}
          >
            {s.text}
          </p>
        </div>
      ))}
    </div>
  );
}

/** 周辺マップ（公式サイトの「周辺マップ」相当。Googleマップ埋め込み＋外部リンク） */
function MapEmbed({ spot, light }: { spot: SpotDetail; light?: boolean }) {
  return (
    <div className="relative w-full">
      <iframe
        title={`${spot.name} 周辺マップ`}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(spot.map.query)}&z=11&hl=ja&output=embed`}
        className={`h-[420px] w-full border-0 ${light ? "rounded-[24px]" : ""}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={spot.map.link}
        target="_blank"
        rel="noreferrer"
        className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-4 py-2 text-body-14 font-light backdrop-blur-[62px] transition-colors duration-300 ease-standard ${
          light
            ? "bg-white/85 text-ink hover:bg-white"
            : "bg-white/90 text-ink shadow-modal hover:bg-white"
        }`}
      >
        マップで開く
        <img src="/img/icon-view-more-black.svg" alt="" className="size-[14px]" />
      </a>
    </div>
  );
}

/* ───────────────────────── 案1 全画面ヒーロー ───────────────────────── */

function Variant1({ spot }: { spot: SpotDetail }) {
  return (
    <main className="min-h-dvh bg-white">
      <BackPill />
      {/* 写真いっぱいのヒーロー。下端に向けて暗くして文字を乗せる */}
      <div className="relative h-dvh w-full overflow-hidden">
        <img
          src={spot.hero}
          alt={spot.name}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 px-[120px] pb-[88px] text-white">
          <p className="text-body-18 font-thin leading-[1.2] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            {spot.category} {spot.no}
          </p>
          <h1 className="text-[80px] font-thin leading-none opacity-95">
            {spot.name}
          </h1>
          <p className="text-body-16 font-extralight leading-[2] tracking-[0.7px] text-white/90">
            {spot.lead}（{spot.kana}）
          </p>
        </div>
      </div>
      {/* 白地の本文 */}
      <div className="mx-auto flex w-[880px] max-w-full flex-col gap-[88px] px-6 py-[120px]">
        <Sections spot={spot} />
        <div className="flex gap-2">
          {spot.photos.map((p) => (
            <img
              key={p}
              src={p}
              alt=""
              className="h-[280px] min-w-0 flex-1 object-cover"
            />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <h2 className="text-title-36 font-thin leading-[1.8] text-ink">
            担当者からのおすすめポイント
          </h2>
          <Points spot={spot} />
        </div>
        <div className="flex flex-col gap-6">
          <h2 className="text-title-36 font-thin leading-[1.8] text-ink">
            基本情報
          </h2>
          <InfoTable spot={spot} />
        </div>
        <div className="flex flex-col gap-6">
          <h2 className="text-title-36 font-thin leading-[1.8] text-ink">
            周辺マップ
          </h2>
          <MapEmbed spot={spot} />
        </div>
      </div>
    </main>
  );
}

/* ───────────────────────── 案2 白エディトリアル ───────────────────────── */

function Variant2({ spot }: { spot: SpotDetail }) {
  return (
    <main className="min-h-dvh bg-white">
      <BackPill dark />
      <div className="mx-auto w-[1200px] max-w-full px-6 pb-[120px] pt-[120px]">
        {/* 上段：縦書きの名前 ＋ 横長写真（オモロいセクションと同じ縦書きの世界観） */}
        <div className="flex items-start gap-[56px]">
          <div className="flex shrink-0 items-start gap-6 pt-2">
            <h1
              className="whitespace-nowrap text-[56px] font-thin leading-[1.2] text-ink"
              style={{ writingMode: "vertical-rl" }}
            >
              {spot.name}
            </h1>
            <p
              className="whitespace-nowrap pt-1 text-body-14 font-extralight tracking-[2px] text-ink/50"
              style={{ writingMode: "vertical-rl" }}
            >
              {spot.category} {spot.no}｜{spot.kana}
            </p>
          </div>
          <div className="relative h-[560px] min-w-0 flex-1 overflow-hidden">
            <img
              src={spot.hero}
              alt={spot.name}
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        </div>
        <p className="mt-10 text-body-18 font-extralight leading-[2.2] tracking-[0.7px] text-ink/80">
          {spot.lead}
        </p>
        {/* 下段：本文 ＋ 右に基本情報（スクロールに追従） */}
        <div className="mt-[88px] flex items-start gap-[72px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[72px]">
            <Sections spot={spot} />
            <div className="flex flex-col gap-6">
              <h2 className="text-title-28 font-thin leading-[1.6] text-ink">
                担当者からのおすすめポイント
              </h2>
              <Points spot={spot} />
            </div>
            <div className="flex gap-2">
              {spot.photos.map((p) => (
                <img
                  key={p}
                  src={p}
                  alt=""
                  className="h-[240px] min-w-0 flex-1 object-cover"
                />
              ))}
            </div>
            <div className="flex flex-col gap-6">
              <h2 className="text-title-28 font-thin leading-[1.6] text-ink">
                周辺マップ
              </h2>
              <MapEmbed spot={spot} />
            </div>
          </div>
          <aside className="sticky top-10 w-[360px] shrink-0 bg-sky-bottom/40 p-8">
            <h2 className="mb-4 text-body-18 font-thin text-ink">基本情報</h2>
            <InfoTable spot={spot} />
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ───────────────────────── 案3 空グラデ没入 ───────────────────────── */

function Variant3({ spot }: { spot: SpotDetail }) {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-brand via-brand/80 to-sky-bottom">
      <BackPill />
      <div className="mx-auto flex w-[960px] max-w-full flex-col items-center gap-[72px] px-6 pb-[140px] pt-[120px]">
        {/* 体験ページの窓の意匠：白枠＋大きな角丸の写真 */}
        <div className="flex w-full flex-col items-center gap-8">
          <p className="text-body-18 font-thin leading-[1.2] text-white/90 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
            {spot.category} {spot.no}
          </p>
          <h1 className="text-[64px] font-thin leading-none text-white">
            {spot.name}
          </h1>
          <p className="text-body-14 font-extralight tracking-[2px] text-white/70">
            {spot.kana}
          </p>
          <div className="relative h-[520px] w-full overflow-hidden rounded-[36px] border-[3px] border-white/60">
            <img
              src={spot.hero}
              alt={spot.name}
              className="absolute inset-0 size-full object-cover"
            />
          </div>
          <p className="text-body-18 font-extralight leading-[2.2] tracking-[0.7px] text-white/90">
            {spot.lead}
          </p>
        </div>
        {/* ガラスカードの本文（グルメ帯・タイマー数字箱と同じ white/10 + blur65） */}
        <div className="w-full rounded-16 bg-white/10 p-[56px] backdrop-blur-65">
          <Sections spot={spot} light />
        </div>
        <div className="w-full rounded-16 bg-white/10 p-[56px] backdrop-blur-65">
          <h2 className="mb-6 text-title-28 font-thin leading-[1.6] text-white">
            担当者からのおすすめポイント
          </h2>
          <Points spot={spot} light />
        </div>
        <div className="w-full rounded-16 bg-white/10 p-[56px] backdrop-blur-65">
          <h2 className="mb-6 text-title-28 font-thin leading-[1.6] text-white">
            基本情報
          </h2>
          <InfoTable spot={spot} light />
        </div>
        <div className="w-full rounded-16 bg-white/10 p-[56px] backdrop-blur-65">
          <h2 className="mb-6 text-title-28 font-thin leading-[1.6] text-white">
            周辺マップ
          </h2>
          <MapEmbed spot={spot} light />
        </div>
      </div>
    </main>
  );
}

/* ───────────────────────── 本体（案の切替＋調整パネル） ───────────────────────── */

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
        version: 1,
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
                note: "詳細ページ（テンプレ）のデザイン3案。選ぶとその場で切り替わります。",
              },
              {
                pills: "デザインの案",
                path: "detail.pattern",
                immediate: true,
                options: Object.entries(PATTERNS).map(([v, p]) => ({
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

  if (pattern === 2) return <Variant2 spot={spot} />;
  if (pattern === 3) return <Variant3 spot={spot} />;
  return <Variant1 spot={spot} />;
}
