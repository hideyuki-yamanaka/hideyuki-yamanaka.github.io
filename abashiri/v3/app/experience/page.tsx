"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Stage from "@/components/Stage";
import ExperienceFlow, { DEFAULT_INTRO_PACE, type Step } from "@/components/ExperienceFlow";
import TopTunePanel, { type TopTuneValues } from "@/components/TopTunePanel";
import { DEFAULT_BO } from "@/components/boPatterns";
import { DEFAULT_SPOT_TRANSITION } from "@/components/spotTransition";
import { DEFAULT_FACE } from "@/components/faceConfig";
import { DEFAULT_KV_EXIT } from "@/components/kvExitConfig";
import { DEFAULT_HERO_ENTER } from "@/components/heroEnterConfig";
import { DEFAULT_MSG } from "@/components/msgConfig";
import { buildEnter, DEFAULT_ENTER_TUNE } from "@/components/enterPatterns";
import MobileExperience from "@/components/MobileExperience";
import { useIsMobile } from "@/components/useIsMobile";

export default function ExperiencePage() {
  /* スマホ（〜640px）は専用の体験ページ（2026-08-24 ヒデさん依頼） */
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>(1);
  /* 「この場所にする」を押したか。人物イラストはここで初めて出てくる */
  const [picked, setPicked] = useState(false);
  /* 「ぼーっ」はこの画面にしか出ないので、調整パネルもここに置く */
  const [tune, setTune] = useState<TopTuneValues>({
    boPattern: DEFAULT_BO,
    illustEnter: 3,
    bouncePattern: 1,
    bounceStrength: 100,
    illustDelay: 0.5,
    loop: { cycle: 10, show: 2.6, swayFirst: false },
    tamaranee: 1,
    tamaIntro: { delay: 350, hold: 3000 },
    preview: { faceOn: false, patchRed: false },
    face: DEFAULT_FACE,
    spot: DEFAULT_SPOT_TRANSITION,
    kvExit: DEFAULT_KV_EXIT,
    hero: DEFAULT_HERO_ENTER,
    msg: DEFAULT_MSG,
    expIntro: DEFAULT_INTRO_PACE,
    expPick: { pattern: 1 },
    scrollSpd: { kvToMsg: 100 },
    tips: { delay: 5, fade: 1.2, pattern: 5 },
    videoVol: { fadeIn: true, fadeSec: 3, uiHideSec: 2 },
    expEnter: { ...DEFAULT_ENTER_TUNE },
  });
  const onSettleValues = useCallback((v: TopTuneValues) => setTune(v), []);

  /* 登場アニメに関わる値を触ったら、体験フローを最初から再生し直す
     （Anyflow のパネルと同じ「変えたらその場でアニメが見られる」挙動） */
  const [replayEpoch, setReplayEpoch] = useState(0);
  const onReplay = useCallback((path?: string) => {
    /* 遷移（動画への入り方）を触った時：場面選択に戻して自動で
       「この場所にする」を押し、その場で遷移をプレビュー（2026-08-23 ヒデさん依頼） */
    if (path?.startsWith("expEnter.")) {
      setPicked(false);
      setStep(2);
      window.__abashiriAutoPick = true; /* カードがまだ無ければマウント時に拾われる */
      window.setTimeout(
        () => window.dispatchEvent(new CustomEvent("abashiri:auto-pick")),
        1200
      );
      return;
    }
    /* カルーセルの登場を触った時は、場所えらびの画面から再生し直す */
    setStep(path?.startsWith("expPick.") ? 2 : 1);
    setPicked(false);
    setReplayEpoch((e) => e + 1);
  }, []);

  /* ブラウザバックの階層化（2026-08-23 ヒデさん依頼）：
     導入(1) → 場面選択(2) → 動画(3) を履歴に積み、
     戻るで 3→2→1→（前のページ）と1段ずつ戻れるようにする */
  const stepRef = useRef(step);
  const fromPop = useRef(false);
  useEffect(() => {
    const prev = stepRef.current;
    stepRef.current = step;
    if (fromPop.current) {
      fromPop.current = false;
      return;
    }
    /* 進んだ時だけ履歴を積む（プレビュー等でプログラム的に戻る時は積まない） */
    if (step > prev) {
      window.history.pushState({ expStep: step }, "", `?step=${step}`);
    }
  }, [step]);
  /* ヘッダーの「体験」から：導入（1画面目）へ戻す */
  useEffect(() => {
    const onReset = () => {
      fromPop.current = true; /* 戻し方向なので履歴は積まない */
      setStep(1);
      setPicked(false);
      window.history.replaceState(null, "", "/experience");
    };
    window.addEventListener("abashiri:exp-reset", onReset);
    return () => window.removeEventListener("abashiri:exp-reset", onReset);
  }, []);

  useEffect(() => {
    const onPop = (ev: PopStateEvent) => {
      const s = (ev.state as { expStep?: number } | null)?.expStep;
      fromPop.current = true;
      if (s === 2 || s === 3) {
        setStep(s as Step);
        if (s !== 3) setPicked(false);
      } else {
        setStep(1);
        setPicked(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* 遷移パターン：パネルの細密チューニング値から組み立てる */
  const enterPattern = useMemo(() => buildEnter(tune.expEnter), [tune.expEnter]);

  /* ?step=2 / ?step=3 で途中のステップから開始できる（動作確認・デモ用） */
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("step");
    if (s === "2" || s === "3") setStep(Number(s) as Step);
    if (s === "3") setPicked(true);
  }, []);

  if (isMobile) return <MobileExperience />;

  return (
    <>
      {/* カンプ 15152:29210 / 29251 / 29271 はどれも back（後ろ姿）バリアント。
          導入（step1）と場所えらび（step2）にはイラストを出さない。
          「この場所にする」を押した瞬間に所定の位置でフェードインして、
          そのまま人物ごと窓の中へ入っていく */}
      <Stage key={replayEpoch} illustration="bo" hideIllust={!picked} bo={tune.boPattern} brandOverlay>
        <ExperienceFlow
          step={step}
          setStep={setStep}
          onPicked={() => setPicked(true)}
          introPace={tune.expIntro}
          pickEnter={tune.expPick.pattern}
          tips={tune.tips}
          videoVol={tune.videoVol}
          videoUiHideSec={tune.videoVol.uiHideSec}
          enter={enterPattern}
        />
      </Stage>

      {/* ⚠️ 公開前に外す：確認用の調整パネル（右下・たたんだ状態） */}
      <TopTunePanel onSettleValues={onSettleValues} onReplay={onReplay} />
    </>
  );
}
