import Link from "next/link";
import BoShowcase from "./showcase";
import { BO_PATTERNS } from "@/components/boPatterns";

/* 動画再生中の「ぼーっ」の出方 5案。
   最初の5秒は出ない → そのあと5秒ごとに出入りをくり返す。 */
export function generateStaticParams() {
  return BO_PATTERNS.map((_, i) => ({ n: String(i + 1) }));
}

export default async function BoMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const idx = Math.min(Math.max(Number(n) || 1, 1), BO_PATTERNS.length);
  const pat = BO_PATTERNS[idx - 1];
  return (
    <>
      <BoShowcase idx={idx} />
      <div className="fixed left-3 top-3 z-[70] flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-2">
        <Link
          href="/mock/bo"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-medium text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-medium text-white shadow">
          {pat.label}　{pat.note}
        </p>
        <p className="rounded-full bg-black/50 px-4 py-2 text-[13px] font-light text-white shadow">
          1回目は{pat.startDelay}秒後。そのあと{pat.cycle}秒ごとにくり返します
        </p>
        <div className="flex items-center gap-1">
          {BO_PATTERNS.map((p, i) => (
            <Link
              key={p.key}
              href={`/mock/bo/${i + 1}`}
              className={`flex size-[30px] items-center justify-center rounded-full text-[13px] font-bold shadow ${
                i + 1 === idx
                  ? "bg-[#0070c9] text-white"
                  : "bg-white/95 text-[#0070c9]"
              }`}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
