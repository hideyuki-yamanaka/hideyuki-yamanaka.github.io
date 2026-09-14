import Link from "next/link";
import BirdShowcase from "./showcase";

const TITLES: Record<string, string> = {
  "1": "案1:大きめパタパタ（下げコマを曲線に修正）",
  "2": "案2:曲線キープ・控えめ羽ばたき",
  "3": "案3:3コマなめらか",
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((n) => ({ n }));
}

export default async function BirdMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#35c3ea] to-[#b5d7ff]">
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <Link
          href="/mock/bird"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-black text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-bold text-white shadow">
          {TITLES[n] ?? TITLES["1"]}
        </p>
      </div>
      <BirdShowcase n={n} />
    </main>
  );
}
