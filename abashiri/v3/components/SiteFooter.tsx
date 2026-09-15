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
import { motion } from "framer-motion";

export const FOOTER_EVENT = "abashiri:footer";

export const FOOTER_PATTERNS: Record<number, { name: string; note: string }> = {
  1: {
    name: "案1",
    note: "白地・横並び（既定）。作字ロゴ（青）＋リンク＋SNSを一列に",
  },
  2: {
    name: "案2",
    note: "空グラデ。下へ向かって空色になり、白文字。サイトの世界観に沈んで終わる",
  },
  3: {
    name: "案3",
    note: "ロゴ大きめ。作字を主役に置き、リンクは右へ小さく添える",
  },
  4: {
    name: "案4",
    note: "ミニマル1行。作字ロゴとSNSだけ。いちばん軽い終わり方",
  },
  5: {
    name: "案5",
    note: "中央そろえ。作字ロゴを真ん中に置き、リンクとSNSを上下に配置",
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
function Logo({ h, light = false }: { h: number; light?: boolean }) {
  return (
    <img
      src={light ? "/img/hero-message.svg" : "/img/hero-message-blue.svg"}
      alt="な〜んにもない たまらない"
      style={{ height: h }}
      className="w-auto"
    />
  );
}

function NavLinks({ light = false, className = "" }: { light?: boolean; className?: string }) {
  const c = light
    ? "text-white/85 hover:text-white"
    : "text-ink/70 hover:text-ink";
  return (
    <nav className={`flex flex-wrap items-center gap-x-8 gap-y-3 ${className}`}>
      {LINKS.map((l) =>
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

/* 画面に入ったら静かに現れる（サイト共通の質感） */
const reveal = {
  hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ── 案ごとの中身 ─────────────────────────── */

function Body({ pat }: { pat: number }) {
  switch (pat) {
    /* 案2 空グラデ：下へ向かって空色になり、白文字で終わる */
    case 2:
      return (
        <div className="flex w-full flex-col gap-[56px] px-[120px] py-[100px]">
          <div className="flex items-end justify-between gap-10">
            <Logo h={130} light />
            <div className="flex flex-col items-end gap-6">
              <NavLinks light className="justify-end" />
              <SnsRow light />
            </div>
          </div>
        </div>
      );

    /* 案3 作字ロゴ大きめ：ロゴを主役に、リンクは右へ小さく */
    case 3:
      return (
        <div className="flex w-full items-start justify-between gap-[80px] px-[120px] py-[120px]">
          <Logo h={180} />
          <div className="flex flex-col items-end gap-10 pt-2">
            <NavLinks className="justify-end" />
            <SnsRow />
          </div>
        </div>
      );

    /* 案4 ミニマル1行：いちばん軽い終わり方 */
    case 4:
      return (
        <div className="flex w-full items-center justify-between gap-10 px-[120px] py-[56px]">
          <Logo h={70} />
          <SnsRow size={18} />
        </div>
      );

    /* 案5 中央そろえ：ロゴを真ん中に、上下にリンクとSNS */
    case 5:
      return (
        <div className="flex w-full flex-col items-center gap-[48px] px-6 py-[110px]">
          <NavLinks className="justify-center" />
          <Logo h={150} />
          <SnsRow />
        </div>
      );

    /* 案1（既定）白地・横並び：いまのトンマナのまま */
    default:
      return (
        <div className="flex w-full flex-col gap-[56px] px-[120px] py-[100px]">
          <div className="flex items-end justify-between gap-10">
            <Logo h={140} />
            <div className="flex flex-col items-end gap-8">
              <NavLinks className="justify-end" />
              <SnsRow />
            </div>
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
    <motion.footer
      /* ⚠️ relative z-10 は必須。前の兄弟に sticky（positioned）があると
         描画順で上に来て、フッターの地が沈む（体験セクションで実際に起きた） */
      className={`relative z-10 w-full ${
        sky
          ? "bg-gradient-to-b from-sky-bottom via-brand/80 to-brand"
          : "bg-white"
      }`}
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <Body pat={pat} />
    </motion.footer>
  );
}
