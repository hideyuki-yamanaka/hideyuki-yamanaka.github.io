"use client";

/*
 * トップページに常時出しておく調整パネル（ヒデさん指示 2026-08-18）
 *
 * ・仕様は settings/tune-panel/README.md の共通部品（public/tune-panel.js。原本 settings/tune-panel/tune-panel.js から scripts/sync-tune-panel.mjs が自動で写す・写しは直接直さない・2026-10-20 から v2.3.2）に準拠
 *   隠しモード（右下の透明な四角で出す）・タブ→カテゴリのカード・値は案ごと×PC/スマホごと・自動保存
 *
 * カテゴリの並びは「ページ ＞ セクション ＞ 細目」の3階層（2026-08-21 ヒデさん指示。
 * AnyFlow のパネルと同じ考え方。全部を並列に並べない。全文は settings/tune-panel/README.md）
 *
 * 反映のしかたを2つに分けている
 *   ① 位置・大きさ … globals.css の --illust-* を直接書き換える（React を通さないので
 *      ドラッグ中もカクつかない）
 *   ② 案の切り替え・スクロール連動の値 … 手が止まってから React 側へ渡す（onSettle）
 *
 * ⚠公開前にこのパネルは外すこと（本番の見た目に出てしまうため）
 */
import { useEffect, useRef } from "react";
import { DEFAULT_BO } from "./boPatterns";
import { DEFAULT_SPOT_TRANSITION, type SpotTransition } from "./spotTransition";
import {
  BGM_VOLUME_EVENT,
  BGM_VOLUME_UI_EVENT,
  DEFAULT_BGM_VOLUME,
} from "./bgmConfig";
import { DEFAULT_FACE, type FaceConfig } from "./faceConfig";
import { DEFAULT_KV_EXIT, type KvExit } from "./kvExitConfig";
import { DEFAULT_HERO_ENTER, type HeroEnter } from "./heroEnterConfig";
import { DEFAULT_MSG, MSG_PATTERNS, type MsgTune } from "./msgConfig";
import {
  EVENT_LAYOUT_EVENT,
  EVENT_LAYOUT_PATTERNS,
  EVENT_TAIL_EVENT,
  DEFAULT_EVENT_TAIL,
} from "./EventSection";
import {
  CARD_RATIOS,
  DEFAULT_CARD_RATIO,
  EVENT_RATIO_EVENT,
} from "./EventVariants5";
import {
  PT_DEFAULT,
} from "./PageTransition";
import { EV_FLOWS } from "./eventParts";
import { SOUND_DLG_DEFAULT, SOUND_DLG_PREVIEW_EVENT, SOUND_DLG_SHOWN_EVENT, SOUND_DLG_VARIANTS } from "./soundDialogConfig";
import { TOP_TUNE_KEY, TOP_TUNE_VERSION } from "./tuneKeys";
import { attachPhoneMode } from "./phoneMode";
import { PHOTO_SET_DEFAULT } from "./PhotoSetSwitch";
import { RETOUCH_ALL_DEFAULT, RETOUCH_ITEMS, RETOUCH_TARGETS, type RetouchAll, type RetouchKey } from "./PhotoRetouch";

/* 写真のレタッチの10項目のつまみを作る（2026-10-21 ヒデさん「調整パネルにある写真の調整は、同じ10項目を入れて」・RULES 6-18）。
   keys が2つ以上の時は、上の「写真」のボタンで選んだ写真のつまみだけを出す（6-14） */
function retouchItems(keys: RetouchKey[]) {
  const out: Record<string, unknown>[] = [];
  for (const group of ["明るさ", "色"] as const) {
    out.push({ sub: group, deep: true });
    for (const key of keys) {
      for (const it of RETOUCH_ITEMS.filter((i) => i.group === group)) {
        out.push({
          slider: it.name,
          path: `retouch.${key}.${it.key}`,
          min: it.min,
          max: it.max,
          step: it.step,
          ...(it.unit ? { unit: it.unit } : {}),
          signed: true,
          hint: it.hint,
          ...(keys.length > 1 ? { when: (p: { retouchPick?: string }) => p.retouchPick === key } : {}),
        });
      }
    }
  }
  return out;
}
import { DEFAULT_INTRO_PACE, type IntroPace } from "./ExperienceFlow";
import { DEFAULT_ENTER_TUNE, type EnterTune } from "./enterPatterns";

export type TopTuneValues = {
  boPattern: number;
  illustEnter: number;
  /** 1〜5: バウンスの動き（ホバー・ループ共通） */
  bouncePattern: number;
  /** バウンスの強さ%（100が基準） */
  bounceStrength: number;
  /** ボタンが出てから人物が出るまでのディレイ(秒) */
  illustDelay: number;
  /** 周期ループ：間隔・見せる長さ(秒)・swayFirst=横揺れしてからバウンス */
  loop: { cycle: number; show: number; swayFirst: boolean };
  /** 1〜5: たまらねーの出方（tamaraneePatterns.ts） */
  tamaranee: number;
  /** 初回の「たまらねー」お披露目（ms） */
  tamaIntro: { delay: number; hold: number };
  /** パネルの確認用スイッチ */
  preview: { faceOn: boolean; patchRed: boolean };
  face: FaceConfig;
  spot: SpotTransition;
  /** 作字の消え方（kvExitConfig.ts） */
  kvExit: KvExit;
  /** 作字の登場のしかた（heroEnterConfig.ts） */
  hero: HeroEnter;
  /** メッセージセクション（msgConfig.ts） */
  msg: MsgTune;
  /** 体験ページの導入メッセージの出方（ExperienceFlow.ts の IntroPace） */
  expIntro: IntroPace;
  /** 体験ページ・場所えらびカルーセルの登場（1〜5） */
  expPick: { pattern: number };
  /** KV→メッセージ区間のスクロール速度（%）。100=標準（2026-08-23 ヒデさん依頼） */
  scrollSpd: { kvToMsg: number };
  /** ヘッダーのアンカーで飛ぶ時の演出（2026-09-16 ヒデさん依頼） */
  nav: { inMs: number; outMs: number };
  /** 各セクションの大見出しの大きさ（2026-09-16 ヒデさん「基本的に共通に」） */
  secHead: number;
  /** ぼーっとTips（動画再生ページのモーダル）のタイミング（2026-08-23 ヒデさん依頼） */
  tips: { delay: number; fade: number; pattern: number };
  /** 動画の音量：徐々に大きくするか（2026-08-23 ヒデさん依頼） */
  videoVol: { fadeIn: boolean; fadeSec: number; uiHideSec: number };
  /** 「この場所にする」→動画再生画面への遷移（enterPatterns.ts の EnterTune） */
  expEnter: EnterTune;
};

/* 位置・大きさ（px）。既定値は globals.css の :root と必ずそろえる */
const POS_DEFAULTS = {
  frameRight: 57,
  frameTop: 750,
  personX: 0,
  personY: 14,
  personW: 162,
  tamaraneeX: 107,
  tamaraneeY: -10,
  tamaraneeW: 75,
  boX: 135,
  boY: 8,
  boW: 62,
  sparkleX: 4,
  sparkleY: 53,
  sparkleW: 18,
  sparkle2Dx: -5,
  sparkle2Dy: -5,
  birdTopSky1X: -20,
  birdTopSky1Y: 16,
  birdTopSky2X: 50,
  birdTopSky2Y: 535,
  birdTopSky1W: 64,
  birdTopSky1Rot: -14,
  birdTopSky2W: 105,
  birdTopSky2Rot: 0,
  birdExpSky1X: -20,
  birdExpSky1Y: 16,
  birdExpSky2X: 50,
  birdExpSky2Y: 64, /* カルーセルにかぶらない高い位置（2026-08-23 ヒデさん指示） */
  birdExpSky2W: 105,
  birdExpSky2Rot: 0,
  birdExpX: 150,
  birdExpY: 180, /* 右のカモメと高低差をつけた低め位置（カード上端にかぶらない） */
  birdExpW: 84,
  birdExpRot: -8,
};

/* params のキー → CSS 変数名 */
const VAR_OF: Record<keyof typeof POS_DEFAULTS, string> = {
  frameRight: "--illust-frame-right",
  frameTop: "--illust-frame-top",
  personX: "--illust-person-x",
  personY: "--illust-person-y",
  personW: "--illust-person-w",
  tamaraneeX: "--illust-tamaranee-x",
  tamaraneeY: "--illust-tamaranee-y",
  tamaraneeW: "--illust-tamaranee-w",
  boX: "--illust-bo-x",
  boY: "--illust-bo-y",
  boW: "--illust-bo-w",
  sparkleX: "--illust-sparkle-x",
  sparkleY: "--illust-sparkle-y",
  sparkleW: "--illust-sparkle-w",
  sparkle2Dx: "--illust-sparkle2-dx",
  sparkle2Dy: "--illust-sparkle2-dy",
  birdTopSky1X: "--bird-sky1-x-top",
  birdTopSky1Y: "--bird-sky1-y-top",
  birdTopSky2X: "--bird-sky2-x-top",
  birdTopSky2Y: "--bird-sky2-y-top",
  birdTopSky1W: "--bird-sky1-w-top",
  birdTopSky1Rot: "--bird-sky1-rot-top",
  birdTopSky2W: "--bird-sky2-w-top",
  birdTopSky2Rot: "--bird-sky2-rot-top",
  birdExpSky1X: "--bird-sky1-x-exp",
  birdExpSky1Y: "--bird-sky1-y-exp",
  birdExpSky2X: "--bird-sky2-x-exp",
  birdExpSky2Y: "--bird-sky2-y-exp",
  birdExpSky2W: "--bird-sky2-w-exp",
  birdExpSky2Rot: "--bird-sky2-rot-exp",
  birdExpX: "--bird-exp-x",
  birdExpY: "--bird-exp-y",
  birdExpW: "--bird-exp-w",
  birdExpRot: "--bird-exp-rotate",
};

