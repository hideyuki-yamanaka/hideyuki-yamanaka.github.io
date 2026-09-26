"use client";

/*
 * ページ遷移の演出（V3.0・2026-09-16 ヒデさん依頼）
 *
 * 【2026-09-26 作り直し】ヒデさん指示
 *   「ページのトランジションは全部統一してほしい。もう少しじんわり溶けて変わる印象を、
 *     ほんの気持ちだけ。体験セクションの案とかが全部トランジションかかってない」
 *   旧：ページが【切り替わった後】に幕を一瞬かぶせて外していた。前のページはパッと消え、
 *       新しいページの上で白が点滅するだけ＝「溶けて変わる」にならず、かかっていないようにも見えた。
 *       さらにフッター・ナビの一部は window.location で【丸ごと読み込み直し】ていて幕が出なかった。
 *   新：①リンクを押す → ②前のページがじんわり幕に溶ける → ③幕の裏でページを入れ替える
 *       → ④新しいページが幕の中からじんわり現れる。
 *       ・サイト内の別ページへのリンクは【画面全体のクリックを1か所で見張って】全部ここを通す
 *         （体験セクションの案1〜5・グルメ・スポット・フッター・ナビ… 今後増えるリンクも自動で同じ）
 *       ・ボタンなどからの移動は navigateTo(href) を呼ぶ
 *       ・行き先が「ぼーっと体験」（青い背景のページ）の時だけ、幕の色をそのページの背景と
 *         同じ青にする（2026-09-20 の「ぼーっとしてみる」の幕と同じ重ね方）。動きは同じ
 *       ・ブラウザの「戻る／進む」は幕を出さない（押した瞬間にもう入れ替わっているため、
 *         幕を出すと白い点滅にしかならない）
 *
 * 仕組みの注意
 *   ・幕は position:fixed で画面全体。ふだんは pointer-events-none
 *   ・ブラーは backdrop-filter（後ろの画面をぼかす）。値を毎フレーム変えると非常に重いので、
 *     「ブラー量は固定して、幕の不透明度だけを動かす」作り（TopPage で実測済みの知見）
 *   ・ブラーをかけると幕の四隅が薄れるので、少し拡大して縁を画面の外へ逃がす（2026-09-25 の知見）
 */
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useAnimate } from "framer-motion";

export const PAGE_TRANSITION_EVENT = "abashiri:page-transition";
/** ボタンなどからのページ移動の依頼（navigateTo が出す） */
export const NAVIGATE_EVENT = "abashiri:navigate";
/** 幕をかぶせ始めた合図。トップはこれを受けて KV の動きを止める（ブラーを軽くするため） */
export const NAVIGATING_EVENT = "abashiri:navigating";

/** ボタンなどからページを移る時はこれを呼ぶ（Link / <a> は自動で拾うので不要） */
export function navigateTo(href: string) {
  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { href } }));
}

export type PageTransitionPattern = {
  name: string;
  note: string;
  /** 溶けて消える〜現れ終わるまでの合計(ms)。消える:現れる＝4:6 */
  dur: number;
  /** 固定のブラー量(px)。0ならブラー無し */
  blur: number;
  /** 幕の色（空グラデ / 白 / 黒のうすい膜） */
  veil: string;
  /** 幕自体の動き方 */
  motion: "fade" | "rise" | "zoom" | "wipe";
  /** 幕がいちばん濃くなった時の不透明度（1未満にすると向こうが透けて
      「色を挟みきらないディゾルブ」になる）。省略時は 1（完全に覆う） */
  peak?: number;
};

/** 案7（既定）の長さ・ぼかし・白の濃さの既定。
    ⚠️ 値の住み家：ここ／TopTunePanel の既定／tune-defaults.json（3つとも同じ値に） */
export const PT_DEFAULT = { dur: 1000, blur: 3, peak: 88 };

