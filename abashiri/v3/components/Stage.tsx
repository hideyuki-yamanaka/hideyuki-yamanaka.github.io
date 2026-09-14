"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Bird from "./Bird";
import { waitForConsent } from "./consentGate";
import IllustTamannee from "./IllustTamannee";
import { useFaceReaction } from "./useFaceReaction";
import { DEFAULT_HERO_TIMING, type HeroTiming } from "./heroTiming";
import { DEFAULT_BIRDS, type BirdsConfig } from "./birdConfig";
import { mergeFace, type FaceConfig } from "./faceConfig";
import { mergeLayout, type LayoutTune } from "./layoutConfig";
import { findTamaranee } from "./tamaraneePatterns";
/* バウンス5案（2026-08-23 ヒデさん依頼で復活）。ホバーもループも同じ動きを使う。
   強さ k は 1 が基準で、跳ぶ高さ・つぶれ方がそのまま倍率で効く */
type BounceAnim = { keyframes: Keyframe[]; options: KeyframeAnimationOptions };
const BOUNCES: Record<number, { note: string; make: (k: number) => BounceAnim }> = {
  1: {
    note: "ぴょこっ。ひとつだけ素直に弾む",
    make: (k) => ({
      keyframes: [
        { transform: "translateY(0)" },
        { transform: `translateY(${-14 * k}px)`, offset: 0.4 },
        { transform: `translateY(${3 * k}px)`, offset: 0.75 },
        { transform: "translateY(0)" },
      ],
      options: { duration: 450, easing: "ease-out" },
    }),
  },
  2: {
    note: "ぴょこぴょこ。大→小と2回弾む",
    make: (k) => ({
      keyframes: [
        { transform: "translateY(0)" },
        { transform: `translateY(${-16 * k}px)`, offset: 0.28 },
        { transform: "translateY(0)", offset: 0.52 },
        { transform: `translateY(${-7 * k}px)`, offset: 0.72 },
        { transform: "translateY(0)" },
      ],
      options: { duration: 620, easing: "ease-in-out" },
    }),
  },
  3: {
    note: "プルン。着地でからだがつぶれて戻る（登場と同じ）",
    make: (k) => ({
      keyframes: [
        { transform: "translateY(0) scale(1, 1)" },
        { transform: `translateY(${-10 * k}px) scale(${1 - 0.03 * k}, ${1 + 0.04 * k})`, offset: 0.35 },
        { transform: `translateY(0) scale(${1 + 0.05 * k}, ${1 - 0.06 * k})`, offset: 0.6 },
        { transform: `translateY(0) scale(${1 - 0.01 * k}, ${1 + 0.02 * k})`, offset: 0.8 },
        { transform: "translateY(0) scale(1, 1)" },
      ],
      options: { duration: 550, easing: "ease-out" },
    }),
  },
  4: {
    note: "ちょんちょん。小さく速く2回",
    make: (k) => ({
      keyframes: [
        { transform: "translateY(0)" },
        { transform: `translateY(${-6 * k}px)`, offset: 0.25 },
        { transform: "translateY(0)", offset: 0.5 },
        { transform: `translateY(${-3 * k}px)`, offset: 0.72 },
        { transform: "translateY(0)" },
      ],
      options: { duration: 350, easing: "ease-in-out" },
    }),
  },
  5: {
    note: "大きくジャンプ。高く跳んで弾んで収まる",
    make: (k) => ({
      keyframes: [
        { transform: "translateY(0) rotate(0deg)" },
        { transform: `translateY(${-24 * k}px) rotate(${-2 * k}deg)`, offset: 0.32 },
        { transform: `translateY(${4 * k}px) rotate(${1 * k}deg)`, offset: 0.62 },
        { transform: `translateY(${-8 * k}px) rotate(${-0.5 * k}deg)`, offset: 0.8 },
        { transform: "translateY(0) rotate(0deg)" },
      ],
      options: { duration: 700, easing: "ease-in-out" },
    }),
  },
};
const makeBounce = (pattern: number, k: number): BounceAnim =>
  (BOUNCES[pattern] ?? BOUNCES[3]).make(k);

