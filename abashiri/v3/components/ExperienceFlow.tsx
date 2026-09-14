"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * ぼーっと体験（v1.1）
 * カンプ: 15152:27989（導入）/ 15152:29215（場所えらび）/ 15152:29191（ホバー）
 *         15152:29237（遷移後）/ 15152:29261（動画再生）
 *
 * 3ステップ
 *   1 導入      … 全画面のぼやけた景色 ＋ 中央のテキスト ＋「次へ進む」
 *   2 場所えらび … 右から左へゆっくり流れるカルーセル。ホバーで拡大＋動画プレビュー
 *   3 動画再生   … 全画面の動画 ＋ 左下のぼーっとタイマー
 *
 * 2→3 の間に「窓枠をくぐって向こう側の世界に入る」遷移が挟まる（enterPatterns.ts の5案）。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import BoTips, { DEFAULT_BO_TIPS, type BoTipsTune } from "./BoTips";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import GlobalNav from "./GlobalNav";
import { devSilent } from "./devSound";
import { findEnter, type EnterPattern } from "./enterPatterns";

declare global {
  interface Window {
    /** 遷移プレビューの保留フラグ（experience/page.tsx が立てる） */
    __abashiriAutoPick?: boolean;
  }
}

export type Step = 1 | 2 | 3;

/* カンプ 15152:29215 のカルーセル。
   ⚠️ 3枚目の「駅のホーム」の写真はカンプにしか無く、この環境から取得できなかったため
   既存の天都山展望台で仮置きしている。差し替え待ち。
   ⚠️ 動画は ryuhyo.mp4 の1本しか無い。全カードで同じ動画を流すと、
      さんご草のカードに流氷の映像が被って「流氷を選んだのに赤い写真が出る」ことになる。
      なので video は動画が実在するスポットにだけ持たせ、無いカードは写真のまま見せる。 */
export type Spot = {
  id: string;
  label: string;
  src: string;
  /** そのスポット自身の動画。まだ無いスポットは未設定にしておく */
  video?: string;
  /** カンプに無く仮置きしている素材かどうか（報告用） */
  placeholder?: boolean;
};

const SPOTS: Spot[] = [
  { id: "sango", label: "さんご草", src: "/img/scene-sango.jpg" },
  /* 静止画は動画と同じ「流氷の海」を使う。
     scene-ryuhyo.jpg は船が写っていて動画と絵が違うため、遷移の途中で
     船の写真が挟まって見えてしまう。ice.jpg なら動画の絵とつながる */
  { id: "ryuhyo", label: "流氷クルーズ", src: "/img/ice.jpg", video: "/video/ryuhyo.mp4" },
  { id: "tento", label: "網走駅", src: "/img/scene-eki.jpg" }, /* 写真差し替えに伴い改名（2026-08-23 ヒデさん指定・Figma 15574:22389） */
  { id: "himawari", label: "能取岬", src: "/img/scene-notoro.jpg" }, /* 灯台の写真へ差し替えに伴い改名（Figma 15574:22393） */
];

const STAGE_W = 1512;
const STAGE_H = 982;

/* カンプ 15152:29215 の実寸 */
const CARD_W = 902;
const CARD_H = 586;
const CARD_GAP = 60;

/* 導入の文字は、上から順に1ブロックずつブラーが晴れて出てくる。
   ヒデさん指示（2026-08-18）で「もっとゆったり、順番に」見せる方向へ緩めた。
   2026-08-21 ヒデさん指示で、見出しと「次へ進む」ボタンは最初から表示に変更。
   順に出るのは本文の段落4つだけ。
   ⚠️ 速さの好みが出るところなので、ここだけ触れば全体のテンポが変わるようにしてある */
export type IntroPace = {
  /** 景色のブラーが晴れるのを待つ時間(秒) */
  startDelay: number;
  /** 1段落ずつずらす間隔(秒) */
  stagger: number;
  /** 1段落が出きるまで(秒) */
  duration: number;
  /** ブラーの掛かり具合(px) */
  blur: number;
};
/* 2026-08-22 ヒデさん依頼で調整パネルから触れるようにした。ここは既定値 */
export const DEFAULT_INTRO_PACE: IntroPace = {
  startDelay: 0.8,
  stagger: 0.35,
  duration: 1.15,
  blur: 18,
};

