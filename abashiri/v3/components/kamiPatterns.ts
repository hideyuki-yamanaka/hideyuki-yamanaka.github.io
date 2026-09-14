/* 紙芝居パターン（吹き出し→な→伸ばし棒ビヨーン→収まる→んにもない→たまらない）の
   バリエーション定義
   - 伸ばし棒は最初から最後まで「〜」の曲線のまま伸縮（直線にしない・太さ一定）
   - バウンスは控えめに、伸ばし棒だけ
   - 戻った後の字形の扱い（そのまま／ゆっくり馴染ませる）も切り替え可能 */
export type KamiPattern = {
  name: string;
  desc: string;
  /** 伸ばし棒が伸びる時間(ms) */
  growDur: number;
  /** 伸びの緩急（CSSイージング） */
  growEase: [number, number, number, number];
  /** 伸び切ってから縮み始めるまでのタメ(ms) */
  hold: number;
  /** 縮み方：バネ（弾む）かトゥイーン（弾まない） */
  settle:
    | { type: "spring"; stiffness: number; damping: number }
    | { type: "tween"; dur: number; ease: [number, number, number, number] };
  /** 戻った後：none=線をそのまま「〜」として使う（太さ変化ゼロ）
      fade=本物の字形へゆっくり馴染ませる */
  swap: "none" | "fade";
  /** fade の時のクロスフェード時間(ms) */
  swapDur?: number;
  /** んにもない の1文字ごとの間(ms) と フェード時間(ms) */
  letterStagger: number;
  letterDur: number;
};

export const KAMI_PATTERNS: Record<number, KamiPattern> = {
  1: {
    name: "なじみバウンス・線のまま",
    desc: "控えめにぽよんと戻り、伸ばし棒はそのまま「〜」として残る（太さは一切変わらない）。",
    growDur: 520,
    growEase: [0.3, 1.08, 0.5, 1],
    hold: 110,
    settle: { type: "spring", stiffness: 210, damping: 15 },
    swap: "none",
    letterStagger: 90,
    letterDur: 420,
  },
  2: {
    name: "なじみバウンス・ゆっくり字形へ",
    desc: "戻り方は案1と同じ控えめバウンス。落ち着いてから0.9秒かけて手書きの字形へじわっと馴染ませる。",
    growDur: 520,
    growEase: [0.3, 1.08, 0.5, 1],
    hold: 110,
    settle: { type: "spring", stiffness: 210, damping: 15 },
    swap: "fade",
    swapDur: 900,
    letterStagger: 90,
    letterDur: 420,
  },
  3: {
    name: "ほんのり弾み・きびきび",
    desc: "弾みをさらに抑えて、テンポ少し速め。線はそのまま「〜」として残る。いちばんあっさりした案。",
    growDur: 430,
    growEase: [0.25, 1, 0.4, 1],
    hold: 90,
    settle: { type: "spring", stiffness: 240, damping: 18 },
    swap: "none",
    letterStagger: 75,
    letterDur: 380,
  },
};