/* ループ限定の「横揺れ」（旧スイング案4「小刻みシェイク」の復活。
   ONにすると、これを揺れてからバウンスに入る） */
const SWAY_ANIM: BounceAnim = {
  keyframes: [
    { transform: "rotate(0deg)" },
    { transform: "rotate(4deg)", offset: 0.12 },
    { transform: "rotate(-3.5deg)", offset: 0.24 },
    { transform: "rotate(3deg)", offset: 0.36 },
    { transform: "rotate(-2.5deg)", offset: 0.5 },
    { transform: "rotate(1.5deg)", offset: 0.68 },
    { transform: "rotate(0deg)" },
  ],
  options: { duration: 1600, easing: "ease-in-out" },
};
import { VIDEO_AUDIO_EVENT } from "./SoundUi";
import { findBo } from "./boPatterns";
import { findIllustEnter } from "./illustEnterPatterns";

/*
 * 人物イラストのスイング（/mock/illust で5パターン比較）
 * 共通ルール：回転軸はイラストの下辺中央（transformOrigin 50% 100%）、
 * 角度は −4°〜+4° の範囲だけ。その中で緩急（メリハリ）の付け方を変えている。約15秒に1回。
 *
 * v1.1: 位置はカンプ側で決まるので、ここでは transformOrigin だけを持つ。
 * （v1.0 にあった top:72 の下げは、全画面化でカンプ位置とずれるため撤去）
 */
import type { Transition } from "framer-motion";

const SWING_STYLE: React.CSSProperties = { transformOrigin: "50% 100%" };

/* 初回だけ「たまらねー」を自分から見せる時間（ミリ秒）
   delay … 登場アニメが終わってから出すまでの間
   hold  … 出したまま留めておく長さ。このあと引っ込む
   2026-08-20 ヒデさん指示で hold を 1700 → 3000 に延長 */
const TAMA_INTRO_DEFAULT = { delay: 350, hold: 3000 } as const;

type IllustAnim = {
  animate: Record<string, number[]>;
  transition: Transition;
  style: React.CSSProperties;
};

const ILLUST_ANIMS: Record<number, IllustAnim> = {
  /* 案1: タメて→スナップ。左へゆっくり傾いてから右へ一気、弾んで戻る */
  1: {
    animate: { rotate: [0, -4, 4, -1.5, 0.5, 0] },
    transition: {
      duration: 2.2,
      times: [0, 0.35, 0.5, 0.7, 0.85, 1],
      ease: ["easeInOut", "easeIn", "easeOut", "easeOut", "easeOut"],
      repeat: Infinity,
      repeatDelay: 12.8,
    },
    style: SWING_STYLE,
  },
  /* 案2: 速い2往復→ゆっくり収束。出だし全力、あとはふわっと */
  2: {
    animate: { rotate: [0, 4, -4, 4, -2, 0] },
    transition: {
      duration: 2.0,
      times: [0, 0.15, 0.35, 0.55, 0.8, 1],
      ease: ["easeOut", "easeInOut", "easeInOut", "easeOut", "easeInOut"],
      repeat: Infinity,
      repeatDelay: 13,
    },
    style: SWING_STYLE,
  },
  /* 案3: ワイパー。右へじーっくりため → 左へビュッ → ゆっくり中央へ */
  3: {
    animate: { rotate: [0, 4, -4, 0] },
    transition: {
      duration: 2.4,
      times: [0, 0.5, 0.62, 1],
      ease: ["easeInOut", "easeIn", "easeInOut"],
      repeat: Infinity,
      repeatDelay: 12.6,
    },
    style: SWING_STYLE,
  },
  /* 案4【採用】: 小刻みシェイク→ピタッ。右へ傾いてから震えてすっと止まる */
  4: {
    animate: { rotate: [0, 4, -3.5, 3, -2.5, 1.5, 0] },
    transition: {
      duration: 1.6,
      times: [0, 0.12, 0.24, 0.36, 0.5, 0.68, 1],
      ease: ["easeOut", "easeInOut", "easeInOut", "easeInOut", "easeInOut", "easeOut"],
      repeat: Infinity,
      repeatDelay: 13.4,
    },
    style: SWING_STYLE,
  },
  /* 案5: タメ静止つきワンモーション。左でピタッと静止→右へ大きく→中央へ */
  5: {
    animate: { rotate: [0, -4, -4, 4, 0] },
    transition: {
      duration: 2.4,
      times: [0, 0.25, 0.42, 0.64, 1],
      ease: ["easeInOut", "linear", "easeIn", "easeOut"],
      repeat: Infinity,
      repeatDelay: 12.6,
    },
    style: SWING_STYLE,
  },
};

