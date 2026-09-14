"use client";

import { use, useState } from "react";
import Link from "next/link";
import Stage from "@/components/Stage";
import ExperienceFlow, { type Step } from "@/components/ExperienceFlow";
import { ENTER_PATTERNS } from "@/components/enterPatterns";

/* 「この場所にする」を押してから動画の世界に入るまでの遷移 5案。
   カルーセルから始まるので、カードにカーソルを乗せて → ボタンを押す、で確認できる。 */
export default function EnterMockPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = use(params);
  const idx = Math.min(Math.max(Number(n) || 1, 1), ENTER_PATTERNS.length);
  const pat = ENTER_PATTERNS[idx - 1];

  /* 遷移だけを何度も見たいので、カルーセル（step2）から始める */
  const [step, setStep] = useState<Step>(2);

  return (
    <>
      <Stage illustration="bo">
        <ExperienceFlow step={step} setStep={setStep} enter={idx} />
      </Stage>

      <div className="fixed left-3 top-3 z-[70] flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-2">
        <Link
          href="/mock/enter"
          className="rounded-full bg-white/95 px-4 py-2 text-[13px] font-medium text-[#0070c9] shadow"
        >
          ← 一覧へ
        </Link>
        <p className="rounded-full bg-[#0070c9]/85 px-4 py-2 text-[13px] font-medium text-white shadow">
          {pat.label}　{pat.note}
        </p>
        <p className="rounded-full bg-black/50 px-4 py-2 text-[13px] font-light text-white shadow">
          カードにカーソルを乗せて「この場所にする」を押す
        </p>
        {step === 3 && (
          <button
            type="button"
            onClick={() => setStep(2)}
            className="cursor-pointer rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[#0b3c69] shadow transition-transform hover:scale-105"
          >
            ↺ もう一度見る
          </button>
        )}
      </div>
    </>
  );
}
