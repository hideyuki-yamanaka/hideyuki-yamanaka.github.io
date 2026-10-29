"use client";

import { useCallback, useEffect, useState } from "react";
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
    illustDelay: 0, /* 2026-10-29 ヒデさん「人物が出てくるタイミングをちょっと早めましょう」0.5→0 🟡（tune-defaults.json・TopTunePanel の既定と同じ値） */
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
    nav: { inMs: 420, outMs: 620 },
    secHead: 36,
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

  /* 【2026-09-26】スマホのトップにも調整パネルを載せる（ふだんは隠しモードで見えない）。
     載っていないと、パネルで変えた値（体験の案・ページ切り替え・各種つまみ）も、
     スマホモードの同期も、スマホのトップに一切届かなかった */
  /* 【2026-10-29 ヒデさん「最初からこの風景のブラーの写真を出してほしい。リロードした時に一瞬水色の画面が入ってしまう」】
     トップの画面（Stage の紙・スマホの MobileTop）は、画面の大きさを測り終わるまで透明で、
     測れるのはページの仕組みが動き出した後。それまでは後ろの地（空色のグラデ＝水色）だけが見えていた。
     → 一番後ろに、キービジュアルの写真を敷いておく。サーバーで作る HTML に入っているので、
       仕組みが動く前（写真が届いた瞬間）から出る。画面が出てきたら、その下に隠れる */
  /* 画面が出そろったら（1.5秒後）外す。縦長の画面で紙の上下にできる帯は、今まで通り空色のグラデのままにするため */
  const [backdrop, setBackdrop] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setBackdrop(false), 1500);
    return () => window.clearTimeout(id);
  }, []);
  /* 【同日 ヒデさん「リロードすると写真が上から降ってくるように見える。移動はなし」】
     前は敷いた写真だけ「下ぞろえ・少し拡大・ぼかし」だったので、本物の写真に入れ替わる瞬間に水平線の高さが変わって動いて見えた。
     → 本物のキービジュアルの写真とまったく同じ位置・大きさ・ぼかし無しで敷く（最初の窓が上に乗るとちゃんとぼけて見える）。
       PC … Stage の紙（1512×982 を「高さか幅の小さい方」に合わせて縮め、上下の真ん中に置く。useStageScale の stageScaleOf と同じ式）の中に真ん中ぞろえ
       スマホ … 画面いっぱいに真ん中ぞろえ（MobileTop の写真と同じ） */
  const kvBackdrop = backdrop && (
    <img
      src="/img/bg-hero.webp"
      alt=""
      aria-hidden
      fetchPriority="high"
      /* 位置と大きさは globals.css の .kv-backdrop（PC／スマホの切り替えは画面の幅で決める＝仕組みが動く前から正しい位置に出る） */
      className="kv-backdrop pointer-events-none fixed left-0 w-screen object-cover"
    />
  );


  if (isMobile)
    return (
      <>
        {kvBackdrop}
        <MobileTop />
        <TopTunePanel onSettleValues={onSettleValues} onReplay={onReplay} />
      </>
    );

  return (
    <>
      {kvBackdrop}
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
