"use client";

/* ぼーっとスポット詳細（テンプレ）。/spot/notoro など。
   データは components/spotDetailData.ts（CMSのつもり） */
import { useParams } from "next/navigation";
import SpotDetailPage from "@/components/SpotDetailPage";

export default function SpotDetailRoute() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  return <SpotDetailPage slug={slug} />;
}
