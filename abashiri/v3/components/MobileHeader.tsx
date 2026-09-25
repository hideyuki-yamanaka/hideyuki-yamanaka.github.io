"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import SiteLogo from "./SiteLogo";
import { topTuneStorageKey } from "./tuneKeys";

/** スマホのヘッダー（左＝環境音ON/OFFの置き場、右＝ハンバーガー）とメニュー。
 *
 * 【2026-09-24 ヒデさん指摘】
 *   「詳細ページのヘッダーなどのパーツが微妙に違うので、
 *     トップで使われているものにしてください」
 *   → スマホのトップ（MobileTop）は PC のナビ（GlobalNav）ではなく
 *     この形のヘッダーを出している。詳細ページだけ PC のナビを出していたので、
 *     同じ部品をここへ切り出して【1つのコピー】を両方から使う。
 *
 * ⚠️ 置き場（#abashiri-sound-slot）が画面に無いと、SoundUi は左下に出てしまう。
 *    この部品を出すときは、ほかに置き場を作らないこと（IDは1画面に1つ）。
 */

export const MOBILE_NAV: { label: string; scene: number }[] = [
  { label: "ホーム", scene: 0 },
  { label: "ぼーっとスポット", scene: 2 },
  { label: "グルメ", scene: 6 },
  { label: "体験", scene: 7 },
];

/** トップ以外のページからメニューで飛ぶ時の行き先の預け先 */
export const MOBILE_GOTO_KEY = "abashiri-goto-scene";

/* ── ドロワー（ハンバーガーを押すと出る中身）の3案 ─────────────
   【2026-09-26 ヒデさん指示】
     「テキストを入れただけの殺風景なデザイン。作字のロゴ（吹き出しの上に網走市観光サイト
       が付いているセット）を持ってきて、ドロワーの中のデザインを3バリエーション、
       調整パネルで選べるように」
   ⚠️ どの案かはトップの調整パネル（サイト共通 → ハンバーガーメニュー）で選ぶ。
      スマホの画面にはそのパネルが無いので、ここでは保存値（localStorage）と
      焼き込み（tune-defaults.json）を直接読む */
export const MENU_DRAWERS: Record<number, { name: string; note: string }> = {
  1: {
    name: "案1 空に浮かぶ作字",
    note: "網走の空と海の写真の上に、白い作字を大きく中央に置く。メニューは白い文字で中央に縦並び。サイトの入口（キービジュアル）と同じ空気",
  },
  2: {
    name: "案2 白い紙に番号",
    note: "白地に青い作字を左上に。メニューは「01 ホーム」のように番号を付けて左ぞろえ、細い区切り線と矢印。本の目次のように静か",
  },
  3: {
    name: "案3 写真のタイル",
    note: "空色のグラデに白い作字。メニューは2×2の写真タイル（ホーム＝海・スポット＝能取岬・グルメ＝料理・体験＝監獄）。押す前に行き先が絵でわかる",
  },
};
export const MENU_DRAWER_DEFAULT = 1;
/** 案を変えた時に知らせる合図（調整パネル → このメニュー） */
export const MENU_DRAWER_EVENT = "abashiri:menu-drawer";

const TILE_IMG: Record<number, string> = {
  0: "/img/bg-hero.jpg",
  2: "/img/spot-notoro.webp",
  6: "/img/gourmet-new-1.webp",
  7: "/img/spot/kangoku-1.webp",
};

/** いまのドロワーの案。保存値 → 焼き込み → 既定 の順に読む */
function useDrawerVariant(): [number, boolean, (v: boolean) => void] {
  const [v, setV] = useState(MENU_DRAWER_DEFAULT);
  const [forceOpen, setForceOpen] = useState(false);
  useEffect(() => {
    let baked: number | null = null;
    const read = () => {
      let n: number | null = null;
      try {
        const raw = localStorage.getItem(topTuneStorageKey());
        const d = raw ? JSON.parse(raw)?.menu?.drawer : undefined;
        if (MENU_DRAWERS[d]) n = d;
      } catch {}
      if (n == null && baked != null) n = baked;
      setV(n ?? MENU_DRAWER_DEFAULT);
    };
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && MENU_DRAWERS[d?.menu?.drawer]) baked = d.menu.drawer;
        read();
      })
      .catch(() => read());
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === topTuneStorageKey()) read();
    };
    /* 調整パネルで選んだ時：その場で切り替え、スマホ枠の中では開いて見せる */
    const onPick = (e: Event) => {
      const d = (e as CustomEvent<{ v: number; open?: boolean }>).detail;
      if (d && MENU_DRAWERS[d.v]) setV(d.v);
      if (d?.open) setForceOpen(true);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("tp:remote-apply", read);
    window.addEventListener(MENU_DRAWER_EVENT, onPick);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tp:remote-apply", read);
      window.removeEventListener(MENU_DRAWER_EVENT, onPick);
    };
  }, []);
  return [v, forceOpen, setForceOpen];
}

