"use client";

/* 素朴なグルメの詳細（テンプレ）。/gourmet/matsuo など。
   データは components/gourmetDetailData.ts（CMSのつもり）。
   ⚠️ 見た目はスポット詳細とまったく同じ部品を使う
      （2026-09-20 ヒデさん指示「同じテンプレのフォーマットの詳細ページでOK」）。 */
import { useParams } from "next/navigation";
import SpotDetailPage from "@/components/SpotDetailPage";

export default function GourmetDetailRoute() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  return <SpotDetailPage slug={slug} />;
}
