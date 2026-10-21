"use client";

/*
 * 写真のレタッチ（2026-10-21）
 *
 * 【ヒデさん】「キービジュアルの写真も、彩度とか露光量とか、一通りのレタッチできる項目を調整できるように、
 *   エフェクト＆テクスチャのパネルにキービジュアルという項目を一番最初につけて追加して」
 *   →「調整パネルにある写真の調整は、この機会に同じ10項目を入れてほしい」
 * - 写真アプリの基本補正と同じ10項目：露光量・コントラスト・ハイライト・シャドウ・白レベル・黒レベル・
 *   色温度・色かぶり補正・自然な彩度・彩度
 * - 直せる写真（RETOUCH_TARGETS）：キービジュアル／ぼーっとスポットの能取岬・サンゴ草・流氷・ひまわり。
 *   ぼーっとスポットの写真は、トップ・詳しいページ・体験ページのどこに出ても同じ仕上がりにする（同じファイルの <img> を全部）。
 *   キービジュアルは <img data-kv-photo> の付いた写真だけ＝キービジュアル（PC・スマホ）とフッター（2026-10-21 ヒデさん「フッターはキービジュアルのやつを使って」）。
 *   同じファイルでも、スマホのメニューの背景・体験ページには効かせない
 * - 写真の上に幕やフィルターは重ねない（2026-10-21 ヒデさん「フィルター加工などせず、画像を直接いじって」）。
 *   値が変わったら、写真の点を1つずつ計算し直した絵を作り、<img> の中身をその絵に入れ替える。全部 0 の写真は何もしない
 * - 調整パネル（トップページ）が <html data-retouch='{"kv":{...},"notoro":{...},...}'> を立て、この部品が見張って作り直す。
 *   パネルの無いページ（詳しいページなど）は、パネルの保存値 → 焼き込み（tune-defaults.json）の順に読む
 * - 写真の組（新しい写真／前の写真）は PhotoSetSwitch と同じ一覧で選ぶ
 */
import { useEffect } from "react";
import { PHOTO_SWAPS, PHOTO_SET_DEFAULT } from "./PhotoSetSwitch";
import { TOP_TUNE_KEY, TOP_TUNE_VERSION } from "./tuneKeys";

export type RetouchValues = {
  /** 露光量（EV・−2〜+2） */
  exposure: number;
  /** 以下は −100〜+100（0＝そのまま） */
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temp: number;
  tint: number;
  vibrance: number;
  saturation: number;
};
export const RETOUCH_DEFAULT: RetouchValues = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temp: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
};
/** 10項目の並び・名前・範囲（調整パネルのつまみもここから作る） */
export const RETOUCH_ITEMS: { key: keyof RetouchValues; name: string; group: "明るさ" | "色"; min: number; max: number; step: number; unit?: string; hint: string }[] = [
  { key: "exposure", name: "露光量", group: "明るさ", min: -2, max: 2, step: 0.05, unit: "EV", hint: "写真全体の光の量。+1 で2倍の明るさ、−1 で半分" },
  { key: "contrast", name: "コントラスト", group: "明るさ", min: -100, max: 100, step: 1, hint: "明るい所と暗い所の差。上げるとくっきり、下げると眠い感じに" },
  { key: "highlights", name: "ハイライト", group: "明るさ", min: -100, max: 100, step: 1, hint: "明るい所（空・雲など）だけを明るく／暗く。下げると白く飛んだ所に色が戻る" },
  { key: "shadows", name: "シャドウ", group: "明るさ", min: -100, max: 100, step: 1, hint: "暗い所（影・海の深い所など）だけを明るく／暗く" },
  { key: "whites", name: "白レベル", group: "明るさ", min: -100, max: 100, step: 1, hint: "いちばん明るい所の明るさ" },
  { key: "blacks", name: "黒レベル", group: "明るさ", min: -100, max: 100, step: 1, hint: "いちばん暗い所の暗さ。下げると締まる" },
  { key: "temp", name: "色温度", group: "色", min: -100, max: 100, step: 1, hint: "− で青く涼しく、+ で黄色く暖かく" },
  { key: "tint", name: "色かぶり補正", group: "色", min: -100, max: 100, step: 1, hint: "− で緑寄り、+ でマゼンタ寄り" },
  { key: "vibrance", name: "自然な彩度", group: "色", min: -100, max: 100, step: 1, hint: "色の薄い所ほど強く効く彩度。もともと鮮やかな所は飽和しにくい" },
  { key: "saturation", name: "彩度", group: "色", min: -100, max: 100, step: 1, hint: "色の鮮やかさ全体。−100 で白黒" },
];

