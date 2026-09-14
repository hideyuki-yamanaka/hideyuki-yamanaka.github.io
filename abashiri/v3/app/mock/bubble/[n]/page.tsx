import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";

const TITLES: Record<string, string> = {
  "1": "案1:ぷにぷに呼吸",
  "2": "案2:ふわゆら漂い",
  "3": "案3:輪郭ムニムニ",
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((n) => ({ n }));
}

export default async function BubbleMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const num = Number(n);
  return (
    <>
      <Stage illustration="tamannee" illustEntrance>
        <TopPage intro={2} blurSeq bubbleAnim={num} />
      </Stage>
      <div className="fixed left-3 top-3 z-[70] flex items-center gap-2">
        <Link
          href="/mock/bubble"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-black text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-bold text-white shadow">
          {TITLES[n] ?? TITLES["1"]}（登場後の吹き出しに注目）
        </p>
      </div>
    </>
  );
}
