"use client";

/* 動画を見ている画面（体験フローの step3）をそのまま出して、
   右下の人物の「ぼーっ」の出方だけを案ごとに差し替える。
   ⚠️ 比較mockでも本物の画面・本物の動画を使う（ヒデさんルール） */
import Stage from "@/components/Stage";
import ExperienceFlow from "@/components/ExperienceFlow";

export default function BoShowcase({ idx }: { idx: number }) {
  return (
    <Stage illustration="bo" bo={idx}>
      <ExperienceFlow step={3} setStep={() => {}} />
    </Stage>
  );
}
