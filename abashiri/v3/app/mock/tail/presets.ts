import { DEFAULT_BUBBLE, type BubbleTune } from "@/components/bubbleConfig";

/*
 * 吹き出しのしっぽの「先の角丸をどれだけ弱めるか」の比較用プリセット。
 *
 * 伸びるタイミング・速さ・ぽよん具合は全案とも本番と同じ（採用済み）。
 * 違うのは tail.sharp ＝ なめらか補正をしっぽの先にどれだけ効かせないか、だけ。
 *
 * 参考：元イラストのしっぽの先は y=179.3。
 *       なめらか補正をフルに効かせると y=171.8 まで削れて丸くなる。
 *       sharp を上げるほど元の 179.3 に近づく＝丸まりすぎが戻る。
 *       どの案も輪郭は曲線で描くので、角ばることはない。
 */
export type TailPreset = {
  title: string;
  desc: string;
  tail: BubbleTune["tail"];
};

const base = DEFAULT_BUBBLE.tail;
const withSharp = (sharp: number) => ({ ...base, sharp });

export const TAIL_PRESETS: Record<string, TailPreset> = {
  "1": {
    title: "案1：0%（これまでの本番）",
    desc: "なめらか補正をしっぽの先にもフルに効かせた状態。いちばん丸い。比較の基準として置いてます。",
    tail: withSharp(0),
  },
  "2": {
    title: "案2：35%（ほんの少しだけ）",
    desc: "丸さをたっぷり残したまま、削れすぎたぶんを少しだけ戻す。言われな気づかんレベルの控えめ。",
    tail: withSharp(35),
  },
  "3": {
    title: "案3：55%（採用中）",
    desc: "丸みは残しつつ、しっぽの先がちゃんと「先っぽ」に見える。いま本番に入れてある設定です。",
    tail: withSharp(55),
  },
  "4": {
    title: "案4：75%（しっかりめ）",
    desc: "元イラストにかなり近い。しっぽの向きがはっきり出るぶん、少しシャープな印象。",
    tail: withSharp(75),
  },
  "5": {
    title: "案5：100%（元イラストどおり）",
    desc: "しっぽの先には補正を一切かけない。イラストレーターさんが描いた通りの丸み。これでも角ばりはしません。",
    tail: withSharp(100),
  },
};
