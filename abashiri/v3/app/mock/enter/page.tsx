import Link from "next/link";
import { ENTER_PATTERNS } from "@/components/enterPatterns";

export default function EnterIndex() {
  return (
    /* globals.css で html/body に overflow:hidden が掛かっているので自前でスクロールさせる */
    <main className="h-dvh overflow-y-auto bg-[#e6f3ff] px-6 py-12">
      <div className="mx-auto w-full max-w-[720px]">
        <p className="text-[13px] font-medium tracking-[0.12em] text-[#0070c9]">
          ABASHIRI v1.1 / BOTTO EXPERIENCE
        </p>
        <h1 className="mt-2 text-[28px] font-light leading-[1.4] text-[#0b3c69]">
          窓枠をくぐって世界に入る演出　5案
        </h1>
        <p className="mt-3 text-[15px] font-light leading-[1.8] text-[#3c4a57]">
          「この場所にする」を押してから、動画の世界に入るまでの遷移です。
          <br />
          選んだカードが<strong className="font-medium">窓枠</strong>。近づくにつれて白フチ（10px）と角丸（120px）が外れ、
          最後は全画面になります。
          <br />
          どの案も同じ流れで、<strong className="font-medium">尺・寄り方・まわりの落とし方</strong>だけを変えています。
        </p>

        <div className="mt-6 rounded-2xl bg-[#fff7e8] px-6 py-4">
          <p className="text-[14px] font-medium text-[#8a6314]">見かた</p>
          <p className="mt-1 text-[13px] font-light leading-[1.8] text-[#6b5010]">
            カルーセルの画面から始まります。カードにカーソルを乗せると拡大して
            「この場所にする」が出るので、それを押すと遷移が始まります。
            <br />
            遷移後に出る「↺ もう一度見る」でカルーセルに戻れます。
          </p>
        </div>

        <ul className="mt-8 flex flex-col gap-3">
          {ENTER_PATTERNS.map((p, i) => (
            <li key={p.key}>
              <Link
                href={`/mock/enter/${i + 1}`}
                className="block rounded-2xl bg-white px-6 py-5 shadow-sm transition-transform hover:scale-[1.01]"
              >
                <p className="text-[18px] font-medium text-[#0b3c69]">{p.label}</p>
                <p className="mt-1 text-[14px] font-light leading-[1.7] text-[#5a6b7a]">
                  {p.note}
                </p>
                <p className="mt-2 text-[12px] font-light text-[#8c9ba8]">
                  尺 {(p.duration / 1000).toFixed(1)}秒 ／ 景色の視差 {p.parallax.toFixed(2)}
                  {p.dim > 0 && ` ／ まわりを ${Math.round(p.dim * 100)}% 落とす`}
                  {p.blur[1] > 0 && ` ／ 途中で ${p.blur[1]}px ぼかす`}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[13px] font-light leading-[1.8] text-[#5a6b7a]">
          採用案が決まったら、他の4案は消します（dev サーバが重くなるため）。
        </p>
      </div>
    </main>
  );
}
