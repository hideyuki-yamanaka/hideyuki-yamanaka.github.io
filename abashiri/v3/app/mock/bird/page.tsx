import Link from "next/link";

/* カモメ羽ばたきアニメーション比較 mock 一覧 */
export default function BirdMockIndex() {
  const items = [
    {
      href: "/mock/bird/1",
      title: "案1：大きめパタパタ（下げコマを曲線に修正）",
      desc: "羽の上げ下げがはっきりした2コマ。下げコマも翼のアーチを残して直線っぽさを解消。",
    },
    {
      href: "/mock/bird/2",
      title: "案2：曲線キープ・控えめ羽ばたき",
      desc: "どちらのコマもカモメらしい「〜」の曲線のまま、振り幅だけ変える上品な2コマ。",
    },
    {
      href: "/mock/bird/3",
      title: "案3：3コマなめらか",
      desc: "上げ→中間→下げ→中間と3コマで回す、少しなめらかなGIF風。",
    },
  ];
  return (
    <main className="h-dvh overflow-y-auto bg-gradient-to-b from-[#35c3ea] to-[#b5d7ff] px-6 py-14">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-2 text-[28px] font-black text-white">
          カモメ羽ばたき 比較mock
        </h1>
        <p className="mb-8 text-[14px] font-bold text-white/90">
          白カモメ（空）と水色カモメ（体験ページ）を同じ画面で確認できます
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
