"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preload } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useMotionValueEvent,
  type Variants,
} from "framer-motion";
import Bird from "./Bird";
import GlobalNav from "./GlobalNav";

/* ビューポートに入った時の「上品なブラー解除」共通アニメーション */
const reveal: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(16px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
};

type CardData = { src: string; alt: string; title: string };

/* タイトルは仮のものあり。正式名称が決まったら差し替える。
   v1.1: スポットのカード列は SpotShowcase（KV直下の全画面セクション）に置き換わった */
const GOURMET_CARDS: CardData[] = [
  { src: "/img/gourmet-1.jpg", alt: "わかさぎの唐揚げ", title: "わかさぎの唐揚げ" },
  { src: "/img/gourmet-2.jpg", alt: "浜の海鮮焼き", title: "浜の海鮮焼き" },
  { src: "/img/gourmet-3.jpg", alt: "地魚の御膳", title: "地魚の御膳" },
  { src: "/img/gourmet-4.jpg", alt: "浜のちゃんこ鍋", title: "浜のちゃんこ鍋" },
];
const EVENT_CARDS: CardData[] = [
  { src: "/img/event-1.jpg", alt: "監獄食体験", title: "監獄食体験" },
  { src: "/img/event-2.jpg", alt: "タオルが凍る極寒体験", title: "タオルが凍る極寒体験" },
  { src: "/img/event-3.jpg", alt: "流氷カヤック", title: "流氷カヤック" },
  { src: "/img/event-4.jpg", alt: "流氷ウォーク", title: "流氷ウォーク" },
];

/* No.付き楕円カード（ホバーで中の写真がズーム）
   No.1 → No.2 → … と少しずつ遅れてブラー出現する */
const cardReveal: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(16px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 + i * 0.25 },
  }),
};

/* カードホバー（採用案：グラデが現れて、スポット名が下からすっと上がる） */
export type CardHover = { overlay: string; title: string };
const CARD_HOVER: CardHover = {
  overlay:
    "opacity-0 transition-opacity duration-500 ease-standard group-hover:opacity-100",
  title:
    "translate-y-[18px] opacity-0 transition-all delay-75 duration-500 ease-standard group-hover:translate-y-0 group-hover:opacity-100",
};

function Card({
  card,
  index,
  hover = CARD_HOVER,
}: {
  card: CardData;
  index: number;
  hover?: CardHover;
}) {
  const ov = hover;
  return (
    <motion.div
      variants={cardReveal}
      custom={index}
      className="relative h-[410px] w-[730px] shrink-0"
    >
      <div className="group h-full w-full overflow-hidden rounded-290 border-8 border-white/70">
        <img
          src={card.src}
          alt={card.alt}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
        />
        {/* ホバー：下から黒グラデ+ブラーの上にスポット名 */}
        <div
          className={`absolute inset-0 flex items-end justify-center rounded-290 bg-gradient-to-b from-transparent to-black/70 pb-10 backdrop-blur-6 ${ov.overlay}`}
        >
          <p className={`text-title-32 font-medium leading-[1.2] text-white ${ov.title}`}>
            {card.title}
          </p>
        </div>
      </div>
      <p className="font-num pointer-events-none absolute left-[-16px] top-[-65px] text-number-140 font-thin leading-none text-white opacity-70">
        No.{index + 1}
      </p>
    </motion.div>
  );
}

/* カード列はモックの内側いっぱいに広げる（左だけ120pxの余白）。
   980pxのグリッドから左右に飛び出させて、見切れをなくす。
   縦スクロール→横スクロール切替のため ref を登録する */
function CardRow({
  cards,
  rowIndex,
  registerRow,
  hover,
}: {
  cards: CardData[];
  rowIndex: number;
  registerRow: (i: number, el: HTMLDivElement | null) => void;
  hover?: CardHover;
}) {
  return (
    <div
      ref={(el) => registerRow(rowIndex, el)}
      className="no-scrollbar -mt-20 ml-[calc((980px-100cqw)/2)] w-[100cqw] overflow-x-auto pt-20"
    >
      <div className="flex w-max gap-20 pl-30 pr-15">
        {cards.map((c, i) => (
          <Card key={c.src} card={c} index={i} hover={hover} />
        ))}
      </div>
    </div>
  );
}

/* もっと見る（案1採用：まるごと右へ10pxスライド。2026-08-23 ヒデさん決定） */
export type MoreAnim = { text: string; icon: string };
const MORE_ANIM: MoreAnim = { text: "", icon: "" };

function ViewMore({ anim = MORE_ANIM }: { anim?: MoreAnim }) {
  const a = anim;
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="group flex cursor-pointer items-center gap-6 text-control-20 font-medium text-white transition-transform duration-300 ease-standard hover:translate-x-[10px]"
    >
      <span className={a.text}>もっと見る</span>
      <img
        src="/img/icon-more-circle.svg"
        alt=""
        className={`size-[62px] ${a.icon}`}
      />
    </a>
  );
}