/* ═══════════ 導入 ═══════════ */
function Intro({
  onNext,
  pace = DEFAULT_INTRO_PACE,
}: {
  onNext: () => void;
  pace?: IntroPace;
}) {
  const INTRO_STAGGER: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: pace.startDelay,
        staggerChildren: pace.stagger,
      },
    },
  };
  const INTRO_BLOCK: Variants = {
    hidden: { opacity: 0, filter: `blur(${pace.blur}px)`, y: 14 },
    show: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { duration: pace.duration, ease: [0.22, 1, 0.36, 1] },
    },
  };
  return (
    <motion.div
      key="intro"
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* 背景の青グラデは ExperienceFlow 本体に1枚だけ置いてある（ここには持たせない）。
          ここに持たせると、導入→場所えらび に切り替わる一瞬だけグラデが消えて
          下地の空グラデが顔を出し、「別の青が挟まった」ように見える */}

      {/* カンプ 15152:29260: (565, 110) 382x629 / 縦並び gap 100。
          文字は一気に出さず、上から順に1ブロックずつブラーが晴れて出てくる。
          ぼーっと読ませたいので、間隔は広め（0.55秒おき）に取っている */}
      <motion.div
        /* 上下中央ぞろえ。カンプは top 110px 固定だが、文字量で高さが変わるので
           画面の真ん中に置いたほうが収まりが良い */
        className="absolute left-1/2 top-1/2 flex w-[382px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[100px] text-center text-white"
        variants={INTRO_STAGGER}
        initial="hidden"
        animate="show"
      >
        <div className="flex w-full flex-col items-center gap-[76px]">
          {/* 見出しは最初から出しておく（2026-08-21 ヒデさん指示。
              段落だけが順にブラー出現する） */}
          <div className="flex flex-col items-center leading-[1.6] whitespace-nowrap">
            <p className="text-body-18 font-light">網走に来る前に、まずやってみよう</p>
            <p className="text-title-44 font-thin">ぼーっと体験</p>
          </div>
          <div className="flex w-full flex-col items-center gap-8 text-body-16 font-light leading-[1.8]">
            <motion.p variants={INTRO_BLOCK}>網走は何もないけど、それがたまらない。</motion.p>
            <motion.p variants={INTRO_BLOCK}>
              忙しなく過ごす、あなたの日常からそっと離れて、
              <br />
              何も考えず、「ぼーっとする」こと。
            </motion.p>
            <motion.p variants={INTRO_BLOCK} className="whitespace-nowrap">
              それが最大の癒しであり、くつろぎです。
              <br />
              網走では、そんな体験が思う存分できる。
            </motion.p>
            <motion.p variants={INTRO_BLOCK} className="whitespace-nowrap">
              ウェブサイトを通して、その空間を
              <br />
              疑似体験しよう。
            </motion.p>
          </div>
        </div>
        {/* 「次へ進む」も最初から出しておく（2026-08-21 ヒデさん指示） */}
        <div>
          <GlassButton onClick={onNext}>次へ進む</GlassButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* カンプ 15152:28007 / 15152:29231 共通のすりガラスボタン */
function GlassButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      /* v1.2: トップの「ぼーっとしてみる」とスタイル統一（ヒデさん指示 2026-08-21）。
         白2px枠 → 白40%・1pxの内側リング。地 white/10・blur65 は共通 */
      className="flex w-[220px] cursor-pointer items-center justify-center rounded-full bg-white/10 px-11 py-4 text-body-16 font-medium leading-[1.2] text-white ring-1 ring-inset ring-white/40 backdrop-blur-65 transition-transform hover:scale-105"
    >
      {children}
    </button>
  );
}

/* ═══════════ 場所えらび（左右のシェブロンで送るカルーセル） ═══════════ */
/*
 * カンプ 15152:29228 の実測
 *   器 … left 0.16 / top 239 / w 1512 / h 586
 *   カード … 902x586・角丸120・白フチ10px(60%)・gap 60
 *   3枚の中心 … -206 / 756 / 1718 ＝ 中央カードは画面のど真ん中(1512/2=756)
 *
 * カードは3枚とも同じ比率・同じサイズ。カンプに拡大状態は無い。
 * ホバーは 1.01 倍だけ、触れるものだと分かる程度にとどめる。
 *
 * 送りは自動をやめて、左右のシェブロンで手動。
 * 選べるのは中央のカードだけ（ボタンは中央にしか出さない）。
 */
const STEP = CARD_W + CARD_GAP; /* カード1枚ぶんの送り幅 = 962 */
/* ホバーで触れると分かる程度に。カンプに拡大状態が無いので控えめに */
const HOVER_SCALE = 1.01;

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-[26px]" aria-hidden>
      <path
        d={dir === "left" ? "M15 5L8 12l7 7" : "M9 5l7 7-7 7"}
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* 白ベース＋背面ブラーのスライダーボタン。サイトのすりガラス調に合わせる */
function SliderButton({
  dir,
  onClick,
}: {
  dir: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "前の場所へ" : "次の場所へ"}
      /* 中央カードの左右の端に乗せる（半幅451 の 62px 内側 ＝ カードのフチから28px）。
         画面幅に依らないよう、器の中央からの相対位置で置く */
      style={{
        left: "50%",
        transform:
          dir === "left"
            ? "translate(calc(-50% - 389px), -50%)"
            : "translate(calc(-50% + 389px), -50%)",
      }}
      /* v1.2: 地・枠をボタン共通仕様（white/10 + 白40%リング）に統一 */
      className="absolute top-1/2 z-20 flex size-[68px] cursor-pointer items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/40 backdrop-blur-65 transition-colors duration-300 ease-standard hover:bg-white/25"
    >
      <Chevron dir={dir} />
    </button>
  );
}

/* 最初に中央へ置くスポット＝流氷クルーズ（2026-08-22 ヒデさん指示。
   動画があり「この場所にする」ボタンが出る唯一のカードなので、入口で迷わせない） */
const START_INDEX = Math.max(0, SPOTS.findIndex((s) => s.id === "ryuhyo"));

