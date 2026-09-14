import Link from "next/link";

/* 吹き出しムニムニアニメ 比較 mock 一覧 */
export default function BubbleMockIndex() {
  const items = [
    {
      href: "/mock/bubble/1",
      title: "案1：ぷにぷに呼吸",
      desc: "吹き出し全体が縦横スクイッシュしながらゆっくり呼吸。スライムをそっと押すような弾力感。文字は動かない。",
    },
    {
      href: "/mock/bubble/2",
      title: "案2：ふわゆら漂い",
      desc: "吹き出しがわずかに浮き沈み＋ほんの少し傾く。空に浮かんでる雲っぽい、いちばん控えめな案。",
    },
    {
      href: "/mock/bubble/3",
      title: "案3：輪郭ムニムニ",
      desc: "ゆらぎノイズで吹き出しの縁そのものが波打つ。陽炎みたいにムニムニ動く、いちばん有機的な案。",
    },
  ];
  return (
    <main className="h-dvh overflow-y-auto bg-gradient-to-b from-[#35c3ea] to-[#b5d7ff] px-6 py-14">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-2 text-[28px] font-black text-white">
          吹き出しムニムニ 比較mock（3案）
        </h1>
        <p className="mb-8 text-[14px] font-bold leading-relaxed text-white/90">
          登場アニメが終わったあと、吹き出しがずっとゆるく動き続けます。
          <br />
          登場演出（ブラー順出し）はどの案も今のままです。
        </p>
        <Link
          href="/mock/bubble/tune"
          className="mb-4 block rounded-2xl bg-[#0070c9]/90 p-5 backdrop-blur transition-transform hover:scale-[1.02]"
        >
          <p className="mb-1 text-[18px] font-black text-white">🫧 調整パネル（おすすめ）</p>
          <p className="text-[13px] font-medium leading-relaxed text-white/90">
            パスのなめらか補正＋曲線に沿って波が流れるアニメを、数値をいじりながら確認できます。
          </p>
        </Link>
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
