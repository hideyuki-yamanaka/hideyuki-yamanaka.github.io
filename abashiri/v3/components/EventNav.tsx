"use client";

/*
 * 体験セクション 案2（カードを切る）の送りボタン 5案
 *
 * 【2026-10-14 ヒデさん指示】
 *   「左右のボタンは文字のカルーセルスライドショーに被るのでやめたいです。5バリエーションぐらい
 *     カルーセルの左右ボタンのアイデアをください。丸くボタンになってない形でもいいと思います。
 *     位置を変えてもいいと思います」
 *   → 束の左右（上下の真ん中）に置いていた丸いボタンは、後ろを流れる「意外とオモロい、網走。」の
 *     帯とちょうど同じ高さだった。どの案も、帯から離れた「束の下」に置く（案3 はボタンを置かない）
 *   選び方：調整パネル › バリエーション › 体験セクション › 送りボタン（案2 を選んだ時だけ出る）
 *
 *   案1 番号と矢印 …… 束の下の真ん中に「‹ 01 / 04 ›」。今が何枚目かも分かる
 *   案2 番号のタブ …… 束の下に「‹ 01 02 03 04 ›」。番号を押すとその体験へ飛ぶ。今の番号に細い下線
 *   案3 カーソル …… ボタンは置かない。束の左右の余白にカーソルを乗せると、丸い矢印のカーソルになり、
 *                     押すと送る（作りは EventVariants4 の MarqueeStack）。
 *                     スマホは写真を左右にスワイプ・束の左右をタップ（作りは MobileEvents の StackScene）
 *   案4 丸いボタンを下に … 場所えらびと同じ丸いボタン（CarouselArrow）を、束の下に2つ並べる
 *   案5 細い線の矢印 …… 束の下の左右の端に、細く長い線の矢印。乗せると線が矢印の向きへ少し伸びる
 *
 * 🟡仮置き（カンプが無いので Claude が決めた所）：
 *   ・置き場所：束のいちばん下の角から 32px 下（PC・スマホとも）
 *   ・数字：Inter Light（数字は Inter の決まり）・PC 16px／スマホ 14px（案1）、PC 14px／スマホ 12px（案2）
 *   ・色：今の番号と矢印＝文字の色（Text_Default）／それ以外＝その 40%（案2 の番号は 30%）
 *   ・矢印：線の太さ 1.2（案1・2）・1（案5）。押せる範囲は PC 40px／スマホ 44px の四角
 *   ・案3 のカーソル：72px の丸・文字の色の 80% の地に白い矢印
 *   ・案5 の線：PC 64px／スマホ 48px。乗せると 1.25 倍に伸びる
 *   ・動き：番号の入れ替わり・下線・伸びる線は Ease_Standard 0.5秒
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CarouselArrow from "./CarouselArrow";

export const EV_NAVS: Record<number, { name: string; note: string }> = {
  1: { name: "番号と矢印", note: "写真の束の下の真ん中に「‹ 01 / 04 ›」。今が何枚目かも分かる。矢印を押すと送る／戻す" },
  2: { name: "番号のタブ", note: "束の下に「‹ 01 02 03 04 ›」。番号を押すと、その体験へ飛ぶ（近い向きへ何枚か続けて切る）。今の番号に細い下線" },
  3: { name: "カーソルが矢印に", note: "ボタンは置かない。束の左右の余白にカーソルを乗せると、カーソルが丸い矢印に変わり、押すと送る。スマホは写真を左右にスワイプ（束の左右のすき間をタップでも送れる）" },
  4: { name: "丸いボタンを下に", note: "場所えらびと同じ丸いボタンを、束の下に2つ並べる（いちばん見慣れた形）" },
  5: { name: "細い線の矢印", note: "束の下の左右の端に、細く長い線の矢印（←— と —→）。カーソルを乗せると、線が矢印の向きへ少し伸びる" },
};
/** 既定の案。値の住み家：ここ／TopTunePanel の DEFAULTS／tune-defaults.json／globals.css の --ev-nav（4つとも同じ値） */
export const EV_NAV_DEFAULT = 1;

/** 調整パネルの「送りボタン」（CSS 変数 --ev-nav）を読む。パネルが値を書き換えるたびに読み直す */
export function useEvNav() {
  const [nav, setNav] = useState(EV_NAV_DEFAULT);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const v = parseInt(getComputedStyle(root).getPropertyValue("--ev-nav"), 10);
      setNav(EV_NAVS[v] ? v : EV_NAV_DEFAULT);
    };
    read();
    /* パネルは html の style に CSS 変数を書く。書き換わった時だけ読み直す（毎フレームは読まない） */
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["style"] });
    return () => mo.disconnect();
  }, []);
  return nav;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** 細い線のシェブロン（案1・2）。押せる範囲は四角いまま、見た目は線だけ */
