/*
 * タブレットの浮遊シャドウ（案3「斜め光」採用版）の共通パラメーター
 * /mock/shadow/tune の調整パネルからも同じ構造でいじれる。
 */
export type ShadowTune = {
  /** 横ずれ(px)。マイナスで左へ（右上から光が当たるイメージ） */
  x: number;
  /** 縦ずれ(px)。プラスで下へ */
  y: number;
  /** ぼかし(px) */
  blur: number;
  /** 広がり(px)。マイナスで影が締まる */
  spread: number;
  /** 影の色（HEX）。globals.css の --color-shadow と同じ値にすること */
  color: string;
  /** 濃さ(0〜100%) */
  opacity: number;
};

export const DEFAULT_SHADOW: ShadowTune = {
  x: -45,
  y: 55,
  blur: 80,
  spread: -12,
  /* ヒデさん調整値（2026-08-13） */
  color: "#005fb3",
  opacity: 70,
};

export function mergeShadow(partial?: Partial<ShadowTune> | null): ShadowTune {
  return { ...DEFAULT_SHADOW, ...partial };
}

/** box-shadow の値文字列を組み立てる */
export function buildShadow(t: ShadowTune): string {
  const hex = t.color.replace("#", "");
  const n = parseInt(
    hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex,
    16
  );
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${t.x}px ${t.y}px ${t.blur}px ${t.spread}px rgba(${r},${g},${b},${(
    t.opacity / 100
  ).toFixed(2)})`;
}

export const SHADOW_STORAGE_KEY = "abashiri-shadow";