export const PAGE_TRANSITION_PATTERNS: Record<number, PageTransitionPattern> = {
  /* 【2026-09-26 ヒデさん指示】「もう少しじんわり溶けて変わる印象を、ほんの気持ちだけ」
     → 案6（うっすら白を挟む）をもとに、白を少し濃く（60→88%）・ほんの少しぼかし（3px）・
       少し長く（0.62→1.0秒）。前のページが白くじんわり溶け、次のページが白の中から現れる。
       長さ・ぼかし・白の濃さは調整パネルのつまみ（この案を選んだ時だけ出る） */
  7: {
    name: "案7",
    note: "じんわり溶ける（既定）。前のページがうっすら白くぼやけながら溶けて、次のページが白の中からじんわり現れる。案6より少しだけ溶ける印象が強い。長さ・ぼかし・白の濃さは下のつまみで",
    dur: PT_DEFAULT.dur,
    blur: PT_DEFAULT.blur,
    veil: "bg-white",
    motion: "fade",
    peak: PT_DEFAULT.peak / 100,
  },
  /* 【2026-09-24 ヒデさん指示】「ブラーでの切り替えをやめて、ディゾルブみたいに」
     → ブラーも色の幕も使わず、うっすら白を挟んですっと入れ替わるだけにする。 */
  6: {
    name: "案6",
    note: "ディゾルブ。ブラーも色の幕も使わず、うっすら白を挟んで前の画面と次の画面がすっと入れ替わる（2026-09-26 まで既定）",
    dur: 620,
    blur: 0,
    veil: "bg-white",
    motion: "fade",
    peak: 0.6,
  },
  1: {
    name: "案1",
    note: "溶ける。空の色の膜がブラーごとふわっと覆って、すっと引く",
    dur: 900,
    blur: 20,
    veil: "bg-gradient-to-b from-brand/85 via-brand/70 to-sky-bottom/85",
    motion: "fade",
  },
  2: {
    name: "案2",
    note: "白くかすむ。白い霧がかかって晴れる。いちばん静かで軽い",
    dur: 800,
    blur: 16,
    veil: "bg-white/75",
    motion: "fade",
  },
  3: {
    name: "案3",
    note: "下から霧。空色の膜が下からせり上がってきて、上へ抜けていく",
    dur: 1000,
    blur: 18,
    veil: "bg-gradient-to-t from-brand/90 to-brand/60",
    motion: "rise",
  },
  4: {
    name: "案4",
    note: "近づいてぼやける。膜がわずかに迫りながらブラーが深くなる",
    dur: 1100,
    blur: 26,
    veil: "bg-brand/70",
    motion: "zoom",
  },
  5: {
    name: "案5",
    note: "横に流れる。霧が左から右へ流れて、景色が入れ替わる",
    dur: 950,
    blur: 18,
    veil: "bg-gradient-to-r from-brand/85 via-brand/70 to-brand/85",
    motion: "wipe",
  },
};
const DEFAULT_PAT = 7;

/* 溶けて消える方は「ゆっくり始まって、ゆっくり覆いきる」、
   現れる方は「すっと引き始めて、最後はじんわり」 */
const EASE_IN = [0.45, 0, 0.55, 1] as const;
const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

/** 案ごとの「入り」「いちばん濃い所」「抜け」 */
function variantsOf(p: PageTransitionPattern, peak: number) {
  switch (p.motion) {
    case "rise":
      return {
        initial: { opacity: 0, y: "35%" },
        animate: { opacity: peak, y: "0%" },
        exit: { opacity: 0, y: "-35%" },
      };
    case "zoom":
      return {
        initial: { opacity: 0, scale: 1.08 },
        animate: { opacity: peak, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
      };
    case "wipe":
      return {
        initial: { opacity: 0, x: "-25%" },
        animate: { opacity: peak, x: "0%" },
        exit: { opacity: 0, x: "25%" },
      };
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: peak },
        exit: { opacity: 0 },
      };
  }
}

type Tune = { pat: number; dur: number; blur: number; peak: number };

