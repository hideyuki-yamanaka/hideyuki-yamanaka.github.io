"use client";

/*
 * ぼーっとTips（動画再生ページのモーダル。カンプ 15564:22022。2026-08-23 ヒデさん依頼）
 *
 * 動画を再生して delaySec 秒たったら、画面中央にふわーっとフェードインで出る。
 * ×で閉じると fadeSec 秒かけてフェードアウト。一度閉じたらこの動画滞在中は出さない。
 * 一時停止するといったん消え、再開すると（未クローズなら）また delaySec 後に出る。
 *
 * カンプ実測値：
 *   本体 幅700 / 角丸16 / 白10% / ブラー65 / padding44 / 縦gap24 / 中央配置
 *   ピル「ぼーっとTips」 幅186 / 白40% / ブラー90 / px16 py6 / 本体上端-22px / 16px Regular
 *   見出し「五感を使おう」20px ＋「どんな音が聞こえるかな？」46px（ExtraLight・行間1.2・gap8）
 *   本文 14px Light 行間1.8 白
 */
import { useEffect, useRef, useState } from "react";

export type BoTipsTune = {
  /** 再生からモーダルが出るまでの時間（秒） */
  delay: number;
  /** フェードイン/アウトのアニメーション時間（秒） */
  fade: number;
  /** 1〜5: 出現のしかた（TIPS_PATTERNS） */
  pattern: number;
};
export const DEFAULT_BO_TIPS: BoTipsTune = { delay: 5, fade: 1.2, pattern: 5 }; /* 案5「下からゆっくり」で採用（2026-08-23 ヒデさん決定） */

/* 出現のしかた5案（2026-08-23 ヒデさん依頼。パネルのピルで切替） */
export const TIPS_PATTERNS: Record<number, { name: string; note: string }> = {
  1: { name: "フェード", note: "透明→そのままふわっと。いちばんシンプル。" },
  2: { name: "ブラーで出現", note: "ぼやけた状態からピントが合うように現れます。" },
  3: { name: "ブラー＋下から", note: "ぼやけたまま下からふわっと浮かび上がります。" },
  4: { name: "ブラー＋少し拡大", note: "小さくぼやけた状態から、ピントと大きさが同時に合います。" },
  5: { name: "下からゆっくり", note: "ブラーなしで、下からゆっくり浮かび上がります。" },
};

/* 各案の「出る前」の状態。出たあとは全案共通（透明度1・ブラー0・移動なし） */
const FROM: Record<number, React.CSSProperties> = {
  1: { opacity: 0, filter: "blur(0px)", transform: "none" },
  2: { opacity: 0, filter: "blur(18px)", transform: "none" },
  3: { opacity: 0, filter: "blur(12px)", transform: "translateY(26px)" },
  4: { opacity: 0, filter: "blur(10px)", transform: "scale(0.95)" },
  5: { opacity: 0, filter: "blur(0px)", transform: "translateY(40px)" },
};
const SHOWN: React.CSSProperties = {
  opacity: 1,
  filter: "blur(0px)",
  transform: "none",
};

