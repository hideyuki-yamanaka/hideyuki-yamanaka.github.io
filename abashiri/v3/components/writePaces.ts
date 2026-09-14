/* 「なぞり書き」の書くスピードのパターン定義 */
export type WritePace = {
  name: string;
  /** 1pxあたりの時間(ms) */
  rate: number;
  /** 一画の最短・最長時間(ms) */
  min: number;
  max: number;
  /** 次の画の重なり具合（1で完全に書き終えてから次へ） */
  overlap: number;
  /** 画と画のあいだの小さな間(ms) */
  gap: number;
};

export const WRITE_PACES: Record<number, WritePace> = {
  1: { name: "ちょっとゆっくり（約5.5秒）", rate: 0.85, min: 170, max: 850, overlap: 0.85, gap: 15 },
  2: { name: "のんびり（約6.5秒）", rate: 1.0, min: 195, max: 900, overlap: 0.88, gap: 22 },
  3: { name: "じっくり（約7.5秒）", rate: 1.12, min: 215, max: 980, overlap: 0.9, gap: 28 },
};