import { INTRO_PATTERNS } from "./introPatterns";
import { KV_PATTERNS } from "./kvPatterns";
import HeroWriting from "./HeroWriting";
import HeroKamishibai from "./HeroKamishibai";
import HeroCombo from "./HeroCombo";
import HeroBlurSeq from "./HeroBlurSeq";
import SpotShowcase from "./SpotShowcase";
import GourmetSection from "./GourmetSection";
import { DEFAULT_HERO_TIMING, type HeroTiming } from "./heroTiming";
import { DEFAULT_BIRDS, type BirdsConfig } from "./birdConfig";
import { type BubbleTune } from "./bubbleConfig";
import { buildShadow, mergeShadow, type ShadowTune } from "./shadowConfig";
import { mergeLayout, type LayoutTune } from "./layoutConfig";
import { mergeSpotTransition, type SpotTransition } from "./spotTransition";
import { mergeKvExit, type KvExit } from "./kvExitConfig";
import { mergeHeroEnter, type HeroEnter } from "./heroEnterConfig";
import MessageSection from "./MessageSection";
import { mergeMsg, type MsgTune } from "./msgConfig";
import { waitForConsent } from "./consentGate";

/** イラスト出現の合図（Stage が拾う） */
export const ILLUST_IN_EVENT = "abashiri:illust-in";

