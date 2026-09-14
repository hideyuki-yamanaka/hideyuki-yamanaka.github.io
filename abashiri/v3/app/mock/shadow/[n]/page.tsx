import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";

/* 比較mock専用の浮遊シャドウ3案。採用は案3「斜め光」で、
   本番は shadowConfig.ts のパラメーター（/mock/shadow/tune で調整）を使う。 */
const FRAME_SHADOWS: Record<string, string> = {
  "1": "shadow-[0_0_80px_12px_rgba(0,95,179,0.35)]",
  "2": "shadow-[0_18px_35px_rgba(0,95,179,0.28),0_0_120px_24px_rgba(0,95,179,0.24)]",
  "3": "shadow-[-45px_55px_80px_-12px_rgba(0,95,179,0.45)]",
};

const TITLES: Record<string, string> = {
  "1": "案1:ふんわりハロー",
  "2": "案2:二層リアル",
  "3": "案3:斜め光",
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((n) => ({ n }));
}

export default async function ShadowMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  return (
    <>
      <Stage illustration="tamannee" illustEntrance>
        <TopPage intro={2} blurSeq frameShadow={FRAME_SHADOWS[n]} />
      </Stage>
      <div className="fixed left-3 top-3 z-[70] flex items-center gap-2">
        <Link
          href="/mock/shadow"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-black text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-bold text-white shadow">
          {TITLES[n] ?? TITLES["1"]}（タブレットの影に注目）
        </p>
      </div>
    </>
  );
}
