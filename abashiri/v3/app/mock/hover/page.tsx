import Link from "next/link";

/* カードホバー＆もっと見るボタン アニメ比較 mock 一覧 */
export default function HoverMockIndex() {
  const items = [
    {
      href: "/mock/hover/1",
      title: "案1：下からすっと ＋ 矢印スライド",
      desc: "カード：黒グラデが現れて名前が下からスライドイン（カンプ基準）。ボタン：丸アイコンが右へ10pxスッと動く。",
    },
    {
      href: "/mock/hover/2",
      title: "案2：じんわりフォーカス ＋ くるっと回転",
      desc: "カード：グラデがゆっくり現れ、名前はブラーが晴れてピントが合う。ボタン：アイコンが一回転しながら少し拡大。",
    },
    {
      href: "/mock/hover/3",
      title: "案3：せり上がりワイプ ＋ ふわっと開く",
      desc: "カード：グラデの幕が下からせり上がって名前がぽんと乗る。ボタン：テキストとアイコンの間がふわっと広がる。",
    },
  ];
  return (
    <main className="h-dvh overflow-y-auto bg-gradient-to-b from-[#35c3ea] to-[#b5d7ff] px-6 py-14">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-2 text-[28px] font-black text-white">
          ホバーアニメ 比較mock（3案）
        </h1>
        <p className="mb-8 text-[14px] font-bold leading-relaxed text-white/90">
          カードのオーバーレイと「もっと見る」ボタンのセットです。
          <br />
          カードとボタンは別々の案の組み合わせ採用もOK（例：カード案2＋ボタン案1）。
        </p>
        <div className="flex flex-col gap-4">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="rounded-2xl bg-white/90 p-5 backdrop-blur transition-transform hover:scale-[1.02]"
            >
              <p className="mb-1 text-[18px] font-black text-[#0070c9]">{it.title}</p>
              <p className="text-[13px] font-medium leading-relaxed text-[#1e1e1e]">
                {it.desc}
              </p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-[12px] font-bold text-white/80">
          ※ カードのタイトル（わかさぎの唐揚げ等）は仮です。正式名称があれば教えてください
        </p>
      </div>
    </main>
  );
}
