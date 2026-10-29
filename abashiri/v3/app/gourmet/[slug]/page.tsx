/* 素朴なグルメの詳細（テンプレ）。/gourmet/matsuo など。
   データは components/gourmetDetailData.ts（CMSのつもり）。
   ⚠️ 見た目はスポット詳細とまったく同じ部品を使う
      （2026-09-20 ヒデさん指示「同じテンプレのフォーマットの詳細ページでOK」）。
   2026-10-28 スポットと同じく「前もって作っておくページ」にした（ページ移動の幕が止まらないように・app/spot/[slug]/page.tsx に経緯） */
import SpotDetailPage from "@/components/SpotDetailPage";
import { GOURMET_DETAILS } from "@/components/gourmetDetailData";

export function generateStaticParams() {
  return Object.keys(GOURMET_DETAILS).map((slug) => ({ slug }));
}

export default async function GourmetDetailRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SpotDetailPage slug={slug} />;
}