type StageProps = {
  children: React.ReactNode;
  /** tamannee: TOP系（ニヤリ顔＋たまんねーっ） / bo: 動画視聴中（横顔＋ぼーっ） */
  illustration?: "tamannee" | "bo";
  /** true: イラスト（人物＋たまんねーっ＋キラキラ）を演出の一番最後にブラーで出す */
  illustEntrance?: boolean;
  /** イラスト出現の質感（heroTiming.illust） */
  timing?: HeroTiming;
  /** カモメの配置・見た目（birdConfig.ts） */
  birds?: BirdsConfig;
  /** true: カモメをドラッグで動かせる（調整パネル用） */
  birdsEditable?: boolean;
  /** ドラッグでカモメが動いた時の通知（調整パネル用） */
  onBirdMove?: (key: "skyTopLeft" | "skyRight", patch: { x: number; y: number }) => void;
  /** 1〜5: 人物イラストのスイングパターン（既定は採用版の案4） */
  illustAnim?: number;
  /** カーソルに反応する眉の動き（faceConfig.ts） */
  face?: Partial<FaceConfig> | null;
  /** 右カラムなどの位置（layoutConfig.ts） */
  layout?: Partial<LayoutTune> | null;
  /** 1〜5: ホバー時に「たまらねー」が出るパターン（tamaraneePatterns.ts） */
  tamaranee?: number | string | null;
  /** 1〜5: 動画再生中の「ぼーっ」の出方（boPatterns.ts / illustration="bo" の時だけ効く） */
  bo?: number | string | null;
  /** 1〜5: 人物イラストの登場パターン（illustEnterPatterns.ts） */
  illustEnter?: number | string | null;
  /** 1〜5: バウンスの動き（ホバー・ループ共通） */
  bouncePattern?: number;
  /** バウンスの強さ。1が基準 */
  bounceStrength?: number;
  /** 周期ループ：間隔と見せる長さ(秒)、swayFirst=横揺れしてからバウンス */
  tamaLoop?: { cycle: number; show: number; swayFirst?: boolean };
  /** 初回の「たまらねー」お披露目のタイミング(ms)。調整パネルから */
  tamaIntro?: { delay: number; hold: number };
  /** true: 眉・口・たまらねーを出しっぱなしにする（調整パネルの確認用） */
  forceFace?: boolean;
  /** true: 眉と口のパッチを赤くする（覆い残しの確認用） */
  patchRed?: boolean;
  /** true: 人物イラストを出さない（カンプにイラストが無い画面用） */
  hideIllust?: boolean;
  /** true: 青グラデ（brand→透明）をカモメの下に敷く（体験ページの下地。
      以前は ExperienceFlow 側にあり、カモメがグラデの後ろに隠れて薄く見えていた。2026-08-23） */
  brandOverlay?: boolean;
};

/**
 * デザインカンプの 1512x982 ステージを画面サイズに合わせて等倍縮小して中央表示する。
 * 空・カモメ・人物イラスト・右レール（ロゴ/SNS）は全ページ共通。
 */
