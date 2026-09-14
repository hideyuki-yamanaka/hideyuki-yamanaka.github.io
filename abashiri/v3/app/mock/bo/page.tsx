import Link from "next/link";
import { BO_PATTERNS } from "@/components/boPatterns";

export default function BoIndex() {
  return (
    /* globals.css で html/body に overflow:hidden が掛かっている（固定ステージ用）ので、
       一覧ページは自前でスクロールできる箱にする */
    <main className="h-dvh overflow-y-auto bg-[#e6f3ff] px-6 py-12">
      <div className="mx-auto w-full max-w-[720px]">
        <p className="text-[13px] font-medium tracking-[0.12em] text-[#0070c9]">
          ABASHIRI v1.1 / ぼーっと体験
        </p>
        <h1 className="mt-2 text-[28px] font-light leading-[1.4] text-[#0b3c69]">
          動画を見ている時の「ぼーっ」　5案
        </h1>
        <p className="mt-3 text-[15px] font-light leading-[1.8] text-[#3c4a57]">
          動画再生中、右下の人物の横に出る「ぼーっ」の吹き出しです。
          <br />
          5案とも <strong className="font-medium">1回目は3秒</strong>で出て、そのあとは
          <strong className="font-medium">5秒ごと</strong>に出たり消えたりをくり返します。
          <br />
          周期と待ち時間は5案とも同じで、<strong className="font-medium">出方・漂い方の質感だけ</strong>を変えています。
        </p>
        <p className="mt-3 rounded-xl bg-white/70 px-4 py-3 text-[13px] font-light leading-[1.8] text-[#5a6b7a]">
          開いたら、画面の再生ボタンを押して動画を流してから見てください。
          <br />
          「ぼーっ」は右下の人物の右上に出ます。1回目は3秒後です。
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {BO_PATTERNS.map((p, i) => (
            <li key={p.key}>
              <Link
                href={`/mock/bo/${i + 1}`}
                className="block rounded-2xl bg-white px-6 py-5 shadow-sm transition-transform hover:scale-[1.01]"
              >
                <p className="text-[18px] font-medium text-[#0b3c69]">{p.label}</p>
                <p className="mt-1 text-[14px] font-light leading-[1.7] text-[#5a6b7a]">
                  {p.note}
                </p>
                <p className="mt-2 text-[13px] font-light leading-[1.7] text-[#0070c9]">
                  ぼーっと感 → {p.nuance}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[13px] font-light leading-[1.8] text-[#5a6b7a]">
          いまの本番は <strong className="font-medium">案4「息を吐くように抜ける」</strong>（2026-08-18 採用）。
          <br />
          他の4案は見比べ用に残しています。不要になったら消します（dev サーバが重くなるため）。
        </p>
      </div>
    </main>
  );
}
