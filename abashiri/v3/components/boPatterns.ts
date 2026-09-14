/*
 * 動画を見ている人物の「ぼーっ」の吹き出しアニメーション 5案
 * /mock/bo で並べて比べられる。
 *
 * ヒデさんの希望（2026-08-18）
 *   ・動画再生中、5秒に1回くらいのペースでフェードイン／フェードアウト
 *   ・いちばん最初は非表示。ただし1回目だけは早めに、3秒で出す（周期は5秒のまま）
 *   ・「ぼーっとしている」ニュアンスが出る動きにしたい
 *
 * 共通ルール
 *   ・1周期は5秒（cycle）。出ている時間は案ごとに違う
 *   ・最初だけ startDelay（3秒）待ってから1周目が始まる。2回目以降は5秒おき
 *   ・keyframes の配列と times の長さは必ずそろえる（framer-motion の決まり）
 *   ・単位はカンプ（1512x982 ステージ）上の px ＝ 見た目そのままの px
 *   ・文字そのもの（text-bo.svg）は動かさない。出方・漂い方だけを変えている
 */
export type BoPattern = {
  key: string;
  label: string;
  /** 何が違うのかの一言 */
  note: string;
  /** ぼーっとしている感じがどこから出るのか（一覧に出す説明） */
  nuance: string;
  /** 1周期の長さ(秒) */
  cycle: number;
  /** 最初の1回が始まるまでの待ち(秒)。ここは5案とも同じ */
  startDelay: number;
  /** キーフレームの時間割（0〜1）。keyframes の各配列と同じ長さにする */
  times: number[];
  /** framer-motion に渡すキーフレーム。opacity は必須 */
  keyframes: {
    opacity: number[];
    filter?: string[];
    y?: number[];
    x?: number[];
    rotate?: number[];
    scale?: number[];
  };
  /** 変形の支点。吹き出しのしっぽ側（左下）を基点にすると自然に見える */
  origin: string;
  ease: "linear" | "easeIn" | "easeOut" | "easeInOut";
};

/* 5案とも共通。
   START_DELAY … 1回目が出はじめるまでの待ち。ヒデさん指示で 5秒 → 3秒に前倒し（2026-08-18）
   CYCLE       … 2回目以降のペース。ここは5秒のまま */
const START_DELAY = 3;
const CYCLE = 5;

export const BO_PATTERNS: BoPattern[] = [
  {
    key: "breath",
    label: "案1  ゆっくり息をする",
    note: "ふわっと出て、たっぷり留まって、ふわっと消える。上下にほんのり漂うだけ",
    nuance: "動きが少なく、息の速さだけがゆっくり。いちばん素直で邪魔をしない",
    cycle: CYCLE,
    startDelay: START_DELAY,
    times: [0, 0.14, 0.62, 0.88, 1],
    keyframes: {
      opacity: [0, 1, 1, 0, 0],
      y: [3, 0, -2, -4, 3],
    },
    origin: "left bottom",
    ease: "easeInOut",
  },
  {
    key: "haze",
    label: "案2  にじんで浮かぶ",
    note: "ボケた状態からピントが合って出てきて、また溶けて消える",
    nuance: "輪郭が甘いまま出入りするので、頭がぼんやりしている感じが強い",
    cycle: CYCLE,
    startDelay: START_DELAY,
    times: [0, 0.18, 0.6, 0.9, 1],
    keyframes: {
      opacity: [0, 1, 1, 0, 0],
      filter: ["blur(10px)", "blur(0px)", "blur(0px)", "blur(10px)", "blur(10px)"],
      scale: [0.94, 1, 1, 1.03, 0.94],
    },
    origin: "left bottom",
    ease: "easeInOut",
  },
  {
    key: "drift",
    label: "案3  ゆらゆら漂う",
    note: "出ている間、風に流されるように少し横へ動きながら傾く",
    nuance: "意識がどこかへ流れている散漫さ。5案でいちばん「気が抜けている」",
    cycle: CYCLE,
    startDelay: START_DELAY,
    times: [0, 0.16, 0.5, 0.86, 1],
    keyframes: {
      opacity: [0, 1, 1, 0, 0],
      x: [-5, 0, 5, 9, -5],
      rotate: [-3, 0, 2, 4, -3],
    },
    origin: "left bottom",
    ease: "easeInOut",
  },
  {
    key: "sigh",
    label: "案4  息を吐くように抜ける",
    note: "少し大きめで出て、消える時にすっと小さくなって上へ抜けていく",
    nuance: "ため息をついたような脱力。消え方に情感が出る",
    cycle: CYCLE,
    startDelay: START_DELAY,
    times: [0, 0.12, 0.55, 0.84, 1],
    keyframes: {
      opacity: [0, 1, 1, 0, 0],
      scale: [1.1, 1, 1, 0.9, 1.1],
      y: [5, 0, -1, -12, 5],
    },
    origin: "left bottom",
    ease: "easeOut",
  },
  {
    key: "flicker",
    label: "案5  ぽつ、ぽつ、と2回",
    note: "5秒の中で、弱く1回・しっかり1回。まばたきのように2度出る",
    nuance: "意識が飛びかけて戻る感じ。「ぼーっ…ぼーっ」とリズムが出る",
    cycle: CYCLE,
    startDelay: START_DELAY,
    times: [0, 0.08, 0.2, 0.3, 0.44, 0.58, 0.82, 1],
    keyframes: {
      opacity: [0, 0.5, 0.5, 0, 0, 1, 0, 0],
      y: [2, 1, 1, 2, 2, 0, -3, 2],
    },
    origin: "left bottom",
    ease: "easeInOut",
  },
];

/* 本番で使う案。2026-08-18 ヒデさんが案4「息を吐くように抜ける」を選択。
   他の案は /mock/bo で今も見比べられる */
export const DEFAULT_BO = 4;

/** 番号（1〜5）か key で引く。見つからなければ既定の案 */
export function findBo(v?: number | string | null): BoPattern {
  if (typeof v === "string") {
    const hit = BO_PATTERNS.find((p) => p.key === v);
    if (hit) return hit;
  }
  const n = Number(v ?? DEFAULT_BO);
  return BO_PATTERNS[Math.min(Math.max(n, 1), BO_PATTERNS.length) - 1];
}