/* ── カルーセルの登場5案（2026-08-23 ヒデさん依頼：急すぎるのでゆったりと） ──
   d はカードの位置（中央=0、左が負、右が正）。案ごとに出方の性格を変える。
   どれも 1.4〜2.0秒・サイト共通イージングで、せかさない */
const PICK_EASE = [0.22, 1, 0.36, 1] as const;
export const PICK_ENTER_PATTERNS: Record<
  number,
  { name: string; note: string; heading: Variants; card: (d: number) => Variants }
> = {
  /* 2026-08-23 ヒデさん指示で総入れ替え：左右の移動はなし。
     どれも「その場でブラーが晴れて登場」。違いは順番と質感だけ */
  1: {
    name: "案1",
    note: "一斉にブラー解除。全体が同時に、ゆっくりピントが合う",
    heading: {
      hidden: { opacity: 0, filter: "blur(14px)" },
      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 1.8, ease: PICK_EASE } },
    },
    card: () => ({
      hidden: { opacity: 0, filter: "blur(16px)" },
      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 1.8, ease: PICK_EASE } },
    }),
  },
  2: {
    name: "案2",
    note: "中央から順に。真ん中のカードが先に晴れて、両隣が続く",
    heading: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 1.4, ease: PICK_EASE } },
    },
    card: (d) => ({
      hidden: { opacity: 0, filter: "blur(16px)" },
      show: {
        opacity: 1, filter: "blur(0px)",
        transition: { duration: 1.6, ease: PICK_EASE, delay: 0.2 + Math.abs(d) * 0.35 },
      },
    }),
  },
  3: {
    name: "案3",
    note: "左から順に。カードが1枚ずつ順番に晴れていく",
    heading: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 1.4, ease: PICK_EASE } },
    },
    card: (d) => ({
      hidden: { opacity: 0, filter: "blur(16px)" },
      show: {
        opacity: 1, filter: "blur(0px)",
        transition: { duration: 1.6, ease: PICK_EASE, delay: 0.2 + (d + 2) * 0.3 },
      },
    }),
  },
  4: {
    name: "案4",
    note: "見出し→カードの二段階。見出しが晴れてから、カードがまとめて晴れる",
    heading: {
      hidden: { opacity: 0, filter: "blur(12px)" },
      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 1.2, ease: PICK_EASE } },
    },
    card: () => ({
      hidden: { opacity: 0, filter: "blur(18px)" },
      show: {
        opacity: 1, filter: "blur(0px)",
        transition: { duration: 1.8, ease: PICK_EASE, delay: 0.9 },
      },
    }),
  },
  5: {
    name: "案5",
    note: "濃いブラー＋ほんの少し縮んで収まる。動かないまま奥行きを感じる",
    heading: {
      hidden: { opacity: 0, filter: "blur(12px)" },
      show: { opacity: 1, filter: "blur(0px)", transition: { duration: 1.6, ease: PICK_EASE } },
    },
    card: () => ({
      hidden: { opacity: 0, filter: "blur(24px)", scale: 1.04 },
      show: {
        opacity: 1, filter: "blur(0px)", scale: 1,
        transition: { duration: 2.0, ease: PICK_EASE, delay: 0.2 },
      },
    }),
  },
};

