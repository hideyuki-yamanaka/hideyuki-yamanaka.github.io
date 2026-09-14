import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import { ILLUST_ENTER_PATTERNS } from "@/components/illustEnterPatterns";

/* キービジュアルの演出が終わったあとに人物イラストが登場する5案。
   ページを開いてから約4.5秒後に出てくる。もう一度見たいときは再読み込み。 */
export function generateStaticParams() {
  return ILLUST_ENTER_PATTERNS.map((_, i) => ({ n: String(i + 1) }));
}

export default async function IllustEnterMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const idx = Math.min(Math.max(Number(n) || 1, 1), ILLUST_ENTER_PATTERNS.length);
  const pat = ILLUST_ENTER_PATTERNS[idx - 1];
  return (
    <>
      <Stage illustration="tamannee" illustEntrance illustEnter={idx}>
        <TopPage intro={2} blurSeq />
      </Stage>
      <div className="fixed left-3 top-3 z-[70] flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-2">
        <Link
          href="/mock/illust-enter"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-medium text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-medium text-white shadow">
          {pat.label}　{pat.note}
        </p>
        <p className="rounded-full bg-black/50 px-4 py-2 text-[13px] font-light text-white shadow">
          約4.5秒後に登場します（再読み込みでもう一度）
        </p>
      </div>
    </>
  );
}
