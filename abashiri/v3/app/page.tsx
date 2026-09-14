"use client";

import { useCallback, useState } from "react";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import MobileTop from "@/components/MobileTop";
import { useIsMobile } from "@/components/useIsMobile";
import TopTunePanel, { type TopTuneValues } from "@/components/TopTunePanel";
import { DEFAULT_BO } from "@/components/boPatterns";
import { DEFAULT_SPOT_TRANSITION } from "@/components/spotTransition";
import { DEFAULT_FACE } from "@/components/faceConfig";
import { DEFAULT_KV_EXIT } from "@/components/kvExitConfig";
import { DEFAULT_HERO_ENTER } from "@/components/heroEnterConfig";
import { DEFAULT_MSG } from "@/components/msgConfig";
import { DEFAULT_ENTER_TUNE } from "@/components/enterPatterns";
import { DEFAULT_INTRO_PACE } from "@/components/ExperienceFlow";

export default function Home() {
  /* スマホ（〜640px）はデスクトップの固定キャンバスではなく MobileTop を出す
     （2026-08-24 ヒデさん依頼「390px で美しく」）。フックは早期returnより前で呼ぶ */
  const isMobile = useIsMobile();

  /* 右下の調整パネルからもらう値。位置・大きさは CSS 変数側で直接反映されるので、
     ここで持つのは「案の切り替え」と「スクロール連動の値」だけ */
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

  /* 登場アニメに関わる値を触ったら、ページを作り直して登場を再生し直す
     （Anyflow のパネルと同じ「変えたらその場でアニメが見られる」挙動。
      環境音のON/OFF確認は済んだ記憶が残っているので、再生はすぐ始まる） */
  const [replayEpoch, setReplayEpoch] = useState(0);
  const [fastReplay, setFastReplay] = useState(false);
  const onReplay = useCallback((path?: string) => {
    /* 人物まわり（登場・ループ・お披露目）は、作字を完成形で置いて
       人物登場の直前から再生し直す（2026-08-23 ヒデさん指示） */
    setFastReplay(Boolean(path && (path.startsWith("anim.") || path.startsWith("intro."))));
    setReplayEpoch((e) => e + 1);
  }, []);

  if (isMobile) return <MobileTop />;

  return (
    <>
      <Stage
        key={replayEpoch}
        illustration="tamannee"
        illustEntrance
        illustEnter={tune.illustEnter}
        bouncePattern={tune.bouncePattern}
        bounceStrength={tune.bounceStrength / 100}
        tamaLoop={tune.loop}
        bo={tune.boPattern}
        face={tune.face}
        tamaranee={tune.tamaranee}
        tamaIntro={tune.tamaIntro}
        forceFace={tune.preview.faceOn}
        patchRed={tune.preview.patchRed}
      >
        {/* 決定版：吹き出し→な〜んにもない→たまらない を順にブラー
            →ボタン→イラスト（ブラー後にクルンと一回転） */}
        <TopPage
          intro={2}
          blurSeq
          waitConsent
          spotTune={tune.spot}
          kvExit={tune.kvExit}
          heroEnter={tune.hero}
          msgTune={tune.msg}
          msgScrollSpeed={tune.scrollSpd.kvToMsg}
          illustDelay={tune.illustDelay * 1000}
          fastIntro={fastReplay}
        />
      </Stage>

      {/* ⚠️ 公開前に外す：確認用の調整パネル（右下・たたんだ状態） */}
      <TopTunePanel onSettleValues={onSettleValues} onReplay={onReplay} />
    </>
  );
}
