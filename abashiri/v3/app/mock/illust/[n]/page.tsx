import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";

const TITLES: Record<string, string> = {
  "1": "案1:タメて→スナップ",
  "2": "案2:速い2往復→ふわり収束",
  "3": "案3:ワイパー",
  "4": "案4:小刻みシェイク→ピタッ",
  "5": "案5:静止のタメ→ワンモーション",
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((n) => ({ n }));
}

export default async function IllustMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const num = Number(n);
  return (
    <>
      <Stage illustration="tamannee" illustEntrance illustAnim={num}>
        <TopPage intro={2} blurSeq />
      </Stage>
      <div className="fixed left-3 top-3 z-[70] flex items-center gap-2">
        <Link
          href="/mock/illust"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-black text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-bold text-white shadow">
          {TITLES[n] ?? TITLES["1"]}（右下の人物・約15秒ごと）
        </p>
      </div>
    </>
  );
}