type Params = {
  pos: typeof POS_DEFAULTS;
  anim: { boPattern: number; illustEnter: number; tamaranee: number; bouncePattern: number; bounceStrength: number; illustDelay: number };
  intro: { delay: number; hold: number };
  preview: { faceOn: boolean; patchRed: boolean };
  sound: { volume: number; dialog: number; dlgGap: number; dlgBlur: number };
  /** 写真の組 1＝新しい（調整済み・既定）／0＝前の写真（PhotoSetSwitch・2026-10-20） */
  photos: { set: number };
  /** 写真のレタッチ（PhotoRetouch・2026-10-21）。写真ごとに10項目（露光量は EV、ほかは −100〜+100・0＝そのまま） */
  retouch: RetouchAll;
  /** ぼーっとスポットのレタッチで、いまつまみを出している写真 */
  retouchPick: string;
  bird: { opacity: number; color: string; stroke: number };
  face: FaceConfig;
  sparkle: { period: number };
  spot: SpotTransition;
  kvExit: KvExit;
  hero: HeroEnter;
  msg: MsgTune;
  /** gap＝見出し→カルーセルの間(px)。カンプは140 */
  gourmet: { speed: number; pauseOnHover: boolean; gap: number };
  /** 体験セクション（グルメの下）のレイアウト案 1〜10 */
  /** shufDur/shufPow：案31（カードを切る）の秒数とメリハリ */
  /** mqSize/mqDur：案31 の後ろを流れる文字の大きさ(px)・1周の秒数。shufCard：カードの大きさ(%) */
  events: { pattern: number; tailPad: number; cardRatio: number; flow: number; shufDur: number; shufPow: number; mqSize: number; mqDur: number; shufCard: number };
  /** ページ遷移の演出 1〜5 */
  /** dur/blur/peak は案7（じんわり溶ける）だけの長さ(ms)・ぼかし(px)・白の濃さ(%) */
  pageTrans: { pattern: number; dur: number; blur: number; peak: number };
  /** 全ページ共通フッターのデザイン 1〜5 */
  footer: {
    padX: number;
    padBottom: number;
    colGap: number;
    mapGapX: number;
    mapGapY: number;
    headGap: number;
    itemGap: number;
    logoH: number;
    mapOffsetY: number;
    stageH: number;
    fadeH: number;
    fadeSolid: number;
    evPadBottom: number;
    /** フッターの上のパディング（グラデの下〜中身の上端・px） */
    padTop: number;
    /** 白→写真のグラデのパターン 1〜5（SiteFooter の FADE_CURVES の番号・2026-10-20） */
    fadeCurve: number;
    /** 上のセクション（トップの体験）の下へ写真を重ねる長さ（px・セクションの下端から上へ） */
    overlap: number;
    /** 写真の明るさの案 0〜3（SiteFooter の PHOTO_TONES・2026-10-20）／写真の明るさ%／下からの影の濃さ%／光を重ねる強さ% */
    tone: number;
    bright: number;
    /** 写真の彩度（%・100 がそのまま） */
    sat: number;
    shade: number;
    /** 影が下から写真のどこまでかかるか（%） */
    shadeH: number;
    light: number;
  };
  expIntro: IntroPace;
  expPick: { pattern: number };
  loop: { cycle: number; show: number; swayFirst: boolean };
  scrollSpd: { kvToMsg: number };
  nav: { inMs: number; outMs: number };
  /** 各セクションの大見出しの大きさ（2026-09-16） */
  secHead: number;
  tips: { delay: number; fade: number; pattern: number };
  videoVol: { fadeIn: boolean; fadeSec: number; uiHideSec: number };
  /** 「この場所にする」→動画再生画面への遷移（enterPatterns.ts の EnterTune） */
  expEnter: EnterTune;
};

/* tune-panel.js（依存ゼロの素のJS）の必要なところだけの型 */
type TunePanelLib = {
  create: (cfg: Record<string, unknown>) => { destroy: () => void };
};
declare global {
  interface Window {
    TunePanel?: TunePanelLib;
  }
}

