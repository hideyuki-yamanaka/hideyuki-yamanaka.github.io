"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 全ページ共通フッター（V3.0・2026-09-16 ヒデさん依頼）
 *
 * デザインは5案。右下の調整パネル（🌐サイト共通）から切り替える。
 * 既定は案1＝いまのサイトのトンマナそのまま（白地・Noto Thin/ExtraLight・
 * ink の文字・余白多め・動きは静か）。
 *
 * 使うアセットは V1 から残してあったもの
 *   ・logo-abashiri.svg（縦の「網走」ロゴ 75×159）
 *   ・sns-ig-circle.svg / sns-x.svg / sns-yt.svg
 *
 * 🟡仮置き
 *   ・SNSのリンク先URL（公式アカウントが確定したら差し替え）
 *   ・問い合わせ先は網走市観光協会の公開情報（0152-44-5849）を使用
 */
import { useEffect, useState } from "react";
import Link from "next/link";

export const FOOTER_EVENT = "abashiri:footer";

export const FOOTER_PATTERNS: Record<number, { name: string; note: string }> = {
  /* どの案も「作字（な〜んにもない／たまらない）をいちばん見せる」ための組み方。
     2026-09-16 ヒデさん指示で、縦ロゴ前提の旧レイアウトから全面的に作り直した */
  1: {
    name: "案1",
    note: "中央に大きく（既定）。作字を真ん中に大きく置き、上下にたっぷり余白。リンクは下に小さく",
  },
  2: {
    name: "案2",
    note: "空に還る。下へ向かって青くなる空の中に、白い作字を大きく。KVの世界で終わる",
  },
  3: {
    name: "案3",
    note: "左に大きく。作字を左に寄せて大きく置き、リンクとSNSは右端にそろえる",
  },
  4: {
    name: "案4",
    note: "ポスター。作字をうんと大きく、下端にリンクを一行。いちばん潔い",
  },
  5: {
    name: "案5",
    note: "作字が中心。リンクを作字の左右に振り分けて、作字が真ん中の軸になる",
  },
};

/* フッターのリンク。トップ内のセクションは GlobalNav と同じ飛び方をさせる */
const LINKS: { label: string; href?: string; jump?: "spotAt" | "gourmetAt" | "eventsAt" }[] = [
  { label: "ホーム", href: "/" },
  { label: "ぼーっとスポット", jump: "spotAt" },
  { label: "グルメ", jump: "gourmetAt" },
  { label: "体験", jump: "eventsAt" },
];

/* 🟡仮置き：公式アカウントが確定したら差し替える */
const SNS = [
  { icon: "/img/sns-ig-circle.svg", label: "Instagram", href: "https://www.instagram.com/" },
  { icon: "/img/sns-x.svg", label: "X", href: "https://x.com/" },
  { icon: "/img/sns-yt.svg", label: "YouTube", href: "https://www.youtube.com/" },
];

/** トップ内のセクションへ飛ぶ（GlobalNav と同じ仕掛け） */
function jumpTo(key: "spotAt" | "gourmetAt" | "eventsAt") {
  const sc = document.querySelector<HTMLElement>("[data-abashiri-scroller]");
  const at =
    key === "eventsAt"
      ? document.querySelector<HTMLElement>("#events")?.offsetTop
      : sc?.dataset[key];
  if (!sc || at == null) {
    /* 他ページからはトップへ戻ってから飛ぶ */
    try {
      sessionStorage.setItem("abashiri-goto", key);
    } catch {}
    window.location.href = "/";
    return;
  }
  window.dispatchEvent(
    new CustomEvent("abashiri:scroll-to", { detail: { y: Number(at) } })
  );
}

/* ── 部品 ───────────────────────────────── */

/** サイトロゴ＝キービジュアルの作字「な〜んにもない／たまらない」
    （2026-09-16 ヒデさん指示で「網走」の縦ロゴから差し替え）。
    ⚠️ 元アセットは「白い吹き出し＋青文字／白のたまらない」で濃い背景用。
    白地では消えてしまうので、白⇄青を入れ替えた反転版
    hero-message-blue.svg を使う（light=濃い背景のときだけ元のまま） */
function Logo({ cls, light = false }: { cls: string; light?: boolean }) {
  return (
    <img
      src={light ? "/img/hero-message.svg" : "/img/hero-message-blue.svg"}
      alt="な〜んにもない たまらない"
      /* 高さはクラスで指定（スマホでは小さく。style だと切り替えられない） */
      className={`w-auto ${cls}`}
    />
  );
}