/** 直せる写真。srcs＝同じ写真のファイル（今の名前＝新しい写真）。kvOnly＝キービジュアルの印の付いた <img> だけ */
export const RETOUCH_TARGETS = {
  kv: { name: "キービジュアル", srcs: ["/img/bg-hero.jpg"], kvOnly: true }, /* キービジュアルとフッター（data-kv-photo の付いた写真） */
  notoro: { name: "能取岬", srcs: ["/img/spot-notoro.webp", "/img/spot/notoro-1.webp"], kvOnly: false },
  sango: { name: "サンゴ草", srcs: ["/img/spot-sangoso.webp"], kvOnly: false },
  ryuhyo: { name: "流氷", srcs: ["/img/spot-ryuhyo.webp"], kvOnly: false },
  himawari: { name: "ひまわり", srcs: ["/img/spot/himawari-1.webp"], kvOnly: false },
} as const;
export type RetouchKey = keyof typeof RETOUCH_TARGETS;
export type RetouchAll = Record<RetouchKey, RetouchValues>;
export const RETOUCH_ALL_DEFAULT = Object.fromEntries(Object.keys(RETOUCH_TARGETS).map((k) => [k, { ...RETOUCH_DEFAULT }])) as RetouchAll;

const KEYS = Object.keys(RETOUCH_TARGETS) as RetouchKey[];
const isNeutral = (v: RetouchValues) => Object.values(v).every((x) => !x);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

/** 色ごとの対応表（0〜255 → 0〜255）。露光量・ホワイトバランスは光の量（リニア）で、明暗の形は見た目の明るさで計算する */
function buildLuts(v: RetouchValues) {
  const t = v.temp / 100, tn = v.tint / 100;
  /* 色温度：+ で暖かく（赤を上げて青を下げる）／色かぶり補正：+ でマゼンタ寄り（緑を下げる） */
  const gains = [1 + 0.12 * t + 0.04 * tn, 1 - 0.08 * tn, 1 - 0.12 * t + 0.04 * tn];
  const ev = Math.pow(2, v.exposure);
  const k = 1 + v.contrast / 100;
  return gains.map((g) => {
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      let x = toSrgb(Math.min(1, toLin(i / 255) * ev * g));
      x = (x - 0.5) * k + 0.5; /* コントラスト：まんなかの灰色を中心に広げる・狭める */
      x += (v.highlights / 100) * 0.25 * smooth(0.45, 1, x); /* ハイライト：明るい所だけ */
      x += (v.shadows / 100) * 0.25 * (1 - smooth(0, 0.55, x)); /* シャドウ：暗い所だけ */
      x += (v.whites / 100) * 0.15 * smooth(0.7, 1, x); /* 白レベル：いちばん明るい所 */
      x += (v.blacks / 100) * 0.15 * (1 - smooth(0, 0.3, x)); /* 黒レベル：いちばん暗い所 */
      lut[i] = Math.round(Math.max(0, Math.min(1, x)) * 255);
    }
    return lut;
  });
}

/** 1枚の写真に10項目を当てた絵（JPEG の Blob）を作る */
async function render(im: HTMLImageElement, v: RetouchValues): Promise<Blob | null> {
  const w = im.naturalWidth, h = im.naturalHeight;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(im, 0, 0);
  const data = g.getImageData(0, 0, w, h);
  const d = data.data;
  const [lr, lg, lb] = buildLuts(v);
  const sat = 1 + v.saturation / 100, vib = v.vibrance / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = lr[d[i]], gg = lg[d[i + 1]], b = lb[d[i + 2]];
    if (sat !== 1 || vib) {
      const L = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      /* 自然な彩度：もともと色の薄い所ほど強く効く */
      const f = sat * (1 + vib * (1 - (mx - mn) / 255));
      r = L + (r - L) * f;
      gg = L + (gg - L) * f;
      b = L + (b - L) * f;
    }
    d[i] = r;
    d[i + 1] = gg;
    d[i + 2] = b;
  }
  g.putImageData(data, 0, 0);
  return new Promise((res) => cv.toBlob(res, "image/jpeg", 0.92));
}

