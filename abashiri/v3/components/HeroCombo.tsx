"use client";

/*
 * キービジュアル 決定版候補（なぞり書き × 伸ばし棒ビヨーン の組み合わせ）
 *
 * 1. 吹き出しがブラーで出現
 * 2. 「な」をなぞり書き
 * 3. 伸ばし棒が曲線のままビヨーンと伸びて、なじみバウンスで戻る
 *    （線幅はカンプのストローク5で一定。戻った線がそのまま「〜」になる）
 * 4. 「んにもない」を本当のひらがなの書き順でなぞり書き
 * 5. 「たまらない」（あしらい込み）はまとめてブラーで出現
 * 6. その後「ぼーっとしてみる」ボタン →（TopPage経由で）最後にイラスト
 */
import { useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { WRITE_PACES } from "./writePaces";
import { DEFAULT_HERO_TIMING, type HeroTiming } from "./heroTiming";
import { collect, groupIntoCharacters, traceReveal, SVG_NS } from "./writingCore";

/** な〜んにもない（〜を除く）の画数：な3・ん1・に3・も1・な4・い2 */
const UPPER_STROKES = [3, 1, 3, 1, 4, 2];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function HeroCombo({
  pace = 2,
  timing = DEFAULT_HERO_TIMING,
  onScheduled,
}: {
  pace?: number;
  timing?: HeroTiming;
  /** 呼び出し時点からの残り時間(ms)で通知 */
  onScheduled?: (endMs: number) => void;
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
      const upper = rest.filter((i) => i.midY < 205);
      const lower = rest.filter((i) => i.midY >= 205);
      const tilde = upper.find((i) => i.w > 40 && i.h < 25);
      const upperLetters = upper.filter((i) => i !== tilde);
      const chars = groupIntoCharacters(upperLetters, UPPER_STROKES);

      /* 初期状態：全部隠す */
      [...upper, ...lower].forEach((i) => (i.p.style.opacity = "0"));
      if (bubble) bubble.style.opacity = "0";

      /* 伸ばし棒（案1なじみバウンス・線のまま・うねり強め） */
      const letterFill = chars[0]?.[0]?.p.getAttribute("fill") || "#0070C9";
      const tb = tilde ?? { x: 130, top: 96, w: 55, h: 14, midY: 103 };
      const sx = tb.x;
      const cy = tb.top + tb.h / 2;
      const finalW = tb.w;
      const amp = Math.max(3.5, tb.h * 0.38);
      const strokeW = 5; /* カンプのストローク値 */
      const bubbleBox = bubble?.getBBox();
      const longW = bubbleBox
        ? Math.max(finalW * 2.2, bubbleBox.x + bubbleBox.width - 34 - sx)
        : finalW * 3;

      const bar = document.createElementNS(SVG_NS, "path");
      bar.setAttribute("fill", "none");
      bar.setAttribute("stroke", letterFill);
      bar.setAttribute("stroke-width", String(strokeW));
      bar.setAttribute("stroke-linecap", "round");
      bar.style.opacity = "0";
      svg.appendChild(bar);
      let barW = finalW * 0.5;
      const redraw = () => {
        /* カンプの「〜」に寄せて、しっかりうねらせる（制御点は見た目の約1.6倍） */
        const ratio = Math.max(0.4, barW / finalW);
        const a = amp * 1.6 * Math.pow(ratio, 0.85);
        bar.setAttribute(
          "d",
          `M ${sx} ${cy} C ${sx + barW * 0.3} ${cy - a} ${sx + barW * 0.7} ${cy + a} ${sx + barW} ${cy}`
        );
      };
      redraw();

      const wp = WRITE_PACES[pace] ?? WRITE_PACES[2];

      /* ===== ここから本番の流れ ===== */
      await wait(timing.start);
      if (aborted) return;

      /* 1. 吹き出しがブラーで出現 */
      if (bubble) {
        bubble.animate(
          [
            { opacity: 0, filter: "blur(16px)" },
            { opacity: 1, filter: "blur(0px)" },
          ],
          { duration: 900, fill: "forwards", easing: "cubic-bezier(0.33,1,0.68,1)" }
        );
      }
      await wait(680);
      if (aborted) return;

      /* 2. 「な」をなぞり書き */
      let naDelay = 0;
      (chars[0] ?? []).forEach((it) => {
        const dur = traceReveal(svg, it.p, naDelay, wp);
        it.p.style.opacity = "1";
        naDelay += dur * wp.overlap + wp.gap;
      });
      await wait(naDelay + 120);
      if (aborted) return;

      /* 3. 伸ばし棒がビヨーン → なじみバウンスで戻る（戻った線がそのまま「〜」） */
      bar.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 140,
        fill: "forwards",
        easing: "ease-out",
      });
      bar.style.opacity = "1";
      await animate(finalW * 0.5, longW, {
        duration: 0.52,
        ease: [0.3, 1.08, 0.5, 1],
        onUpdate: (v) => {
          barW = v;
          redraw();
        },
      });
      await wait(110);
      if (aborted) return;
      await animate(longW, finalW, {
        type: "spring",
        stiffness: 210,
        damping: 15,
        onUpdate: (v) => {
          barW = v;
          redraw();
        },
      });
      if (aborted) return;

      /* 4. 「んにもない」を書き順どおりなぞり書き */
      let d2 = 130;
      chars.slice(1).forEach((strokes) => {
        strokes.forEach((it) => {
          const dur = traceReveal(svg, it.p, d2, wp);
          it.p.style.opacity = "1";
          d2 += dur * wp.overlap + wp.gap;
        });
      });
      await wait(d2 + 200);
      if (aborted) return;

      /* 5. たまらない（あしらい込み）はまとめてブラーで出現 */
      const blurDur = Math.min(timing.kotoba.duration, 1200);
      lower.forEach((it) => {
        it.p.animate(
          [
            { opacity: 0, filter: `blur(${timing.kotoba.blur}px)` },
            { opacity: 1, filter: "blur(0px)" },
          ],
          {
            duration: blurDur,
            fill: "forwards",
            easing: "cubic-bezier(0.33, 1, 0.68, 1)",
          }
        );
      });

      onScheduled?.(blurDur + 80);
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
