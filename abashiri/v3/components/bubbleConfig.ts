/*
 * 吹き出し（な〜んにもない の白いフキダシ）の共通パラメーター
 * - smooth: パスの歪みをならす平滑化処理の強さ
 * - tail:   しっぽ（下のとんがり）が伸びる登場演出
 * - puni:   ぷにぷに呼吸アニメ（案1）の動き
 * /mock/bubble/tune の調整パネルからも同じ構造でいじれる。
 */
export type BubbleTune = {
  smooth: {
    /** 平滑化を何回かけるか（0でオフ。多いほどツルツル） */
    passes: number;
    /** 輪郭を何点でなぞり直すか（少ないほど丸っこくなる） */
    points: number;
  };
  /**
   * しっぽ（吹き出しの下のとんがり）の伸び。
   * 引っ込んだ状態＝ただの丸い吹き出しで登場し、そこから下へ伸びていく。
   * ちょうど「たまらない」が出るころに伸びきると、しゃべっているように見える。
   */
  tail: {
    /** 吹き出しが出はじめてから伸び出すまでの間(ms) */
    delay: number;
    /** 伸びきるまでの時間(ms) */
    duration: number;
    /** 開始時にどれだけ引っ込めておくか(%)。100でしっぽ完全になし */
    retract: number;
    /** 伸びきる瞬間の行き過ぎ量(%)。0でぽよんなし、大きいほど弾む */
    overshoot: number;
    /**
     * しっぽの先の「角丸の弱め具合」(%)。
     * 0   = なめらか補正をそのまま効かせる（＝先がいちばん丸い）
     * 100 = しっぽの先だけ補正を効かせない（＝元イラストどおりの尖り具合）
     * 途中の値ほど「丸さは残しつつ、丸まりすぎを戻す」。
     * ※100 にしても角ばるわけではない。輪郭は常に曲線で描かれるので、
     *   元の手描きイラストが持っている丸みはそのまま残る。
     */
    sharp: number;
  };
  puni: {
    /** 横のふくらみ量(%) */
    ampX: number;
    /** 縦のふくらみ量(%) */
    ampY: number;
    /** 1回の呼吸にかける時間(秒) */
    period: number;
  };
  wave: {
    /** 波の高さ(px)。輪郭が法線方向にどれだけ揺れるか */
    amp: number;
    /** 輪郭一周あたりの波の数 */
    waves: number;
    /** 波が一周ぶん流れるのにかける時間(秒) */
    period: number;
  };
};

export const DEFAULT_BUBBLE: BubbleTune = {
  smooth: { passes: 2, points: 72 },
  /* 「な〜んにもない」が出はじめる頃から伸び出し、
     「たまらない」が出るタイミングで伸びきって、ぷるんと落ち着く */
  tail: { delay: 600, duration: 950, retract: 100, overshoot: 12, sharp: 55 },
  puni: { ampX: 3.5, ampY: 3, period: 2.6 },
  /* パスの曲線に沿ってゆっくり波が伝わる（採用候補） */
  wave: { amp: 3, waves: 6, period: 3.2 },
};

export function mergeBubble(partial?: Partial<BubbleTune> | null): BubbleTune {
  const d = DEFAULT_BUBBLE;
  if (!partial) return d;
  return {
    smooth: { ...d.smooth, ...partial.smooth },
    tail: { ...d.tail, ...partial.tail },
    puni: { ...d.puni, ...partial.puni },
    wave: { ...d.wave, ...partial.wave },
  };
}

export const BUBBLE_STORAGE_KEY = "abashiri-bubble";
