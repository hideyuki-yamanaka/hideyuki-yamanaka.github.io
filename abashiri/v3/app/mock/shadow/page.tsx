import Link from "next/link";

/* タブレット浮遊シャドウ 比較 mock 一覧 */
export default function ShadowMockIndex() {
  const items = [
    {
      href: "/mock/shadow/1",
      title: "案1：ふんわりハロー",
      desc: "深い海色のやわらかい光暈（ハロー）をぐるっと均一にまとう。いちばんシンプルで空気感のある浮き方。",
    },
    {
      href: "/mock/shadow/2",
      title: "案2：二層リアル",
      desc: "近くの濃い影＋遠くの淡い広がりの2枚重ね。実物っぽい立体感で「高さ」がいちばん伝わる。",
    },
    {
      href: "/mock/shadow/3",
      title: "案3：斜め光",
      desc: "右上から光が当たっている体で、左下へ長く影が伸びる。いちばんドラマチックで方向性のある浮き方。",
    },
  ];
  return (
    <main className="h-dvh overflow-y-auto bg-gradient-to-b from-[#35c3ea] to-[#b5d7ff] px-6 py-14">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-2 text-[28px] font-black text-white">
          タブレット浮遊シャドウ 比較mock（3案）
        </h1>
        <p className="mb-8 text-[14px] font-bold leading-relaxed text-white/90">
          現行のくっきりした水色の影を外して、トンマナになじむ新しい影に差し替えた比較です。
          ※ タブレットの下端は画面外に見切れるデザインなので、左右の縁の見え方で選ぶのがおすすめ。
        </p>
        <Link
          href="/mock/shadow/tune"
          className="mb-4 block rounded-2xl bg-[#0070c9]/90 p-5 backdrop-blur transition-transform hover:scale-[1.02]"
        >
          <p className="mb-1 text-[18px] font-black text-white">🌫 調整パネル（案3採用版）</p>
          <p className="text-[13px] font-medium leading-relaxed text-white/90">
            影の位置・ぼかし・広がり・色・濃さをその場でいじって確認できます。
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