function Pick({
  onPick,
  enter = 1,
}: {
  onPick: (spot: Spot, rect: DOMRect, at: number) => void;
  /** 1〜5: カルーセルの登場（PICK_ENTER_PATTERNS） */
  enter?: number;
}) {
  const EP = PICK_ENTER_PATTERNS[enter] ?? PICK_ENTER_PATTERNS[1];
  const [index, setIndex] = useState(START_INDEX);
  const go = (d: number) => setIndex((i) => i + d);

  /* 登場アニメは「最初からあるカード」だけに付ける。カルーセルを送って
     新しく入ってくるカードに毎回付くと、横のカードがなかなか現れない
     （2026-08-23 ヒデさん指摘）。
     ⚠️ 時間で variants を外す方式はNG：再生途中のカードのアニメがキャンセルされ
     透明のまま固まる（2026-08-23 ヒデさん報告のバグ）。カードごとに
     「最初からいたか」で固定し、途中で切り替えない */
  const initialSlotsRef = useRef<Set<number> | null>(null);
  if (initialSlotsRef.current === null) {
    initialSlotsRef.current = new Set(
      [-2, -1, 0, 1, 2].map((d) => START_INDEX + d)
    );
  }
  const initialSlots = initialSlotsRef.current;

  const active = ((index % SPOTS.length) + SPOTS.length) % SPOTS.length;
  /* track の原点を「器の中央（left:50%）」に置き、カードは中心基準で並べる。
     ステージは横長の画面だと 1512px より広がるので、
     1512 を固定値として中央を計算するとその差のぶんだけ左にずれる。 */
  const trackX = -index * STEP;
  /* 前後2枚ずつだけ描く。index は増え続けるが、中身は循環させるので端が見えない */
  const slots = [-2, -1, 0, 1, 2].map((d) => {
    const pos = index + d;
    return { pos, spot: SPOTS[((pos % SPOTS.length) + SPOTS.length) % SPOTS.length] };
  });

  /* ← → キーでも送れるようにしておく */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.div
      key="pick"
      className="absolute inset-0"
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
    >
      {/* 背景の青グラデは ExperienceFlow 本体側に1枚だけ（導入と共通で敷いてある） */}

      <motion.p
        variants={EP.heading}
        className="absolute left-1/2 top-[110px] -translate-x-1/2 whitespace-nowrap text-title-44 font-thin leading-[1.6] text-white"
      >
        どこでぼーっとする？
      </motion.p>

      {/* カンプ 15152:29228: top 239 / h 586。拡大しないのでカンプの実寸そのまま */}
      <div className="absolute left-0 top-[239px] h-[586px] w-full">
        {/* ⚠️ ここに overflow-hidden を付けない：ホバーの拡大分が上下で
            見切れる（2026-08-23 ヒデさん報告）。横のはみ出しはステージの
            ルート（ExperienceFlow直下の overflow-hidden）が刈ってくれる */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute left-1/2 top-0 h-full"
            animate={{ x: trackX }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {slots.map(({ pos, spot }) => (
              <motion.div
                key={pos}
                variants={
                  initialSlots.has(pos) ? EP.card(pos - START_INDEX) : undefined
                }
              >
                <SpotCard
                  spot={spot}
                  active={pos === index}
                  left={pos * STEP - CARD_W / 2}
                  onPick={onPick}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
        <SliderButton dir="left" onClick={() => go(-1)} />
        <SliderButton dir="right" onClick={() => go(1)} />
      </div>

      {/* いま何枚目か */}
      <div className="absolute bottom-[42px] left-1/2 flex -translate-x-1/2 items-center gap-3">
        {SPOTS.map((s, i) => (
          <span
            key={s.id}
            className={`block size-[8px] rounded-full transition-all duration-500 ease-standard ${
              i === active ? "w-[26px] bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

function SpotCard({
  spot,
  active,
  left,
  onPick,
}: {
  spot: Spot;
  /** 中央に来ているか。true の時だけボタンと動画プレビューが出る */
  active: boolean;
  /** track の中での左端の位置(px) */
  left: number;
  onPick: (spot: Spot, rect: DOMRect, at: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hover, setHover] = useState(false);

  /* 中央にいる間だけ動画プレビューを流す（そのスポットの動画がある時だけ） */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !spot.video) return;
    if (active) {
      v.muted = true; /* プレビューは常に無音。音は動画再生画面から */
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active]);

  /* 遷移プレビュー：パネルで遷移を調整すると、この合図で
     「この場所にする」を自動で押す（2026-08-23 ヒデさん依頼のリアルタイム確認）。
     合図が先に飛んでカードがまだ無い場合に備え、保留フラグも見る */
  useEffect(() => {
    if (!(active && spot.video)) return;
    const fire = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) onPick(spot, r, videoRef.current?.currentTime ?? 0);
    };
    const h = () => {
      window.__abashiriAutoPick = false;
      fire();
    };
    window.addEventListener("abashiri:auto-pick", h);
    let id = 0;
    if (window.__abashiriAutoPick) {
      window.__abashiriAutoPick = false;
      id = window.setTimeout(fire, 400); /* マウント直後はレイアウト待ち */
    }
    return () => {
      window.removeEventListener("abashiri:auto-pick", h);
      window.clearTimeout(id);
    };
  }, [active, spot, onPick]);

  return (
    <div
      ref={ref}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="absolute top-0 overflow-hidden border-white/60 transition-all duration-500 ease-standard"
      style={{
        left,
        width: CARD_W,
        height: CARD_H,
        borderWidth: 10,
        borderRadius: 120,
        /* カンプに拡大状態は無いので、触れた合図としてほんの少しだけ */
        transform: `scale(${active && hover ? HOVER_SCALE : 1})`,
        /* 中央以外は少し引いて、選べるのが中央だけだと分かるようにする */
        opacity: active ? 1 : 0.55,
        zIndex: active ? 10 : 1,
      }}
    >
      <img src={spot.src} alt={spot.label} className="absolute inset-0 size-full object-cover" />
      {spot.video && (
        <video
          ref={videoRef}
          src={spot.video}
          loop
          playsInline
          preload="metadata"
          poster={spot.src}
          /* 見せるだけの飾りなので、クリックは全部すり抜けさせる */
          className={`pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-700 ease-standard ${
            active ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {/* カンプ 15152:29231: カード内 top 464。中央のカードにだけ出す。
          2026-08-22 ヒデさん指示：動画が実在するスポット（いまは流氷クルーズだけ）に
          限定して出す。動画の無いカードは選んでも先の再生画面が成立しないため */}
      <div
        className={`absolute left-1/2 top-[464px] z-10 -translate-x-1/2 transition-all duration-500 ease-standard ${
          active && spot.video
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <GlassButton
          onClick={() => {
            const r = ref.current?.getBoundingClientRect();
            /* プレビューがいま何秒目を映しているかを一緒に渡す。
               ズームインも再生画面もこの続きから始めるので、絵が飛ばない */
            if (r) onPick(spot, r, videoRef.current?.currentTime ?? 0);
          }}
        >
          この場所にする
        </GlassButton>
      </div>
    </div>
  );
}

/* ═══════════ 窓の向こうに映すもの（唯一の映像レイヤー） ═══════════ */
/*
 * ⚠️ ここが「拡大しきった瞬間に絵が飛ぶ」問題の急所。
 * 以前は「ズームイン用の video」と「再生画面の video」の2つがあり、
 * 拡大が終わった瞬間にバトンタッチしていた。別の要素は必ず別のコマから
 * 始まるので、どれだけ秒数を合わせても一瞬ずれる（poster が挟まることもある）。
 * 映像の要素はサイト内でこの1つだけにして、窓が拡大しきった後もそのまま残す。
 * こうすれば「最後のコマ」と「最初のコマ」は物理的に同じコマになる。
 */
function MediaLayer({
  spot,
  videoRef,
  startAt,
}: {
  spot: Spot;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** プレビューが映していた秒数。null なら直接この画面に来た＝頭から止まったまま */
  startAt: number | null;
}) {
  const synced = useRef(false);

  /* プレビューが映していたコマに合わせて、そのまま流し続ける */
  const sync = useCallback(() => {
    const v = videoRef.current;
    if (!v || synced.current || v.readyState < 1) return;
    synced.current = true;
    if (startAt != null) {
      if (startAt > 0) v.currentTime = startAt;
      v.muted = true; /* 音は動画再生画面（Watch）が引き取る */
      v.play().catch(() => {});
    }
  }, [startAt, videoRef]);

  useEffect(() => {
    sync();
  }, [sync]);

  return (
    <>
      <img
        src={spot.src}
        alt={spot.label}
        className="absolute inset-0 size-full object-cover"
      />
      {spot.video && (
        <video
          ref={videoRef}
          src={spot.video}
          playsInline
          loop /* 再生ページの本編は繰り返す（2026-08-31 ヒデさん指示。付け忘れで1周で止まっていた） */
          preload="auto"
          poster={spot.src}
          onLoadedMetadata={sync}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </>
  );
}

/* ═══════════ 動画再生 ═══════════ */
/* v1.0 と同じ挙動：最初は止まっていて、再生ボタンを押すと動画とタイマーが同時に始まる。
   再生中は3秒さわらないと操作系が消えて、動かすとまた出てくる。 */
function Watch({
  spot,
  videoRef,
  seamless,
  tips = DEFAULT_BO_TIPS,
  vol = { fadeIn: true, fadeSec: 3 },
  uiHideSec = 2,
}: {
  spot: Spot;
  /* 動画そのものは MediaLayer が持つ。ここは操作するだけ */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /* カルーセルから続けて入って来たか。true なら止めずにそのまま流す */
  seamless: boolean;
  /** ぼーっとTips（再生後に出るモーダル）のタイミング。調整パネルから */
  tips?: BoTipsTune;
  /** 動画の音量：徐々に大きくするか・何秒かけるか。調整パネルから */
  vol?: { fadeIn: boolean; fadeSec: number };
  /** 再生ボタン・タイマーが自動で消えるまでの時間（秒）。調整パネルから */
  uiHideSec?: number;
}) {
  const [playing, setPlaying] = useState(!spot.video || seamless);
  const [remaining, setRemaining] = useState(3 * 60);
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 再生ボタンの上にカーソルがある間は自動で消さない（2026-08-31 ヒデさん指示。
     消えた後にボタンへ向かうと、着いた瞬間また消える事象の対策） */
  const hoverUiRef = useRef(false);
  /* 再生中だけ、3秒放置で操作系を隠す。ホバー中なら隠さず様子見を続ける */
  const pokeUi = useCallback(() => {
    setUiVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const tick = () => {
      if (hoverUiRef.current) {
        hideTimer.current = setTimeout(tick, 500);
        return;
      }
      setUiVisible(false);
    };
    hideTimer.current = setTimeout(tick, uiHideSec * 1000);
  }, [uiHideSec]);
  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );
  /* ぼーっとTipsが出ている間は再生UIを出さない（マウスが通ってもカウントしない）。
     Tipsを閉じたあとは、クリックやマウス操作でまた再生UIが出る（2026-08-23 ヒデさん仕様） */
  const [tipsVisible, setTipsVisible] = useState(false);
  const controlsShown = !tipsVisible && (uiVisible || !playing);

  /* 再生が始まったら、操作していなくても uiHideSec 後に自動で消す
     （2026-08-23 ヒデさん指示：消えるタイミングを早く＋パネルで調整） */
  useEffect(() => {
    if (playing) pokeUi();
  }, [playing, pokeUi]);

  /* Tips表示中はマウスを動かしても再生UIを出さない */
  const pokeUiGuarded = useCallback(() => {
    if (!tipsVisible) pokeUi();
  }, [tipsVisible, pokeUi]);

  /* playing の状態と <video> の再生を同期する。
     再生開始時は音量を0から徐々に上げる（いきなり鳴らない。2026-08-23 ヒデさん依頼） */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.muted = devSilent(); /* 開発中(localhost)は無音 */
      v.play().catch(() => setPlaying(false));
      if (vol.fadeIn && vol.fadeSec > 0) {
        /* 動画自身の再生時計を基準に上げる（rAFはタブが裏だと止まるため使わない） */
        v.volume = 0;
        const start = v.currentTime;
        const onTime = () => {
          const p = Math.min(1, (v.currentTime - start) / vol.fadeSec);
          v.volume = p;
          if (p >= 1) v.removeEventListener("timeupdate", onTime);
        };
        v.addEventListener("timeupdate", onTime);
        return () => v.removeEventListener("timeupdate", onTime);
      }
      v.volume = 1;
    } else {
      v.pause();
    }
  }, [playing, videoRef, vol.fadeIn, vol.fadeSec]);

  /* 動画が始まったらぼーっとタイマーがカウントダウン */
  useEffect(() => {
    if (!playing || remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [playing, remaining]);

  /* 動画の音声が優先：再生状態を環境音（SoundUi）へ知らせる */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("abashiri:video-audio", { detail: { active: playing } })
    );
  }, [playing]);
  useEffect(
    () => () => {
      window.dispatchEvent(
        new CustomEvent("abashiri:video-audio", { detail: { active: false } })
      );
    },
    []
  );

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    /* 動画の上に重なる操作パネルだけ。映像には一切触らない */
    <div
      className="absolute inset-0 z-30"
      onPointerMove={() => playing && pokeUiGuarded()}
      onPointerDown={() => playing && pokeUiGuarded()}
    >
      {/* ぼーっとTips：再生UIが消えて「何もない状態」になってからカウント開始し、
          中央にふわっと出る（カンプ 15564:22022）。表示中は再生UIと排他 */}
      {spot.video && (
        <BoTips
          active={playing && !controlsShown}
          tune={tips}
          onVisibleChange={setTipsVisible}
        />
      )}
      {spot.video && (
        <button
          type="button"
          onClick={() => {
            setPlaying((v) => !v);
            pokeUi();
          }}
          onPointerEnter={() => {
            hoverUiRef.current = true;
            pokeUi();
          }}
          onPointerLeave={() => {
            hoverUiRef.current = false;
            pokeUi();
          }}
          aria-label={playing ? "一時停止" : "再生"}
          className={`absolute left-1/2 top-1/2 z-10 flex size-[192px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-all duration-500 ease-standard hover:scale-110 ${
            controlsShown ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <img
            src={playing ? "/img/icon-pause.svg" : "/img/play-circle.svg"}
            alt=""
            className="size-full"
          />
        </button>
      )}

      {/* 左下のぼーっとタイマー。
          ラッパは位置とフェードだけ（filter/transform を持たせない）。
          ⚠️ タグと数字箱は「兄弟」に並べる：blur付きの箱の中にタグを入れると、
          タグの backdrop-blur が動画まで届かず効かなくなる（前回の再発防止） */}
      <div
        className={`absolute left-[67px] top-[724px] flex flex-col items-start gap-2 transition-opacity duration-500 ease-standard ${
          controlsShown ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* タグ：カンプ 16060:23117 Main Button
            （白20% / blur100 / 角丸full / px16 py6 / Noto Sans JP Light 20px 行間1.2 白） */}
        <span className="rounded-full bg-white/20 px-4 py-[6px] text-[20px] font-light leading-[1.2] text-white backdrop-blur-[100px]">
          ぼーっとタイマー
        </span>
        {/* 数字箱：カンプ 15152:29287（地 white/10 / blur65 / 角丸16 / 左右44・上下24） */}
        <div className="flex flex-col items-start justify-center rounded-16 bg-white/10 px-11 py-6 backdrop-blur-65">
          <p className="font-num whitespace-nowrap text-number-120 font-thin leading-none text-white">
            {mm}:{ss}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ 窓枠をくぐる遷移 ═══════════ */
/*
 * 「窓に近づいていく」を成立させる肝は、窓枠と、窓の向こうの景色を切り離すこと。
 *
 * 前の実装は、写真ごとカードを scale で拡大していた。これは物理的には
 * 「写真を引き伸ばしている」動きで、「窓に近づいている」動きではない。
 * 近づいた時に大きくなるのは“枠”であって、遠くにある景色はほとんど大きくならない。
 * ここがずれていたので不自然に見えていた。
 *
 * 直したところ
 *  1. 景色は画面に固定して一切動かさない。広がるのは窓の“開口部”だけ（＝覗き穴が広がる）
 *  2. 開口部は画面の中心へ寄りながら広がる。カード自身の中心ではなく、目線の先へ向かう
 *  3. イージングを ease-in 寄りに。等速で歩いて近づくと、見た目の大きさは加速して増える
 *  4. まわりの世界（カルーセル・見出し・背景）は外へ押し出して奥に流す
 *  5. 人物イラストは Stage 側の一番上のレイヤーに残るので、窓が人物の手前ではなく
 *     奥から迫ってきて、人物ごと世界に入っていくように見える（z-20 で人物 z-30 の下）
 */

function EnterWindow({
  from,
  pattern,
  landed,
  onDone,
  children,
}: {
  /** ステージ座標での、押した瞬間のカードの位置と大きさ＋器の実寸 */
  from: { x: number; y: number; w: number; h: number; stageW: number; stageH: number };
  pattern: number | string | EnterPattern | null | undefined;
  /** 拡大しきったか。くぐり終わったら暗幕を外して素の映像に戻す */
  landed: boolean;
  onDone: () => void;
  /** 窓の向こうに映すもの。拡大が終わってもこの要素のまま残す */
  children: React.ReactNode;
}) {
  const p = findEnter(pattern);
  const sec = p.duration / 1000;

  useEffect(() => {
    const id = setTimeout(onDone, p.duration);
    return () => clearTimeout(id);
  }, [onDone, p.duration]);

  /* 終点。画面より一回り大きくして、フチが見えないところまで開く。
     ⚠️ 1512x982 の固定値で出すと、横長の画面では終点が左上寄りになり、
        しかも画面を覆いきらないまま止まる。必ず器の実寸から出すこと。 */
  const overshoot = 1.12;
  const toW = from.stageW * overshoot;
  const toH = from.stageH * overshoot;

  /* ⚠️ 位置と大きさに別々のイージングを当てると、小さいまま位置だけ先に
     終点（＝左上のマイナス座標）へ走ってしまう。窓が左上へ飛んで見えた原因はこれ。
     ひとつの進行度 t から矩形の中心と大きさを両方出して、常に一体で動かす。 */
  const t = useMotionValue(0);
  useEffect(() => {
    const controls = animate(t, 1, { duration: sec, ease: p.growEase });
    return () => controls.stop();
  }, [t, sec, p.growEase]);

  const mix = (a: number, b: number) => (v: number) => a + (b - a) * v;
  const fromCx = from.x + from.w / 2;
  const fromCy = from.y + from.h / 2;
  const toCx = from.stageW / 2;
  const toCy = from.stageH / 2;

  const w = useTransform(t, mix(from.w, toW));
  const h = useTransform(t, mix(from.h, toH));
  const cx = useTransform(t, mix(fromCx, toCx));
  const cy = useTransform(t, mix(fromCy, toCy));
  /* 左上 = 中心 − 大きさの半分。これで矩形が破綻しない */
  const x = useTransform([cx, w], ([c, ww]: number[]) => c - ww / 2);
  const y = useTransform([cy, h], ([c, hh]: number[]) => c - hh / 2);
  /* 景色は画面に貼り付いたまま。開口部が動いたぶんだけ中で逆に動かす */
  const imgX = useTransform(x, (v) => -v);
  const imgY = useTransform(y, (v) => -v);

  const radius = useTransform(t, mix(p.radius[0], p.radius[1]));
  const border = useTransform(t, mix(p.border[0], p.border[1]));
  /* 途中のブラー：中盤に山なりで一度ぼける（0なら効かない） */
  const midBlur = useTransform(t, (v) =>
    p.blur[1] > 0
      ? `blur(${(p.blur[1] * Math.sin(Math.PI * Math.min(1, Math.max(0, v)))).toFixed(1)}px)`
      : "none"
  );

  return (
    <motion.div className="absolute inset-0 z-20 overflow-hidden" key="enter">
      {/* まわりを暗く落とす（トンネル感）。くぐり終わったら消す */}
      <motion.div
        className="absolute inset-0 bg-shadow"
        initial={{ opacity: 0 }}
        animate={{ opacity: landed ? 0 : p.dim }}
        transition={{ duration: sec, ease: p.ease }}
      />

      {/* 窓の開口部。枠だけが近づいて広がる */}
      <motion.div
        className="absolute overflow-hidden border-white/60 [animation:botto-fade-in_140ms_linear]"
        style={{ x, y, width: w, height: h, borderRadius: radius, borderWidth: border }}
      >
        {/* 窓の向こうの中身は外（MediaLayer）から渡される。
            ここで自前の video を持つと、拡大しきった瞬間に別の要素へ
            バトンタッチすることになり、必ず「別のコマ」に切り替わってしまう。
            要素をひとつに保つのが、絵がずれないための唯一の条件。 */}
        <motion.div
          className="absolute left-0 top-0"
          style={{ x: imgX, y: imgY, width: from.stageW, height: from.stageH }}
        >
          <motion.div
            className="size-full"
            initial={{ scale: p.parallax }}
            animate={{ scale: 1 }}
            transition={{ duration: sec, ease: [0.33, 0, 0.5, 1] }}
            style={{ filter: midBlur }}
          >
            {children}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* まわりの世界（カルーセル・見出し・背景）を外へ押し出して奥に流す */
function WorldPush({
  children,
  active,
  pattern,
}: {
  children: React.ReactNode;
  active: boolean;
  pattern: number | string | EnterPattern | null | undefined;
}) {
  const p = findEnter(pattern);
  return (
    <motion.div
      className="absolute inset-0"
      animate={
        active
          ? { scale: 1.35, opacity: 0, filter: "blur(12px)" }
          : { scale: 1, opacity: 1, filter: "blur(0px)" }
      }
      transition={{ duration: p.duration / 1000, ease: [0.55, 0, 0.85, 0.6] }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════ 本体 ═══════════ */
export default function ExperienceFlow({
  step,
  setStep,
  enter,
  onPicked,
  introPace,
  pickEnter,
  tips,
  videoVol,
  videoUiHideSec,
}: {
  step: Step;
  setStep: (s: Step) => void;
  /** 遷移のパターン。番号 or 調整パネルで組んだ EnterPattern そのもの（enterPatterns.ts） */
  enter?: number | string | EnterPattern | null;
  /** 「この場所にする」を押した合図。人物イラストはここから出す */
  onPicked?: () => void;
  /** 導入メッセージの出方（ブラー・速度・タイミング）。調整パネルから */
  introPace?: IntroPace;
  /** 1〜5: 場所えらびのカルーセルの登場（PICK_ENTER_PATTERNS）。調整パネルから */
  pickEnter?: number;
  /** ぼーっとTips（動画再生ページのモーダル）のタイミング。調整パネルから */
  tips?: BoTipsTune;
  /** 動画の音量フェードイン。調整パネルから */
  videoVol?: { fadeIn: boolean; fadeSec: number };
  /** 再生ボタン・タイマーが消えるまでの時間（秒）。調整パネルから */
  videoUiHideSec?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  /* 映像はサイト内で1つだけ。ズームインも再生画面もこれを共有する */
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [landed, setLanded] = useState(false);
  const [spot, setSpot] = useState<Spot>(SPOTS[1]);
  /* プレビューを止めた位置（秒）。null なら直接この画面に来たということ */
  const [startAt, setStartAt] = useState<number | null>(null);
  const [entering, setEntering] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    /** 器の実寸（ステージ座標）。横長の画面では 1512 より広くなる */
    stageW: number;
    stageH: number;
  } | null>(null);

  /* handlePick の中身を作り直したくないので ref 経由で渡す */
  const onPickedRef = useRef(onPicked);
  onPickedRef.current = onPicked;

  /* ブラウザ座標 → ステージ座標（1512x982）に直してから渡す。
     ステージは画面サイズに合わせて縮小表示されているので、その倍率で割る */
  const handlePick = useCallback((s: Spot, rect: DOMRect, at: number) => {
    setStartAt(at);
    onPickedRef.current?.();
    const root = rootRef.current;
    if (!root) return;
    const rr = root.getBoundingClientRect();
    const scale = rr.width / root.offsetWidth || 1;
    setSpot(s);
    setEntering({
      x: (rect.left - rr.left) / scale,
      y: (rect.top - rr.top) / scale,
      w: rect.width / scale,
      h: rect.height / scale,
      stageW: root.offsetWidth,
      stageH: root.offsetHeight,
    });
  }, []);

  /* 窓は畳まない。拡大しきった状態のまま置いておき、中の映像もそのまま残す。
     ここで entering を null にして別の要素に描き直すと、その瞬間だけ必ず
     別のコマ（または poster）が映って「急に画面が変わった」ように見える */
  const finishEnter = useCallback(() => {
    setLanded(true);
    setStep(3);
  }, [setStep]);

  /* ブラウザバックや遷移プレビューで step1/2 へ戻ったら、
     窓（entering）と映像の状態を片付ける（2026-08-23 ヒデさん依頼の階層バック対応） */
  useEffect(() => {
    if (step !== 3) {
      setEntering(null);
      setLanded(false);
      setStartAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const media = (
    <MediaLayer spot={spot} videoRef={mediaRef} startAt={startAt} />
  );

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      {/* サウンドON/OFFの置き場：SoundUi がここへ描画する */}
      <div
        id="abashiri-sound-slot"
        /* カンプ x=34。ヘッダーの文字行（top32・高さ19px）と上下中央ぞろえ
           （2026-08-22 ヒデさん指示。ナビは帯ではなく素の文字なので、その実寸に合わせる） */
        className="absolute left-[34px] top-[32px] z-40 flex h-[19px] items-center"
      />

      {/* 遷移中は、まわりの世界だけ外へ押し出して奥へ流す。
          動画画面はこの外に出しておく。中に入れると、窓をくぐり終わったあとに
          WorldPush が元の大きさへ戻る動きが余計に走ってしまう */}
      {step !== 3 && (
        <WorldPush active={!!entering} pattern={enter}>
          {/* 背景の青グラデは Stage の brandOverlay に移動（2026-08-23）。
              ここに置くとカモメがグラデの後ろに隠れて薄く見えるため */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Intro key="intro" onNext={() => setStep(2)} pace={introPace} />
            )}
            {step === 2 && <Pick key="pick" onPick={handlePick} enter={pickEnter} />}
          </AnimatePresence>
        </WorldPush>
      )}
      {/* 映像レイヤー。カルーセルから入って来た時は窓の中に、
          ?step=3 で直接来た時はそのまま全画面に置く。どちらも要素は1つ */}
      {entering ? (
        <EnterWindow
          from={entering}
          pattern={enter}
          landed={landed}
          onDone={finishEnter}
        >
          {media}
        </EnterWindow>
      ) : (
        step === 3 && <div className="absolute inset-0 z-20">{media}</div>
      )}

      {/* 窓をくぐったら、余計な演出をはさまずそのまま動画を見せる。
          Watch は操作パネルだけで、映像そのものには触らない */}
      {step === 3 && (
        <Watch spot={spot} videoRef={mediaRef} seamless={startAt != null} tips={tips} vol={videoVol} uiHideSec={videoUiHideSec} />
      )}

      {/* ナビは常に最前面（動画再生中の操作パネルが z-30 の全画面レイヤーなので、
          その上に載せないとメニューが押せない。2026-08-22 ヒデさん指摘）。
          TopPage と同じ「pointer-events-none の器 ＋ 中身だけ auto」方式 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div className="pointer-events-auto">
          <GlobalNav theme="light" />
        </div>
      </div>
    </div>
  );
}