export default function BoTips({
  active,
  tune = DEFAULT_BO_TIPS,
  onVisibleChange,
  compact = false,
}: {
  /** true の間だけ出現カウントが進む（再生中かつ再生UIが消えている時。2026-08-23 仕様） */
  active: boolean;
  tune?: BoTipsTune;
  /** モーダルの表示中フラグを親（Watch）へ知らせる。表示中は再生UIを出さないため */
  onVisibleChange?: (visible: boolean) => void;
  /** スマホ用に一回り小さく（幅・見出しを縮小。2026-08-24） */
  compact?: boolean;
}) {
  /* hidden: 出ていない / pre: 出る直前の1コマ（アニメの出発点） / in: 表示中 / out: フェードアウト中 */
  const [phase, setPhase] = useState<"hidden" | "pre" | "in" | "out">("hidden");
  const firstPattern = useRef(true);
  const [closed, setClosed] = useState(false); /* ×で閉じたら滞在中は出さない */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (active && !closed) {
      /* 「何もない状態」になってからカウント開始（2026-08-23 ヒデさん仕様） */
      timer.current = setTimeout(
        () => setPhase("pre"),
        Math.max(0, tune.delay) * 1000
      );
    } else if (!active) {
      /* 再生が止まった/再生UIが出た → 表示中ならフェードアウト（閉じた扱いにはしない） */
      setPhase((p) => (p === "in" || p === "pre" ? "out" : p));
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, closed, tune.delay]);

  /* pre（出発点の見た目）を1コマ描いてから in へ。
     いきなり in で置くと、トランジションの出発点が描画されず
     アニメなしでパッと出てしまう（2026-08-23 ヒデさん報告のバグ修正） */
  useEffect(() => {
    if (phase !== "pre") return;
    const id = setTimeout(() => setPhase("in"), 50);
    return () => clearTimeout(id);
  }, [phase]);

  /* 表示中かどうかを親へ通知（表示中は再生UIを出さない排他制御に使う） */
  useEffect(() => {
    onVisibleChange?.(phase === "pre" || phase === "in");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* パネルで出現パターンを切り替えたら、その場で出し直して比較できるようにする */
  useEffect(() => {
    if (firstPattern.current) {
      firstPattern.current = false;
      return;
    }
    if (!active) return;
    setClosed(false);
    setPhase("hidden");
    const id = setTimeout(() => setPhase("pre"), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tune.pattern]);

  /* フェードアウトが終わったら DOM から下ろす */
  useEffect(() => {
    if (phase !== "out") return;
    const id = setTimeout(() => setPhase("hidden"), tune.fade * 1000);
    return () => clearTimeout(id);
  }, [phase, tune.fade]);

  const close = () => {
    setClosed(true);
    setPhase("out");
  };

  if (phase === "hidden") return null;

  /* 登場アニメ（本体とピルに同じものを当てて同時に動かす） */
  const anim: React.CSSProperties = {
    ...(phase === "in" ? SHOWN : FROM[tune.pattern] || FROM[1]),
    transition: `opacity ${tune.fade}s cubic-bezier(0.22,1,0.36,1), filter ${tune.fade}s cubic-bezier(0.22,1,0.36,1), transform ${tune.fade}s cubic-bezier(0.22,1,0.36,1)`,
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      {/* ⚠️ ピルは本体（backdrop-blur を持つ）の外に出す。本体の中に置くと、
          本体が「背景ぼかしの起点」になり、ピルの backdrop-blur は景色ではなく
          本体の描画結果をぼかすため、はみ出し部分ではほぼ効かない
          （2026-08-24 ヒデさん指摘の帯のブラーが効かない件の真因） */}
      <div
        className={`pointer-events-auto relative ${
          compact ? "w-[calc(100vw-40px)] max-w-[420px]" : "w-[700px] max-w-[86vw]"
        }`}
      >
        {/* 本体 */}
        <div
          className={`relative rounded-2xl bg-white/10 backdrop-blur-[65px] ${
            compact ? "p-7" : "p-[44px]"
          }`}
          style={anim}
        >
          {/* ×：案2「内側右上のシンプル×」で採用（2026-08-23 ヒデさん決定） */}
          <button
            type="button"
            onClick={close}
            aria-label="とじる"
            className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center text-white/70 transition-colors duration-300 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <div
            className={`flex flex-col items-center text-center text-white ${
              compact ? "gap-4" : "gap-6"
            }`}
          >
            <div className="flex flex-col items-center gap-2 leading-[1.2]">
              {/* 見出しサイズはカンプ実測（20px/46px）。compact はスマホ用に縮小 */}
              <p className={compact ? "text-[15px] font-extralight" : "text-[20px] font-extralight"}>
                五感を使おう
              </p>
              <p
                className={`whitespace-nowrap font-extralight ${
                  compact ? "text-[30px]" : "text-[46px]"
                }`}
              >
                どんな音が聞こえるかな？
              </p>
            </div>
            <p className="text-left text-body-14 font-light leading-[1.8]">
              音に集中して、耳を澄ませましょう。どんな音が聞こえてくるでしょうか。船のエンジン音、鳥のなく声、流氷が軋む音などでも構いません。その音に集中してみよう。
            </p>
          </div>
        </div>

        {/* 上部ピル（カンプ 15564:22024。本体の上端に半分乗る・白40%・ブラー100）。
            中央寄せは外側のラッパー（transform）、登場アニメは内側に分けて当てる */}
        <div className="absolute -top-[22px] left-1/2 -translate-x-1/2">
          <div
            className="flex w-[186px] items-center justify-center rounded-full bg-white/40 px-4 py-[6px] backdrop-blur-[100px]"
            style={anim}
          >
            <p className="text-body-16 font-normal leading-[1.2] text-white">
              ぼーっとTips
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
