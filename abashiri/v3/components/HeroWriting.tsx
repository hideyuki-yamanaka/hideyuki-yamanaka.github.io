"use client";

/*
 * キービジュアルの手書きアニメーション（採用版・なぞり書き）
 *
 * - 吹き出し＋「な〜んにもない」…… まとめて一枚のブラーで出現
 * - 「たまらない」…… 実際のひらがなの書き順でなぞり書き
 * - 下の曲線のあしらい …… 「い」の書き始めと同時に左から右へ
 *
 * タイミングは heroTiming.ts の共通パラメーターで調整できる。
 */
import { useEffect, useRef } from "react";
import { WRITE_PACES } from "./writePaces";
import { DEFAULT_HERO_TIMING, type HeroTiming } from "./heroTiming";
import { collect, writeTamaranai } from "./writingCore";

export default function HeroWriting({
  pace = 2,
  timing = DEFAULT_HERO_TIMING,
  onScheduled,
}: {
  /** 1〜3: 書くスピード（WRITE_PACES） */
  pace?: number;
  /** タイミング設定（heroTiming.ts） */
  timing?: HeroTiming;
  /** 書き終わり予定時刻(ms)を通知（ボタン・イラスト出現の起点） */
  onScheduled?: (writingEndMs: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      const res = await fetch("/img/hero-message.svg");
      const text = await res.text();
      if (aborted || !ref.current) return;
      ref.current.innerHTML = text;
      const svg = ref.current.querySelector("svg");
      if (!svg) return;
      svg.setAttribute("width", "471");
      svg.setAttribute("height", "390");

      const { bubble, rest } = collect(svg);
      const upper = rest.filter((i) => i.midY < 205); // な〜んにもない
      const lower = rest.filter((i) => i.midY >= 205); // たまらない＋あしらい

      const kotobaStart = timing.start + timing.kotoba.delay;

      /* 吹き出し＋な〜んにもない：まとめて一枚のブラーで出現 */
      const groupPaths = [...(bubble ? [bubble] : []), ...upper.map((i) => i.p)];
      groupPaths.forEach((p) => {
        p.style.opacity = "0";
        p.animate(
          [
            { opacity: 0, filter: `blur(${timing.kotoba.blur}px)` },
            { opacity: 1, filter: "blur(0px)" },
          ],
          {
            duration: timing.kotoba.duration,
            delay: kotobaStart,
            fill: "forwards",
            easing: "cubic-bezier(0.33, 1, 0.68, 1)",
          }
        );
      });

      /* たまらない＋あしらい：書き順どおりになぞる */
      const wp = WRITE_PACES[pace] ?? WRITE_PACES[2];
      const writingEnd = writeTamaranai(
        svg,
        lower,
        kotobaStart + timing.tamaranai.delay,
        wp,
        timing.flourish.offset
      );

      const total = Math.max(kotobaStart + timing.kotoba.duration, writingEnd);
      onScheduled?.(total);
    })();
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pace, timing]);

  return (
    <div ref={ref} className="h-[390px] w-[471px]" aria-label="な〜んにもない たまらない" />
  );
}