let baked: Partial<RetouchAll> | null = null;
function readAll(): RetouchAll {
  const out = {} as RetouchAll;
  let src: Partial<RetouchAll> | null = null;
  const raw = document.documentElement.dataset.retouch;
  if (raw) {
    try {
      src = JSON.parse(raw);
    } catch {}
  }
  if (!src) {
    try {
      src = JSON.parse(localStorage.getItem(`tp:${TOP_TUNE_KEY}:v${TOP_TUNE_VERSION}`) || "null")?.retouch || null;
    } catch {}
  }
  if (!src) src = baked;
  for (const k of KEYS) out[k] = { ...RETOUCH_DEFAULT, ...(src?.[k] || {}) };
  return out;
}
function photoSetPrev(): boolean {
  const ds = document.documentElement.dataset.photoSet;
  if (ds === "prev") return true;
  if (ds === "new") return false;
  try {
    const saved = JSON.parse(localStorage.getItem(`tp:${TOP_TUNE_KEY}:v${TOP_TUNE_VERSION}`) || "null");
    const v = saved?.photos?.set;
    return (typeof v === "number" ? v : PHOTO_SET_DEFAULT) === 0;
  } catch {
    return false;
  }
}
const pathOf = (src: string) => {
  try {
    return new URL(src, location.href).pathname;
  } catch {
    return src;
  }
};

export default function PhotoRetouch() {
  useEffect(() => {
    let alive = true;
    /** 写真ごとの、作った絵（ファイル名ごと）と、その時の値 */
    const made: Record<string, { sig: string; url: string }> = {};
    const imgCache = new Map<string, Promise<HTMLImageElement>>();
    const load = (src: string) => {
      let p = imgCache.get(src);
      if (!p) {
        p = new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.decoding = "async";
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = src;
        });
        imgCache.set(src, p);
      }
      return p;
    };
    /** 写真のファイル（新しい写真の名前）→ どの写真か */
    const keyOfNew: Record<string, RetouchKey> = {};
    for (const k of KEYS) for (const s of RETOUCH_TARGETS[k].srcs) keyOfNew[s] = k;
    const REVERSE: Record<string, string> = Object.fromEntries(Object.entries(PHOTO_SWAPS).map(([a, b]) => [b, a]));
    /** ページの中の、直す対象の <img> と、その元のファイル（新しい写真の名前） */
    const scan = () => {
      const list: { el: HTMLImageElement; key: RetouchKey; newSrc: string }[] = [];
      document.querySelectorAll<HTMLImageElement>("img").forEach((el) => {
        let newSrc = el.dataset.retouchSrc;
        if (!newSrc) {
          const p = pathOf(el.getAttribute("src") || "");
          const n = keyOfNew[p] ? p : REVERSE[p] && keyOfNew[REVERSE[p]] ? REVERSE[p] : "";
          if (!n) return;
          newSrc = n;
        }
        const key = keyOfNew[newSrc];
        if (!key) return;
        if (RETOUCH_TARGETS[key].kvOnly && !el.hasAttribute("data-kv-photo")) return;
        list.push({ el, key, newSrc });
      });
      return list;
    };

    let busy = false, again = false;
    const run = async () => {
      if (busy) {
        again = true;
        return;
      }
      busy = true;
      try {
        const all = readAll();
        const prev = photoSetPrev();
        for (const { el, key, newSrc } of scan()) {
          const base = prev ? PHOTO_SWAPS[newSrc] || newSrc : newSrc;
          const v = all[key];
          if (isNeutral(v)) {
            if (el.dataset.retouchSrc) delete el.dataset.retouchSrc;
            if (pathOf(el.getAttribute("src") || "") !== base) el.setAttribute("src", base);
            continue;
          }
          const sig = base + JSON.stringify(v);
          let m = made[newSrc];
          if (!m || m.sig !== sig) {
            const im = await load(base);
            const blob = await render(im, v);
            if (!alive || !blob) return;
            if (m) URL.revokeObjectURL(m.url);
            m = made[newSrc] = { sig, url: URL.createObjectURL(blob) };
          }
          el.dataset.retouchSrc = newSrc; /* 中身を絵に入れ替えても、元の写真が分かるように */
          if (el.getAttribute("src") !== m.url) el.setAttribute("src", m.url);
        }
      } catch {
        /* 読めなかった時は元の写真のまま */
      } finally {
        busy = false;
        if (again && alive) {
          again = false;
          void run();
        }
      }
    };
    /* パネルの無いページ用に、焼き込み（tune-defaults.json）も読んでおく */
    fetch("/tune-defaults.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        baked = d?.retouch || null;
        void run();
      })
      .catch(() => {});
    void run();
    const htmlObs = new MutationObserver(() => void run());
    htmlObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-retouch", "data-photo-set"] });
    /* ページの移動・後から出た写真にも当てる */
    let raf = 0;
    const bodyObs = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => void run());
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });
    return () => {
      alive = false;
      htmlObs.disconnect();
      bodyObs.disconnect();
      cancelAnimationFrame(raf);
      Object.values(made).forEach((m) => URL.revokeObjectURL(m.url));
    };
  }, []);
  return null;
}
