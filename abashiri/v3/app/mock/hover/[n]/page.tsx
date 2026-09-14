import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage, { type CardHover, type MoreAnim } from "@/components/TopPage";

/* 比較検討用の3案。採用は案1で、本番の TopPage 側に直接書いてある。
   ここは「他の案がどう見えたか」を残しておくためだけの置き場。 */
const CARD_HOVERS: Record<string, CardHover> = {
  "1": {
    overlay:
      "opacity-0 transition-opacity duration-500 ease-standard group-hover:opacity-100",
    title:
      "translate-y-[18px] opacity-0 transition-all delay-75 duration-500 ease-standard group-hover:translate-y-0 group-hover:opacity-100",
  },
  "2": {
    overlay:
      "opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100",
    title:
      "opacity-0 blur-[6px] transition-all duration-700 ease-out group-hover:opacity-100 group-hover:blur-none",
  },
  "3": {
    overlay:
      "translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.35,1)] group-hover:translate-y-0",
    title:
      "translate-y-[24px] opacity-0 transition-all delay-100 duration-500 ease-[cubic-bezier(0.3,1.4,0.5,1)] group-hover:translate-y-0 group-hover:opacity-100",
  },
};

const MORE_ANIMS: Record<string, MoreAnim> = {
  "1": {
    text: "",
    icon: "transition-transform duration-300 ease-standard group-hover:translate-x-[10px]",
  },
  "2": {
    text: "",
    icon: "transition-transform duration-500 ease-[cubic-bezier(0.3,1.2,0.4,1)] group-hover:rotate-[360deg] group-hover:scale-110",
  },
  "3": {
    text: "transition-transform duration-300 ease-out group-hover:-translate-x-[6px]",
    icon: "transition-transform duration-300 ease-out group-hover:translate-x-[8px] group-hover:scale-105",
  },
};

const TITLES: Record<string, string> = {
  "1": "案1:下からすっと + 矢印スライド",
  "2": "案2:じんわりフォーカス + くるっと回転",
  "3": "案3:せり上がりワイプ + ふわっと開く",
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((n) => ({ n }));
}

export default async function HoverMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  return (
    <>
      <Stage illustration="tamannee" illustEntrance>
        <TopPage intro={2} blurSeq cardHover={CARD_HOVERS[n]} moreAnim={MORE_ANIMS[n]} />
      </Stage>
      <div className="fixed left-3 top-3 z-[70] flex items-center gap-2">
        <Link
          href="/mock/hover"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-black text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-bold text-white shadow">
          {TITLES[n] ?? TITLES["1"]}（カードにマウスを乗せて確認）
        </p>
      </div>
    </>
  );
}
