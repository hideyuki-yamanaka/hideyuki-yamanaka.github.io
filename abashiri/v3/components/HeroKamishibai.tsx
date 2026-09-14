"use client";

/*
 * キービジュアル 紙芝居パターン
 *
 * 1. 吹き出しだけがブラーで出現
 * 2. 「な」がぽんと出る
 * 3. 伸ばし棒がビヨーンと長く伸びる（既存パスを引き延ばさず、
 *    同じ太さの線を新規に描いて伸縮させるので潰れない）
 * 4. バネで縮んで「〜」に収まる（収まった瞬間に本物の字形へ差し替え）
 * 5. 「んにもない」が紙芝居っぽく順に出る
 * 6. 「たまらない」は採用済みのなぞり書き＋あしらい
 */
import { useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { WRITE_PACES } from "./writePaces";
import { DEFAULT_HERO_TIMING, type HeroTiming } from "./heroTiming";
import { collect, groupIntoCharacters, writeTamaranai, SVG_NS } from "./writingCore";
import { KAMI_PATTERNS } from "./kamiPatterns";

/** な〜んにもない（〜を除く）の画数：な3・ん1・に3・も1・な4・い2 */
const UPPER_STROKES = [3, 1, 3, 1, 4, 2];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function HeroKamishibai({
  variant = 1,
  pace = 2,
  timing = DEFAULT_HERO_TIMING,
  onScheduled,
}: {
  variant?: number;
  pace?: number;
  timing?: HeroTiming;
  /** 呼び出し時点からの残り時間(ms)で通知 */
  onScheduled?: (writingEndMs: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let aborted = false;
    const kv = KAMI_PATTERNS[variant] ?? KAMI_PATTERNS[1];

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

      /* 伸ばし棒（幅広で平たい）を分離 */
      const tilde = upper.find((i) => i.w > 40 && i.h < 25);
      const upperLetters = upper.filter((i) => i !== tilde);
      const chars = groupIntoCharacters(upperLetters, UPPER_STROKES);
      const naChar = chars[0] ?? [];
      const restChars = chars.slice(1);

      /* 初期状態：全部隠す（吹き出しから紙芝居で出していく） */
      [...upper, ...lower].forEach((i) => (i.p.style.opacity = "0"));
      if (bubble) bubble.style.opacity = "0";

      /* 自前の伸ばし棒（線）を用意 */
      const letterFill = naChar[0]?.p.getAttribute("fill") || "#0070C9";
      const tb = tilde ?? { x: 130, top: 96, w: 55, h: 14, midY: 103 };
      const sx = tb.x;
      const cy = tb.top + tb.h / 2;
      const finalW = tb.w;
      const amp = Math.max(3.5, tb.h * 0.38);
      /* 線幅はデザインカンプのストローク値そのまま（Figma: 5） */
      const strokeW = 5;
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
      /* 最初から最後まで「〜」の曲線のまま伸縮する（直線にしない・太さも一定）。
         幅が小さい時だけ波も少し浅くして、にゅっと生えてくる感じに */
      let barW = finalW * 0.5;
      const redraw = () => {
        /* カンプの「〜」に寄せて、しっかりうねらせる（制御点は見た目の約1.6倍）。
           長さに合わせて波の深さも育てる */
        const ratio = Math.max(0.4, barW / finalW);
        const a = amp * 1.6 * Math.pow(ratio, 0.85);
        bar.setAttribute(
          "d",
          `M ${sx} ${cy} C ${sx + barW * 0.3} ${cy - a} ${sx + barW * 0.7} ${cy + a} ${sx + barW} ${cy}`
        );
      };
      redraw();

      /* 文字グループの出現：バウンスさせず、ふわっとブラーが晴れるだけ */
      const showChar = (strokes: typeof naChar, delay: number) => {
        strokes.forEach((it) => {
          const p = it.p;
          p.animate(
            [
              { opacity: 0, filter: "blur(5px)" },
              { opacity: 1, filter: "blur(0px)" },
            ],
            {
              duration: kv.letterDur,
              delay,
              fill: "forwards",
              easing: "cubic-bezier(0.33, 1, 0.68, 1)",
            }
          );
          p.style.opacity = "0";
        });
      };

      /* ===== 紙芝居ここから ===== */
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
      await wait(750);
      if (aborted) return;

      /* 2. 「な」がぽんと出る */
      showChar(naChar, 0);
      await wait(430);
      if (aborted) return;

      /* 3. 伸ばし棒が曲線のままビヨーンと伸びる（にゅっと生えて → 伸び切る） */
      bar.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 160,
        fill: "forwards",
        easing: "ease-out",
      });
      bar.style.opacity = "1";
      await animate(finalW * 0.5, longW, {
        duration: kv.growDur / 1000,
        ease: kv.growEase,
        onUpdate: (v) => {
          barW = v;
          redraw();
        },
      });
      await wait(kv.hold);
      if (aborted) return;

      /* 4. 「〜」の長さに戻る（弾むかどうかはパターン次第。曲線と太さは終始そのまま） */
      const settleOpts =
        kv.settle.type === "spring"
          ? {
              type: "spring" as const,
              stiffness: kv.settle.stiffness,
              damping: kv.settle.damping,
            }
          : { duration: kv.settle.dur / 1000, ease: kv.settle.ease };
      await animate(longW, finalW, {
        ...settleOpts,
        onUpdate: (v: number) => {
          barW = v;
          redraw();
        },
      });
      if (aborted) return;

      /* 戻った後の字形の扱い：
         none = 線をそのまま「〜」として残す（太さは一切変わらない）
         fade = 本物の手書き字形へゆっくり馴染ませる */
      if (tilde && kv.swap === "fade") {
        const dur = kv.swapDur ?? 900;
        tilde.p.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: dur,
          fill: "forwards",
          easing: "ease-in-out",
        });
        tilde.p.style.opacity = "0";
        bar.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: dur,
          fill: "forwards",
          easing: "ease-in-out",
        });
      }

      /* 5. んにもない が順に出る */
      restChars.forEach((strokes, i) => showChar(strokes, 150 + i * kv.letterStagger));
      const lettersDone = 150 + restChars.length * kv.letterStagger + 420;
      await wait(lettersDone);
      if (aborted) return;

      /* 6. たまらない（なぞり書き＋あしらい） */
      const wp = WRITE_PACES[pace] ?? WRITE_PACES[2];
      const writingEnd = writeTamaranai(svg, lower, 150, wp, timing.flourish.offset);
      onScheduled?.(writingEnd);
    })();

    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, pace, timing]);

  return (
    <div ref={ref} className="h-[390px] w-[471px]" aria-label="な〜んにもない たまらない" />
  );
}
