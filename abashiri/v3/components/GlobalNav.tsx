"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type GlobalNavProps = {
  /** light: 白文字（写真の上） / dark: 黒文字（体験フロー） */
  theme: "light" | "dark";
  size?: "md" | "sm";
};

/* カンプ 15492:22184（2026-08-22 更新版）：4項目・gap 32px。
   宿泊・よくある質問は撤去。スポットとグルメはトップのスクロール位置へジャンプ */
const ITEMS: { label: string; href?: string; anchor?: string }[] = [
  /* ホームは一番左。押すと TOP ページへ戻る */
  { label: "ホーム", href: "/" },
  { label: "ぼーっとスポット", anchor: "#spot" },
  { label: "グルメ", anchor: "#gourmet" },
  { label: "体験", href: "/experience" },
];

export default function GlobalNav({ theme, size = "md" }: GlobalNavProps) {
  const color = theme === "light" ? "text-white" : "text-ink";
  const fontSize = size === "sm" ? "text-control-14" : "text-body-16";
  const pathname = usePathname();

  /* 「ホーム」の挙動（2026-08-18 ヒデさん指示）
       ・他のページにいる時 … トップページへ飛ぶ（Link のまま）
       ・すでにトップページにいる時 … 画面を一番上まで戻す
     トップページは window ではなく中の箱がスクロールするので、
     data-abashiri-scroller を探してその箱を戻す。 */
  const onHomeClick = (e: React.MouseEvent) => {
    if (pathname !== "/") return; /* 別ページなら普通に遷移させる */
    e.preventDefault();
    /* ⚠️ 以前はここで自前の rAF ループが scrollTop を書いていたが、
       TopPage の慣性スクロール（targetY へ毎フレーム追従）と取り合いになり、
       直前にスクロールしていると効かないことがあった（2026-08-23 ヒデさん指摘）。
       いまは「行き先」をイベントで渡して、動かすのは TopPage 一本にしている */
    window.dispatchEvent(
      new CustomEvent("abashiri:scroll-to", { detail: { y: 0 } })
    );
  };
  /* 「ぼーっとスポット」「グルメ」はトップのスクロールで到達する画面なので、
     アンカーではなく scroller のスクロール量ジャンプで飛ぶ。
     行き先は TopPage が data-spot-at / data-gourmet-at に入れている */
  const jumpTo = (e: React.MouseEvent, key: "spotAt" | "gourmetAt") => {
    e.preventDefault();
    const sc = document.querySelector<HTMLElement>("[data-abashiri-scroller]");
    const at = sc?.dataset[key];
    if (!sc || !at) {
      /* トップ以外（体験ページなど）から押された：行き先を覚えてトップへ移動し、
         トップ側が着いてからその位置へスクロールする（2026-08-23 ヒデさん報告の修正） */
      try {
        sessionStorage.setItem("abashiri-goto", key);
      } catch {}
      window.location.href = "/";
      return;
    }
    /* 動かすのは TopPage の慣性スクロール一本（上の onHomeClick と同じ理由） */
    window.dispatchEvent(
      new CustomEvent("abashiri:scroll-to", { detail: { y: Number(at) } })
    );
  };

  /* 「体験」：すでに体験ページにいる時は、導入（1画面目）へ戻す
     （同じURLへのリンクは何も起きないため。2026-08-23 ヒデさん指示） */
  const onExpClick = (e: React.MouseEvent) => {
    if (pathname !== "/experience") return; /* 別ページなら普通に遷移 */
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("abashiri:exp-reset"));
  };

  return (
    <nav
      /* カンプ 15492:22184: top 32px / gap 32px / Noto Sans JP Light 300 / 16px / 行間 1.2 */
      className={`absolute left-1/2 top-[32px] z-20 flex -translate-x-1/2 items-center gap-8 whitespace-nowrap font-light leading-[1.2] transition-colors duration-500 ease-standard ${color} ${fontSize}`}
    >
      {ITEMS.map((item) =>
        item.href ? (
          <Link
            key={item.label}
            href={item.href}
            onClick={
              item.href === "/"
                ? onHomeClick
                : item.href === "/experience"
                  ? onExpClick
                  : undefined
            }
            className="transition-opacity hover:opacity-70"
          >
            {item.label}
          </Link>
        ) : (
          <a
            key={item.label}
            href={item.anchor ?? "#"}
            onClick={(e) => {
              if (!item.anchor) e.preventDefault();
              else if (item.anchor === "#gourmet") jumpTo(e, "gourmetAt");
              else if (item.anchor === "#spot") jumpTo(e, "spotAt");
            }}
            className="transition-opacity hover:opacity-70"
          >
            {item.label}
          </a>
        )
      )}
    </nav>
  );
}