/* 開く時の動き（3案共通）：ふわっとブラーが晴れる。項目は少しずつ遅れて出る */
const EASE = [0.22, 1, 0.36, 1] as const;
const itemIn = (i: number) => ({
  initial: { opacity: 0, y: 14, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.55, ease: EASE, delay: 0.12 + i * 0.06 },
});

export default function MobileHeader({
  dark,
  onScene,
}: {
  /** 白い背景の上に出ている時は true（線と字を黒へ） */
  dark: boolean;
  /** トップページのとき：その場で場面を移す。
      渡されない時（詳細ページなど）はトップへ移動してからその場面を開く */
  onScene?: (scene: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [variant, forceOpen, setForceOpen] = useDrawerVariant();

  /* 調整パネルで案を選んだ時は、スマホ枠の中で開いて見せる */
  useEffect(() => {
    if (!forceOpen) return;
    setOpen(true);
    setForceOpen(false);
  }, [forceOpen, setForceOpen]);

  const go = (scene: number) => {
    setOpen(false);
    if (onScene) {
      onScene(scene);
      return;
    }
    try {
      sessionStorage.setItem(MOBILE_GOTO_KEY, String(scene));
    } catch {}
    router.push("/");
  };

  const light = variant !== 2; /* 案2 だけ白地（線や字を濃い色に） */

  return (
    <>
      {/* 固定追従ヘッダー：左=環境音ON/OFF、右=ハンバーガー
          （全シーン共通。2026-08-28 ヒデさん指示） */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 pt-5">
        <div
          id="abashiri-sound-slot"
          className="pointer-events-auto flex h-[22px] origin-left scale-[0.72] items-center"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          className="pointer-events-auto flex size-9 items-center justify-center"
        >
          <span className="relative block h-[11px] w-[24px]">
            <span
              className={`absolute left-0 top-0 h-[1.5px] w-full rounded-full ${dark ? "bg-ink" : "bg-white"}`}
            />
            <span
              className={`absolute bottom-0 left-0 h-[1.5px] w-full rounded-full ${dark ? "bg-ink" : "bg-white"}`}
            />
          </span>
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            key={"drawer-" + variant}
            aria-label="メニュー"
            className={`fixed inset-0 z-50 overflow-y-auto ${light ? "text-white" : "bg-white text-ink"}`}
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {/* 背景（案ごと） */}
            {variant === 1 && (
              <div className="pointer-events-none fixed inset-0">
                <img src="/img/bg-hero.jpg" alt="" className="size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-brand/70 via-brand/35 to-brand/80" />
              </div>
            )}
            {variant === 3 && (
              <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-sky-top to-brand" />
            )}

            {/* 閉じる */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className={`fixed right-6 top-5 z-10 flex size-9 items-center justify-center ${light ? "text-white" : "text-ink"}`}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* ── 案1 空に浮かぶ作字 ── */}
            {variant === 1 && (
              <div className="relative flex min-h-full flex-col items-center px-6 pb-16 pt-[14vh]">
                <motion.div {...itemIn(0)}>
                  <SiteLogo height={168} tone="light" />
                </motion.div>
                <ul className="mt-14 flex flex-col items-center gap-8">
                  {MOBILE_NAV.map((item, i) => (
                    <motion.li key={item.label} {...itemIn(i + 1)}>
                      <button
                        type="button"
                        onClick={() => go(item.scene)}
                        className="text-body-18 font-light leading-none tracking-[0.12em] text-white"
                      >
                        {item.label}
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── 案2 白い紙に番号 ── */}
            {variant === 2 && (
              <div className="relative flex min-h-full flex-col px-7 pb-16 pt-[88px]">
                <motion.div {...itemIn(0)}>
                  <SiteLogo height={118} tone="blue" />
                </motion.div>
                <ul className="mt-12 flex flex-col">
                  {MOBILE_NAV.map((item, i) => (
                    <motion.li key={item.label} {...itemIn(i + 1)} className="border-b border-ink/12">
                      <button
                        type="button"
                        onClick={() => go(item.scene)}
                        className="flex w-full items-center gap-5 py-5 text-left"
                      >
                        <span className="w-7 font-num text-body-13 font-light tabular-nums text-ink/45">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-[22px] font-thin leading-none tracking-[0.06em] text-ink">
                          {item.label}
                        </span>
                        <img src="/img/icon-view-more-black.svg" alt="" className="size-[18px] opacity-60" />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── 案3 写真のタイル ── */}
            {variant === 3 && (
              <div className="relative flex min-h-full flex-col items-center px-5 pb-12 pt-[76px]">
                <motion.div {...itemIn(0)}>
                  <SiteLogo height={132} tone="light" />
                </motion.div>
                <ul className="mt-10 grid w-full grid-cols-2 gap-3">
                  {MOBILE_NAV.map((item, i) => (
                    <motion.li key={item.label} {...itemIn(i + 1)}>
                      <button
                        type="button"
                        onClick={() => go(item.scene)}
                        className="relative block aspect-[4/5] w-full overflow-hidden rounded-[14px] text-left"
                      >
                        <img
                          src={TILE_IMG[item.scene] || "/img/bg-hero.jpg"}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <span className="absolute inset-x-3 bottom-3 text-body-16 font-light leading-tight text-white">
                          {item.label}
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
