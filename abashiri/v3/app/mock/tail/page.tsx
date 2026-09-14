import Link from "next/link";
import { TAIL_PRESETS } from "./presets";

/* しっぽの先の角丸の強さ 比較 mock 一覧 */
export default function TailMockIndex() {
  return (
    <main className="h-dvh overflow-y-auto bg-gradient-to-b from-[#35c3ea] to-[#b5d7ff] px-6 py-14">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-2 text-[28px] font-black text-white">
          しっぽの先の角丸 比較mock（5案）
        </h1>
        <p className="mb-8 text-[14px] font-bold leading-relaxed text-white/90">
          しっぽが伸びる動き（速さ・タイミング・ぽよん）はどの案も本番と同じで、
          違うのは<strong>しっぽの先の丸さだけ</strong>です。数字が大きいほど、
          丸まりすぎていたのが元イラストの形に戻ります。
          <br />
          <br />
          どの案も輪郭は曲線で描いているので、<strong>角ばることはありません</strong>。
          しっぽが伸びきったあとの形をじっくり見比べてください。
          <br />
          スマホなら画面をリロードするたびに頭から再生されます。
        </p>
        <Link
          href="/mock/bubble/tune"
          className="mb-4 block rounded-2xl bg-[#0070c9]/90 p-5 backdrop-blur transition-transform hover:scale-[1.02]"
        >
          <p className="mb-1 text-[18px] font-black text-white">🫧 調整パネル</p>
          <p className="text-[13px] font-medium leading-relaxed text-white/90">
            「しっぽが伸びる」の数値を自分でいじって確かめられます。
          </p>
        </Link>
        <div className="flex flex-col gap-4">
          {Object.entries(TAIL_PRESETS).map(([n, p]) => (
            <Link
              key={n}
              href={`/mock/tail/${n}`}
              className="rounded-2xl bg-white/90 p-5 backdrop-blur transition-transform hover:scale-[1.02]"
            >
              <p className="mb-1 text-[18px] font-black text-[#0070c9]">{p.title}</p>
              <p className="text-[13px] font-medium leading-relaxed text-[#1e1e1e]">
                {p.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
