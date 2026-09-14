/*
 * カモメの配置・見た目の共通パラメーター
 * /mock/birds の調整パネルからも同じ構造でいじれる。
 * 位置の単位: 空のカモメ=ステージ内px（skyRight.x は右端からの距離）
 *            プロモのカモメ=プロモ枠内の%
 */
export type BirdTune = {
  /** 位置X（skyTopLeft/skyRight: px、promo系: %） */
  x: number;
  /** 位置Y（skyTopLeft/skyRight: px、promo系: %） */
  y: number;
  /** 横幅(px) */
  w: number;
  /** 傾き(度) */
  rotate: number;
  /** 線の太さ（SVG座標系。小さいほど細い） */
  stroke: number;
  /** 羽ばたきの速さ(秒/1往復) */
  flap: number;
  /** ふわふわ漂う周期(秒) */
  drift: number;
  /** 開始ずらし(秒) */
  delay: number;
};

export type BirdsConfig = {
  skyTopLeft: BirdTune;
  skyRight: BirdTune;
  promo1: BirdTune;
  promo2: BirdTune;
};

export const DEFAULT_BIRDS: BirdsConfig = {
  /* 左上の小さいカモメ */
  skyTopLeft: { x: -20, y: 16, w: 64, rotate: -14, stroke: 7, flap: 0.5, drift: 10, delay: 0 },
  /* 右中の大きいカモメ（手前）。全体が見えるよう左に寄せ、線は細めに */
  skyRight: { x: 50, y: 535, w: 105, rotate: 0, stroke: 4.5, flap: 0.62, drift: 9, delay: 1.2 },
  /* プロモ内・右上の白カモメ */
  promo1: { x: 85, y: 17, w: 105, rotate: 0, stroke: 4.5, flap: 0.6, drift: 8, delay: 0 },
  /* プロモ内・左の小さい白カモメ */
  promo2: { x: -0.9, y: 13, w: 62, rotate: 0, stroke: 8, flap: 0.48, drift: 6, delay: 0.8 },
};

export function mergeBirds(partial?: Partial<BirdsConfig> | null): BirdsConfig {
  const d = DEFAULT_BIRDS;
  if (!partial) return d;
  return {
    skyTopLeft: { ...d.skyTopLeft, ...partial.skyTopLeft },
    skyRight: { ...d.skyRight, ...partial.skyRight },
    promo1: { ...d.promo1, ...partial.promo1 },
    promo2: { ...d.promo2, ...partial.promo2 },
  };
}

export const BIRDS_STORAGE_KEY = "abashiri-birds";