export default function PageTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  /** 幕の色：white＝案の色 ／ blue＝ぼーっと体験ページの背景と同じ青 */
  const [kind, setKind] = useState<"pat" | "blue">("pat");
  const [tune, setTune] = useState<Tune>({ pat: DEFAULT_PAT, ...PT_DEFAULT });
  const tuneRef = useRef(tune);
  tuneRef.current = tune;
  /** 幕の裏で入れ替え中の行き先（着いたら現す） */
  const pending = useRef<string | null>(null);
  const busy = useRef(false);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** いまの案（案7 だけはつまみの値で上書き） */
  const current = () => {
    const t = tuneRef.current;
    const base = PAGE_TRANSITION_PATTERNS[t.pat] ?? PAGE_TRANSITION_PATTERNS[DEFAULT_PAT];
    const p: PageTransitionPattern =
      t.pat === 7 ? { ...base, dur: t.dur, blur: t.blur, peak: t.peak / 100 } : base;
    return p;
  };

  /** ④ 幕の中から新しいページを現す */
  const reveal = async () => {
    if (fallback.current) clearTimeout(fallback.current);
    const el = scope.current;
    if (!el) return;
    const p = current();
    const v = variantsOf(p, p.peak ?? 1);
    await animate(el, v.exit, { duration: (p.dur * 0.6) / 1000, ease: EASE_OUT });
    el.style.pointerEvents = "none";
    pending.current = null;
    busy.current = false;
    setKind("pat");
  };

  /** ①〜③ 幕に溶かしてから入れ替える */
  const go = async (href: string) => {
    if (busy.current) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.href = href;
      return;
    }
    const dest = url.pathname + url.search + url.hash;
    if (url.pathname === window.location.pathname) {
      router.push(dest);
      return;
    }
    busy.current = true;
    const blue = url.pathname.startsWith("/experience");
    setKind(blue ? "blue" : "pat");
    window.dispatchEvent(new CustomEvent(NAVIGATING_EVENT, { detail: { href: dest } }));
    router.prefetch(dest);
    const el = scope.current;
    if (!el) {
      router.push(dest);
      busy.current = false;
      return;
    }
    const p = current();
    /* 青い幕は体験ページの背景そのものなので、完全に覆う＆ブラー無し・動きはフェード */
    const v = blue
      ? variantsOf({ ...p, motion: "fade" }, 1)
      : variantsOf(p, p.peak ?? 1);
    el.style.pointerEvents = "auto"; /* 溶けている間の二度押しを防ぐ */
    await animate(el, v.initial, { duration: 0 });
    await animate(el, v.animate, { duration: (p.dur * 0.4) / 1000, ease: EASE_IN });
    pending.current = url.pathname;
    router.push(dest);
    /* 万一ページが変わらなくても、幕は必ず引く */
    fallback.current = setTimeout(() => void reveal(), 5000);
  };
  const goRef = useRef(go);
  goRef.current = go;
  const revealRef = useRef(reveal);
  revealRef.current = reveal;

  /* 焼き込み値を読む＋パネルからのライブ切替を受ける */
  useEffect(() => {
    const take = (d: Partial<{ v: number; pattern: number; dur: number; blur: number; peak: number }>) => {
      setTune((t) => {
        const pat = d.v ?? d.pattern;
        return {
          pat: typeof pat === "number" && PAGE_TRANSITION_PATTERNS[pat] ? pat : t.pat,
          dur: typeof d.dur === "number" ? d.dur : t.dur,
          blur: typeof d.blur === "number" ? d.blur : t.blur,
          peak: typeof d.peak === "number" ? d.peak : t.peak,
        };
      });
    };
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.pageTrans && take(d.pageTrans))
      .catch(() => {});
    const onTune = (e: Event) => {
      const detail = (e as CustomEvent<{ v: number; dur?: number; blur?: number; peak?: number; preview?: boolean }>).detail;
      if (!detail) return;
      take(detail);
      /* パネルで選んだら、その場で一度見せる（遷移しなくても確かめられる） */
      if (detail.preview && !busy.current) {
        window.setTimeout(async () => {
          const el = scope.current;
          if (!el || busy.current) return;
          busy.current = true;
          const p = current();
          const v = variantsOf(p, p.peak ?? 1);
          await animate(el, v.initial, { duration: 0 });
          await animate(el, v.animate, { duration: (p.dur * 0.4) / 1000, ease: EASE_IN });
          await revealRef.current();
        }, 30);
      }
    };
    /* サイト内の別ページへのリンクを全部拾う（capture＝どのボタンの処理より先に見る）。
       ⚠️ ここで preventDefault すると、Next の Link は自分では動かない（defaultPrevented を見て止まる） */
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      if (a.dataset.noVeil !== undefined) return;
      const raw = a.getAttribute("href") || "";
      if (!raw || raw.startsWith("#") || /^(mailto|tel):/.test(raw)) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; /* 同じページ内の移動は各部品にまかせる */
      e.preventDefault();
      void goRef.current(url.href);
    };
    const onNavigate = (e: Event) => {
      const href = (e as CustomEvent<{ href: string }>).detail?.href;
      if (typeof href === "string") void goRef.current(href);
    };
    window.addEventListener(PAGE_TRANSITION_EVENT, onTune);
    window.addEventListener(NAVIGATE_EVENT, onNavigate);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(PAGE_TRANSITION_EVENT, onTune);
      window.removeEventListener(NAVIGATE_EVENT, onNavigate);
      document.removeEventListener("click", onClick, true);
      if (fallback.current) clearTimeout(fallback.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 着いたら（新しいページが描かれてから）現す */
  useEffect(() => {
    if (!pending.current || pathname !== pending.current) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => void revealRef.current());
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [pathname]);

  const p = current();
  const blurPx = kind === "pat" ? p.blur : 0;
  return (
    <motion.div
      ref={scope}
      data-page-veil
      aria-hidden
      /* ⚠️ ブラー量は固定。毎フレーム変えると極端に重くなる。
         ブラーの時は少し拡大して、薄れた四隅を画面の外へ逃がす */
      className={`pointer-events-none fixed inset-0 z-[100] ${kind === "blue" ? "bg-sky-bottom" : p.veil}`}
      style={{
        opacity: 0,
        backdropFilter: blurPx ? `blur(${blurPx}px)` : undefined,
        WebkitBackdropFilter: blurPx ? `blur(${blurPx}px)` : undefined,
        scale: blurPx ? 1.06 : 1,
      }}
    >
      {kind === "blue" && (
        /* ぼーっと体験ページの空にかぶる青（Stage の brandOverlay）と同じ重ね方。
           幕がそのまま次のページの背景に見える（2026-09-20 の幕と同じ） */
        <div className="absolute inset-0 bg-gradient-to-b from-brand via-brand/45 to-transparent" />
      )}
    </motion.div>
  );
}
