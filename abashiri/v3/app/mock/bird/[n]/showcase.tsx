import Bird, { type BirdVariant } from "@/components/Bird";

const VARIANTS: Record<string, BirdVariant> = {
  "1": "flap",
  "2": "soft",
  "3": "smooth3",
};

/* 実サイズ・実色に近い配置でカモメを並べる */
export default function BirdShowcase({ n }: { n: string }) {
  const v = VARIANTS[n] ?? "flap";
  return (
    <>
      {/* 空エリア：白カモメ */}
      <div className="absolute left-[10%] top-[16%] h-[62px] w-[105px]">
        <Bird variant={v} flapDuration={0.62} driftDuration={9} />
      </div>
      <div className="absolute left-[36%] top-[10%] h-[40px] w-[64px]">
        <Bird variant={v} flapDuration={0.5} driftDuration={7} delay={0.6} />
      </div>
      <div className="absolute left-[58%] top-[24%] h-[34px] w-[58px]">
        <Bird variant={v} flapDuration={0.48} driftDuration={6} delay={1.1} />
      </div>
      <div className="absolute left-[24%] top-[38%] h-[92px] w-[150px]">
        <Bird variant={v} flapDuration={0.7} driftDuration={10} delay={0.3} />
      </div>
      <div className="absolute left-[64%] top-[44%] h-[52px] w-[88px]">
        <Bird variant={v} flapDuration={0.58} driftDuration={8} delay={0.9} />
      </div>

      {/* 体験ページ想定：薄い水色背景 × 水色カモメ */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[#e6f3ff]">
        <p className="absolute left-4 top-3 text-[12px] font-bold text-[#7ba7cc]">
          体験ページの水色カモメはこんな感じ
        </p>
        <div className="absolute left-[16%] top-[34%] h-[62px] w-[108px]">
          <Bird variant={v} color="#b6dafc" flapDuration={0.62} driftDuration={9} />
        </div>
        <div className="absolute left-[58%] top-[20%] h-[86px] w-[150px]">
          <Bird variant={v} color="#b6dafc" flapDuration={0.75} driftDuration={11} delay={0.5} />
        </div>
      </div>
    </>
  );
}
