import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import { TAMARANEE_PATTERNS } from "@/components/tamaraneePatterns";

/* 人物イラストにカーソルを乗せた時の「眉が上がる＋たまらねーがひょこっと出る」5案。
   右下の人物にマウスを乗せて比べる。スマホは指で触っている間だけ出る。 */
export function generateStaticParams() {
  return TAMARANEE_PATTERNS.map((_, i) => ({ n: String(i + 1) }));
}

export default async function TamaraneeMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const idx = Math.min(Math.max(Number(n) || 1, 1), TAMARANEE_PATTERNS.length);
  const pat = TAMARANEE_PATTERNS[idx - 1];
  return (
    <>
      <Stage illustration="tamannee" tamaranee={idx}>
        <TopPage intro={2} blurSeq />
      </Stage>
      <div className="fixed left-3 top-3 z-[70] flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-2">
        <Link
          href="/mock/tamaranee"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-medium text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-medium text-white shadow">
          {pat.label}　{pat.note}
        </p>
        <p className="rounded-full bg-black/50 px-4 py-2 text-[13px] font-light text-white shadow">
          右下の人物にカーソルを乗せてください
        </p>
      </div>
    </>
  );
}
