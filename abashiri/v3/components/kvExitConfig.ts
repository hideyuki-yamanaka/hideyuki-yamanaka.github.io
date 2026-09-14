/*
 * 作字（な〜んにもない たまらない）がスクロールで消えていく時の
 * 「消え方」のパラメーター（2026-08-21 ヒデさん依頼）。
 *
 * 「今の消え方があっさりしている」→ もっとゆったり消えるバリエーションを5案。
 * 案はプリセット（数値の組み合わせ）で、調整パネルの案ピルを押すと
 * この数値がスライダーに流し込まれ、そこから細かく調整できる。
 *
 * ⚠️ 案0（今の消え方）の数値は、従来 TopPage がハードコードしていた
 *    kvOut=320 / blur 22 / fadeStart 0.6 / scale 0.8 と同じ。既定はこれ。
 */
export type KvExit = {
  /** 0=今の消え方 / 1〜5=ゆったり案（プリセット。数値を触ると「カスタム」扱いになるだけで挙動は同じ） */
  pattern: number;
  /** 消えきるまでのスクロール量(px)。大きいほどゆっくり */
  range: number;
  /** フェードが本格化する位置（消える行程の何%から。それまでは薄くなるだけ） */
  fadeStart: number;
  /** 消えきる時の最大ブラー(px) */
  blurMax: number;
  /** 消えきる時の大きさ（%。100で等倍、80で2割縮む、110で少しふくらむ） */
  scaleTo: number;
  /** 消えきるまでの縦移動(px)。マイナスで上へ、プラスで下へ */
  yTo: number;
  /** ゆったり度（1=直線。大きいほど「最初はその場にとどまり、あとからすっと消える」） */
  ease: number;
};

export const DEFAULT_KV_EXIT: KvExit = {
  pattern: 0,
  range: 320,
  fadeStart: 60,
  blurMax: 22,
  scaleTo: 80,
  yTo: 0,
  ease: 1,
};

/** 案ピルを押した時にスライダーへ流し込むプリセット */
export const KV_EXIT_PATTERNS: Record<
  number,
  { name: string; note: string; values: Omit<KvExit, "pattern"> }
> = {
  0: {
    name: "今まで",
    note: "現行の消え方。320pxですっと奥へ引く、いちばんあっさりした交代。",
    values: { range: 320, fadeStart: 60, blurMax: 22, scaleTo: 80, yTo: 0, ease: 1 },
  },
  1: {
    name: "案1",
    note: "ロングフェード。距離を2倍以上とって、同じ動きのままじわじわ消えていく。",
    values: { range: 700, fadeStart: 55, blurMax: 20, scaleTo: 86, yTo: 0, ease: 1.35 },
  },
  2: {
    name: "案2",
    note: "空へ還る。少しふくらみながら浮き上がり、にじんで空に溶けていく。",
    values: { range: 780, fadeStart: 45, blurMax: 26, scaleTo: 108, yTo: -60, ease: 1.2 },
  },
  3: {
    name: "案3",
    note: "ブラーで溶ける。文字がしばらくその場でにじんで漂い、最後にすっと消える。",
    values: { range: 720, fadeStart: 75, blurMax: 30, scaleTo: 96, yTo: 0, ease: 1.5 },
  },
  4: {
    name: "案4",
    note: "静かに沈む。ほとんどボケずに、ゆっくり下へ沈みながら小さくなって消える。",
    values: { range: 820, fadeStart: 60, blurMax: 14, scaleTo: 88, yTo: 40, ease: 1.6 },
  },
  5: {
    name: "案5",
    note: "余韻ロングテイク。1000pxかけて、静かに静かに消えていく。いちばんゆったり。",
    values: { range: 1000, fadeStart: 70, blurMax: 12, scaleTo: 90, yTo: 12, ease: 1.8 },
  },
};

export function mergeKvExit(partial?: Partial<KvExit> | null): KvExit {
  return { ...DEFAULT_KV_EXIT, ...partial };
}
