"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * スマホ（〜640px）用のぼーっと体験ページ（2026-08-24〜 ヒデさん依頼）。
 *
 * 4ステップ：導入 → 場所えらび（青グラデ＋横カルーセル：PC版のレスポンシブ）
 *   → 窓枠ダイブイン（選んだカードが画面いっぱいに広がる）→ 動画再生（ぼーっとTips＋後ろ向き人物）。
 * 動画は ryuhyo.mp4 の1本のみ（＝流氷クルーズだけ体験可）。
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BoTips, { DEFAULT_BO_TIPS } from "./BoTips";

const PICKS = [
  { id: "notoro", label: "能取岬", no: "01", img: "/img/spot-notoro.jpg" },
  { id: "sangoso", label: "能取湖サンゴ草群落地", no: "02", img: "/img/spot-sangoso.jpg" },
  { id: "eki", label: "網走駅", no: "03", img: "/img/spot-eki.jpg" },
  { id: "ryuhyo", label: "流氷クルーズ", no: "04", img: "/img/ice.jpg", video: "/video/ryuhyo.mp4" },
];
const VIDEO_IDX = PICKS.findIndex((p) => p.video);
const CARD_W = 300; // カード幅（PC 902 のレスポンシブ縮小）

type EnterRect = { top: number; left: number; width: number; height: number };

