import Link from "next/link";

/* 人物イラスト スイング（ため→速い戻り→バウンス）比較 mock 一覧 */
export default function IllustMockIndex() {
  const items = [
    {
      href: "/mock/illust/1",
      title: "案1：タメて→スナップ",
      desc: "左へゆっくり傾いてタメたあと、右へ一気に振り抜いて弾みながら戻る。いちばん王道のメリハリ。",
    },
    {
      href: "/mock/illust/2",
      title: "案2：速い2往復→ふわり収束",
      desc: "出だしに全力で2往復してから、ゆっくり中央へ収まる。前半が元気で後半が余韻。",
    },
    {
      href: "/mock/illust/3",
      title: "案3：ワイパー",
      desc: "右へじーっくりタメて、左へビュッと1回。あとはゆっくり中央へ。動きが1回だけで上品。",
    },
    {
      href: "/mock/illust/4",
      title: "案4：小刻みシェイク→ピタッ",
      desc: "プルプルッと細かく震えて、最後にすっと止まる。テンポが速くコミカル。",
    },
    {
      href: "/mock/illust/5",
      title: "案5：静止のタメ→ワンモーション",
      desc: "左に傾いた状態で一瞬ピタッと止まり、そこから右へ大きく振り抜く。間があるぶん動きが目立つ。",
    },
  ];

  return (
    <main className="h-dvh overflow-y-auto bg-gradient-to-b from-[#35c3ea] to-[#b5d7ff] px-6 py-14">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-2 text-[28px] font-black text-white">
          人物スイング 比較mock（5案・±4°）
        </h1>
        <p className="mb-8 text-[14px] font-bold leading-relaxed text-white/90">
          どの案も回転の軸はイラストの下辺中央、傾きは −4°〜+4° の範囲だけ。
          その中で緩急（メリハリ）の付け方が違います。約15秒に1回動きます（登場直後に1回目）。
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
      </div>
    </main>
  );
}
