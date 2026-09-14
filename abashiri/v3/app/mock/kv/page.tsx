import Link from "next/link";
import { KV_PATTERNS } from "@/components/kvPatterns";

/* キービジュアル後退演出 比較mock 一覧 */
export default function KvMockIndex() {
  return (
    <main className="h-dvh overflow-y-auto bg-gradient-to-b from-[#35c3ea] to-[#b5d7ff] px-6 py-14">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-2 text-[28px] font-black text-white">
          キービジュアル交代演出 比較mock（5案）
        </h1>
        <p className="mb-8 text-[14px] font-bold leading-relaxed text-white/90">
          どの案も本物のTOPページです。タブレットの中をゆっくりスクロールして、
          <br />
          「な〜んにもない たまらない」の消え方を見比べてください。
        </p>
        <div className="flex flex-col gap-4">
          {Object.entries(KV_PATTERNS).map(([n, p]) => (
            <Link
              key={n}
              href={`/mock/kv/${n}`}
              className="rounded-2xl bg-white/90 p-5 backdrop-blur transition-transform hover:scale-[1.02]"
            >
              <p className="mb-1 text-[18px] font-black text-[#0070c9]">
                案{n}：{p.name}
              </p>
              <p className="text-[13px] font-medium leading-relaxed text-[#1e1e1e]">
                {p.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