export default function TopTunePanel({
  onSettleValues,
  onReplay,
}: {
  /** 手が止まった時に、案の切り替えとスクロール連動の値を渡す */
  onSettleValues: (v: TopTuneValues) => void;
  /** 登場アニメに関わる値が変わって手が止まった時（Anyflow同様、その場で再生し直す用）。
      どの値を触ったかを path で渡す（ページ側で再生位置を変えるのに使う） */
  onReplay?: (path?: string) => void;
}) {
  const madeRef = useRef(false);

  useEffect(() => {
    if (madeRef.current) return;

    const DEFAULTS: Params = {
      pos: { ...POS_DEFAULTS },
      anim: { boPattern: DEFAULT_BO, illustEnter: 3, tamaranee: 1, bouncePattern: 1, bounceStrength: 100, illustDelay: 0.5 },
      intro: { delay: 350, hold: 3000 },
      preview: { faceOn: false, patchRed: false },
      /* 音量は % で持つ（スライダーが扱いやすいので）。0〜100 = 0〜1 */
      sound: { volume: Math.round(DEFAULT_BGM_VOLUME * 100), dialog: SOUND_DLG_DEFAULT /* 2026-10-28 最初の確認の窓の案（soundDialogConfig.ts）。同日「案2 言葉だけでいきましょう」で既定は案2 */, dlgGap: 0, dlgBlur: 40 /* 案2 の1行目と2行目のギャップ(px)・背景のブラー(px)。同日「ブラーをもうちょっときつく」で 22→40🟡 */ },
      photos: { set: PHOTO_SET_DEFAULT },
      retouch: structuredClone(RETOUCH_ALL_DEFAULT),
      retouchPick: "notoro",
      /* カモメ共通の不透明度(%)。全ページのカモメに効く */
      bird: { opacity: 100, color: "#ffffff", stroke: 100 },
      face: { ...DEFAULT_FACE },
      /* キラキラの切替周期（秒）。CSS 変数へは applyVars とは別に書く */
      sparkle: { period: 1.2 },
      spot: { ...DEFAULT_SPOT_TRANSITION },
      kvExit: { ...DEFAULT_KV_EXIT },
      hero: { ...DEFAULT_HERO_ENTER },
      msg: { ...DEFAULT_MSG },
      /* グルメのカルーセル。1周40秒は🟡仮置きのまま既定に */
      /* gap：【2026-09-26 ヒデさん指示】「グルメの上のテキスト群と下のカルーセルの間を詰めて、
              コンテンツを中央に寄せて。上下に余白ができる感じ」→ カンプの 140px から詰める。
              🟡仮置き 80px（詰める量はカンプに無いので、調整パネル「グルメの余白」で決める） */
      gourmet: { speed: 40, pauseOnHover: false /* 2026-10-14 ヒデさん「ホバーしてもカルーセルの移動は止まらないように」 */, gap: 80 },
      events: { pattern: 31 /* 2026-10-14 ヒデさん「案2をデフォルトに」（パネルの表示は案2・値は31） */, tailPad: DEFAULT_EVENT_TAIL, cardRatio: DEFAULT_CARD_RATIO, flow: 3 /* 2026-09-26 1回スクロール＝1枚。流れ方は物理の3案。ヒデさん「3番目でデフォルトに」→ 案3 角を押されて回る */, shufDur: 1.0, shufPow: 3 /* 2026-09-26 案31 カードを切る：ヒデさん「ゆったりすぎ・シャッと、でも急じゃなく」→ 1.0秒・メリハリ3（🟡仮置き） */, mqSize: 80, mqDur: 34, shufCard: 100 /* 同日 ヒデさん「後ろのテキストのサイズ・速度、カードのサイズも変えられるように」。既定はカンプ値(80px)・これまでの速さ(34秒)・等倍 */ } /* 2026-09-24: 見終わるまでが長いので 38→62（一定速度なのは変えない） */, /* 案10は削除したので案1。tailPad は既定0（2026-09-16） */
      /* ページ遷移の演出。2026-09-26 ヒデさん「全部統一・ほんの気持ちだけじんわり溶ける印象に」
         → 案7「じんわり溶ける」を既定に（それまでは案6「ディゾルブ」）。
         ⚠️ 値の住み家：ここ／PageTransition の PT_DEFAULT／tune-defaults.json */
      pageTrans: { pattern: 7, dur: PT_DEFAULT.dur, blur: PT_DEFAULT.blur, peak: PT_DEFAULT.peak },
      /* フッター（階層＝A罫線／組み＝Aゆったり2カラム）。
         余白・間隔の既定は globals.css の --ft-* と同じ値にそろえる */
      footer: {
        padX: 160,
        padBottom: 112, /* 2026-09-27 4-7 で 110→112（globals.css の --ft-pad-bottom・tune-defaults.json と同じ値） */
        colGap: 140,
        mapGapX: 40,
        mapGapY: 48,
        headGap: 16,
        itemGap: 10,
        logoH: 260,
        mapOffsetY: 0,
        stageH: 120,
        /* 2026-10-20 ヒデさん「案3をベースに、グラデーションの徐々にかかっていく感じを5パターン。ほかの案は削除してOK」
           → フッターは案3「ふつうのフッター」の作りだけ。ここの値＝グラデのパターン1「長く、なめらかに」の値
           （ほかのパターンの値は、パネルのグラデのピルの values に持たせた・FADE_VALUES） */
        fadeH: 64, /* 🟡 16→24→48→64（「徐々にかかっていく感じ」→ 画面の64%かけて溶かす。頭は重ねる長さで上へ伸ばした） */
        fadeSolid: 0,
        evPadBottom: 96, /* 🟡 同日「体験セクションの下に少しパディングを設けて、グラデーションの助走エリアを」 */
        padTop: 64, /* 🟡仮置き：グラデの下から中身までの写真の見え幅 */
        fadeCurve: 1, /* 🟡 パターン1「長く、なめらかに」 */
        overlap: 400, /* 🟡 240→400：写真を体験の下へ400px重ねる＝グラデの始まりがカードの下あたり（流れる文字より下） */
        /* 写真の明るさ（2026-10-20 ヒデさん「後ろの写真がすごく暗く見える。3案」→ 同日 パネルで調整して「これで変えてほしい」）。
           案1「写真を明るく」：明るさ120%・影なし・影の高さ40%🟡（彩度は同日足したつまみ・100%＝そのまま） */
        tone: 1,
        bright: 100, /* 2026-10-21 写真そのものの色を元の写真に合わせた（フィルター加工はしない・ヒデさん）ので 120→76→100 */
        sat: 100,
        shade: 0,
        shadeH: 40,
        light: 0,
      },
      expIntro: { ...DEFAULT_INTRO_PACE },
      expPick: { pattern: 3 }, /* 2026-10-21 案3 で固めた（調整パネルから外した） */
      scrollSpd: { kvToMsg: 100 },
      nav: { inMs: 420, outMs: 620 },
      secHead: 36,
      tips: { delay: 5, fade: 1.2, pattern: 5 }, /* 出現は案5「下からゆっくり」で確定 */
      videoVol: { fadeIn: true, fadeSec: 3, uiHideSec: 2 },
      expEnter: { ...DEFAULT_ENTER_TUNE },
      /* 周期ループ（たまらねー＋バウンス）。15秒おき・2.6秒見せるが既定 */
      loop: { cycle: 10, show: 2.6, swayFirst: false },
    };
    const params: Params = structuredClone(DEFAULTS);

    /* ① 位置・大きさは CSS 変数へ直書き */
    const applyVars = () => {
      const root = document.documentElement;
      /* グルメのカルーセル：1周の秒数とホバー停止（その場で反映） */
      root.style.setProperty("--gourmet-speed", `${params.gourmet.speed}s`);
      root.style.setProperty("--gourmet-gap", `${params.gourmet.gap}px`);
      root.dataset.gourmetPause = params.gourmet.pauseOnHover ? "1" : "0";
      for (const k of Object.keys(VAR_OF) as (keyof typeof POS_DEFAULTS)[]) {
        /* Rot で終わるキーだけ単位が deg（カモメの傾きなど） */
        const unit = k.endsWith("Rot") ? "deg" : "px";
        root.style.setProperty(VAR_OF[k], `${params.pos[k]}${unit}`);
      }
      root.style.setProperty("--illust-sparkle-period", `${params.sparkle.period}s`);
      root.style.setProperty("--bird-opacity", String(params.bird.opacity / 100));
      root.style.setProperty("--bird-color", params.bird.color);
      root.style.setProperty("--bird-stroke", String(params.bird.stroke / 100));
      /* フッターの余白・間隔・グラデ・写真は 2026-10-21 に固定した（調整パネルから外した）。値は globals.css の --ft-* だけ。
         ここで書き込むと、ブラウザに残った古い保存値でフッターが変わってしまうので、もう書かない */
      /* 重ね写真の流れ方（1〜3）。eventParts.tsx の EV_FLOWS の番号 */
      root.style.setProperty("--ev-flow", String(params.events.flow ?? 1));
      /* 案31（カードを切る）の秒数とメリハリ。EventVariants4 の ShuffleCard が読む */
      /* --ev-shuf-dur（切る速さ）は 2026-10-21 に固めた：globals.css で PC 1.0秒／スマホ 0.6秒。ここからは書かない */
      root.style.setProperty("--ev-shuf-pow", String(params.events.shufPow ?? 3));
      root.style.setProperty("--ev-mq-size", `${params.events.mqSize ?? 80}px`);
      root.style.setProperty("--ev-mq-dur", `${params.events.mqDur ?? 34}s`);
      root.style.setProperty("--ev-shuf-card", String((params.events.shufCard ?? 100) / 100));
      /* ヘッダーのアンカー移動（単位なしの数。TopPage が ms として読む） */
      root.style.setProperty("--nav-in", String(params.nav.inMs));
      root.style.setProperty("--nav-out", String(params.nav.outMs));
      root.style.setProperty("--sec-head", `${params.secHead}px`);
      /* 最初の確認の窓の案（0＝現行・1〜3）。SoundUi の useSoundDlg が読む（2026-10-28） */
      root.style.setProperty("--sound-dlg", String(params.sound.dialog ?? SOUND_DLG_DEFAULT));
      root.style.setProperty("--sound-msg-gap", `${params.sound.dlgGap ?? 0}px`);
      root.style.setProperty("--sound-dlg-blur", `${params.sound.dlgBlur ?? 40}px`);
      /* 写真の組（PhotoSetSwitch が <html data-photo-set> を見張って差し替える） */
      root.dataset.photoSet = (params.photos?.set ?? PHOTO_SET_DEFAULT) === 0 ? "prev" : "new";
      /* 写真のレタッチ（PhotoRetouch が <html data-retouch> を見張って写真を作り直す） */
      root.dataset.retouch = JSON.stringify(params.retouch || RETOUCH_ALL_DEFAULT);
    };
    /* 音量は SoundUi へイベントで直接渡す（鳴っている最中でもその場で変わる） */
    const applyVolume = () =>
      window.dispatchEvent(
        new CustomEvent(BGM_VOLUME_EVENT, {
          detail: { v: params.sound.volume / 100 },
        })
      );

    /* ② 案・スクロール連動は React へ */
    const pushValues = () =>
      onSettleValues({
        boPattern: params.anim.boPattern,
        illustEnter: params.anim.illustEnter,
        bouncePattern: params.anim.bouncePattern,
        bounceStrength: params.anim.bounceStrength,
        illustDelay: params.anim.illustDelay,
        loop: { ...params.loop },
        tamaranee: params.anim.tamaranee,
        tamaIntro: { ...params.intro },
        preview: { ...params.preview },
        face: { ...params.face },
        spot: { ...params.spot },
        kvExit: { ...params.kvExit },
        hero: { ...params.hero },
        msg: { ...params.msg },
        expIntro: { ...params.expIntro },
        expPick: { ...params.expPick },
        scrollSpd: { ...params.scrollSpd },
        nav: { ...params.nav },
        secHead: params.secHead,
        tips: { ...params.tips },
        videoVol: { ...params.videoVol },
        expEnter: { ...params.expEnter },
      });

    let panel: { destroy: () => void; sync?: () => void } | null = null;
    const resyncFonts = () => panel?.sync?.();

    /* 保存値を初期値の形に合わせて重ねる（知らないキー・型違いは捨てる） */
    const shapeMerge = (def: unknown, saved: unknown): unknown => {
      if (saved === undefined) return def;
      if (def !== null && typeof def === "object" && !Array.isArray(def)) {
        if (saved === null || typeof saved !== "object" || Array.isArray(saved)) return def;
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(def as Record<string, unknown>)) {
          out[k] = shapeMerge(
            (def as Record<string, unknown>)[k],
            (saved as Record<string, unknown>)[k]
          );
        }
        return out;
      }
      return typeof saved === typeof def ? saved : def;
    };

    const build = async () => {
      const lib = window.TunePanel;
      if (!lib) return;
      madeRef.current = true;

      /* 【2026-09-26 一回限りの移し替え】ページ遷移の既定を案6→案7に変えたが、
         ブラウザに前の保存値（案6・長さなどの項目なし）が残っていると新しい既定が見えない。
         版を上げると他のつまみの保存値まで全部消えるので、ページ遷移の項目だけを置き換える。
         見分け方：新しく足した dur を持っていない保存値＝この変更より前のもの */
      try {
        const k = `tp:${TOP_TUNE_KEY}:v${TOP_TUNE_VERSION}`;
        const raw = localStorage.getItem(k);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && (!saved.pageTrans || saved.pageTrans.dur === undefined)) {
            saved.pageTrans = { pattern: 7, dur: PT_DEFAULT.dur, blur: PT_DEFAULT.blur, peak: PT_DEFAULT.peak };
            localStorage.setItem(k, JSON.stringify(saved));
          }
          /* 【2026-10-20 一回限りの移し替え】フッターの既定を案3「ふつうのフッター」＋透け方「なめらか」にした。
             前の保存値（グラデ80%・体験の下の余白80px など）が残っていると、案3 なのにグラデが画面の8割ある
             おかしな形で見えてしまう。版を上げると他のつまみまで全部消えるので、流れの値だけ置き換える
             （左右の余白・間隔・作字の大きさなど、ほかのフッターの保存値はそのまま）。
             見分け方：透け方（fadeCurve）を持っていない保存値＝この変更より前のもの */
          /* 同日 3回目：案3 だけにして、グラデを5パターンに入れ替えた。案（pattern）を持っている保存値＝この変更より前のもの。
             流れの値だけパターン1の既定へ置き換え、案の番号は消す */
          if (saved && saved.footer && (saved.footer.fadeCurve === undefined || saved.footer.pattern !== undefined)) {
            Object.assign(saved.footer, { evPadBottom: 96, fadeH: 64, fadeSolid: 0, fadeCurve: 1, overlap: 400, padTop: 64 });
            delete saved.footer.pattern;
            localStorage.setItem(k, JSON.stringify(saved));
          }
        }
      } catch {}

      /* デプロイ用の既定値ファイル（💾保存の自動引き継ぎ先）。
         ローカルで保存 → public/tune-defaults.json に書き込み → git経由でデプロイに載り、
         ここで読み込まれて全員の既定値になる（2026-08-23 ヒデさん依頼） */
      try {
        const res = await fetch("/tune-defaults.json", { cache: "no-store" });
        if (res.ok) {
          const baked = await res.json();
          const merged = shapeMerge(DEFAULTS, baked) as Params;
          Object.assign(DEFAULTS, merged);
          Object.assign(params, structuredClone(merged));
        }
      } catch {}

      panel = lib.create({
        title: "調整パネル", /* 2026-09-20 anyflow と同じ名称にそろえる */
        /* ⚠️ 保存キーと版は tuneKeys.ts に1つだけ置く（スマホのメニューも同じ場所を読むため） */
        storageKey: TOP_TUNE_KEY,
        /* ⚠既定値の意味を変えたら必ず上げる（古い保存値が自動で捨てられる）。
           v2: 「ぼーっ」の採用案を 案1 → 案4 に変更（2026-08-18）
           v3: カンプ更新でイラストが差し替わり、キラキラの項目が無くなった（2026-08-19）
           v4: 環境音の音量を追加（2026-08-19）
           v5: 眉毛（持ち上げ量・位置）を追加、たまらねーの既定位置を変更（2026-08-20）
           v6: キラキラ（2コマ）を追加（2026-08-20）
           v7: 口元（開いた口の位置・大きさ・線の太さ）を追加（2026-08-20）
           v8: 口の形をカンプ更新（Vector 8）に差し替え・既定位置を変更、
               眉の動き方5案を追加（2026-08-21）
           v9: 全パターンを本番パネルに集約（2026-08-21）
           v10: 「ページ＞セクション＞細目」の3階層に再設計。スイング＝案4固定・
                眉の動き方（パキッと固定）でピルを撤去。登場はぴょこん4案に（2026-08-21）
           v11: 体験ページ左のカモメ（位置・大きさ・傾き）を追加（2026-08-21）
           v12: スポットが「1スクロールごとに切替」になり、切替の見せ方5案と
                1枚あたりのスクロール量を追加（2026-08-21）
           v13: 切替はブラーで確定しピルを撤去。余韻＝白フェードの長さに（2026-08-22）
           v14: グルメが5場面目（場面ごとブラー切替）になり、白フェードを廃止（2026-08-22）
           v15: 作字の「スクロールでの消え方」を追加（ゆったり系5案＋距離・ブラー・
                縮小・縦移動・ゆったり度、2026-08-21 ヒデさん依頼）
           v16: 作字の「登場のしかた」を追加（一括出現・ブラー弱め9px・
                たまらないまでの間、2026-08-21 ヒデさん指示）
           v17: 人物イラストの登場を「短いスパン＋バウンス」5案に刷新
                （案番号の意味が変わったため。2026-08-21 ヒデさん指示）
           v18: メッセージセクション新設（KV直下・カンプ 15480:22896。出方5案＋
                距離・出はじめ・文字の薄さ。2026-08-21 ヒデさん依頼）
           v19: ホバー時の縦バウンス5案を追加（2026-08-21 ヒデさん依頼）
           v20: 作字（登場・消え方）の項目を撤去し既定値で固定／メッセージは案1〜3＋
                にじみ幅／人物登場は案3固定・ぼーは現状固定でピル撤去（2026-08-21）
           v21: メッセージに「読み終わってからの余韻」を追加。テンポは最初の設定へ
                戻した（len2400・にじみ幅1.3。2026-08-22 ヒデさん指示）
           v22: グルメのカルーセルに「1周の速さ」「ホバーで止める」を追加
                （2026-08-22 ヒデさん依頼）
           v23: 縦バウンス・たまらねーの案ピルを撤去（既定で確定）。体験ページの
                導入メッセージ（間・間隔・時間・ブラー）を追加（2026-08-22）
           v24: メッセージの見た目（見出し透過・太さ・行間／本文太さ・行間）と、
                バウンス統一（プルン・強さ%）＋ループの間隔・長さを追加（2026-08-23）
           v25: バウンス5案ピル復活・ループ前の横揺れON/OFF・人物が出るまでの間を追加
                （2026-08-23 ヒデさん依頼）
           v26: 場所えらびカルーセルの登場5案＋メッセージ「出はじめの深さ」を2000pxまで拡大
                （2026-08-23 ヒデさん依頼）
           v27: 用語を一般用語（不透明度・ディレイ等）に統一。人物の登場ディレイを秒単位に。
                刻みを「ざっくり検証できる粗さ」へ総点検（2026-08-23 ヒデさん指示）
           v28: 場所えらびの登場を「その場でブラー」5案に総入れ替え（移動なし。
                2026-08-23 ヒデさん指示）
           v29: カモメを全ページ共通で調整可に（左上・右の位置＋共通の不透明度。
                2026-08-23 ヒデさん依頼）
           v30: パネルの情報整理：トップをページの流れ順（メッセージ→スポット→グルメ→
                人物）に並び替え。用語の残り（ホバー時・切替の間隔）を統一（2026-08-23）
           v31: カモメに「色」「線の太さ」を追加（白×明るい空で薄く見える対策。2026-08-23）
           v32: カモメの位置をページごとに分離（見た目は共通のまま。トップ／体験で別々に
                調整できる。2026-08-23 ヒデさん指示）
           v33: 古いブラウザ保存値を一斉破棄。自動焼き込み（tune-defaults.json）導入前に
                本番URLで保存された古い値が、最新の焼き込みを上書きして「調整が反映されて
                いない」ように見えていたため（2026-08-23 ヒデさん報告の原因） */
        version: TOP_TUNE_VERSION, /* =42。2026-10-14 体験の既定を案2・グルメはホバーで止めないに。古い保存値を破棄 */ /* 41: 2026-09-24 流れる速さの既定を変更 */ /* 2026-09-20 剥がれる速さの既定を変更。古い保存値を破棄する */
        /* 【2026-09-27 ヒデさん決定】共通部品 v2.0.0 に上げた。
           ・値は「案ごと × PC/スマホごと」に部品が自動で分ける（ルール6-8）。
             案ピルと同じ見出しの中のつまみは案ごと、ほかは全案共通。スマホモードで触るとスマホだけの上書き（青い印）
           ・範囲は AnyFlow 式の自動（旧 autoCenter は廃止）／隠しモードは開くたび必ず隠れる（startClosed は不要）
           ・余白・サイズ・角丸・文字サイズの px のつまみは 4と8の倍数に止まる（ルール4-7） */
        /* ページごとのタブ切替（2026-08-23 ヒデさん依頼） */
        tabs: true,
        position: { right: 20, bottom: 20 },
        params,
        defaults: DEFAULTS,
        /* 焼き込み（tune-defaults.json）は、初めて来た人にもそのまま届く（共通の部品 v2.3.2 で直した・2026-10-20。
           前はページ側の pinSelectedVariantBase で、選ばれている案の最初の値を焼き込みにそろえていた） */
        schema: [
          {
            cat: "サイト共通",
            open: false,
            items: [
              /* 【2026-09-26】ハンバーガーメニューの3案は「案1 空に浮かぶ作字」に確定したので、
                 ここにあった切り替えは外した（MobileHeader.tsx に固定） */
              /* 左上の音のスイッチのアイコンは 2026-10-20 に「音の波」に決定（5案の切り替えは外した・BgmIcons.tsx） */
              /* 【2026-10-28 ヒデさん】「一番最初のサウンドのオンオフのUIをブラッシュアップ。3案ほど。抜け感があり、上品でゆったり。キービジュアルの世界観に」
                 → 最初の確認の窓の見せ方を 現行＋3案 から選ぶ（soundDialogConfig.ts・SoundUi.tsx）。案の見比べなのでバリエーション（6-13・6-18） */
              { sub: "環境音（BGM）", grp: "variation" },
              {
                pills: "最初の確認の窓",
                path: "sound.dialog",
                immediate: true,
                values: false, /* 案ごとの値は持たない（下の案2 のつまみは案2 の時だけ出す） */
                autoNum: "案",
                hint: "ページを開いた時に出る「網走の環境音を楽しむことができます。再生しますか？」の窓の見せ方。案を押すと、その場で窓を出し直します（ON／OFF を押すと閉じます）。",
                options: Object.entries(SOUND_DLG_VARIANTS).map(([v, d]) => ({
                  name: d.name,
                  value: Number(v),
                  desc: d.note,
                  ...(d.fixed ? { fixed: true } : {}),
                })),
              },
              /* 【2026-10-28 ヒデさん「案2の言葉だけでいきましょう。ただ、文字がちょっと弱々しく見にくいので、フォントウェイトやラインハイト、1行目、2行目のギャップなどを変えられる調整パネルを。背景のブラーの具合も変えられるように。もうちょっときつくして」】
                 → 案2 の時だけ出す（6-14）。余白は基本・ギャップ／文字はフォント・文字の行／ぼかしはエフェクト＆テクスチャ・ブラー（6-13・6-17・6-18） */
              { sub: "最初の確認の窓", grp: "basic", when: (p: Params) => p.sound.dialog === 2 },
              {
                slider: "1行目と2行目のギャップ",
                path: "sound.dlgGap",
                min: 0,
                max: 32,
                step: 1,
                unit: "px",
                immediate: true,
                when: (p: Params) => p.sound.dialog === 2,
                hint: "「網走の環境音を楽しむことができます。」と「再生しますか？」の間。0 で行間だけ。",
              },
              { sub: "最初の確認の窓", grp: "font", when: (p: Params) => p.sound.dialog === 2 },
              { font: "網走の環境音を…（案内の文）", sel: "[data-sound-msg]", id: "soundMsg", when: (p: Params) => p.sound.dialog === 2 },
              { sub: "最初の確認の窓", grp: "fxtex", when: (p: Params) => p.sound.dialog === 2 },
              {
                slider: "背景のブラー",
                path: "sound.dlgBlur",
                min: 0,
                max: 80,
                step: 1,
                unit: "px",
                immediate: true,
                when: (p: Params) => p.sound.dialog === 2,
                hint: "窓の後ろの景色のぼかし。大きいほど強くぼける。",
              },
              { sub: "環境音（BGM）", grp: "other" },
              {
                slider: "音量",
                path: "sound.volume",
                min: 0,
                max: 100,
                step: 1,
                fmt: "%",
                hint: "100% で音源そのままの大きさ。これ以上は上げられない仕様なので音割れしません。",
              },
              {
                note: "その場で反映されます。",
              },
              /* ヘッダーのアンカー移動（幕）：かぶる 420ms・引く 620ms で固めて外した（2026-10-21 ヒデさん「画像の箇所の調整パネルは削除で大丈夫です」・値は下の「固めた値」） */
              /* 【2026-10-21 ヒデさん】「ページ遷移の演出から フッター（全ページ共通）は、今の案をデフォルトにして削除して大丈夫。案・セクションごと」
                 → ページ遷移の演出は 案7「じんわり溶ける」・長さ1000ms・ぼかし3px・白の濃さ88% で固定（PageTransition の PT_DEFAULT・tune-defaults.json）。
                 つまみと案は外した（戻す時は git の記録） */
              { sub: "カモメの見た目（全ページ共通）", grp: "fxtex" },
              {
                note: "ここは色や濃さなど「見た目」だけ。位置・大きさ・傾きは トップ／体験 の各タブにある「カモメ」で調整します。",
              },
              {
                slider: "不透明度",
                path: "bird.opacity",
                min: 0,
                max: 100,
                step: 5,
                fmt: "%",
                hint: "全ページのカモメ（左上・右・体験ページ左）の濃さ。下げるほど薄く景色になじみ、0で見えなくなります。",
              },
              {
                color: "色",
                path: "bird.color",
                hint: "カモメの線の色。真っ白だと明るい空の上で薄く見えるので、濃くしたい時は少しグレー寄り（例 #e0e8f0 → #c0ccd8）にすると輪郭が立ちます。",
              },
              {
                slider: "線の太さ",
                path: "bird.stroke",
                min: 50,
                max: 250,
                step: 10,
                fmt: "%",
                hint: "線の太さの倍率（100%が今まで）。上げるほど太く濃く見え、下げるほど細く繊細になります。",
              },
              /* 【2026-10-21 ヒデさん】フッター（全ページ共通）とフッターの写真も、今の案を既定にして見出しごと外した
                 （「フッターの写真も、暗いままをデフォルトにして影の濃さを0に」「削除して大丈夫」）。
                 値は globals.css の --ft-*（全ページ共通・詳しいページも同じ）に固定：グラデ「白がゆっくり明ける」長さ130%・重ねる長さ872px・
                 体験の下のパディング96px・上のパディング64px・左右60px・カラム248px・列84px など。写真は「前の暗いまま」で影0＝写真そのまま */
            ],
          },
          {
            cat: "トップページ",
            items: [
              /* 【2026-10-20 ヒデさん】「調整した画像に差し替えてデフォルトに。調整パネル上では前の画像にも戻れるように」。
                 写真の組の見比べなのでバリエーション（6-13・6-18）。
                 2026-10-21 ヒデさん「この写真という項目はサイト共通というよりトップページにあってほしい」→ トップページのタブへ移した（効くのは全ページのまま） */
              { sub: "写真", grp: "variation" },
              {
                note: "キービジュアル・フッター・能取岬・サンゴ草・流氷・ひまわりの写真。トップ・詳しいページ・体験ページのどこでも同じ写真になります。",
              },
              {
                pills: "写真",
                path: "photos.set",
                immediate: true,
                autoNum: false,
                options: [
                  { name: "新しい写真", value: 1, desc: "【既定・2026-10-20】ヒデさんが明るさ・色を調整した写真" },
                  { name: "前の写真", value: 0, desc: "調整する前の写真（-prev のファイル）" },
                ],
              },
              /* 【2026-10-21 ヒデさん】「キービジュアルの写真も、彩度とか露光量とか、一通りのレタッチできる項目を調整できるように、
                 エフェクト＆テクスチャのパネルにキービジュアルという項目を一番最初につけて」→「調整パネルにある写真の調整は、同じ10項目を入れて」。
                 写真の色・明るさなのでエフェクト＆テクスチャ（6-13・6-18）。写真そのものを計算し直して差し替える（幕・フィルターは重ねない・PhotoRetouch） */
              { sub: "キービジュアル", grp: "fxtex" },
              {
                note: "キービジュアルの後ろの写真のレタッチ（PC・スマホ）。フッターも同じ写真なので、同じように変わります。全部 0 で写真そのまま。",
              },
              ...retouchItems(["kv"]),
              { sub: "ぼーっとスポット", grp: "fxtex" },
              {
                note: "ぼーっとスポットの写真のレタッチ。トップ・詳しいページ・体験ページのどこでも同じ仕上がりになります。全部 0 で写真そのまま。",
              },
              {
                pills: "写真",
                path: "retouchPick",
                immediate: true,
                autoNum: false,
                values: false, /* どの写真のつまみを出すかを選ぶだけ（案ごとの値は持たない） */
                options: (["notoro", "sango", "ryuhyo", "himawari"] as const).map((k) => ({ name: RETOUCH_TARGETS[k].name, value: k })),
              },
              ...retouchItems(["notoro", "sango", "ryuhyo", "himawari"]),
              { sub: "セクションの大見出し（全セクション共通）", grp: "font" },
              {
                note: "グルメ「なーんにもない、道東の土地、網走。」と体験「意外とオモロい、網走。」の大きさ。ひとつの値を共有しているので、ここを変えると両方そろって変わります。",
              },
              {
                slider: "大きさ",
                path: "secHead",
                grid: "fontSize", /* 文字サイズ（14・18px も可）。名前だけだと部品が「大きさ」と見分けて4の倍数に寄せるため（2026-09-28） */
                min: 20,
                max: 64,
                step: 1,
                unit: "px",
                immediate: true,
              },
              { sub: "人物イラスト", grp: "basic" },
              { sub: "置き場所（枠ごと）", deep: true },
              {
                slider: "位置 X（右基準）",
                path: "pos.frameRight",
                min: -100,
                max: 400,
                step: 1,
                fmt: "px",
                hint: "大きくすると左へ寄ります。人物と文字がまとめて動きます。",
              },
              {
                slider: "位置 Y",
                path: "pos.frameTop",
                min: 400,
                max: 980,
                step: 1,
                fmt: "px",
              },
              { sub: "置き場所（人物）", deep: true },
              {
                slider: "位置 X（ずらし）",
                path: "pos.personX",
                min: -120,
                max: 120,
                step: 1,
                fmt: "px",
              },
              {
                slider: "位置 Y（ずらし）",
                path: "pos.personY",
                min: -120,
                max: 120,
                step: 1,
                fmt: "px",
              },
              {
                slider: "大きさ",
                path: "pos.personW",
                min: 80,
                max: 320,
                step: 1,
                fmt: "px",
                hint: "横幅。縦は元の比率のまま付いてきます。",
              },
              /* ── 表情 ─────────────────────────── */
              { sub: "表情", deep: true },
              /* ホバーの縦バウンスは既定（案1 ぴょこっ）で確定（2026-08-22 ヒデさん指示。
                 案ピルは撤去。パターン本体の hoverBouncePatterns.ts も使われていなかったので 2026-09-26 に削除） */
              {
                note: "眉が上がり、口がぽかんと開きます（切替はパキッと・フェード無し）。位置調整は下の「出しっぱなし」をONにするとラクです。",
              },
              { sub: "眉", deep: true },
              {
                slider: "持ち上げる量",
                path: "face.browLift",
                min: 0,
                max: 20,
                step: 1,
                fmt: "px",
                hint: "0 で動かなくなります。",
              },
              {
                slider: "位置 X（ずらし）",
                path: "face.browX",
                min: -20,
                max: 20,
                step: 1,
                fmt: "px",
                hint: "＋で右へ。",
              },
              {
                slider: "位置 Y（ずらし）",
                path: "face.browY",
                min: -20,
                max: 20,
                step: 1,
                fmt: "px",
                hint: "＋で下へ。",
              },
              {
                slider: "パッチの太らせ",
                path: "face.patchSpread",
                min: 0,
                max: 300,
                step: 5,
                fmt: "",
                hint: "眉を上げた時に元の眉がはみ出したら、ここを上げます。",
              },
              { sub: "口", deep: true },
              {
                slider: "位置 X（ずらし）",
                path: "face.mouthX",
                min: 30,
                max: 70,
                step: 0.5,
                fmt: "px",
              },
              {
                slider: "位置 Y（ずらし）",
                path: "face.mouthY",
                min: 60,
                max: 100,
                step: 0.5,
                fmt: "px",
              },
              {
                slider: "大きさ",
                path: "face.mouthW",
                min: 4,
                max: 20,
                step: 0.5,
                fmt: "px",
                hint: "横幅。縦は元の比率のまま。カンプは 11.2px です。",
              },
              /* ── たまらねー ────────────────────── */
              /* 出方は現状の案で確定（2026-08-22 ヒデさん指示。案ピルは撤去。
                 パターン本体は tamaraneePatterns.ts） */
              { sub: "たまらねー", deep: true },
              {
                slider: "位置 X（ずらし）",
                path: "pos.tamaraneeX",
                min: -60,
                max: 260,
                step: 1,
                fmt: "px",
              },
              {
                slider: "位置 Y（ずらし）",
                path: "pos.tamaraneeY",
                min: -120,
                max: 160,
                step: 1,
                fmt: "px",
              },
              {
                slider: "大きさ",
                path: "pos.tamaraneeW",
                min: 40,
                max: 200,
                step: 1,
                fmt: "px",
              },
              /* ── キラキラ ─────────────────────── */
              { sub: "キラキラ（1コマ目）", deep: true },
              {
                slider: "位置 X（ずらし）",
                path: "pos.sparkleX",
                min: -40,
                max: 160,
                step: 1,
                fmt: "px",
              },
              {
                slider: "位置 Y（ずらし）",
                path: "pos.sparkleY",
                min: -40,
                max: 240,
                step: 1,
                fmt: "px",
              },
              {
                slider: "大きさ",
                path: "pos.sparkleW",
                min: 6,
                max: 60,
                step: 1,
                fmt: "px",
              },
              { sub: "キラキラ（2コマ目）", deep: true },
              {
                slider: "位置 X（ずらし）",
                path: "pos.sparkle2Dx",
                min: -30,
                max: 30,
                step: 1,
                fmt: "px",
                hint: "＋で右へ。1コマ目からの相対位置です。",
              },
              {
                slider: "位置 Y（ずらし）",
                path: "pos.sparkle2Dy",
                min: -30,
                max: 30,
                step: 1,
                fmt: "px",
                hint: "−で上へ。",
              },
              /* 人物イラスト › 口 › 線の太さ：2px で固めて外した（2026-10-21 ヒデさん「画像の箇所の調整パネルは削除で大丈夫です」） */
              { sub: "人物イラスト", grp: "anim" },
              { sub: "出現", deep: true },
              {
                slider: "ディレイ",
                path: "anim.illustDelay",
                min: 0,
                max: 10,
                step: 0.5,
                fmt: "s",
                hint: "ボタンが出てから人物が登場するまでの待ち時間。上げると登場が遅くなり「間」ができ、下げるとすぐ出ます。変えると人物登場の直前から再生し直します。",
              },
              { sub: "バウンスとループ", deep: true },
              {
                note: "バウンスはホバーもループも同じ動き。ループでは、たまらねーとキラキラも一緒に出ます。",
              },
              /* バウンスの動き5案ピルは撤去。案1（ぴょこっ）で確定
                 （2026-08-30 ヒデさん指示。パターン本体は Stage.tsx の BOUNCES） */
              {
                note: "強さを変えると、その場で人物が1回バウンスして違いを見せます。カーソルを乗せても試せます。",
              },
              {
                toggle: "ループ前の横揺れ",
                path: "loop.swayFirst",
                hint: "ONにすると、ループの時だけ左右に小刻みに揺れてからバウンスします（以前のスイングの復活）。",
              },
              {
                slider: "バウンスの強さ",
                path: "anim.bounceStrength",
                min: 20,
                max: 250,
                step: 10,
                fmt: "%",
                hint: "100が基準。大きいほど高く跳ねて、つぶれ方も大きくなります。人物にカーソルを乗せると確かめられます。",
              },
              {
                slider: "ループの間隔",
                path: "loop.cycle",
                min: 5,
                max: 60,
                step: 5,
                fmt: "s",
                hint: "この間隔で、バウンス＋たまらねー＋キラキラが自動で出ます。",
              },
              {
                slider: "表示時間",
                path: "loop.show",
                min: 0.5,
                max: 6,
                step: 0.5,
                fmt: "s",
              },
              { sub: "たまらねー（初回の1回だけ）", deep: true },
              {
                slider: "出現ディレイ",
                path: "intro.delay",
                min: 0,
                max: 2000,
                step: 50,
                fmt: "ms",
              },
              {
                slider: "表示時間",
                path: "intro.hold",
                min: 500,
                max: 8000,
                step: 100,
                fmt: "ms",
                hint: "出したまま留めておく長さ。このあと引っ込みます。",
              },
              { sub: "キラキラ（2コマ目）", deep: true },
              {
                slider: "切替の間隔",
                path: "sparkle.period",
                min: 0.3,
                max: 4,
                step: 0.1,
                fmt: "s",
              },
              /* 人物イラスト › 確認用（眉と口を出しっぱなし・パッチを赤く）：どちらも「しない」で固めて外した（2026-10-21 ヒデさん「画像の箇所の調整パネルは削除で大丈夫です」） */
              /* ── 人物イラスト ─────────────────── */
              /* 登場のしかたは案3「ポンッ→プルン」で確定（2026-08-21 ヒデさん指示。
                 案ピルは撤去。パターン本体は illustEnterPatterns.ts） */

              { sub: "カモメ（このページの2匹）", grp: "basic" },
              {
                note: "このページのカモメは「左上」「右」の2匹。色や濃さは サイト共通 の「カモメの見た目」にあります。",
              },
              { sub: "左上のカモメ", deep: true },
              {
                slider: "位置 X",
                path: "pos.birdTopSky1X",
                min: -100,
                max: 1400,
                step: 5,
                fmt: "px",
                hint: "左上のカモメの横位置。上げると右へ動きます。",
              },
              {
                slider: "位置 Y",
                path: "pos.birdTopSky1Y",
                min: -50,
                max: 900,
                step: 5,
                fmt: "px",
                hint: "左上のカモメの縦位置。上げると下へ動きます。",
              },
              {
                slider: "大きさ",
                path: "pos.birdTopSky1W",
                min: 30,
                max: 250,
                step: 5,
                fmt: "px",
                hint: "左上のカモメの横幅。上げると大きくなります。",
              },
              {
                slider: "傾き",
                path: "pos.birdTopSky1Rot",
                min: -45,
                max: 45,
                step: 1,
                fmt: "°",
                hint: "左上のカモメの回転。マイナスで左へ、プラスで右へ傾きます。",
              },
              { sub: "右のカモメ", deep: true },
              {
                slider: "位置 X（右基準）",
                path: "pos.birdTopSky2X",
                min: -100,
                max: 1400,
                step: 5,
                fmt: "px",
                hint: "右のカモメの横位置。上げると左へ動きます（右端からの距離のため）。",
              },
              {
                slider: "位置 Y",
                path: "pos.birdTopSky2Y",
                min: -50,
                max: 900,
                step: 5,
                fmt: "px",
                hint: "右のカモメの縦位置。上げると下へ動きます。",
              },
              {
                slider: "大きさ",
                path: "pos.birdTopSky2W",
                min: 30,
                max: 250,
                step: 5,
                fmt: "px",
                hint: "右のカモメの横幅。上げると大きくなります。",
              },
              {
                slider: "傾き",
                path: "pos.birdTopSky2Rot",
                min: -45,
                max: 45,
                step: 1,
                fmt: "°",
                hint: "右のカモメの回転。マイナスで左へ、プラスで右へ傾きます。",
              },
              /* 作字（登場・消え方）のパネル項目は 2026-08-21 ヒデさん指示で撤去。
                 数値は heroEnterConfig.ts / kvExitConfig.ts の既定値で固定 */
              /* 【2026-10-21 ヒデさん】「トップページの調整パネルのメッセージ（作字のあと）は、今のやつをデフォルトにして削除して構いません」
                 → 案・文言・見出しと本文の太さ／行間／不透明度・出てくる動き（スクロール量・時間）・スクロール速度（KV→メッセージ）を
                 焼き込みの値で固めて、調整パネルから見出しごと外した（値は tune-defaults.json の msg・scrollSpd と、下の pinFixed） */
              { sub: "ぼーっとスポット", grp: "anim" },
              { sub: "入り", deep: true },
              {
                note: "作字の消え方は上の「作字｜スクロールでの消え方」にまとめました（同じ項目が2つあったため統合。2026-08-21）。",
              },
              { sub: "① 背景写真（ブラー）", deep: true },
              {
                slider: "始まる位置",
                path: "spot.bgFrom",
                min: 0,
                max: 800,
                step: 10,
                fmt: "px",
              },
              {
                slider: "最大になる位置",
                path: "spot.bgTo",
                min: 100,
                max: 1400,
                step: 10,
                fmt: "px",
              },
              {
                slider: "最大の強さ",
                path: "spot.bgBlur",
                min: 0,
                max: 60,
                step: 1,
                fmt: "px",
              },
              { sub: "② スポット写真", deep: true },
              {
                slider: "出はじめる位置",
                path: "spot.spotFrom",
                min: 0,
                max: 1400,
                step: 10,
                fmt: "px",
              },
              {
                slider: "ブラーが晴れきる位置",
                path: "spot.spotTo",
                min: 200,
                max: 2000,
                step: 10,
                fmt: "px",
                hint: "ここから「固定ビュー」が始まります。",
              },
              {
                slider: "最初のブラー",
                path: "spot.spotBlur",
                min: 0,
                max: 80,
                step: 1,
                fmt: "px",
              },
              { sub: "③ グルメ場面のあとの余白", deep: true },
              {
                slider: "末尾までの長さ",
                path: "spot.hold",
                min: 0,
                max: 2000,
                step: 10,
                fmt: "px",
                hint: "グルメが出たあと、下に残しておくスクロールの余白です。",
              },
              { sub: "写真の切替", deep: true },
              {
                note: "切替はブラーで確定（2026-08-21）。写真とテキストが同時に切り替わります。",
              },
              {
                slider: "1枚あたりのスクロール量",
                path: "spot.stepLen",
                min: 300,
                max: 1600,
                step: 20,
                fmt: "px",
                hint: "このぶんスクロールするごとに次の写真へ。982でちょうど1画面ぶんです。",
              },
              /* ── グルメ｜余白（2026-09-26 ヒデさん依頼）。画面の上から下の順なので、カルーセルの動きより先 ── */
              { sub: "グルメの余白", grp: "basic" },
              {
                slider: "見出し↔カルーセル",
                path: "gourmet.gap",
                min: 24,
                max: 160,
                step: 4,
                fmt: "px",
                hint: "上の文章と下の写真の列の間。中身は画面の上下まん中にそろうので、詰めるほど上下の余白が広がります。カンプは140px。",
              },
              /* グルメのカルーセル（1周の時間 40秒・ホバーで止める しない）：固めて外した（2026-10-21 ヒデさん「画像の箇所の調整パネルは削除で大丈夫です」） */
              { sub: "体験セクション（グルメの下）", grp: "variation" },
              {
                note: "「意外とオモロい、網走。」の見せ方10案。どれも白地・余白多め・ミニマルで、トップの他のセクションと同じ書体づかいにしてあります（ホバーで開く仕掛けは廃止）。",
              },
              {
                pills: "案",
                path: "events.pattern",
                immediate: true,
                /* 体験の案そのものは「どの案にも属さない」と明示しておく（取り違え防止）。
                   2026-10-14、同じ見出しに「送りボタン」の案ピルを置いた時、部品が「見出しの中のもう1つの案ピルが持ち主」と
                   受け取り、体験の案が切り替わらなくなった（FIXLOG）。送りボタンの行は案4 に決めて外したが、また案ピルを
                   足した時に同じことが起きないよう残す */
                shared: true,
                /* 案によって出す項目が変わるので、選んだら組み直す */
                autoNum: "案",
                options: Object.entries(EVENT_LAYOUT_PATTERNS).map(([v, p]) => ({
                  name: p.name,
                  value: Number(v),
                  desc: p.note,
                })),
              },
              /* 送りボタンの形は 2026-10-21 に見比べて「案9 青いふちのガラス」に決定し、調整パネルの「送りボタン」の行は消した
                 （ヒデさん「ボタンは9番でいきましょう。それ以外の案は、調整パネルからも全部削除して大丈夫です」・EventNav.tsx） */
              { sub: "体験セクション（グルメの下）", grp: "basic" },
              {
                slider: "下のマージン",
                path: "events.tailPad",
                variant: "events.pattern", /* 別のカテゴリへ分けても、この案ごとの値のまま（2026-09-28 分類の見直し） */
                min: 0,
                max: 2000,
                step: 50,
                unit: "px",
                immediate: true,
                hint: "体験セクションとフッターのあいだの余白。もとは「体験がページ最後だったので動きを最後まで見るための逃げ」でしたが、フッターが入ったので既定は0です。動きをゆっくり最後まで見たい時だけ足してください。",
              },
              { sub: "案2 カードを切る：カード", deep: true, when: (p: Params) => p.events.pattern === 31 },
              {
                slider: "大きさ",
                path: "events.shufCard",
                variant: "events.pattern", /* 別のカテゴリへ分けても、この案ごとの値のまま（2026-09-28 分類の見直し） */
                min: 60,
                max: 140,
                step: 1,
                unit: "%",
                /* 【2026-10-21 ヒデさん】「スマホの体験セクションのカードUIを、もう少しだけ気持ち全体を大きく」→ スマホだけ 112%🟡（PC は 100% のまま。スマホモードで触ると別に持てる） */
                spDefault: 112,
                immediate: true,
                when: (p: Params) => p.events.pattern === 31,
                hint: "重なったカードの大きさ（カンプの420×616pxが100%）。束の中心を基準に、束ごと大きく・小さくなります。右へ出る距離も同じ割合で変わります。スマホは上書きが無い間 112%。",
              },
              { sub: "案5 3Dカルーセル：カード", deep: true, when: (p: Params) => p.events.pattern >= 34 },
              {
                seg: "縦横比",
                path: "events.cardRatio",
                variant: "events.pattern", /* 別のカテゴリへ分けても、この案ごとの値のまま（2026-09-28 分類の見直し） */
                immediate: true,
                /* 3Dカルーセルの案を選んだ時だけ出す（他の案には関係が無い） */
                when: (p: Params) => p.events.pattern >= 34,
                options: CARD_RATIOS.map((r, i) => ({ name: r.name, value: i })),
                hint: "3Dカルーセルのカードの形。写真は cover で収まるので、比率を変えても伸びません。",
              },
              { sub: "体験セクション（グルメの下）", grp: "font" },
              { sub: "案2 カードを切る：流れる文字", deep: true, when: (p: Params) => p.events.pattern === 31 },
              {
                slider: "大きさ",
                path: "events.mqSize",
                variant: "events.pattern", /* 別のカテゴリへ分けても、この案ごとの値のまま（2026-09-28 分類の見直し） */
                grid: "fontSize", /* 文字サイズ（14・18px も可）。名前だけだと部品が「大きさ」と見分けて4の倍数に寄せるため（2026-09-28） */
                min: 40,
                max: 200,
                step: 2,
                unit: "px",
                immediate: true,
                when: (p: Params) => p.events.pattern === 31,
                hint: "カードの後ろを右から左へ流れる「意外とオモロい、網走。」の大きさ。カンプは80px。大きくしても文字の中心の高さは変わりません。",
              },
              { sub: "体験セクション（グルメの下）", grp: "anim" },
              {
                /* 【2026-09-26 ヒデさん指示】「1回スクロールすれば一定の速度で流れる。
                   リニアで機械的なので、自然に流れる案を3案。何が違うか明記」
                   旧「写真が流れる速さ」のつまみは、スクロール量を一定速で追う方式の
                   もの。1回＝1枚になって効かなくなったので、流れ方の3案に差し替えた */
                pills: "流れ方",
                path: "events.flow",
                variant: "events.pattern", /* 別のカテゴリへ分けても、この案ごとの値のまま（2026-09-28 分類の見直し） */
                immediate: true,
                /* ほかの案と同じ「案1」の形に（番号が「1 案1 床をすべる」と二重になっていた・2026-09-28 ヒデさん指摘） */
                autoNum: "案",
                /* 重ね写真の案32 だけ（案31 は 2026-09-26 にカードを切る動きになり、
                   下の「切る速さ／メリハリ」で調整する） */
                when: (p: Params) => p.events.pattern === 32,
                options: Object.entries(EV_FLOWS).map(([v, f]) => ({
                  name: f.name,
                  value: Number(v),
                  desc: f.note,
                })),
              },
              /* ── 案31（パネル表示は案2）を選んだ時だけ出るつまみ。画面の奥から手前の順 ──
                 【2026-09-26 ヒデさん指示】「この案を選んだら動的に出てきて、後ろのカルーセル
                   テキストのサイズ感や速度感、カードのサイズ感を変えられるように」 */
              /* 案2 カードを切る：流れる文字の速さ 34秒・切る速さ PC 1.0秒／スマホ 0.6秒・メリハリ 3：固めて外した（2026-10-21 ヒデさん「画像の箇所の調整パネルは削除で大丈夫です」。
                 切る速さのスマホの値は globals.css の --ev-shuf-dur の 744px 未満で持つ） */
            ],
          },
          {
            cat: "ぼーっと体験ページ",
            items: [
              { sub: "導入メッセージ（1画面目）", grp: "anim" },
              {
                note: "見出しとボタンは最初から出ていて、本文の段落4つが順にブラーで出てきます。値を変えると、その場で最初から再生し直します。",
              },
              {
                slider: "出現ディレイ",
                path: "expIntro.startDelay",
                min: 0,
                max: 5,
                step: 0.2,
                fmt: "s",
                hint: "ページが出てから、最初の段落が出はじめるまでの待ち。",
              },
              {
                slider: "段落のギャップ",
                path: "expIntro.stagger",
                min: 0.1,
                max: 3,
                step: 0.1,
                fmt: "s",
                hint: "段落と段落の間。大きいほどゆっくり順に出ます。",
              },
              {
                slider: "1段落のアニメーション時間",
                path: "expIntro.duration",
                min: 0.2,
                max: 4,
                step: 0.2,
                fmt: "s",
              },
              {
                slider: "ブラーの強さ",
                path: "expIntro.blur",
                min: 0,
                max: 40,
                step: 1,
                fmt: "px",
                hint: "出はじめのにじみ具合。0でフェードだけ。",
              },
              { sub: "カモメ（このページの2匹）", grp: "basic" },
              {
                note: "このページのカモメは「右」「左」の2匹（左上は多かったので廃止・2026-08-23）。色や濃さは サイト共通 の「カモメの見た目」にあります。",
              },
              { sub: "右のカモメ", deep: true },
              {
                slider: "位置 X（右基準）",
                path: "pos.birdExpSky2X",
                min: -100,
                max: 1400,
                step: 5,
                fmt: "px",
                hint: "右のカモメの横位置。上げると左へ動きます（右端からの距離のため）。",
              },
              {
                slider: "位置 Y",
                path: "pos.birdExpSky2Y",
                min: -50,
                max: 900,
                step: 5,
                fmt: "px",
                hint: "右のカモメの縦位置。上げると下へ動きます。",
              },
              {
                slider: "大きさ",
                path: "pos.birdExpSky2W",
                min: 30,
                max: 250,
                step: 5,
                fmt: "px",
                hint: "右のカモメの横幅。上げると大きくなります。",
              },
              {
                slider: "傾き",
                path: "pos.birdExpSky2Rot",
                min: -45,
                max: 45,
                step: 1,
                fmt: "°",
                hint: "右のカモメの回転。マイナスで左へ、プラスで右へ傾きます。",
              },
              { sub: "左のカモメ", deep: true },
              {
                slider: "位置 X",
                path: "pos.birdExpX",
                min: 0,
                max: 700,
                step: 1,
                fmt: "px",
              },
              {
                slider: "位置 Y",
                path: "pos.birdExpY",
                min: 0,
                max: 950,
                step: 1,
                fmt: "px",
              },
              {
                slider: "大きさ",
                path: "pos.birdExpW",
                min: 30,
                max: 200,
                step: 1,
                fmt: "px",
              },
              {
                slider: "傾き",
                path: "pos.birdExpRot",
                min: -45,
                max: 45,
                step: 1,
                fmt: "°",
              },
              /* 場所えらびのカルーセル：案3「左から順に」で固めて外した（2026-10-21 ヒデさん「画像の箇所の調整パネルは削除で大丈夫です」） */
              { sub: "動画まわり（遷移と再生画面）", grp: "basic" },
              { sub: "「ぼーっ」の吹き出し", deep: true },
              /* 出方は現状の案で確定（2026-08-21 ヒデさん指示。案ピルは撤去。
                 パターン本体は boPatterns.ts の DEFAULT_BO） */
              { sub: "「ぼーっ」｜位置と大きさ", deep: true },
              {
                slider: "位置 X（ずらし）",
                path: "pos.boX",
                min: -60,
                max: 260,
                step: 1,
                fmt: "px",
              },
              {
                slider: "位置 Y（ずらし）",
                path: "pos.boY",
                min: -120,
                max: 160,
                step: 1,
                fmt: "px",
              },
              {
                slider: "大きさ",
                path: "pos.boW",
                min: 30,
                max: 180,
                step: 1,
                fmt: "px",
              },
              { sub: "動画まわり（遷移と再生画面）", grp: "anim" },

              { sub: "遷移（この場所にする → 再生画面）", deep: true },
              {
                note: "選んだカードが窓になって向こう側へ入る遷移（吸い込まれる案がベース）。値を変えて手を止めると、場面選択に戻って自動でボタンが押され、その場で遷移をプレビューできます。",
              },
              {
                /* 既定1.6秒がツマミの中央に来る範囲（±1.4秒）。2026-08-23 センター設計ルール */
                slider: "アニメーション時間",
                path: "expEnter.durationSec",
                min: 0.2,
                max: 3,
                step: 0.2,
                fmt: "s",
                hint: "窓をくぐり終わるまでの時間。長いほどゆっくり入ります。",
              },
              {
                /* 既定100%が中央（0〜200%）。100%超は今よりさらに強い吸い込み */
                slider: "ため（緩急）",
                path: "expEnter.tame",
                min: 0,
                max: 200,
                step: 10,
                fmt: "%",
                hint: "0%は最初から一定の速さ。100%が今の吸い込まれ。さらに上げると、もっと溜めて終盤の加速が強くなります。",
              },
              {
                /* 既定6%が中央（0〜12%） */
                slider: "奥行き（視差）",
                path: "expEnter.parallax",
                min: 0,
                max: 12,
                step: 1,
                fmt: "%",
                hint: "枠が迫るのに景色がほぼ動かない度合い。上げるほど遠くへ入っていく感じが強まります。",
              },
              {
                /* 既定55%が中央（10〜100%） */
                slider: "まわりの暗さ",
                path: "expEnter.dim",
                min: 10,
                max: 100,
                step: 5,
                fmt: "%",
                hint: "遷移中に画面の外周を暗く落とす量。上げるほどトンネル感が出ます。100%で真っ暗。",
              },
              {
                slider: "途中のブラー",
                path: "expEnter.blurMid",
                min: 0,
                max: 30,
                step: 2,
                fmt: "px",
                hint: "くぐる途中で一度ピントがぼける量。0でオフ。上げると夢に入るような感触になります。",
              },
              { sub: "ぼーっとTips（再生中のモーダル）", deep: true },
              {
                note: "流氷クルーズの動画を再生してしばらくすると、中央に「どんな音が聞こえるかな？」のモーダルがふわっと出ます（カンプ 15564:22022）。×で閉じられます。",
              },
              {
                slider: "出るまでの時間",
                path: "tips.delay",
                min: 1,
                max: 20,
                step: 0.5,
                fmt: "s",
                hint: "再生ボタンを押してからモーダルが出るまでの時間。長いほど、映像に浸ってから出ます。",
              },
              {
                slider: "アニメーション時間",
                path: "tips.fade",
                min: 0.2,
                max: 3,
                step: 0.2,
                fmt: "s",
                hint: "フェードイン/アウトにかける時間。長いほどふわーっと出入りします。",
              },
              { sub: "再生ボタンとタイマー", deep: true },
              {
                slider: "表示時間",
                path: "videoVol.uiHideSec",
                min: 0.5,
                max: 8,
                step: 0.5,
                fmt: "s",
                hint: "再生開始やマウス操作のあと、再生マークとタイマーが消えるまでの時間。短いほど早く映像だけになります。",
              },
              /* 動画の音（音量をだんだん上げる する・フェード時間 3秒）：固めて外した（2026-10-21 ヒデさん「画像の箇所の調整パネルは削除で大丈夫です」） */
            ],
          },
        ],
        onChange: (info?: { path?: string }) => {
          applyVars();
          applyVolume();
          /* イベントセクションのホバー案はイベントで直接届ける（ページ再構築なしで即反映） */
          /* 最初の確認の窓の案を押したら、その場で窓を出し直して見比べられるように（2026-10-28） */
          if (info?.path === "sound.dialog") {
            window.dispatchEvent(new CustomEvent(SOUND_DLG_PREVIEW_EVENT));
          }
          if (info?.path === "events.pattern") {
            window.dispatchEvent(
              new CustomEvent(EVENT_LAYOUT_EVENT, { detail: { v: params.events.pattern } })
            );
          }
          if (info?.path === "events.cardRatio") {
            window.dispatchEvent(
              new CustomEvent(EVENT_RATIO_EVENT, { detail: { v: params.events.cardRatio } })
            );
          }
          if (info?.path === "events.tailPad") {
            window.dispatchEvent(
              new CustomEvent(EVENT_TAIL_EVENT, { detail: { v: params.events.tailPad } })
            );
          }
          /* 【2026-09-16】フッターの案は撤去したので、切り替えを知らせる必要が無くなった。
             余白などの数値は CSS 変数（--ft-*）で直接効くので、イベントは不要 */
        },
        onSave: (p: Params, panelRef: { flash?: (m: string) => void }) => {
          /* ローカルで保存したら、デプロイ用ファイルにも自動で書き込む（自動焼き込み）。
             本番では従来どおりブラウザ保存のみ */
          if (window.location.hostname === "localhost") {
            fetch("/api/tune-save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(p),
            })
              .then((r) =>
                panelRef.flash?.(
                  r.ok
                    ? "保存しました（次のデプロイで全員に反映されます）"
                    : "保存しました（デプロイ用ファイルへの書き込みは失敗）"
                )
              )
              .catch(() => panelRef.flash?.("保存しました（デプロイ用ファイルへの書き込みは失敗）"));
          } else {
            panelRef.flash?.("保存しました（このブラウザだけ。全員に反映するのはローカルで保存）");
          }
        },
        onSettle: (info?: { path?: string }) => {
          applyVars();
          applyVolume();
          pushValues();
          /* 登場のしかた（案切替・たまらねーの披露タイミング）を触ったら、
             Anyflow のパネルと同じく、その場で登場アニメを再生し直して見せる */
          const p = info?.path || "";
          /* バウンス2項目は再生し直さない：ページを作り直しても登場アニメが
             見えるだけでバウンス（周期/ホバー時）は変わって見えない。
             代わりに Stage 側が値の変化を検知して、その場で1回バウンスして見せる
             （2026-08-30 ヒデさん指摘「変えても変わった感じがしない」の対策） */
          const isBounce =
            p === "anim.bouncePattern" || p === "anim.bounceStrength";
          if (
            !isBounce &&
            (p.startsWith("anim.") ||
              p.startsWith("intro.") ||
              p.startsWith("hero.") ||
              p.startsWith("expIntro.") ||
              p.startsWith("expPick.") ||
              p.startsWith("expEnter."))
          )
            onReplay?.(p);
        },
      });
      /* スマホモードの QR・実機への反映（共通の phone-mode・開発中だけ） */
      attachPhoneMode(panel as unknown as Parameters<typeof attachPhoneMode>[0]);
      /* 最初の確認の窓は出るたびに作り直されるので、出た時に文字の行を当て直す（2026-10-28） */
      window.addEventListener(SOUND_DLG_SHOWN_EVENT, resyncFonts);
      /* 調整パネルから外して固めた値（2026-10-21）：ブラウザに残った古い保存値で変わらないよう、焼き込み（DEFAULTS）の値に戻す */
      params.msg = structuredClone(DEFAULTS.msg);
      params.scrollSpd = structuredClone(DEFAULTS.scrollSpd);
      /* 同日 2回目（2026-10-21 ヒデさん「画像の箇所の調整パネルは削除で大丈夫です」）：画面写真の値で固めた */
      params.nav = { inMs: 420, outMs: 620 };
      params.face.mouthStroke = 2;
      params.preview = { faceOn: false, patchRed: false };
      params.gourmet.speed = 40;
      params.gourmet.pauseOnHover = false;
      params.events.mqDur = 34;
      params.events.shufPow = 3;
      params.expPick = { pattern: 3 };
      params.videoVol.fadeIn = true;
      params.videoVol.fadeSec = 3;
      /* 保存されていた値を最初の1回だけ反映する */
      applyVars();
      applyVolume();
      pushValues();
      /* イベントセクションのホバー案も初回反映（保存値が焼き込みと違う時のため） */
      window.dispatchEvent(
        new CustomEvent(EVENT_LAYOUT_EVENT, { detail: { v: params.events.pattern } })
      );
      window.dispatchEvent(
        new CustomEvent(EVENT_TAIL_EVENT, { detail: { v: params.events.tailPad } })
      );
      window.dispatchEvent(
        new CustomEvent(EVENT_RATIO_EVENT, { detail: { v: params.events.cardRatio } })
      );

      /* 画面上の音量インジケーター（SoundUi）で変えたら、パネルの
         スライダー表示も追従させる（逆方向同期。2026-08-30） */
      const onUiVol = (e: Event) => {
        const v = (e as CustomEvent<{ v: number }>).detail?.v;
        if (typeof v !== "number") return;
        params.sound.volume = Math.round(v * 100);
        panel?.sync?.();
      };
      window.addEventListener(BGM_VOLUME_UI_EVENT, onUiVol);
      const origDestroy = panel?.destroy;
      if (panel)
        panel.destroy = () => {
          window.removeEventListener(BGM_VOLUME_UI_EVENT, onUiVol);
          origDestroy?.call(panel);
        };
    };

    if (window.TunePanel) {
      build();
    } else {
      const s = document.createElement("script");
      s.src = "/tune-panel.js";
      s.onload = build;
      document.head.appendChild(s);
    }

    return () => {
      window.removeEventListener(SOUND_DLG_SHOWN_EVENT, resyncFonts);
      panel?.destroy();
      madeRef.current = false;
    };
    /* onSettleValues は毎回同じ関数を渡す前提（page 側で useCallback 済み） */
  }, [onSettleValues]);

  return null;
}
