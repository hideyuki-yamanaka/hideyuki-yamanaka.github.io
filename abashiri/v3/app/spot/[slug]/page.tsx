/* ぼーっとスポット詳細（テンプレ）。/spot/notoro など。
   データは components/spotDetailData.ts（CMSのつもり）

   【2026-10-28 ヒデさん「トップからスポットへ移る時に、トランジションが静止してカクつく。ヘッダーのナビの遷移はすごく自然」】
   前は "use client" ＋ useParams の「開くたびにサーバーで作るページ」だった。Next.js はこの種類のページを先読みしないので、
   ページ移動の幕が濃くなりきった後、サーバーの返事（300〜700ms）を待って幕が止まっていた（本番で実測）。
   ヘッダーのナビは行き先（トップ）が前もって作ってあるページなので待たない＝自然。
   → スポットも generateStaticParams で「前もって作っておくページ」にした（中身の部品は SpotDetailPage のまま）。
     リンクが画面に入ると先読みされ、ボタンからの移動は PageTransition が裏で先読みしておく */
import SpotDetailPage from "@/components/SpotDetailPage";
import { SPOT_DETAILS } from "@/components/spotDetailData";

export function generateStaticParams() {
  return Object.keys(SPOT_DETAILS).map((slug) => ({ slug }));
}

export default async function SpotDetailRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SpotDetailPage slug={slug} />;
}
