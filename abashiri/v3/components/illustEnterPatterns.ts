/*
 * キービジュアルの演出が終わったあと、人物イラストが登場する時の案。
 * /mock/illust-enter で並べて比べられる。
 *
 * 変遷：
 *   2026-08-17 「歩き」「ぴょこん」の2案に絞る → 2026-08-20 ぴょこん5案
 *   2026-08-21 ぴょこん（旧案2）で確定。歩き・旧案3〜6は削除し、
 *              「メリハリの強いバウンス」系のバリエーション3つを追加した
 * どれも画面の下（見えない位置）から跳ね上がる。違うのは跳ね方の性格だけ。
 *
 * 共通ルール
 * - 出るタイミングは「全部そろった一番最後」（TopPage の合図を待つ）
 * - 着地点はカンプ位置 (1245, 764)。どちらも最後はそこでピタッと止まる
 * - 動く量はカンプ（1512x982 ステージ）上の px ＝ 見た目そのままの px
 */
import type { Transition, TargetAndTransition } from "framer-motion";

export type IllustEnterPattern = {
  key: string;
  label: string;
  note: string;
  /** 出る前の状態 */
  initial: TargetAndTransition;
  /** 着地までのキーフレーム */
  animate: TargetAndTransition;
  transition: Transition;
  /** 登場が終わってから、いつもの15秒おきスイングを始めるか */
  swingAfter: boolean;
};

/* 2026-08-21 ヒデさん指示で刷新：
   「枠外から画面へ入ってくるスパンをもっと短く。そこにバウンスを乗せる」
   → 全案とも移動そのものは速く（0.5〜0.75秒）、性格の違いは着地後の弾み方で出す */
export const ILLUST_ENTER_PATTERNS: IllustEnterPattern[] = [
  {
    key: "quick-hitohazumi",
    label: "案1  スッ→ひと弾み",
    note: "短い時間でスッと入って、着地でひとつだけ軽く弾む。いちばん素直",
    initial: { opacity: 1, filter: "blur(0px)", x: 0, y: 240, rotate: 0 },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      y: [240, -20, 5, 0],
      rotate: [0, -2, 1, 0],
    },
    transition: {
      duration: 0.55,
      times: [0, 0.55, 0.8, 1],
      ease: ["easeOut", "easeInOut", "easeOut"],
    },
    swingAfter: true,
  },
  {
    key: "quick-double",
    label: "案2  ビュンッ→2度弾み",
    note: "速く飛び出して、大→小の2回バウンド。リズム感と元気さ",
    initial: { opacity: 1, filter: "blur(0px)", x: 0, y: 240, rotate: 0 },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      y: [240, -28, 8, -10, 3, 0],
      rotate: [0, -4, 2, -2, 1, 0],
    },
    transition: {
      duration: 0.65,
      times: [0, 0.38, 0.58, 0.76, 0.9, 1],
      ease: ["easeOut", "easeIn", "easeOut", "easeIn", "easeOut"],
    },
    swingAfter: true,
  },
  {
    key: "quick-purun",
    label: "案3  ポンッ→プルン",
    note: "着地の瞬間にからだが少しつぶれて戻る（ゼリー感）。かわいさ重視",
    initial: {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      y: 240,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      originY: 1,
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      originY: 1,
      y: [240, -18, 0, 0, 0],
      scaleY: [1, 1.05, 0.9, 1.04, 1],
      scaleX: [1, 0.97, 1.07, 0.98, 1],
      rotate: 0,
    },
    transition: {
      duration: 0.6,
      times: [0, 0.45, 0.66, 0.85, 1],
      ease: ["easeOut", "easeIn", "easeOut", "easeInOut"],
    },
    swingAfter: true,
  },
  {
    key: "quick-sutatto",
    label: "案4  スタッ→小刻み",
    note: "最速でスタッと着地して、ごく小さく2回だけ震える。キレ重視",
    initial: { opacity: 1, filter: "blur(0px)", x: 0, y: 240, rotate: 0 },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      y: [240, -8, 0, -4, 0, 0],
      rotate: [0, -1, 0.5, -0.5, 0, 0],
    },
    transition: {
      duration: 0.5,
      times: [0, 0.5, 0.66, 0.8, 0.92, 1],
      ease: ["easeOut", "easeIn", "easeOut", "easeIn", "easeOut"],
    },
    swingAfter: true,
  },
  {
    key: "quick-boyon",
    label: "案5  高めジャンプ→ボヨンボヨン",
    note: "高く飛んで、だんだん小さく3回弾んで収まる。いちばん遊び心あり",
    initial: { opacity: 1, filter: "blur(0px)", x: 0, y: 240, rotate: 0 },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      y: [240, -40, 10, -16, 4, -6, 2, 0],
      rotate: [0, -5, 2, -3, 1.5, -1, 0.5, 0],
    },
    transition: {
      duration: 0.75,
      times: [0, 0.3, 0.46, 0.6, 0.72, 0.84, 0.93, 1],
      ease: [
        "easeOut",
        "easeIn",
        "easeOut",
        "easeIn",
        "easeOut",
        "easeIn",
        "easeOut",
      ],
    },
    swingAfter: true,
  },
];

/* 採用：案3「ポンッ→プルン」（2026-08-21 ヒデさん確定。パネルの案ピルは撤去済み） */
export const DEFAULT_ILLUST_ENTER = ILLUST_ENTER_PATTERNS[2];

export function findIllustEnter(key?: string | number | null): IllustEnterPattern {
  if (key == null) return DEFAULT_ILLUST_ENTER;
  const byIndex = ILLUST_ENTER_PATTERNS[Number(key) - 1];
  return (
    byIndex ??
    ILLUST_ENTER_PATTERNS.find((p) => p.key === key) ??
    DEFAULT_ILLUST_ENTER
  );
}
