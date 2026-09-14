"use client";

/*
 * トップページに常時出しておく調整パネル（ヒデさん指示 2026-08-18）
 *
 * ・右下にアコーディオンをたたんだ状態で置く（startClosed）
 * ・仕様は settings/tune-panel/README.md のライブラリ（public/tune-panel.js）に準拠
 *   アコーディオン2階層・検索・localStorage保存・「設定をコピー」・`.`キーで隠す
 *
 * カテゴリの並びは「ページ ＞ セクション ＞ 細目」の3階層（2026-08-21 ヒデさん指示。
 * AnyFlow のパネルと同じ考え方。全部を並列に並べない。全文は settings/tune-panel/README.md）
 *
 * 反映のしかたを2つに分けている
 *   ① 位置・大きさ … globals.css の --illust-* を直接書き換える（React を通さないので
 *      ドラッグ中もカクつかない）
 *   ② 案の切り替え・スクロール連動の値 … 手が止まってから React 側へ渡す（onSettle）
 *
 * ⚠️ 公開前にこのパネルは外すこと（本番の見た目に出てしまうため）
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
  sound: { volume: number };
  bird: { opacity: number; color: string; stroke: number };
  face: FaceConfig;
  sparkle: { period: number };
  spot: SpotTransition;
  kvExit: KvExit;
  hero: HeroEnter;
  msg: MsgTune;
  gourmet: { speed: number; pauseOnHover: boolean };
  expIntro: IntroPace;
  expPick: { pattern: number };
  loop: { cycle: number; show: number; swayFirst: boolean };
  scrollSpd: { kvToMsg: number };
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
      sound: { volume: Math.round(DEFAULT_BGM_VOLUME * 100) },
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
      gourmet: { speed: 40, pauseOnHover: true },
      expIntro: { ...DEFAULT_INTRO_PACE },
      expPick: { pattern: 1 },
      scrollSpd: { kvToMsg: 100 },
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
        tips: { ...params.tips },
        videoVol: { ...params.videoVol },
        expEnter: { ...params.expEnter },
      });

    let panel: { destroy: () => void; sync?: () => void } | null = null;

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
        title: "⚙️ 網走サイト 調整パネル",
        storageKey: "abashiri-top-tune",
        /* ⚠️ 既定値の意味を変えたら必ず上げる（古い保存値が自動で捨てられる）。
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
        version: 33,
        /* ⚠️ autoCenter（既定値を真ん中に置くための自動上限調整）は切る。
           既定が範囲の下寄りの項目で、書いた上限が勝手に縮む
           （人物の登場ディレイが max5秒 → 1秒に見えていた事故。2026-08-23） */
        autoCenter: false,
        /* ページごとのタブ切替（2026-08-23 ヒデさん依頼。タブの中はセクションの折りたたみ） */
        tabs: true,
        startClosed: true /* たたんだ状態で置く（ヒデさん指示） */,
        position: { right: 20, bottom: 20 },
        params,
        defaults: DEFAULTS,
        schema: [
          {
            cat: "🌐 サイト共通",
            open: false,
            items: [
              { sub: "環境音（BGM）" },
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
              { sub: "カモメの見た目（全ページ共通）" },
              {
                note: "ここは色や濃さなど「見た目」だけ。位置・大きさ・傾きは 🏠トップ／🎬体験 の各タブにある「カモメ」で調整します。",
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
            ],
          },
          {
            cat: "🏠 トップページ",
            items: [
              /* 作字（登場・消え方）のパネル項目は 2026-08-21 ヒデさん指示で撤去。
                 数値は heroEnterConfig.ts / kvExitConfig.ts の既定値で固定 */
              /* ── メッセージ文言（テキスト編集。2026-08-30 ヒデさん依頼）。
                 長いのでアコーディオン（タブ内の小見出しは折りたたみ・既定で閉じる） ── */
              /* ── メッセージ（KV直下・カンプ 15480:22896）。
                 文言・出方・見た目を1セクションに統合（2026-08-30 ヒデさん指示） ── */
              { sub: "メッセージ（作字のあと）" },
              { sub: "文言（テキスト編集）", deep: true },
              {
                note: "ここで文章そのものを差し替えられます。本文は「空行で段落を分け、段落内は改行で行を分ける」書き方です。入力するとその場で反映されます。",
              },
              { text: "見出し（大きい文字）", path: "msg.title" },
              {
                text: "本文",
                path: "msg.body",
                multiline: true,
                rows: 14,
                hint: "空行を1つ入れると段落が分かれ、改行だけなら同じ段落の次の行になります。",
              },
              { sub: "出方とスクロール", deep: true },
              {
                note: "作字が消えたあと、ブラーの背景の上に「網走は何もない。」の文章が出ます。スクロールで読み進み、読み終わるとぼーっとスポットへ。",
              },
              {
                pills: "登場の案",
                path: "msg.pattern",
                immediate: true,
                options: Object.entries(MSG_PATTERNS).map(([v, p]) => ({
                  name: p.name,
                  value: Number(v),
                  swatch: "#0070c9",
                  desc: p.note,
                })),
              },
              {
                slider: "スクロール速度（KV→メッセージ）",
                path: "scrollSpd.kvToMsg",
                min: 20,
                max: 300,
                step: 10,
                fmt: "%",
                hint: "キービジュアルからメッセージまでの区間で、ホイール/スワイプ1回に進む量。100%が標準。下げるほどゆっくり進み（同じ距離に多くのスクロールが必要）、上げると速く進みます。",
              },
              {
                slider: "読み終わりまでのスクロール量",
                path: "msg.len",
                min: 800,
                max: 5000,
                step: 200,
                fmt: "px",
                hint: "このぶんスクロールする間に文章を読み進めます。大きいほどゆっくり。",
              },
              {
                slider: "読み終わり後のスクロール量",
                path: "msg.tail",
                min: 0,
                max: 2000,
                step: 100,
                fmt: "px",
                hint: "最後の段落が出そろってから、次のセクションへ行くまでのスクロール量。小さいと最後の文章をゆっくり読めません。",
              },
              {
                slider: "表示開始のスクロール量",
                path: "msg.fadeIn",
                min: 0,
                max: 2000,
                step: 100,
                fmt: "px",
                hint: "作字が消えきってから、メッセージが出はじめるまでのスクロール量。大きいほどゆったり見えます（2026-08-23 上限を600→2000に拡大）。",
              },
              {
                slider: "未読テキストの不透明度",
                path: "msg.minOpacity",
                min: 0,
                max: 60,
                step: 1,
                fmt: "%",
                hint: "案2（浮かび上がり）で、まだ読んでいない文字の不透明度。",
              },
              {
                slider: "アニメーション時間の倍率",
                path: "msg.soft",
                min: 1,
                max: 6,
                step: 0.5,
                hint: "1つの行・段落のアニメーション時間の倍率。大きいほどゆっくりにじみながら出ます。",
              },
              { sub: "見た目", deep: true },
              {
                slider: "見出しが出るまでのスクロール量",
                path: "msg.titleDelay",
                min: 0,
                max: 1500,
                step: 100,
                fmt: "px",
                hint: "メッセージ画面になってから「網走は何もない。」が出るまでのスクロール量。0だと画面と同時に出ます。大きいほど、ひと呼吸おいてから出ます。",
              },
              {
                slider: "見出しのアニメーション時間",
                path: "msg.titleAppearSec",
                min: 0.5,
                max: 4,
                step: 0.5,
                fmt: "s",
                hint: "「網走は何もない。」がブラーから現れる時間。長いほどゆったり出ます（本文と同じ出方）。",
              },
              {
                slider: "見出しの不透明度",
                path: "msg.titleOpacity",
                min: 10,
                max: 100,
                step: 1,
                fmt: "%",
                hint: "「網走は何もない。」の不透明度。カンプは80%。",
              },
              {
                slider: "見出しのフォントウェイト",
                path: "msg.titleWeight",
                min: 100,
                max: 500,
                step: 100,
                hint: "100=Thin（カンプ）〜500=Medium。",
              },
              {
                slider: "見出しの行間",
                path: "msg.titleLeading",
                min: 0.8,
                max: 1.6,
                step: 0.1,
              },
              {
                slider: "本文のフォントウェイト",
                path: "msg.bodyWeight",
                min: 100,
                max: 500,
                step: 100,
                hint: "300=Light がカンプ。",
              },
              {
                slider: "本文の行間",
                path: "msg.bodyLeading",
                min: 1.2,
                max: 3,
                step: 0.1,
              },
              /* ── 人物イラスト ─────────────────── */
              /* 登場のしかたは案3「ポンッ→プルン」で確定（2026-08-21 ヒデさん指示。
                 案ピルは撤去。パターン本体は illustEnterPatterns.ts） */

              { sub: "カモメ（このページの2匹）" },
              {
                note: "このページのカモメは「左上」「右」の2匹。色や濃さは 🌐サイト共通 の「カモメの見た目」にあります。",
              },
              { sub: "左上のカモメ", deep: true },
              {
                slider: "左からの距離",
                path: "pos.birdTopSky1X",
                min: -100,
                max: 1400,
                step: 5,
                fmt: "px",
                hint: "左上のカモメの横位置。上げると右へ動きます。",
              },
              {
                slider: "上からの距離",
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
                slider: "右からの距離",
                path: "pos.birdTopSky2X",
                min: -100,
                max: 1400,
                step: 5,
                fmt: "px",
                hint: "右のカモメの横位置。上げると左へ動きます（右端からの距離のため）。",
              },
              {
                slider: "上からの距離",
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
              /* ── KV → ぼーっとスポット ─────────── */
              { sub: "ぼーっとスポット" },
              { sub: "入り（キービジュアルから）", deep: true },
              {
                note: "作字の消え方は上の「作字｜スクロールでの消え方」にまとめました（同じ項目が2つあったため統合。2026-08-21）。",
              },
              { sub: "① 背景写真", deep: true },
              {
                slider: "ブラーが始まる位置",
                path: "spot.bgFrom",
                min: 0,
                max: 800,
                step: 10,
                fmt: "px",
              },
              {
                slider: "ブラーが最大になる位置",
                path: "spot.bgTo",
                min: 100,
                max: 1400,
                step: 10,
                fmt: "px",
              },
              {
                slider: "最大ブラー",
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
                slider: "ページ末尾までの長さ",
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
              /* ── グルメ｜カルーセル（2026-08-22 ヒデさん依頼） ── */
              { sub: "グルメ｜カルーセル" },
              {
                slider: "1周の時間",
                path: "gourmet.speed",
                min: 10,
                max: 120,
                step: 5,
                fmt: "s",
                hint: "写真の列がひと回りする時間。大きいほどゆっくり。その場で反映されます。",
              },
              {
                toggle: "ホバーで一時停止",
                path: "gourmet.pauseOnHover",
                hint: "ONだと、カードにカーソルを乗せている間は流れが止まり、ホバーの文字をゆっくり読めます。",
              },
              { sub: "人物イラスト" },
              { sub: "登場のタイミング", deep: true },
              {
                slider: "人物の登場ディレイ",
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
                toggle: "ループの前に横揺れ",
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
                slider: "たまらねーの表示時間",
                path: "loop.show",
                min: 0.5,
                max: 6,
                step: 0.5,
                fmt: "s",
              },
              { sub: "置き場所｜枠ごと動かす", deep: true },
              {
                slider: "右端からの距離",
                path: "pos.frameRight",
                min: -100,
                max: 400,
                step: 1,
                fmt: "px",
                hint: "大きくすると左へ寄ります。人物と文字がまとめて動きます。",
              },
              {
                slider: "上からの距離",
                path: "pos.frameTop",
                min: 400,
                max: 980,
                step: 1,
                fmt: "px",
              },
              { sub: "置き場所｜人物そのもの", deep: true },
              {
                slider: "横ずれ",
                path: "pos.personX",
                min: -120,
                max: 120,
                step: 1,
                fmt: "px",
              },
              {
                slider: "縦ずれ",
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
              { sub: "表情（ホバー時）", deep: true },
              /* ホバーの縦バウンスは既定（案1 ぴょこっ）で確定（2026-08-22 ヒデさん指示。
                 案ピルは撤去。パターン本体は hoverBouncePatterns.ts） */
              {
                note: "眉が上がり、口がぽかんと開きます（切替はパキッと・フェード無し）。位置調整は下の「出しっぱなし」をONにするとラクです。",
              },
              { sub: "表情｜眉", deep: true },
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
                slider: "横ずれ",
                path: "face.browX",
                min: -20,
                max: 20,
                step: 1,
                fmt: "px",
                hint: "＋で右へ。",
              },
              {
                slider: "縦ずれ",
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
              { sub: "表情｜口", deep: true },
              {
                slider: "横ずれ",
                path: "face.mouthX",
                min: 30,
                max: 70,
                step: 0.5,
                fmt: "px",
              },
              {
                slider: "縦ずれ",
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
              {
                slider: "線の太さ",
                path: "face.mouthStroke",
                min: 0.5,
                max: 4,
                step: 0.25,
                fmt: "px",
                hint: "カンプは 1.5px です。",
              },
              { sub: "確認用（本番の見た目には出ません）", deep: true },
              {
                toggle: "眉と口を出しっぱなしにする",
                path: "preview.faceOn",
              },
              {
                toggle: "パッチを赤くする",
                path: "preview.patchRed",
              },
              /* ── たまらねー ────────────────────── */
              /* 出方は現状の案で確定（2026-08-22 ヒデさん指示。案ピルは撤去。
                 パターン本体は tamaraneePatterns.ts） */
              { sub: "たまらねー｜位置と大きさ", deep: true },
              {
                slider: "横ずれ",
                path: "pos.tamaraneeX",
                min: -60,
                max: 260,
                step: 1,
                fmt: "px",
              },
              {
                slider: "縦ずれ",
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
              { sub: "たまらねー｜初回のお披露目（登場のあと1回だけ）", deep: true },
              {
                slider: "表示ディレイ",
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
              /* ── キラキラ ─────────────────────── */
              { sub: "キラキラ｜1コマ目（基準の位置）", deep: true },
              {
                slider: "横ずれ",
                path: "pos.sparkleX",
                min: -40,
                max: 160,
                step: 1,
                fmt: "px",
              },
              {
                slider: "縦ずれ",
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
              { sub: "キラキラ｜2コマ目（どこへ跳ぶか）", deep: true },
              {
                slider: "横のずらし",
                path: "pos.sparkle2Dx",
                min: -30,
                max: 30,
                step: 1,
                fmt: "px",
                hint: "＋で右へ。1コマ目からの相対位置です。",
              },
              {
                slider: "縦のずらし",
                path: "pos.sparkle2Dy",
                min: -30,
                max: 30,
                step: 1,
                fmt: "px",
                hint: "−で上へ。",
              },
              {
                slider: "切替の間隔",
                path: "sparkle.period",
                min: 0.3,
                max: 4,
                step: 0.1,
                fmt: "s",
              },
            ],
          },
          {
            cat: "🎬 ぼーっと体験ページ",
            items: [
              { sub: "導入メッセージ（1画面目）" },
              {
                note: "見出しとボタンは最初から出ていて、本文の段落4つが順にブラーで出てきます。値を変えると、その場で最初から再生し直します。",
              },
              {
                slider: "開始ディレイ",
                path: "expIntro.startDelay",
                min: 0,
                max: 5,
                step: 0.2,
                fmt: "s",
                hint: "ページが出てから、最初の段落が出はじめるまでの待ち。",
              },
              {
                slider: "段落の間隔",
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
              { sub: "場所えらび｜カルーセルの登場" },
              {
                pills: "案",
                path: "expPick.pattern",
                immediate: true,
                options: [
                  { name: "案1", value: 1, swatch: "#0070c9", desc: "一斉にブラー解除。全体が同時にゆっくりピントが合う" },
                  { name: "案2", value: 2, swatch: "#0070c9", desc: "中央から順に。真ん中が先に晴れて両隣が続く" },
                  { name: "案3", value: 3, swatch: "#0070c9", desc: "左から順に。1枚ずつ順番に晴れていく" },
                  { name: "案4", value: 4, swatch: "#0070c9", desc: "見出し→カードの二段階で晴れる" },
                  { name: "案5", value: 5, swatch: "#0070c9", desc: "濃いブラー＋ほんの少し縮んで収まる（動きなし）" },
                ],
              },
              {
                note: "案を押すと、その場で場所えらびの画面から登場を再生し直します。",
              },
              { sub: "動画まわり（遷移と再生画面）" },
              { sub: "「ぼーっ」の吹き出し", deep: true },
              /* 出方は現状の案で確定（2026-08-21 ヒデさん指示。案ピルは撤去。
                 パターン本体は boPatterns.ts の DEFAULT_BO） */
              { sub: "「ぼーっ」｜位置と大きさ", deep: true },
              {
                slider: "横ずれ",
                path: "pos.boX",
                min: -60,
                max: 260,
                step: 1,
                fmt: "px",
              },
              {
                slider: "縦ずれ",
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
              { sub: "動画の音", deep: true },
              {
                toggle: "音量を徐々に大きくする",
                path: "videoVol.fadeIn",
                hint: "ONだと再生時に音量0から静かに立ち上がります。OFFで最初から通常音量。",
              },
              {
                slider: "フェード時間",
                path: "videoVol.fadeSec",
                min: 0.5,
                max: 10,
                step: 0.5,
                fmt: "s",
                hint: "音量が最大になるまでの時間。長いほどゆっくり大きくなります。",
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
              { sub: "カモメ（このページの2匹）" },
              {
                note: "このページのカモメは「右」「左」の2匹（左上は多かったので廃止・2026-08-23）。色や濃さは 🌐サイト共通 の「カモメの見た目」にあります。",
              },
              { sub: "右のカモメ", deep: true },
              {
                slider: "右からの距離",
                path: "pos.birdExpSky2X",
                min: -100,
                max: 1400,
                step: 5,
                fmt: "px",
                hint: "右のカモメの横位置。上げると左へ動きます（右端からの距離のため）。",
              },
              {
                slider: "上からの距離",
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
                slider: "左からの距離",
                path: "pos.birdExpX",
                min: 0,
                max: 700,
                step: 1,
                fmt: "px",
              },
              {
                slider: "上からの距離",
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
            ],
          },
        ],
        onChange: () => {
          applyVars();
          applyVolume();
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
      /* 保存されていた値を最初の1回だけ反映する */
      applyVars();
      applyVolume();
      pushValues();

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
      panel?.destroy();
      madeRef.current = false;
    };
    /* onSettleValues は毎回同じ関数を渡す前提（page 側で useCallback 済み） */
  }, [onSettleValues]);

  return null;
}