export default function MobileExperience() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "pick" | "enter" | "video">("intro");
  const [pickIdx, setPickIdx] = useState(VIDEO_IDX);
  const [playing, setPlaying] = useState(false);
  const [remaining, setRemaining] = useState(180);
  const [ui, setUi] = useState(true);
  const [tipsVisible, setTipsVisible] = useState(false);
  const [personIn, setPersonIn] = useState(false);
  const [enterRect, setEnterRect] = useState<EnterRect | null>(null);
  const [enterExpanded, setEnterExpanded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = PICKS[pickIdx];

  /* カルーセルは 流氷 を中央にして開く */
  useEffect(() => {
    if (step !== "pick") return;
    const c = carRef.current;
    const el = cardEls.current[VIDEO_IDX];
    if (c && el) {
      c.scrollLeft = el.offsetLeft - (c.clientWidth - el.clientWidth) / 2;
    }
  }, [step]);

  /* スクロールの中央にあるカードを選択中にする */
  const onCarScroll = () => {
    const c = carRef.current;
    if (!c) return;
    const center = c.scrollLeft + c.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    cardEls.current.forEach((el, i) => {
      if (!el) return;
      const mid = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(mid - center);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setPickIdx(best);
  };

  /* 「この場所にする」→ 選んだカードが画面いっぱいに広がる（窓枠ダイブイン） */
  const dive = () => {
    const el = cardEls.current[pickIdx];
    if (!el) return;
    const r = el.getBoundingClientRect();
    setEnterRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setEnterExpanded(false);
    setStep("enter");
  };
  useEffect(() => {
    if (step !== "enter") return;
    const t1 = setTimeout(() => setEnterExpanded(true), 40); // 次フレームで拡大開始
    const t2 = setTimeout(() => {
      setStep("video");
      setPlaying(true);
    }, 1350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  /* 再生⇄映像の同期＋音量フェードイン */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "video") return;
    if (playing) {
      v.play().catch(() => setPlaying(false));
      v.volume = 0;
      const start = v.currentTime;
      const onTime = () => {
        const p = Math.min(1, (v.currentTime - start) / 3);
        v.volume = p;
        if (p >= 1) v.removeEventListener("timeupdate", onTime);
      };
      v.addEventListener("timeupdate", onTime);
      return () => v.removeEventListener("timeupdate", onTime);
    }
    v.pause();
  }, [playing, step]);

  /* タイマー */
  useEffect(() => {
    if (step !== "video" || !playing || remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [step, playing, remaining]);

  /* 再生UIの自動非表示（2.4秒） */
  const poke = () => {
    setUi(true);
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setUi(false), 2400);
  };
  useEffect(() => {
    if (step === "video" && playing) poke();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, playing]);

  /* 動画に入ったら後ろ向き人物（PC同様）をふわっと出す */
  useEffect(() => {
    if (step !== "video") {
      setPersonIn(false);
      return;
    }
    const id = setTimeout(() => setPersonIn(true), 450);
    return () => clearTimeout(id);
  }, [step]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const controls = (ui || !playing) && !tipsVisible;

  const glass =
    "flex items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/45 backdrop-blur-[12px] transition-transform active:scale-95";

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-brand text-white">
      {/* 背景：導入＝景色ぼかし／場所えらび・ダイブ＝青グラデ／動画＝映像 */}
      {step === "intro" && (
        <>
          <img
            src="/img/bg-hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand/55 via-brand/25 to-brand/60" />
        </>
      )}
      {(step === "pick" || step === "enter") && (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-top to-brand" />
      )}

      {/* 環境音トグルの置き場（無いと左下に出るため右上に固定） */}
      <div
        id="abashiri-sound-slot"
        className="absolute right-4 top-5 z-40 flex h-[22px] origin-right scale-[0.72] items-center"
      />

      {/* 戻る（左上） */}
      <button
        type="button"
        aria-label="戻る"
        onClick={() => {
          if (step === "video") {
            setPlaying(false);
            setStep("pick");
          } else if (step === "pick") setStep("intro");
          else if (step === "intro") router.push("/");
        }}
        className="absolute left-5 top-5 z-40 flex size-9 items-center justify-center rounded-full bg-black/20 backdrop-blur-md"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── 導入 ─────────────────────────── */}
      {step === "intro" && (
        <section className="relative z-10 flex h-full flex-col">
          <div className="flex flex-1 -translate-y-6 flex-col items-center justify-center px-6 text-center">
            <p className="text-[13px] font-light">網走に来る前に、まずやってみよう</p>
            <p className="mt-2 text-[34px] font-thin">ぼーっと体験</p>
            <div className="mt-10 space-y-5 text-[14px] font-light leading-[1.9]">
              <p>網走は何もないけど、それがたまらない。</p>
              <p>
                忙しなく過ごす、あなたの日常からそっと離れて、
                <br />
                何も考えず、「ぼーっとする」こと。
              </p>
              <p>
                それが最大の癒しであり、くつろぎです。
                <br />
                網走では、そんな体験が思う存分できる。
              </p>
              <p>ウェブサイトを通して、その空間を疑似体験しよう。</p>
            </div>
            <button
              type="button"
              onClick={() => setStep("pick")}
              className={`${glass} mt-10 px-8 py-[13px] text-[14px] font-medium leading-none`}
            >
              次へ進む
            </button>
          </div>
        </section>
      )}

      {/* ── 場所えらび（青グラデ＋横カルーセル） ── */}
      {step === "pick" && (
        <section className="relative z-10 flex h-full flex-col items-center pb-10 pt-20">
          <h2 className="text-center text-[24px] font-thin">どこでぼーっとする？</h2>

          {/* 横カルーセル（PC版のレスポンシブ。中央のカードが選択） */}
          <div
            ref={carRef}
            onScroll={onCarScroll}
            className="no-scrollbar mt-8 flex w-full flex-1 snap-x snap-mandatory items-center gap-4 overflow-x-auto overflow-y-hidden"
            style={{
              paddingInline: `calc(50% - ${CARD_W / 2}px)`,
              touchAction: "pan-x", // 左右スワイプのみ（上下の遊びを止める）
            }}
          >
            {PICKS.map((p, i) => (
              <div
                key={p.id}
                ref={(el) => {
                  cardEls.current[i] = el;
                }}
                className={`relative aspect-[902/586] shrink-0 snap-center overflow-hidden rounded-[36px] border-[3px] border-white/60 transition-opacity duration-300 ${
                  i === pickIdx ? "opacity-100" : "opacity-55"
                }`}
                style={{ width: CARD_W }}
              >
                <img src={p.img} alt={p.label} className="absolute inset-0 h-full w-full object-cover" />
              </div>
            ))}
          </div>

          {/* ラベル＋ボタン（中央グループ） */}
          <div className="mt-7 flex flex-col items-center gap-5 px-6">
            <div className="flex flex-col items-center">
              <p className="text-[13px] font-extralight">ぼーっとスポット {active.no}</p>
              <p className="mt-1 text-[24px] font-thin">{active.label}</p>
            </div>
            {active.video ? (
              <button
                type="button"
                onClick={dive}
                className={`${glass} w-full max-w-[342px] py-[15px] text-[15px] font-medium leading-none`}
              >
                この場所にする
              </button>
            ) : (
              <p className="text-[12px] font-light text-white/70">
                この場所の体験は準備中です
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── 窓枠ダイブイン（選んだカードが画面いっぱいに広がる） ── */}
      {step === "enter" && enterRect && (
        <div
          className="fixed z-50 overflow-hidden shadow-2xl"
          style={
            enterExpanded
              ? {
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  borderRadius: 0,
                  transition:
                    "top 1.3s cubic-bezier(0.33,0,0.2,1), left 1.3s cubic-bezier(0.33,0,0.2,1), width 1.3s cubic-bezier(0.33,0,0.2,1), height 1.3s cubic-bezier(0.33,0,0.2,1), border-radius 1.3s cubic-bezier(0.33,0,0.2,1)",
                }
              : {
                  top: enterRect.top,
                  left: enterRect.left,
                  width: enterRect.width,
                  height: enterRect.height,
                  borderRadius: 28,
                }
          }
        >
          <img
            src={PICKS[pickIdx].img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}

      {/* ── 動画再生 ─────────────────────── */}
      {step === "video" && (
        <div className="absolute inset-0" onClick={poke}>
          <video
            ref={videoRef}
            src={active.video}
            playsInline
            loop
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* 後ろ向きの人物（PCと同じ illust-video.png）。右下・下ベタ付け */}
          <img
            src="/img/illust-video.png"
            alt=""
            className="pointer-events-none absolute bottom-0 right-2 z-10 block w-[104px] object-bottom drop-shadow-illust"
            style={{
              opacity: personIn ? 1 : 0,
              filter: personIn ? "blur(0px)" : "blur(10px)",
              transition:
                "opacity .9s cubic-bezier(0.22,1,0.36,1), filter .9s cubic-bezier(0.22,1,0.36,1)",
            }}
          />

          <BoTips
            active={playing && !controls}
            tune={DEFAULT_BO_TIPS}
            onVisibleChange={setTipsVisible}
            compact
          />

          <button
            type="button"
            aria-label={playing ? "一時停止" : "再生"}
            onClick={(e) => {
              e.stopPropagation();
              setPlaying((v) => !v);
              poke();
            }}
            className={`absolute left-1/2 top-1/2 z-10 flex size-[114px] -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-opacity duration-500 ${
              controls ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <img
              src={playing ? "/img/icon-pause.svg" : "/img/play-circle.svg"}
              alt=""
              className="size-full"
            />
          </button>

          {/* ⚠️ タグと数字箱は兄弟に（blur箱の中に入れるとタグのblurが動画に届かない） */}
          <div
            className={`absolute bottom-8 left-6 z-10 flex flex-col items-start gap-1.5 transition-opacity duration-500 ${
              controls ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* タグ：カンプ 16060:23117 の縮小版（白20%/blur100/角丸full/Light）。
                サイズはモバイル比率で 14px・px-3 py-1 に🟡仮置き */}
            <span className="rounded-full bg-white/20 px-3 py-1 text-[14px] font-light leading-[1.2] text-white backdrop-blur-[100px]">
              ぼーっとタイマー
            </span>
            <div className="rounded-2xl bg-white/10 px-6 py-3 backdrop-blur-[65px]">
              <p className="font-num text-[44px] font-thin leading-none">
                {mm}:{ss}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