export default function TopPage({
  intro = 2,
  kv = 1,
  write = 0,
  writePace = 2,
  kami = 0,
  combo = false,
  blurSeq = false,
  timing = DEFAULT_HERO_TIMING,
  birds = DEFAULT_BIRDS,
  birdsEditable = false,
  onBirdMove,
  waitConsent = false,
  cardHover,
  moreAnim,
  bubbleAnim = 0,
  bubbleTune,
  frameShadow,
  shadowTune,
  layout,
  spotTune,
  kvExit,
  heroEnter,
  msgTune,
  illustDelay,
  fastIntro = false,
  msgScrollSpeed = 100,
}: {
  intro?: number;
  kv?: number;
  /** 1〜3: 手書きパスアニメーション（0は通常表示） */
  write?: number;
  /** 1〜3: 書くスピード（WRITE_PACES） */
  writePace?: number;
  /** 1〜3: 紙芝居パターン（伸ばし棒ビヨーン。writeより優先） */
  kami?: number;
  /** true: なぞり書き+ビヨーン版（旧候補） */
  combo?: boolean;
  /** true: 決定版（吹き出し→な〜んにもない→たまらない を順にブラー） */
  blurSeq?: boolean;
  /** 登場演出のタイミング設定（heroTiming.ts） */
  timing?: HeroTiming;
  /** カモメの配置・見た目（birdConfig.ts） */
  birds?: BirdsConfig;
  /** true: カモメをドラッグで動かせる（調整パネル用） */
  birdsEditable?: boolean;
  /** ドラッグでカモメが動いた時の通知（調整パネル用） */
  onBirdMove?: (key: "promo1" | "promo2", patch: { x: number; y: number }) => void;
  /** true: 環境音のON/OFF確認が済むまで登場演出を待つ */
  waitConsent?: boolean;
  /** 比較mock専用：カードホバーの見せ方を差し替える（通常は指定しない） */
  cardHover?: CardHover;
  /** 比較mock専用：もっと見るのホバーを差し替える（通常は指定しない） */
  moreAnim?: MoreAnim;
  /** 1〜3: 吹き出しのムニムニアニメ（0でなし） */
  bubbleAnim?: number;
  /** 吹き出しの平滑化・ぷにぷに呼吸のパラメーター（bubbleConfig.ts） */
  bubbleTune?: BubbleTune;
  /** 比較mock専用：影のクラスを外から丸ごと差し替える（通常は指定しない） */
  frameShadow?: string;
  /** 浮遊シャドウの細かい調整（shadowConfig.ts。frameShadow 未指定の時に有効） */
  shadowTune?: Partial<ShadowTune>;
  /** タブレットの位置ずらし（layoutConfig.ts） */
  layout?: Partial<LayoutTune> | null;
  /** KV → ぼーっとスポットの入れ替わりのタイミング（spotTransition.ts） */
  spotTune?: Partial<SpotTransition> | null;
  /** 作字の「消え方」（kvExitConfig.ts。案5つ＋細かい数値を調整パネルから） */
  kvExit?: Partial<KvExit> | null;
  /** 作字の「登場のしかた」（heroEnterConfig.ts。ブラーの強さ・速さ・たまらないまでの間） */
  heroEnter?: Partial<HeroEnter> | null;
  /** メッセージセクション（msgConfig.ts。KV直下・カンプ 15480:22896） */
  msgTune?: Partial<MsgTune> | null;
  /** ボタンが出てから人物イラストが出るまでの間(ms)。調整パネルから */
  illustDelay?: number;
  /** true: 作字の演出を飛ばして完成形から始める（人物まわりの調整リプレイ用） */
  fastIntro?: boolean;
  /** KV→メッセージ区間のスクロール速度（%）。100=標準。
      ホイール/スワイプの deltaY にこの倍率をかける（2026-08-23 ヒデさん依頼） */
  msgScrollSpeed?: number;
}) {
  /* 背景写真はファーストビューの土台。読み込みが他と同列だと
     空色グラデの下地だけが先に見えてしまうため、最優先で先読みする
     （2026-08-21 ヒデさん指摘：立ち上げ時のグラデ画面をなくす） */
  preload("/img/bg-hero.jpg", { as: "image", fetchPriority: "high" });

  const scrollerRef = useRef<HTMLDivElement>(null);

  /* 体験ページなど別ページのヘッダーから「ぼーっとスポット/グルメ」で来た時：
     覚えておいた行き先へ、着いてからスクロールする（2026-08-23） */
  useEffect(() => {
    let key: string | null = null;
    try {
      key = sessionStorage.getItem("abashiri-goto");
      if (key) sessionStorage.removeItem("abashiri-goto");
    } catch {}
    if (key !== "spotAt" && key !== "gourmetAt") return;
    let tries = 0;
    const id = window.setInterval(() => {
      const sc = document.querySelector<HTMLElement>("[data-abashiri-scroller]");
      const at = sc?.dataset[key as "spotAt" | "gourmetAt"];
      tries += 1;
      if (at) {
        window.dispatchEvent(
          new CustomEvent("abashiri:scroll-to", { detail: { y: Number(at) } })
        );
        window.clearInterval(id);
      } else if (tries > 40) {
        window.clearInterval(id);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  /* KV→メッセージ区間のスクロール速度。until（区間の終わり）と gain（倍率）を
     毎レンダーで更新し、wheel ハンドラは ref から読む */
  const wheelGainRef = useRef({ until: 0, gain: 1 });

  /* 「ぼーっとしてみる」→ 体験ページの遷移をディゾルブに（2026-08-22 ヒデさん指摘。
     即切替だとガタついて見えるため、青いグラデ＋ブラーの幕がふわっとかぶってから遷移する。
     体験ページ側も同じ青グラデから始まるので、幕がそのまま次のページにつながる） */
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const onGoExperience = (e: React.MouseEvent) => {
    e.preventDefault();
    if (leaving) return;
    setLeaving(true);
    router.prefetch("/experience");
    window.setTimeout(() => router.push("/experience"), 800);
  };

  /* ディゾルブ中は KV の演出（カモメ＝CSSアニメ／人物イラスト＝WAAPIループ）を
     すべて一時停止して、背景を静止させる。
     backdrop-filter のブラーは「背景が動くたびに全画面を再計算」するのが最も重く、
     ここがガタつきの主因だった（2026-08-24 ヒデさん報告）。背景を止めれば、
     固定ブラー＋透明度フェード（GPU合成）だけになり、確実になめらかになる。
     幕（data-dissolve-veil）自身のフェードは止めないよう除外する */
  useEffect(() => {
    if (!leaving) return;
    /* この効果は DOM コミット後に走るので幕は既に存在する。
       同期で止める（rAF だと裏タブで発火せず、実機でも1フレーム遅れるだけ利点がない）。
       幕自身のフェードは除外（幕の要素配下のアニメは止めない） */
    const veil = document.querySelector("[data-dissolve-veil]");
    document.getAnimations().forEach((a) => {
      const target = (a.effect as KeyframeEffect | null)?.target as Node | null;
      if (veil && target && veil.contains(target)) return;
      try {
        a.pause();
      } catch {}
    });
  }, [leaving]);

  const ip = INTRO_PATTERNS[intro] ?? INTRO_PATTERNS[2];
  const kp = KV_PATTERNS[kv] ?? KV_PATTERNS[1];
  /* 入れ替わりのタイミング（作字が消える → 背景ブラー → スポットが晴れる → 固定） */
  const T = mergeSpotTransition(spotTune);

  /* アニメが終わってから「ぼーっとしてみる」ボタンをふわっと出す */
  const animated = Boolean(write || kami || combo || blurSeq);
  const [buttonIn, setButtonIn] = useState(!animated);

  /* 環境音のON/OFF確認が済んでからヘッダー等の登場演出を始める */
  const [go, setGo] = useState(!waitConsent);
  useEffect(() => {
    if (!waitConsent) return;
    let alive = true;
    waitForConsent().then(() => {
      if (alive) setGo(true);
    });
    return () => {
      alive = false;
    };
  }, [waitConsent]);

  /* v1.2: 「網走市観光サイト」は吹き出しと同時に出す（ヒデさん指示 2026-08-19）。
     以前はボタンと一緒（＝書き終わったあと）だったが、吹き出しに添えた見出しなので
     吹き出しと同じ瞬間に、同じ 900ms・ブラー16px で現れる方が自然。
     HeroBlurSeq 側の吹き出しも「環境音の確認が済んでから timing.start 後」に
     始まるので、同じ条件で合わせている */
  const [kankoIn, setKankoIn] = useState(!animated || fastIntro);
  useEffect(() => {
    if (!animated || !go || fastIntro) return;
    const id = window.setTimeout(() => setKankoIn(true), timing.start);
    return () => window.clearTimeout(id);
  }, [animated, go, timing.start, fastIntro]);

  /* 書き終わり → ボタン → 一番最後にイラスト、の順で出す共通ハンドラ。
     人物までの間は調整パネルから（illustDelay。既定は timing.illust.gap） */
  const handleScheduled = (writingEnd: number) => {
    const buttonAt = writingEnd + timing.button.gap;
    const illustAt = buttonAt + timing.button.duration + (illustDelay ?? timing.illust.gap);
    window.setTimeout(() => setButtonIn(true), buttonAt);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(ILLUST_IN_EVENT));
    }, illustAt);
  };

  /* キービジュアル（文字＋ボタン）は画面中央に固定したまま、
     スクロール量に応じてその場で変化しながら消え、
     下からコンテンツがすべり込んで交代する */
  const { scrollY } = useScroll({ container: scrollerRef });
  /* 作字が消えきるまでの距離は kvExitConfig（パネルの「消え方」）が持つ。
     旧 spotTransition.kvOut は 2026-08-21 に統合済み。
     /mock/kv/[n] のようにパターンを見比べる時だけ、そのパターンの range を使う */
  /* 本番(kv=1)は kvExitConfig の「消え方」で計算する。
     ease>1 だと「最初はその場にとどまり、あとからすっと消える」ゆったり曲線になる。
     /mock/kv/[n] の比較パターンだけ従来の kvPatterns の値のまま */
  const E = mergeKvExit(kvExit);
  const useExit = kv === 1;
  /* メッセージセクション（本番トップのみ）。作字が消えきってから読みはじめ、
     読み終わったぶんだけ「ぼーっとスポット」をうしろへずらす */
  const M = mergeMsg(msgTune);
  const msgStart = (useExit ? E.range : 320) + M.fadeIn;
  /* 読み(len)のあとに余韻(tail)を挟んでから、スポットへ入れ替わる */
  const msgEnd = msgStart + M.len + M.tail;
  /* KV→メッセージ区間（0〜メッセージが出はじめるまで）のスクロール速度 */
  wheelGainRef.current = {
    until: useExit ? msgStart : 0,
    gain: Math.max(0.1, msgScrollSpeed / 100),
  };
  /* 作字の登場（ブラー弱め・一括出現）。timing の kotoba へ上書きして HeroBlurSeq へ渡す。
     ⚠️ useMemo で識別を保つ（毎レンダー新オブジェクトだと HeroBlurSeq の
        effect が走り直して、パネルの無関係な操作でも登場が再生されてしまう） */
  const HE = mergeHeroEnter(heroEnter);
  const timing2: HeroTiming = useMemo(
    () => ({
      ...timing,
      kotoba: { ...timing.kotoba, blur: HE.blur, duration: HE.duration },
    }),
    [timing, HE.blur, HE.duration]
  );
  const kvRange = useExit ? E.range : kp.range;
  const exitT = (v: number) =>
    Math.pow(Math.min(1, Math.max(0, v / Math.max(1, E.range))), E.ease);
  /* 従来の折れ線（0 → a → 1 の3点を直線でつなぐ） */
  const pw = (v: number, mid: number, v0: number, v1: number, v2: number) => {
    const t = Math.min(1, Math.max(0, v / kvRange));
    return t < mid ? v0 + ((v1 - v0) * t) / mid : v1 + ((v2 - v1) * (t - mid)) / (1 - mid);
  };
  const heroBlur = useTransform(scrollY, (v) =>
    useExit ? E.blurMax * exitT(v) : pw(v, 0.45, 0, kp.blurMax * 0.35, kp.blurMax)
  );
  const heroOpacity = useTransform(scrollY, (v) => {
    if (!useExit) return pw(v, kp.fadeStart, 1, 0.55, 0);
    const fs = Math.min(0.95, Math.max(0.05, E.fadeStart / 100));
    const te = exitT(v);
    return te < fs ? 1 - 0.45 * (te / fs) : 0.55 * (1 - (te - fs) / (1 - fs));
  });
  const heroScale = useTransform(scrollY, (v) =>
    useExit
      ? 1 + (E.scaleTo / 100 - 1) * exitT(v)
      : pw(v, 0.5, kp.scale[0], (kp.scale[0] + kp.scale[1]) / 2, kp.scale[1])
  );
  const heroY = useTransform(scrollY, (v) =>
    useExit ? E.yTo * exitT(v) : pw(v, 0.5, kp.y[0], (kp.y[0] + kp.y[1]) / 2, kp.y[1])
  );
  const buttonY = useTransform(scrollY, [0, kvRange], [0, kp.buttonParallax ?? 0]);
  const heroFilter = useMotionTemplate`blur(${heroBlur}px)`;
  const heroPointer = useTransform(heroOpacity, (v) => (v < 0.06 ? "none" : "auto"));

  /* 背景写真：作字が消えていく流れに続いてブラーがかかっていく（spotTransition の ②）。
     ボケた時に端が透けないよう、ブラー量に応じて少しだけ拡大して補正 */
  const bgBlur = useTransform(
    scrollY,
    [0, T.bgFrom, T.bgTo],
    [0, T.bgBlur * 0.5, T.bgBlur]
  );

  /* 人物イラストは KV とメッセージまでは居続けて、
     ぼーっとスポットへ入れ替わる時に見送る（2026-08-21 ヒデさん指示。
     カンプ 15480:22896 でもメッセージ画面の右下に人物がいる） */
  /* グルメ（白背景の場面）に入ったらヘッダーを黒に（2026-08-22 ヒデさん依頼）。
     BGMスイッチは CSS 側（html[data-header-dark] の上書き）が拾う */
  const gourmetStart =
    (useExit ? msgEnd + (T.spotTo - T.spotFrom) : T.spotTo) + T.stepLen * 4;
  const [navDark, setNavDark] = useState(false);
  useEffect(
    () => () => {
      delete document.documentElement.dataset.headerDark;
    },
    []
  );
  useMotionValueEvent(scrollY, "change", (v) => {
    /* 人物はスポット写真の入れ替わりと「同時に」消える（2026-08-21 ヒデさん指示。
       時間差はつけない＝スポットのブラーが晴れる区間そのものでフェード） */
    const from = useExit ? msgEnd : kvRange * 0.4;
    const span = useExit ? Math.max(1, T.spotTo - T.spotFrom) : kvRange * 0.6;
    const t = Math.max(0, Math.min(1, (v - from) / span));
    window.dispatchEvent(
      new CustomEvent("abashiri:illust-fade", { detail: { v: 1 - t } })
    );
    const dark = v >= gourmetStart;
    setNavDark(dark);
    document.documentElement.dataset.headerDark = dark ? "1" : "0";
  });
  const bgFilter = useMotionTemplate`blur(${bgBlur}px)`;
  const bgZoom = kp.bgZoom ?? [1, 1];
  /* ブラー時に端が透けないよう、ズームに少し上乗せ（+0.08まで） */
  const bgScale = useTransform(
    scrollY,
    [0, T.bgFrom, T.bgTo],
    [
      bgZoom[0],
      bgZoom[0] + 0.04,
      Math.max(bgZoom[0], bgZoom[1]) + 0.08,
    ]
  );

  const viewport = { root: scrollerRef, once: true, amount: 0.2 } as const;

  /* 調整パネル用：プロモ内カモメをドラッグで動かす（%座標） */
  const dragPromoBird =
    (key: "promo1" | "promo2") => (e: React.PointerEvent) => {
      if (!birdsEditable || !onBirdMove) return;
      e.preventDefault();
      e.stopPropagation();
      const parent = (e.currentTarget as HTMLElement).parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const start = { px: e.clientX, py: e.clientY, x: birds[key].x, y: birds[key].y };
      const move = (ev: PointerEvent) => {
        onBirdMove(key, {
          x: Math.round((start.x + ((ev.clientX - start.px) / rect.width) * 100) * 10) / 10,
          y: Math.round((start.y + ((ev.clientY - start.py) / rect.height) * 100) * 10) / 10,
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

  /* ===== カード列：縦スクロールで来たら、No.4まで横に流れてから縦に戻る ===== */
  const rowsRef = useRef<(HTMLDivElement | null)[]>([]);
  const registerRow = useCallback((i: number, el: HTMLDivElement | null) => {
    rowsRef.current[i] = el;
  }, []);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;

    /* 3段階で切り替える：
       1) セットが中央付近に来たら縦を引き受けて、じわっと中央へ吸着
       2) 吸着後に少し「ゆとり」（350ms）
       3) 横送り開始。ホイール量は目標値へ貯めて、慣性で追いかける

       重要：端まで送り切ったら「完了方向」を記憶して、その方向の入力は
       セクションが画面から外れるまで素通しする（実位置が慣性で追いつく前に
       再ロックして無限ループになるバグの根本対策） */
    type Lock = {
      row: HTMLDivElement;
      target: number;
      engagedAt: number;
      done: false | "fwd" | "back";
    };
    let lock: Lock | null = null;
    let raf = 0;
    /* 縦スクロールも慣性化：目標値へなめらかに追いかける。
       ⚠️ scrollTop に小数を書き続けると、sticky のレイヤー（メッセージの文字など）が
       ピクセルの間で毎フレーム揺れて「上下にガタガタ」して見える（2026-08-23 ヒデさん指摘）。
       内部の計算は小数のまま posY に持ち、DOM へ書くときだけ整数に丸める */
    let targetY = sc.scrollTop;
    let posY = sc.scrollTop;

    const tick = () => {
      raf = 0;
      let busy = false;
      /* 縦の慣性 */
      const dy = targetY - posY;
      if (Math.abs(dy) > 0.5) {
        posY += dy * 0.12;
        sc.scrollTop = Math.round(posY);
        busy = true;
      } else if (dy !== 0) {
        posY = targetY;
        sc.scrollTop = Math.round(targetY);
      }
      /* カルーセルの横の慣性 */
      if (lock) {
        const cur = lock.row.scrollLeft;
        const diff = lock.target - cur;
        if (Math.abs(diff) > 0.5) {
          lock.row.scrollLeft = cur + diff * 0.13;
          busy = true;
        } else {
          lock.row.scrollLeft = lock.target; /* 終端で正確に止める */
        }
      }
      if (busy) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    /* アンカージャンプなど外部からのスクロールに目標値を同期 */
    const onScroll = () => {
      if (!raf) {
        targetY = sc.scrollTop;
        posY = sc.scrollTop;
      }
    };
    sc.addEventListener("scroll", onScroll, { passive: true });

    /* ナビ（ホーム・スポット・グルメ）のジャンプ先を受け取る。
       ここで targetY を差し替えれば、いつもの慣性でなめらかに移動する
       （2026-08-23 ヒデさん指摘：自前ループとの取り合いでナビが効かないことがあった） */
    const onJump = (e: Event) => {
      const y = (e as CustomEvent<{ y: number }>).detail?.y;
      if (typeof y !== "number") return;
      lock = null; /* カルーセルの横送りロックも解除してから飛ぶ */
      targetY = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, y));
      kick();
    };
    window.addEventListener("abashiri:scroll-to", onJump);

    const onWheel = (e: WheelEvent) => {
      /* トラックパッドの横ジェスチャはネイティブの横スクロールに任せる */
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const scRect = sc.getBoundingClientRect();
      if (scRect.height < 10) return; /* 非表示中など計測不能時は素通し */
      const scale = scRect.height / sc.clientHeight;
      const viewCenter = scRect.top + scRect.height / 2;

      /* 中央帯にいるセクションのカード列を探す */
      let row: HTMLDivElement | null = null;
      let dist = 0;
      for (const r of rowsRef.current) {
        if (!r) continue;
        const sec = r.closest("section");
        if (!sec) continue;
        const sr = sec.getBoundingClientRect();
        const d = sr.top + sr.height / 2 - viewCenter;
        if (Math.abs(d) <= scRect.height * 0.16) {
          row = r;
          dist = d;
          break;
        }
      }

      /* KV→メッセージ区間はスクロール速度の倍率をかける（パネル「スクロール速度」） */
      const g = wheelGainRef.current;
      const dY = targetY < g.until ? e.deltaY * g.gain : e.deltaY;

      /* 帯の外に出たらロック解除して、縦は慣性スクロール */
      if (!row) {
        lock = null;
        e.preventDefault();
        targetY = Math.max(
          0,
          Math.min(sc.scrollHeight - sc.clientHeight, targetY + dY)
        );
        kick();
        return;
      }
      if (!lock || lock.row !== row) {
        lock = {
          row,
          target: row.scrollLeft,
          /* すでに中央付近ならゆとり待ちをスキップ */
          engagedAt:
            Math.abs(dist) < scRect.height * 0.05 ? 0 : performance.now(),
          done: false,
        };
      }

      const max = row.scrollWidth - row.clientWidth;
      if (max <= 0) return;
      const down = e.deltaY > 0;

      /* 完了方向へのさらなる入力は縦の慣性スクロールへ */
      if ((lock.done === "fwd" && down) || (lock.done === "back" && !down)) {
        e.preventDefault();
        targetY = Math.max(
          0,
          Math.min(sc.scrollHeight - sc.clientHeight, targetY + dY)
        );
        kick();
        return;
      }
      /* 逆方向の入力が来たら完了状態を解除（巻き戻しできる） */
      if (lock.done) lock.done = false;

      e.preventDefault();

      /* 1) 中央へじわっと吸着。
         「今の位置＋ズレ」＝センターに合う絶対位置を目標にする。
         毎回同じ値に収束するので、足し込みすぎによるガタつきが起きない */
      if (Math.abs(dist) > 3) {
        const desiredY = sc.scrollTop + dist / scale;
        targetY = Math.max(
          0,
          Math.min(sc.scrollHeight - sc.clientHeight, desiredY)
        );
        kick();
      }

      /* 2) 吸着が済んで少し間が空いてから 3) 横送り */
      const settled =
        performance.now() - lock.engagedAt > 350 &&
        Math.abs(dist) < scRect.height * 0.05;
      if (settled) {
        lock.target = Math.max(0, Math.min(max, lock.target + e.deltaY));
        kick();
        /* 端まで送り切ったら完了方向を記憶 */
        if (down && lock.target >= max - 0.5) lock.done = "fwd";
        if (!down && lock.target <= 0.5) lock.done = "back";
      }
    };
    sc.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      sc.removeEventListener("wheel", onWheel);
      sc.removeEventListener("scroll", onScroll);
      window.removeEventListener("abashiri:scroll-to", onJump);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const L = mergeLayout(layout);

  return (
    <div
      /* v1.1: タブレットのモック枠をやめて画面いっぱいに。
         白ベゼル30px・角丸60px・浮遊シャドウはカンプ 15071:24641 から無くなった */
      className="absolute inset-0"
    >
      <div
        ref={scrollerRef}
        /* data-abashiri-scroller: ヘッダーの「ホーム」がここを探して一番上へ戻す。
           このページは window ではなくこの箱の中がスクロールするので、
           普通の「/」リンクでは何も起きない */
        data-abashiri-scroller=""
        /* ナビの「グルメ」が飛ぶ先（スクロール量）。グルメは5場面目なので
           spotTo + 1枚あたりのスクロール量 × 写真4枚ぶん */
        /* ナビの「ぼーっとスポット」が飛ぶ先＝1枚目のブラーが晴れきる位置 */
        data-spot-at={Math.round(useExit ? msgEnd + (T.spotTo - T.spotFrom) : T.spotTo)}
        data-gourmet-at={Math.round(
          (useExit ? msgEnd + (T.spotTo - T.spotFrom) : T.spotTo) + T.stepLen * 4 + 1
        )}
        className="no-scrollbar h-full w-full overflow-y-auto overflow-x-clip overscroll-contain bg-sky-bottom [container-type:inline-size]"
      >
        {/* 固定背景（灯台の写真）：中身だけがその上をスクロールする。
            パターンによってはスクロールに合わせてゆっくりズーム。
            下地を写真上端と同じ空色にして、角や継ぎ目が出ないようにする */}
        <div className="pointer-events-none sticky top-0 h-[982px] w-full overflow-hidden bg-brand">
          {/* Figmaのトリミング・色加工を焼き込み、角丸の縁を切り落とした四角い書き出し画像。
              角丸はCSS側だけで付けるので、継ぎ目やズレが出ない */}
          <motion.img
            src="/img/bg-hero.jpg"
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            className="h-full w-full object-cover"
            style={{ scale: bgScale, filter: bgFilter }}
          />
        </div>

        {/* キービジュアル：画面中央に固定されたまま、ブラーで登場 →
            スクロールでその場から奥へ引いて消える */}
        <div className="pointer-events-none sticky top-0 -mt-[982px] h-[982px]">
          <motion.div
            className="flex h-full flex-col items-center pt-[150px]"
            initial={
              animated
                ? { opacity: 1 } /* 手書き/紙芝居アニメ時は書く動き自体が登場演出 */
                : {
                    opacity: 0,
                    filter: `blur(${ip.heroBlur}px)`,
                    y: ip.heroY,
                    scale: ip.heroScale,
                  }
            }
            animate={{ opacity: 1, filter: "blur(0px)", y: 0, scale: 1 }}
            transition={{ duration: ip.heroDur, ease: ip.ease, delay: ip.heroDelay }}
          >
            <motion.div
              className="flex flex-col items-center gap-8"
              style={{
                filter: heroFilter,
                opacity: heroOpacity,
                scale: heroScale,
                y: heroY,
                pointerEvents: heroPointer,
              }}
            >
              {/* v1.2 カンプ 15332:21660（更新版）の実測
                    作字ブロック Frame1000007277 … 415 x 379
                    作字 Group1137              … (0.22, 37.47) 414.56 x 341.34
                    網走市観光サイト Group1143   … (215.73, 8.34) 188.16 x 36.28
                    ボタンとの間                … gap 32px（ボタンは上から411px）
                  ⚠️ 書き出し済みの hero-message.svg は 471x390 で、絵の外側に
                     左右28.22 / 上下24.33 の余白を持っている。
                     そのぶん左上へずらして、絵がカンプの座標に来るようにしている
                     （SVGを作り直すと blurSeq のグループ構造に依存した演出が壊れるため、
                      SVGはそのままで置き方だけ合わせる） */}
              <div className="relative h-[379px] w-[415px]">
              <img
                src="/img/text-kanko-site.svg"
                alt="網走市観光サイト"
                /* 出るタイミングは吹き出しと同じ（duration 900ms / blur 16px も揃えてある） */
                className="absolute left-[215.7px] top-[8.3px] h-[36.3px] w-[188.2px] transition-all ease-standard"
                style={{
                  transitionDuration: `${HE.duration}ms`,
                  opacity: animated && !kankoIn ? 0 : 1,
                  /* 出たあとはフィルターを外す（blur(0px)残しはにじみの元） */
                  filter: animated && !kankoIn ? `blur(${HE.blur}px)` : "none",
                }}
              />
              <div className="absolute left-[-28px] top-[13.1px]">
              {blurSeq ? (
                <HeroBlurSeq
                  timing={timing2}
                  instant={fastIntro}
                  gate={waitConsent}
                  bubbleAnim={bubbleAnim}
                  bubbleTune={bubbleTune}
                  tamaGap={HE.tamaGap}
                  onScheduled={handleScheduled}
                />
              ) : combo ? (
                <HeroCombo
                  pace={writePace}
                  timing={timing}
                  onScheduled={handleScheduled}
                />
              ) : kami ? (
                <HeroKamishibai
                  variant={kami}
                  pace={writePace}
                  timing={timing}
                  onScheduled={handleScheduled}
                />
              ) : write ? (
                <HeroWriting
                  pace={writePace}
                  timing={timing}
                  onScheduled={handleScheduled}
                />
              ) : (
                <img
                  src="/img/hero-message.svg"
                  alt="な〜んにもない たまらない"
                  className="h-[390px] w-[471px]"
                />
              )}
              </div>
              </div>
              <motion.div style={{ y: buttonY }}>
                {/* 手書きが終わったあと、ブラーがふわっと晴れて出てくる */}
                <motion.div
                  initial={
                    animated
                      ? { opacity: 0, filter: `blur(${timing.button.blur}px)`, y: 10 }
                      : false
                  }
                  animate={buttonIn ? { opacity: 1, filter: "blur(0px)", y: 0 } : undefined}
                  transition={{
                    duration: timing.button.duration / 1000,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* v1.2 カンプ 15071:24707（4倍で書き出して実測）
                      枠 … 1px・白40%（地 rgb86 に対して枠 rgb154 → (154-86)/169 = 0.40）
                      地 … 白10%（外 rgb68 に対して rgb86 ＝ 68+187*0.1）・backdrop-blur 65px
                      文字は Noto Sans JP Medium 16px 白・行間 1.2・左右44px/上下16px
                      枠は v1.1 では 2px と読んでいたが、更新版のカンプでは 1px。
                      border ではなく内側のリングにしているのは、border だと枠のぶん
                      ボタンが 218x53.2 に太り、カンプの 216x51 とずれるため */}
                  <Link
                    href="/experience"
                    onClick={onGoExperience}
                    className="flex items-center justify-center rounded-full bg-white/10 px-11 py-4 text-body-16 font-medium leading-[1.2] text-white ring-1 ring-inset ring-white/40 backdrop-blur-65 transition-transform hover:scale-105"
                  >
                    ぼーっとしてみる
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* ぼーっとスポット。KV がブラーで奥へ引くのと入れ替わりに写真が合ってきて、
            1スクロールごとに4枚が切り替わる。5場面目はグルメが
            「場面ごとブラーで」現れる（下スクロールでは送らない。2026-08-22） */}
        {/* メッセージ（本番トップのみ）。ブラーの背景の上にカンプ 15480:22896 の文章 */}
        {useExit && (
          <MessageSection scrollY={scrollY} start={msgStart} tune={msgTune} />
        )}

        <SpotShowcase
          scrollY={scrollY}
          /* メッセージを読み終えたぶんだけ、スポットの登場をうしろへずらす */
          tune={
            useExit
              ? {
                  ...T,
                  spotFrom: msgEnd,
                  spotTo: msgEnd + (T.spotTo - T.spotFrom),
                }
              : spotTune ?? undefined
          }
          finale={<GourmetSection />}
        />

        {/* v1.1 の プロモ／旧グルメ／体験・イベント は撤去済み。
            旧部品（Card / CardRow 等）はこのファイル上部に残っている。
            グルメは v1.2 で GourmetSection として新設した */}
      </div>

      {/* 体験ページへのディゾルブの幕。後ろの画面をブラーで溶かしながら
          青グラデ（体験ページの下地と同じ）でふんわり覆う */}
      {leaving && (
        <motion.div
          data-dissolve-veil
          /* ブラーは固定（backdrop-blur-[22px]）。透明度だけをアニメする。
             以前は blur を 0→22px と毎フレーム変えていて、それ自体が最も重い処理だった。
             背景は上の useEffect で静止させてあるので、固定ブラーは一度だけ合成され軽い */
          className="absolute inset-0 z-40 bg-gradient-to-b from-brand via-brand/70 to-sky-bottom backdrop-blur-[22px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      {/* 追従ヘッダー：スクロールの外に置いて常に表示 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
        <motion.div
          className="pointer-events-auto"
          initial={{ opacity: 0, filter: `blur(${ip.headerBlur}px)`, y: ip.headerY }}
          animate={go ? { opacity: 1, filter: "blur(0px)", y: 0 } : undefined}
          transition={{
            duration: ip.headerDur,
            ease: ip.ease,
            /* 演出ありの時は、まず景色を見せてから */
            delay: animated ? (timing.start + timing.header.extraDelay) / 1000 : 0,
          }}
        >
          <GlobalNav theme={navDark ? "dark" : "light"} />
        </motion.div>
      </div>

      {/* サウンドON/OFFの置き場：SoundUi がここへ描画する（白モック内の左上） */}
      <div
        id="abashiri-sound-slot"
        /* カンプ x=34。ヘッダーの文字行（top32・高さ19px）と上下中央ぞろえ
           （2026-08-22 ヒデさん指示。ナビは帯ではなく素の文字なので、その実寸に合わせる） */
        className="absolute left-[34px] top-[32px] z-40 flex h-[19px] items-center"
      />
    </div>
  );
}