function NavLinks({
  light = false,
  className = "",
  only,
}: {
  light?: boolean;
  className?: string;
  /** 案5用：作字の左右に振り分けるとき、前半／後半だけを出す */
  only?: "left" | "right";
}) {
  const c = light
    ? "text-white/85 hover:text-white"
    : "text-ink/70 hover:text-ink";
  const half = Math.ceil(LINKS.length / 2);
  const items =
    only === "left" ? LINKS.slice(0, half) : only === "right" ? LINKS.slice(half) : LINKS;
  return (
    <nav className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-8 ${className}`}>
      {items.map((l) =>
        l.href ? (
          <Link
            key={l.label}
            href={l.href}
            className={`whitespace-nowrap text-body-14 font-light leading-[1.2] transition-colors duration-300 ease-standard ${c}`}
          >
            {l.label}
          </Link>
        ) : (
          <button
            key={l.label}
            type="button"
            onClick={() => l.jump && jumpTo(l.jump)}
            className={`cursor-pointer whitespace-nowrap text-body-14 font-light leading-[1.2] transition-colors duration-300 ease-standard ${c}`}
          >
            {l.label}
          </button>
        )
      )}
    </nav>
  );
}

function SnsRow({ light = false, size = 20 }: { light?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-5">
      {SNS.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          aria-label={s.label}
          className="transition-opacity duration-300 ease-standard hover:opacity-60"
        >
          <img
            src={s.icon}
            alt=""
            style={{ height: size }}
            className={`w-auto ${light ? "" : "[filter:brightness(0)] opacity-70"}`}
          />
        </a>
      ))}
    </div>
  );
}

/* ── 案ごとの中身 ─────────────────────────── */

function Body({ pat }: { pat: number }) {
  switch (pat) {
    /* 案2 空に還る：青い空の中に白の作字。KVと同じ世界で終わらせる */
    case 2:
      return (
        <div className="flex w-full flex-col items-center gap-10 px-6 py-[80px] sm:gap-[64px] sm:py-[130px]">
          <Logo cls="h-[150px] sm:h-[230px]" light />
          <div className="flex flex-col items-center gap-8">
            <NavLinks light className="justify-center" />
            <SnsRow light />
          </div>
        </div>
      );

    /* 案3 左に大きく：作字を左へ寄せ、情報は右端にそろえる（非対称の余白が効く） */
    case 3:
      return (
        <div className="flex w-full flex-col items-center gap-10 px-6 py-[80px] sm:flex-row sm:items-center sm:justify-between sm:gap-[80px] sm:px-[120px] sm:py-[120px]">
          <Logo cls="h-[150px] sm:h-[220px]" />
          <div className="flex flex-col items-center gap-8 sm:items-end">
            <NavLinks className="justify-center sm:justify-end" />
            <SnsRow />
          </div>
        </div>
      );

    /* 案4 ポスター：作字をうんと大きく、下端にリンクを一行だけ */
    case 4:
      return (
        <div className="flex w-full flex-col items-center gap-12 px-6 pb-10 pt-[80px] sm:gap-[100px] sm:px-[120px] sm:pb-[64px] sm:pt-[140px]">
          <Logo cls="h-[170px] sm:h-[300px]" />
          <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
            <NavLinks className="justify-center sm:justify-start" />
            <SnsRow size={18} />
          </div>
        </div>
      );

    /* 案5 作字が中心：リンクを左右に振り分けて、作字を真ん中の軸にする */
    case 5:
      return (
        <div className="flex w-full flex-col items-center gap-10 px-6 py-[80px] sm:gap-[56px] sm:px-[120px] sm:py-[120px]">
          {/* スマホでは左右振り分けをやめて、ロゴの下に一列で置く */}
          <Logo cls="h-[150px] sm:hidden" />
          <NavLinks className="justify-center sm:hidden" />
          <div className="hidden w-full items-center justify-center gap-[72px] sm:flex">
            <NavLinks className="flex-1 justify-end" only="left" />
            <Logo cls="h-[210px]" />
            <NavLinks className="flex-1 justify-start" only="right" />
          </div>
          <SnsRow />
        </div>
      );

    /* 案1（既定）中央に大きく：作字を真ん中に、上下にたっぷり余白 */
    default:
      return (
        <div className="flex w-full flex-col items-center gap-12 px-6 py-[80px] sm:gap-[72px] sm:py-[140px]">
          <Logo cls="h-[160px] sm:h-[240px]" />
          <div className="flex flex-col items-center gap-8">
            <NavLinks className="justify-center" />
            <SnsRow />
          </div>
        </div>
      );
  }
}

export default function SiteFooter() {
  const [pat, setPat] = useState(1);
  useEffect(() => {
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.footer?.pattern;
        if (typeof v === "number" && FOOTER_PATTERNS[v]) setPat(v);
      })
      .catch(() => {});
    const onTune = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v === "number" && FOOTER_PATTERNS[v]) setPat(v);
    };
    window.addEventListener(FOOTER_EVENT, onTune);
    return () => window.removeEventListener(FOOTER_EVENT, onTune);
  }, []);

  /* 案2だけ空グラデ＋白文字。ほかは白地 */
  const sky = pat === 2;
  return (
    /* ⚠️ フッターは登場アニメを付けない。理由は2つ:
       ①filter/opacity を動かすと要素が合成レイヤーになり、アニメ完了後も
         blur(0.003px)・opacity 0.9997 が残って上の白セクションとの境目に
         薄いヘアラインが出る（2026-09-16 実測）
       ②whileInView はこのページ構成（スクロールする箱の中＋タブ非表示時）で
         発火しないことがあり、その場合フッターが opacity:0 のまま見えなくなる
       ページの末尾なので、素直に常時表示にするのがいちばん確実 */
    /* relative z-10：前の兄弟に sticky があると描画順で上に来て地が沈むため必須。
       -mt-[2px]：上のセクションと2px重ねて継ぎ目を出さない */
    <footer
      className={`relative z-10 -mt-[2px] w-full ${
        sky
          ? "bg-gradient-to-b from-sky-bottom via-brand/80 to-brand"
          : "bg-white"
      }`}
    >
      <Body pat={pat} />
    </footer>
  );
}
