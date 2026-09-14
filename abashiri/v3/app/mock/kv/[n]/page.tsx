import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import { KV_PATTERNS } from "@/components/kvPatterns";

/* キービジュアル交代演出 比較：本物のTOPページに各パターンを適用 */
export function generateStaticParams() {
  return Object.keys(KV_PATTERNS).map((n) => ({ n }));
}

export default async function KvMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const num = Number(n);
  const p = KV_PATTERNS[num] ?? KV_PATTERNS[1];
  return (
    <>
      <Stage illustration="tamannee">
        <TopPage intro={2} kv={num} />
      </Stage>
      <div className="fixed left-3 top-3 z-50 flex items-center gap-2">
        <Link
          href="/mock/kv"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-black text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-bold text-white shadow">
          案{num}：{p.name}
        </p>
      </div>
    </>
  );
}
