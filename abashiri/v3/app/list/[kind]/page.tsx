/* 一覧ページ（ぼーっとスポット／素朴なグルメ／意外とオモロい体験）。/list/spot・/list/gourmet・/list/event
   2026-10-29 ヒデさん「各コンテンツの下層ページ（一覧のページ）を作りたい。レイアウトのパターンを静的5つ＋インタラクション5つ」
   中身の部品は components/ListPage.tsx。前もって作っておくページにして、ページ移動の幕が止まらないようにする */
import ListPage, { type ListKind } from "@/components/ListPage";

const KINDS: ListKind[] = ["spot", "gourmet", "event"];

export function generateStaticParams() {
  return KINDS.map((kind) => ({ kind }));
}

export default async function ListRoute({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const k = (KINDS as string[]).includes(kind) ? (kind as ListKind) : "spot";
  return <ListPage kind={k} />;
}
