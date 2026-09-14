/*
 * 手書きアニメーション共通の下回り
 * （HeroWriting＝なぞり書き版 / HeroKamishibai＝紙芝居版 で共用）
 */
import type { WritePace } from "./writePaces";

export const SVG_NS = "http://www.w3.org/2000/svg";
let maskSeq = 0;

export type StrokeItem = {
  p: SVGPathElement;
  x: number;
  top: number;
  midY: number;
  w: number;
  h: number;
  area: number;
};

/** SVG内の全パスを bbox 付きで収集し、吹き出し（最大面積）を分離する */
export function collect(svg: SVGSVGElement): {
  bubble: SVGPathElement | null;
  rest: StrokeItem[];
} {
  const paths = Array.from(svg.querySelectorAll("path"));
  const items: StrokeItem[] = paths.map((p) => {
    const b = p.getBBox();
    return {
      p,
      x: b.x,
      top: b.y,
      midY: b.y + b.height / 2,
      w: b.width,
      h: b.height,
      area: b.width * b.height,
    };
  });
  if (items.length === 0) return { bubble: null, rest: [] };
  const bubble = items.reduce((a, c) => (c.area > a.area ? c : a));
  return { bubble: bubble.p, rest: items.filter((i) => i !== bubble) };
}

/**
 * 画のリストを文字ごとのグループに分ける。
 * strokeCounts が与えられればその画数で確実に割り当て、
 * 無ければ中心Xの大きい隙間で区切る。
 * 文字の中は上の画から（＝ひらがなの書き順）。
 */
export function groupIntoCharacters(
  letters: StrokeItem[],
  strokeCounts?: number[]
): StrokeItem[][] {
  const sorted = [...letters].sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2));
  let groups: StrokeItem[][] = [];
  const total = strokeCounts?.reduce((a, b) => a + b, 0);
  if (strokeCounts && sorted.length === total) {
    let idx = 0;
    groups = strokeCounts.map((n) => {
      const g = sorted.slice(idx, idx + n);
      idx += n;
      return g;
    });
  } else {
    const centers = sorted.map((i) => i.x + i.w / 2);
    const nSplits = Math.min((strokeCounts?.length ?? 5) - 1, Math.max(0, sorted.length - 1));
    const splits = centers
      .slice(1)
      .map((c, i2) => ({ at: i2 + 1, gap: c - centers[i2] }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, nSplits)
      .map((g) => g.at)
      .sort((a, b) => a - b);
    let prev = 0;
    for (const s of [...splits, sorted.length]) {
      groups.push(sorted.slice(prev, s));
      prev = s;
    }
  }
  return groups.map((g) =>
    [...g].sort((a, b) => {
      if (Math.abs(a.top - b.top) > 10) return a.top - b.top;
      return a.x - b.x;
    })
  );
}

/** ペン先が線をなぞって書き進む（マスクのダッシュアニメ）。所要時間(ms)を返す */
export function traceReveal(
  svg: SVGSVGElement,
  p: SVGPathElement,
  delay: number,
  pace: WritePace
): number {
  const len = Math.max(p.getTotalLength(), 1);
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.prepend(defs);
  }
  const id = `hw-mask-${maskSeq++}`;
  const mask = document.createElementNS(SVG_NS, "mask");
  mask.setAttribute("id", id);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  const c = p.cloneNode() as SVGPathElement;
  c.removeAttribute("mask");
  c.removeAttribute("style"); /* 元が非表示(opacity:0)でもマスクは白く塗れるように */
  c.setAttribute("fill", "none");
  c.setAttribute("stroke", "#fff");
  c.setAttribute("stroke-width", "18");
  c.setAttribute("stroke-linecap", "round");
  c.setAttribute("stroke-linejoin", "round");
  c.setAttribute("stroke-dasharray", String(len));
  c.setAttribute("stroke-dashoffset", String(len));
  mask.appendChild(c);
  defs.appendChild(mask);
  p.setAttribute("mask", `url(#${id})`);

  const dur = Math.min(Math.max(len * pace.rate, pace.min), pace.max);
  c.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
    duration: dur,
    delay,
    fill: "forwards",
    easing: "linear",
  });
  return dur;
}

/** 幅の広い曲線あしらい用：左から右へペンを走らせるワイプ */
export function wipeLeftToRight(p: SVGPathElement, delay: number, dur: number) {
  const hidden = "inset(-12% 112% -12% -12%)";
  const shown = "inset(-12% -12% -12% -12%)";
  p.style.clipPath = hidden;
  p.animate([{ clipPath: hidden }, { clipPath: shown }], {
    duration: dur,
    delay,
    fill: "forwards",
    easing: "cubic-bezier(0.45, 0, 0.4, 1)",
  });
}

/** 「たまらない」の画数（このロゴの実データに合わせて固定） */
export const TAMARANAI_STROKES = [3, 1, 2, 3, 2];

/**
 * 下段（たまらない＋あしらい）を書き順どおりになぞる共通処理。
 * 書き終わり予定時刻(ms)を返す。
 */
export function writeTamaranai(
  svg: SVGSVGElement,
  lower: StrokeItem[],
  startDelay: number,
  pace: WritePace,
  flourishOffset = 0
): number {
  const letters = lower.filter((i) => i.w <= 150);
  const flourish = lower.filter((i) => i.w > 150);
  const characters = groupIntoCharacters(letters, TAMARANAI_STROKES);

  let delay = startDelay;
  let lastCharStart = delay;
  characters.forEach((strokes, ci) => {
    if (ci === characters.length - 1) lastCharStart = delay;
    strokes.forEach((it) => {
      const dur = traceReveal(svg, it.p, delay, pace);
      it.p.style.opacity = "1";
      delay += dur * pace.overlap + pace.gap;
    });
  });
  const lettersEnd = delay;

  const flourishStart = lastCharStart + flourishOffset;
  let flourishEnd = flourishStart;
  flourish.forEach((it) => {
    const dur = Math.min(Math.max(it.w * pace.rate * 2.4, pace.min * 2.2), pace.max);
    wipeLeftToRight(it.p, flourishStart, dur);
    flourishEnd = Math.max(flourishEnd, flourishStart + dur);
  });

  return Math.max(lettersEnd, flourishEnd);
}