function ThinArrow({ dir, onClick, sp }: { dir: "left" | "right"; onClick: () => void; sp: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "前の体験へ" : "次の体験へ"}
      className={`group flex ${sp ? "size-[44px]" : "size-[40px]"} cursor-pointer items-center justify-center text-ink/80 transition-colors duration-300 ease-standard hover:text-ink`}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className={`size-[16px] transition-transform duration-500 ease-standard ${
          dir === "left" ? "group-hover:-translate-x-[2px]" : "group-hover:translate-x-[2px]"
        }`}
      >
        <path
          d={dir === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** 細く長い線の矢印（案5）。乗せると矢印の向きへ線が伸び、先の「く」も一緒に動く */
function LineArrow({ dir, onClick, sp }: { dir: "left" | "right"; onClick: () => void; sp: boolean }) {
  const left = dir === "left";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={left ? "前の体験へ" : "次の体験へ"}
      className={`group flex ${sp ? "h-[44px]" : "h-[40px]"} cursor-pointer items-center text-ink/60 transition-colors duration-300 ease-standard hover:text-ink`}
    >
      <span className={`relative block h-[16px] ${sp ? "w-[48px]" : "w-[64px]"}`}>
        {/* 線：内側の端を止めて、外側（矢印の向き）へ伸ばす */}
        <span
          className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current transition-transform duration-500 ease-standard group-hover:scale-x-125 ${
            left ? "origin-right" : "origin-left"
          }`}
        />
        {/* 先の「く」：線が伸びたぶん（線の長さの 1/4）外へ動く */}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className={`absolute top-0 size-[16px] transition-transform duration-500 ease-standard ${
            left
              ? `left-0 ${sp ? "group-hover:-translate-x-[12px]" : "group-hover:-translate-x-[16px]"}`
              : `right-0 ${sp ? "group-hover:translate-x-[12px]" : "group-hover:translate-x-[16px]"}`
          }`}
        >
          <path
            d={left ? "M7 2L0.5 8 7 14" : "M9 2l6.5 6L9 14"}
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

/** 2桁の番号（01・02…） */
const two = (n: number) => String(n).padStart(2, "0");

/**
 * 送りボタン（案1・2・4・5）。案3 はボタンを出さない（null）。
 * 置き場所（束の下）と横幅（束の幅）は使う側が決める。この部品はその箱の中で並べるだけ
 */
export function EvNav({
  nav,
  top,
  count,
  onStep,
  onJump,
  sp = false,
}: {
  nav: number;
  /** いちばん上の体験（ITEMS の添字） */
  top: number;
  count: number;
  /** 1枚送る（1）／戻す（-1） */
  onStep: (dir: 1 | -1) => void;
  /** その番号の体験へ飛ぶ（案2） */
  onJump: (i: number) => void;
  /** スマホの大きさ */
  sp?: boolean;
}) {
  const prev = () => onStep(-1);
  const next = () => onStep(1);
  switch (nav) {
    case 1:
      return (
        <div className={`flex items-center ${sp ? "gap-3" : "gap-4"}`}>
          <ThinArrow dir="left" onClick={prev} sp={sp} />
          <p
            className={`flex items-center font-num font-light leading-none tabular-nums ${sp ? "text-body-14" : "text-body-16"}`}
            aria-live="polite"
          >
            <span className="inline-block overflow-hidden">
              <motion.span
                key={top}
                className="inline-block text-ink"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {two(top + 1)}
              </motion.span>
            </span>
            <span className={`${sp ? "mx-2" : "mx-3"} text-ink/40`}>/</span>
            <span className="text-ink/40">{two(count)}</span>
          </p>
          <ThinArrow dir="right" onClick={next} sp={sp} />
        </div>
      );
    case 2:
      return (
        <div className={`flex items-center ${sp ? "gap-1" : "gap-3"}`}>
          <ThinArrow dir="left" onClick={prev} sp={sp} />
          <div className={`flex items-center ${sp ? "gap-0" : "gap-1"}`}>
            {Array.from({ length: count }, (_, i) => {
              const on = i === top;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onJump(i)}
                  aria-label={`体験${i + 1}へ`}
                  aria-current={on ? "true" : undefined}
                  className={`relative flex ${sp ? "h-[44px] px-2 text-body-12" : "h-[40px] px-2 text-body-14"} cursor-pointer items-center font-num font-light leading-none tabular-nums transition-colors duration-300 ease-standard ${
                    on ? "text-ink" : "text-ink/30 hover:text-ink/60"
                  }`}
                >
                  {two(i + 1)}
                  {/* 今の番号の下線（左から伸びる） */}
                  <span
                    className={`absolute inset-x-2 ${sp ? "bottom-[12px]" : "bottom-[8px]"} h-px origin-left bg-ink transition-transform duration-500 ease-standard ${
                      on ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <ThinArrow dir="right" onClick={next} sp={sp} />
        </div>
      );
    case 4:
      return (
        <div className="flex items-center gap-4">
          <CarouselArrow dir="left" label="前の体験へ" tone="onLight" size={sp ? "sm" : "md"} onClick={prev} />
          <CarouselArrow dir="right" label="次の体験へ" tone="onLight" size={sp ? "sm" : "md"} onClick={next} />
        </div>
      );
    case 5:
      /* 束の幅いっぱいに置いて、左右の端へ寄せる（使う側の箱の幅＝束の幅） */
      return (
        <div className="flex w-full items-center justify-between">
          <LineArrow dir="left" onClick={prev} sp={sp} />
          <LineArrow dir="right" onClick={next} sp={sp} />
        </div>
      );
    default:
      return null;
  }
}

/** 案3（PC）のカーソル。72px の丸に白い矢印。位置は使う側が x・y で動かす */
export function CursorBall({ dir }: { dir: "left" | "right" }) {
  return (
    <span className="flex size-[72px] items-center justify-center rounded-full bg-ink/80 text-white">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-[24px]">
        <path
          d={dir === "left" ? "M15 5L8 12l7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
