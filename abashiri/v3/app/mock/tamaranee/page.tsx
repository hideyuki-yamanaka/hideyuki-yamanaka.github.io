import Link from "next/link";
import { TAMARANEE_PATTERNS } from "@/components/tamaraneePatterns";

export default function TamaraneeIndex() {
  return (
    /* globals.css で html/body に overflow:hidden が掛かっている（固定ステージ用）ので、
       一覧ページは自前でスクロールできる箱にする */
    <main className="h-dvh overflow-y-auto bg-[#e6f3ff] px-6 py-12">
      <div className="mx-auto w-full max-w-[720px]">
        <p className="text-[13px] font-medium tracking-[0.12em] text-[#0070c9]">
          ABASHIRI v1.1 / KEY VISUAL
        </p>
        <h1 className="mt-2 text-[28px] font-light leading-[1.4] text-[#0b3c69]">
          人物イラストのホバー演出　5案
        </h1>
        <p className="mt-3 text-[15px] font-light leading-[1.8] text-[#3c4a57]">
          カーソルを乗せると眉が上がり、「たまらねー」がひょこっと出ます。
          <br />
          眉の持ち上げ量（5px）は5案とも同じで、<strong className="font-medium">出方の質感だけ</strong>を変えています。
          <br />
          スマホは人物を指で触っている間だけ出ます。
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {TAMARANEE_PATTERNS.map((p, i) => (
            <li key={p.key}>
              <Link
                href={`/mock/tamaranee/${i + 1}`}
                className="block rounded-2xl bg-white px-6 py-5 shadow-sm transition-transform hover:scale-[1.01]"
              >
                <p className="text-[18px] font-medium text-[#0b3c69]">{p.label}</p>
                <p className="mt-1 text-[14px] font-light leading-[1.7] text-[#5a6b7a]">
                  {p.note}
                </p>
                <p className="mt-2 text-[12px] font-light text-[#8c9ba8]">
                  文字 {p.text.duration}ms（{p.text.delay}ms 遅れ）／ 眉 {p.brow.duration}ms
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