export default function Stage({
  children,
  illustration = "tamannee",
  illustEntrance = false,
  timing = DEFAULT_HERO_TIMING,
  birds = DEFAULT_BIRDS,
  birdsEditable = false,
  onBirdMove,
  illustAnim = 4,
  face,
  layout,
  tamaranee,
  bo,
  illustEnter,
  bouncePattern = 1,
  bounceStrength = 1,
  tamaLoop = { cycle: 15, show: 2.6, swayFirst: false },
  tamaIntro = TAMA_INTRO_DEFAULT,
  forceFace = false,
  patchRed = false,
  hideIllust = false,
  brandOverlay = false,
}: StageProps) {
  const L = mergeLayout(layout);
  /* カモメの位置はページごとに調整できる（2026-08-23 ヒデさん指示）。
     トップ系（tamannee）と体験ページ（bo）でCSS変数の名前を分ける */
  const birdVar = illustration === "bo" ? "exp" : "top";
  const fc = mergeFace(face);
  /* イラストは pointer-events-none のままにしたいので、:hover ではなく
     カーソルの座標を見て自前で判定する（詳細は useFaceReaction.ts） */
  const illustRef = useRef<HTMLDivElement>(null);
  const browLift = useFaceReaction(illustRef, fc);
  /* browLift が 0 より大きい＝カーソルがイラストに乗っている */
  const over = browLift > 0;
  const tp = findTamaranee(tamaranee);
  const bp = findBo(bo);
  const iep = findIllustEnter(illustEnter);
  const ia = ILLUST_ANIMS[illustAnim] ?? ILLUST_ANIMS[4];
  const [fit, setFit] = useState<{ scale: number; stageW: number; top: number } | null>(
    null
  );
  const [illustIn, setIllustIn] = useState(!illustEntrance);
  /* スクロールでイラストを引っ込める量（1=そのまま 0=消える）。
     カンプ 15191:2178 のぼーっとスポットには人物がいないので、
     KV から下へ送ると同時に見送る */
  const [illustFade, setIllustFade] = useState(1);
  const [spin, setSpin] = useState(false);
  /* 初回の登場（ぴょこん）が収まったあと、「たまらねー」を一度だけ自分から出して
     すぐ引っ込める。2回目以降はカーソルを乗せた時だけ出る（ヒデさん指示 2026-08-20） */
  const [introTama, setIntroTama] = useState(false);
  /* 登場アニメが終わったか。案ごとに長さが違う（0.72〜1.6秒）ので、
     開始時刻からではなく onAnimationComplete を起点にする */
  const [entranceDone, setEntranceDone] = useState(false);

  useEffect(() => {
    if (!illustEntrance || !entranceDone) return;
    const a = window.setTimeout(() => setIntroTama(true), tamaIntro.delay);
    const b = window.setTimeout(
      () => setIntroTama(false),
      tamaIntro.delay + tamaIntro.hold
    );
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [illustEntrance, entranceDone, tamaIntro.delay, tamaIntro.hold]);

  /* 周期アニメ（2026-08-21 ヒデさん指示）：約15秒おきに、登場と同じ
     プルンのバウンスをして、その動きと一緒に「たまらねー」とキラキラが出る。
     （旧・回転スイング ILLUST_ANIMS は廃止。動きを登場時と統一） */
  const [periodicTama, setPeriodicTama] = useState(false);
  useEffect(() => {
    if (!spin) return;
    const CYCLE = Math.max(3, tamaLoop.cycle) * 1000;
    const SHOW = Math.max(0.5, tamaLoop.show) * 1000; /* たまらねーを見せておく長さ */
    let hideT = 0;
    const id = window.setInterval(() => {
      const el = bounceRef.current;
      if (!el) return;
      const doBounce = () => {
        const hb = makeBounce(bouncePattern, bounceStrength);
        el.animate(hb.keyframes, hb.options);
        setPeriodicTama(true);
        hideT = window.setTimeout(() => setPeriodicTama(false), SHOW);
      };
      if (tamaLoop.swayFirst) {
        /* 横揺れ→バウンス（2026-08-23 ヒデさん依頼。ONの時だけ） */
        const sway = el.animate(SWAY_ANIM.keyframes, SWAY_ANIM.options);
        sway.onfinish = doBounce;
      } else {
        doBounce();
      }
    }, CYCLE);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(hideT);
    };
  }, [spin, tamaLoop.cycle, tamaLoop.show, tamaLoop.swayFirst, bouncePattern, bounceStrength]);

  /* 出す条件：カーソルが乗っている間 ＋ 初回の自動お披露目 ＋ 周期アニメ ＋ 出しっぱなし */
  const showTama = over || introTama || periodicTama || forceFace;

  /* 「ぼーっ」は動画の再生ボタンを押してから登場（2026-08-22 ヒデさん指示）。
     まずスポットの文字と同じブラー出現でふわっと現れ、そのあと従来の周期に入る。
     動画が止まったら引っ込める。再生状態は SoundUi と同じイベントで受け取る */
  const [boPhase, setBoPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    let t = 0;
    const onVideo = (e: Event) => {
      const active = Boolean((e as CustomEvent).detail?.active);
      window.clearTimeout(t);
      if (!active) {
        setBoPhase(0);
        return;
      }
      setBoPhase(1);
      /* 登場（0.9s）＋ひと呼吸見せてから、いつもの周期へ */
      t = window.setTimeout(() => setBoPhase(2), 2200);
    };
    window.addEventListener(VIDEO_AUDIO_EVENT, onVideo);
    return () => {
      window.removeEventListener(VIDEO_AUDIO_EVENT, onVideo);
      window.clearTimeout(t);
    };
  }, []);

  /* ホバーした瞬間に、からだが縦に弾む（2026-08-21 ヒデさん依頼。5案から選ぶ）。
     スイングとは別ラッパーに WAAPI で掛けるので干渉しない */
  const bounceRef = useRef<HTMLDivElement>(null);

  /* パネルで「バウンスの動き／強さ」を変えたら、その場で1回バウンスして見せる。
     周期（10秒おき）やホバーを待たないと違いが分からなかった対策（2026-08-30）。
     初回マウントでは鳴らさない（登場アニメとかぶる） */
  const bounceSigRef = useRef(`${bouncePattern}:${bounceStrength}`);
  useEffect(() => {
    const sig = `${bouncePattern}:${bounceStrength}`;
    if (bounceSigRef.current === sig) return;
    bounceSigRef.current = sig;
    const el = bounceRef.current;
    if (!el) return;
    const hb = makeBounce(bouncePattern, bounceStrength);
    el.animate(hb.keyframes, hb.options);
  }, [bouncePattern, bounceStrength]);
  const prevOverRef = useRef(false);
  useEffect(() => {
    if (over && !prevOverRef.current) {
      const hb = makeBounce(bouncePattern, bounceStrength);
      if (bounceRef.current) bounceRef.current.animate(hb.keyframes, hb.options);
    }
    prevOverRef.current = over;
  }, [over, bouncePattern, bounceStrength]);
  /* 表情（眉が上がる・口が開く）も「たまらねー」と同じ条件でそろえる。
     初回のお披露目でも顔が動いた方が「言っている」感じが出る（🟡仮判断） */
  const faceLift = over ? browLift : showTama ? fc.browLift : 0;

  /* 調整パネル用：カモメをドラッグで動かす */
  const dragBird = (key: "skyTopLeft" | "skyRight") => (e: React.PointerEvent) => {
    if (!birdsEditable || !fit || !onBirdMove) return;
    e.preventDefault();
    e.stopPropagation();
    const start = { px: e.clientX, py: e.clientY, x: birds[key].x, y: birds[key].y };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.px) / fit.scale;
      const dy = (ev.clientY - start.py) / fit.scale;
      onBirdMove(key, {
        /* skyRight は右端からの距離なので左右反転 */
        x: Math.round(key === "skyRight" ? start.x - dx : start.x + dx),
        y: Math.round(start.y + dy),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* 高さ基準でスケールし、横は画面幅いっぱいまでステージを広げる
     （モックデバイス側が可変幅で伸びる） */
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vh / 982, vw / 1512);
      const stageW = Math.max(1512, vw / scale);
      const top = Math.max(0, (vh - 982 * scale) / 2);
      setFit({ scale, stageW, top });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  /* TopPage がスクロール量に応じて送ってくる、イラストの見送り量 */
  useEffect(() => {
    const fade = (e: Event) =>
      setIllustFade((e as CustomEvent<{ v: number }>).detail?.v ?? 1);
    window.addEventListener("abashiri:illust-fade", fade);
    return () => window.removeEventListener("abashiri:illust-fade", fade);
  }, []);

  /* TopPage からの合図（一番最後）でイラストを出す。保険で12秒後には必ず出す。
     ⚠️ 保険の12秒は「環境音の確認モーダルに答えてから」数える。
     以前はページ表示から数えていたため、モーダルを12秒以上放置すると
     モーダルの裏で人物が先に出てしまっていた（2026-08-23 ヒデさん報告） */
  useEffect(() => {
    if (!illustEntrance) return;
    const show = () => setIllustIn(true);
    window.addEventListener("abashiri:illust-in", show);
    let fallback = 0;
    let alive = true;
    waitForConsent().then(() => {
      if (alive) fallback = window.setTimeout(show, 12000);
    });
    return () => {
      alive = false;
      window.removeEventListener("abashiri:illust-in", show);
      window.clearTimeout(fallback);
    };
  }, [illustEntrance]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute left-0 overflow-hidden bg-gradient-to-b from-sky-top to-sky-bottom transition-opacity duration-300"
        style={{
          width: fit?.stageW ?? 1512,
          height: 982,
          top: fit?.top ?? 0,
          transform: `scale(${fit?.scale ?? 1})`,
          transformOrigin: "top left",
          opacity: fit ? 1 : 0,
        }}
      >
        {/* 体験ページの青い下地。カモメより下・空グラデより上に敷く
            （カモメが青グラデの後ろで薄く見えていた問題の修正。2026-08-23 ヒデさん指摘） */}
        {brandOverlay && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand via-brand/45 to-transparent" />
        )}

        {/* 空のカモメ（左上・右中）。位置や線幅は birdConfig で調整できる。
            左上は体験ページでは出さない（3匹は多い。2026-08-23 ヒデさん指示） */}
        {birdVar !== "exp" && (
        <div
          className={`absolute ${birdsEditable ? "z-40 cursor-move" : ""}`}
          onPointerDown={dragBird("skyTopLeft")}
          style={{
            /* 位置と不透明度は調整パネルのCSS変数から（既定はbirdConfig）。2026-08-23 */
            left: `var(--bird-sky1-x-${birdVar}, ${birds.skyTopLeft.x}px)`,
            top: `var(--bird-sky1-y-${birdVar}, ${birds.skyTopLeft.y}px)`,
            width: `var(--bird-sky1-w-${birdVar}, ${birds.skyTopLeft.w}px)`,
            height: `calc(var(--bird-sky1-w-${birdVar}, ${birds.skyTopLeft.w}px) * 0.58)`,
            transform: `rotate(var(--bird-sky1-rot-${birdVar}, ${birds.skyTopLeft.rotate}deg))`,
            opacity: "var(--bird-opacity, 1)",
          }}
        >
          <Bird
            flapDuration={birds.skyTopLeft.flap}
            driftDuration={birds.skyTopLeft.drift}
            delay={birds.skyTopLeft.delay}
            strokeWidth={birds.skyTopLeft.stroke}
          />
        </div>
        )}
        <div
          className={`absolute ${birdsEditable ? "z-40 cursor-move" : ""}`}
          onPointerDown={dragBird("skyRight")}
          style={{
            right: `var(--bird-sky2-x-${birdVar}, ${birds.skyRight.x}px)`,
            top: `var(--bird-sky2-y-${birdVar}, ${birds.skyRight.y}px)`,
            opacity: "var(--bird-opacity, 1)",
            width: `var(--bird-sky2-w-${birdVar}, ${birds.skyRight.w}px)`,
            height: `calc(var(--bird-sky2-w-${birdVar}, ${birds.skyRight.w}px) * 0.58)`,
            transform: `rotate(var(--bird-sky2-rot-${birdVar}, ${birds.skyRight.rotate}deg))`,
          }}
        >
          <Bird
            flapDuration={birds.skyRight.flap}
            driftDuration={birds.skyRight.drift}
            delay={birds.skyRight.delay}
            strokeWidth={birds.skyRight.stroke}
          />
        </div>

        {/* ぼーっと体験ページだけ、左側にもカモメ（2026-08-21 ヒデさん指示）。
            位置・大きさは globals.css の --bird-exp-*。右下パネルから動かすと
            CSS 変数がその場で書き換わる＝即反映・自動保存 */}
        {illustration === "bo" && (
          <div
            className="absolute"
            style={{
              opacity: "var(--bird-opacity, 1)",
              left: "var(--bird-exp-x)",
              top: "var(--bird-exp-y)",
              width: "var(--bird-exp-w)",
              height: "calc(var(--bird-exp-w) * 0.58)",
              transform: "rotate(var(--bird-exp-rotate))",
            }}
          >
            <Bird flapDuration={0.55} driftDuration={9} delay={0.6} strokeWidth={6} />
          </div>
        )}

        {children}

        {/* 人物イラスト（たまらねー・キラキラ込み）。常に最前面。
            キービジュアルの演出が全部終わってから登場する（出方は illustEnterPatterns.ts の5案）

            ⚠️ フェードは外側のこの div が持つ。中の motion.div は framer-motion が
               opacity を握っているので、そこに style で opacity を書いても効かない。 */}
        <div
          /* v1.1 カンプ 15071:24641: イラストは (1244.56, 764) / 162x226.8、
             「たまらねー」は (1380.05, 749.94) / 75.2x53.3。
             右づけ。ステージは画面が横長だと 1512px より広がるので、左からの絶対位置ではなく
             右端からの距離で置く（カンプ 1512 幅での右端 1455px ＝ 右から 57px） */
          className="pointer-events-none absolute z-30 h-[241px] w-[210px]"
          style={{
            /* 位置は globals.css の --illust-* から。調整パネルがそこを書き換える */
            right: "var(--illust-frame-right)",
            top: "var(--illust-frame-top)",
            visibility: hideIllust ? "hidden" : "visible",
            opacity: hideIllust ? 0 : illustFade,
            transition: "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
        <motion.div
          className="size-full"
          initial={illustEntrance ? iep.initial : false}
          animate={illustIn ? iep.animate : undefined}
          transition={iep.transition}
          onAnimationComplete={() => {
            if (!illustEntrance || !illustIn) return;
            if (iep.swingAfter) setSpin(true);
            setEntranceDone(true); /* ここから初回の「たまらねー」の時計が動く */
          }}
        >
          <div className="relative h-full w-full">
          {illustration === "tamannee" ? (
            <>
              {/* 人物だけ、15秒に1回クルンと一回転（文字とキラキラは回さない） */}
              <motion.div
                ref={illustRef}
                className="absolute drop-shadow-illust"
                style={{
                  left: "var(--illust-person-x)",
                  top: "var(--illust-person-y)",
                  width: "var(--illust-person-w)",
                  /* 648x1067 の比率。絵そのものは 648x907 で、下 160px は
                     「跳ねた時に切れ目が見えない」ための延長ぶん（画面の下に隠れる） */
                  height: "calc(var(--illust-person-w) * 1.6466)",
                  ...ia.style,
                }}
                /* 旧・回転スイングは廃止（2026-08-21）。周期アニメは上の
                   setInterval がバウンス＋たまらねー＋キラキラをまとめて出す */
              >
                {/* v1.2（カンプ 15332:21660 で絵が差し替わった）
                    新しい絵は 1枚のPNG で、キラキラも頬の赤みも描き込み済み。
                    カンプの置き方（枠162x226.8 の中で (3.30, 11.99) に 139.2x216.44）は
                    画像側に焼き込んであるので、ここでは枠いっぱいに出すだけでよい。
                    眉だけは新しい絵からトレースし直してある
                    （scripts/illust-brow-trace.py → illustMainPaths.ts）。 */}
                <div
                  ref={bounceRef}
                  className="size-full"
                  style={{ transformOrigin: "50% 100%" }}
                >
                <IllustTamannee
                  lift={faceLift}
                  browX={fc.browX}
                  browY={fc.browY}
                  mouthOpen={showTama}
                  mouthX={fc.mouthX}
                  mouthY={fc.mouthY}
                  mouthW={fc.mouthW}
                  mouthStroke={fc.mouthStroke}
                  patchSpread={fc.patchSpread}
                  debugPatch={patchRed}
                  className="size-full"
                />
                </div>
              </motion.div>
              {/* キラキラ（2コマのGIF風）。絵から切り出して独立させた（2026-08-20）。
                  位置・2コマ目のずらし・速さは globals.css の --illust-sparkle-* から。
                  2026-08-21 ヒデさん指示：最初から出しっぱなしにせず、
                  「たまらねー」が出る時に一緒に出す */}
              <div
                className="sparkle-2f absolute"
                style={{
                  left: "var(--illust-sparkle-x)",
                  top: "var(--illust-sparkle-y)",
                  width: "var(--illust-sparkle-w)",
                  opacity: showTama ? 1 : 0,
                  transition: `opacity ${tp.text.duration}ms ${tp.text.ease}`,
                  transitionDelay: `${showTama ? tp.text.delay : 0}ms`,
                }}
              >
                <img src="/img/sparkle-2f.png" alt="" className="w-full" />
              </div>
              {/* v1.1: 「たまらねー」はホバーした時だけ、ひょこっと出る。
                 出方は tamaraneePatterns.ts の5案から選べる（/mock/tamaranee で比較） */}
              <img
                src="/img/text-tamaranee.svg"
                alt="たまらねー"
                className="absolute will-change-transform"
                style={{
                  left: "var(--illust-tamaranee-x)",
                  top: "var(--illust-tamaranee-y)",
                  width: "var(--illust-tamaranee-w)",
                  /* 75:53 の比率を保つ */
                  height: "calc(var(--illust-tamaranee-w) * 0.7067)",
                  transformOrigin: tp.text.origin,
                  transitionProperty: "opacity, transform, filter",
                  transitionDuration: `${tp.text.duration}ms`,
                  transitionTimingFunction: tp.text.ease,
                  transitionDelay: `${showTama ? tp.text.delay : 0}ms`,
                  ...(showTama ? tp.text.on : tp.text.off),
                }}
              />
            </>
          ) : (
            <>
              <img
                src="/img/illust-video.png"
                alt=""
                className="absolute object-contain object-bottom drop-shadow-illust"
                style={{
                  left: "var(--illust-person-x)",
                  top: "var(--illust-person-y)",
                  width: "var(--illust-person-w)",
                  height: "calc(var(--illust-person-w) * 1.6466)",
                }}
              />
              {/* v1.1: 「ぼーっ」は5秒に1回くらいのペースで出入りする（boPatterns.ts）。
                  採用は案4「息を吐くように抜ける」。1回目だけ3秒で出し、以降は5秒おき。
                  ⚠️ 位置（left/top/w）はカンプ採寸なので触らない。動きだけを案で差し替える */}
              {boPhase !== 0 && (
                <motion.img
                  key={boPhase === 1 ? "bo-enter" : "bo-cycle"}
                  src="/img/text-bo.svg"
                  alt="ぼーっ"
                  /* ⚠️ 仮置き: 文字は白（カンプのまま）なので、流氷のような明るい映像の上では
                     ほぼ見えない。人物と同じ Shadow_Illust を掛けて最低限浮かせている。
                     見せ方（影／すりガラスの地／文字色）はヒデさん確認待ち */
                  className="absolute drop-shadow-illust"
                  style={{
                    left: "var(--illust-bo-x)",
                    top: "var(--illust-bo-y)",
                    width: "var(--illust-bo-w)",
                    transformOrigin: bp.origin,
                  }}
                  {...(boPhase === 1
                    ? {
                        /* 登場：スポットの文字と同じブラー出現 */
                        initial: { opacity: 0, filter: "blur(16px)", y: 14 },
                        animate: { opacity: 1, filter: "blur(0px)", y: 0 },
                        transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                      }
                    : {
                        /* 周期：従来の案（登場済みなので最初の待ちは無し） */
                        initial: { opacity: 1 },
                        animate: bp.keyframes,
                        transition: {
                          duration: bp.cycle,
                          times: bp.times,
                          ease: bp.ease,
                          repeat: Infinity,
                        },
                      })}
                />
              )}
            </>
          )}
          </div>
        </motion.div>
        </div>

        {/* v1.1: 右レール（縦書き「網走 観光サイト」＋SNS 3つ）はカンプから無くなった。
            サイト名は吹き出しの上の手書き「網走市観光サイト」に置き換わっている。
            アセット（logo-abashiri.svg / sns-*.svg）はフッター用に残してある。 */}
      </div>
    </div>
  );
}
