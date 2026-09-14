/* キービジュアル（な〜んにもない たまらない＋ボタン）の
   スクロール連動・交代演出パターン。
   いずれも画面中央に固定したまま、スクロール量に応じて変化する。 */
export type KvPattern = {
  name: string;
  desc: string;
  /** 演出が完了するまでのスクロール量(px) */
  range: number;
  /** 拡大縮小 [開始, 終了] */
  scale: [number, number];
  /** 縦方向の移動 [開始, 終了] */
  y: [number, number];
  /** 最大ブラー(px) */
  blurMax: number;
  /** フェード本格化の開始位置（rangeに対する割合 0-1） */
  fadeStart: number;
  /** ボタンだけ余分に沈む視差量(px) */
  buttonParallax?: number;
  /** 背景写真のスクロール連動ズーム [開始, 終了] */
  bgZoom?: [number, number];
};

export const KV_PATTERNS: Record<number, KvPattern> = {
  1: {
    name: "基準：奥へすっと引く",
    desc: "現行の演出。その場で縮小しながらボケて消える、いちばんシンプルな交代。",
    range: 560,
    scale: [1, 0.8],
    y: [0, 0],
    blurMax: 22,
    fadeStart: 0.6,
  },
  2: {
    name: "空に溶ける",
    desc: "少し浮き上がり、ふわっと大きくにじみながら空に還っていく。のびやかさ・開放感。",
    range: 720,
    scale: [1, 1.12],
    y: [0, -70],
    blurMax: 26,
    fadeStart: 0.5,
  },
  3: {
    name: "文字の間を通り抜ける",
    desc: "文字がこちらへ迫って画面の外へ抜けていく。空間の中へ入っていく没入感。",
    range: 620,
    scale: [1, 1.55],
    y: [0, 0],
    blurMax: 18,
    fadeStart: 0.45,
  },
  4: {
    name: "奥行きレイヤー",
    desc: "ボタンと文字が別々の速さで沈み、背景の写真もゆっくり寄る。立体感・上質な奥行き。",
    range: 640,
    scale: [1, 0.9],
    y: [0, 0],
    blurMax: 16,
    fadeStart: 0.55,
    buttonParallax: 150,
    bgZoom: [1, 1.07],
  },
  5: {
    name: "ロングテイク",
    desc: "たっぷりのスクロール量をかけて、静かにゆっくり消えていく。ゆとり・余白の時間。",
    range: 980,
    scale: [1, 0.88],
    y: [0, 24],
    blurMax: 13,
    fadeStart: 0.72,
    bgZoom: [1.06, 1],
  },
};
