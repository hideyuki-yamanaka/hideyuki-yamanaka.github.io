"use client";

/*
 * 網走の環境音（BGM）まわりのUI一式（案1採用版）
 *
 * - 初回訪問時：「網走の環境音を楽しむことができます。再生しますか？」の ON/OFF 確認
 * - 以降はスピーカーのピクトグラム1つで ON/OFF を交互切替（OFFは斜線つき）
 * - ボタンの表示は「実際に音が鳴っているか」と常に同期
 *   （ONにしたら鳴る／OFFにしたら止まる、が直感どおりになる）
 * - ぼーっと体験の動画再生中は環境音を自動で止め、動画が止まったら復帰
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { markConsentDone } from "./consentGate";
import { devSilent } from "./devSound";
import {
  BGM_VOLUME_EVENT,
  BGM_VOLUME_UI_EVENT,
  DEFAULT_BGM_VOLUME,
  clampVolume,
} from "./bgmConfig";
import { bgmGainAt } from "./bgmGain";

/** 白モック内のボタン置き場（TopPage / ExperienceFlow が用意する） */
const SLOT_ID = "abashiri-sound-slot";

import {
  DEFAULT_SOUND_BTN,
  SOUND_BTN_STORAGE_KEY,
  SOUND_BTN_TUNE_EVENT,
  mergeSoundBtn,
  type SoundBtnTune,
} from "./soundBtnConfig";

const KEY = "abashiri-bgm";
export const VIDEO_AUDIO_EVENT = "abashiri:video-audio";

/* スピーカーのピクトグラム。OFFの時は斜線が入る */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[20px] w-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M4 9.3v5.4h3.4L12.2 19V5L7.4 9.3H4Z"
        fill="currentColor"
        strokeWidth="1.4"
      />
      {on && (
        <>
          <path d="M15.3 9.4a3.7 3.7 0 0 1 0 5.2" />
          <path d="M17.8 7a7.1 7.1 0 0 1 0 10" />
        </>
      )}
      {!on && <line x1="3" y1="3.4" x2="21" y2="20.6" />}
    </svg>
  );
}

export default function SoundUi({
  askConsent = false,
  alwaysAsk = false,
}: {
  /** true: 初回にON/OFF確認ダイアログを出す（TOPページ用） */
  askConsent?: boolean;
  /** true: 記憶を無視して毎回ダイアログを出す（確認用） */
  alwaysAsk?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  /** ユーザーの意思（ONにしたい/したくない）。セッション中記憶 */
  const intentRef = useRef(false);
  /** ボタン表示用のON/OFF。「実際に鳴っているか」ではなく「意思」に追従する。
      自動再生ブロック中（意思はONだが音はまだ）でもONと表示し、最初の操作で鳴り始める
      （2026-09-11 ヒデさん指示：リロード後にOFF表示に見えるのを解消） */
  const [audible, setAudible] = useState(false);
  const duckRef = useRef(false); /* 動画再生中フラグ（動画の音声優先） */
  /* 環境音の音量（0〜1）。既定は bgmConfig.ts。調整パネルから変えられる */
  const volRef = useRef(DEFAULT_BGM_VOLUME);
  /* 音量インジケーター（ONの状態でもう一度ONを押すと出るスライダー。
     2026-08-30 ヒデさん依頼）。vol はスライダー表示用の state（volRef と同期） */
  const [showVol, setShowVol] = useState(false);
  const [vol, setVol] = useState(DEFAULT_BGM_VOLUME);
  const wrapRef = useRef<HTMLDivElement>(null);
  /* 最初のHTML（JSが動く前）からモーダルを出しておく。
     「立ち上げ直後にグラデの画面だけが見える」（2026-08-21 ヒデさん指摘）の対策。
     同じタブで2回目以降（記憶あり）の時は、下の初期化ですぐ閉じる */
  const [showDialog, setShowDialog] = useState(askConsent);

  /* ボタンの見た目（白の濃さ・背景ブラー）。調整パネルからライブで変えられる */
  const [btnTune, setBtnTune] = useState<SoundBtnTune>(DEFAULT_SOUND_BTN);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOUND_BTN_STORAGE_KEY);
      if (raw) setBtnTune(mergeSoundBtn(JSON.parse(raw)));
    } catch {}
    const onTune = (e: Event) =>
      setBtnTune(mergeSoundBtn((e as CustomEvent).detail));
    window.addEventListener(SOUND_BTN_TUNE_EVENT, onTune);
    return () => window.removeEventListener(SOUND_BTN_TUNE_EVENT, onTune);
  }, []);

  /* ボタンはモック内左上の置き場に出す。無いページでは画面左下に出す */
  const pathname = usePathname();
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => {
    const find = () => setSlot(document.getElementById(SLOT_ID));
    find();
    /* ページ遷移直後は置き場がまだ無いことがあるので現れるまで監視 */
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [pathname]);

  /* 後半がうるさいトラック対策：曲の進行に合わせて音量を少しずつ絞る。
     最初はしっかり聞こえ、後半（うるさい所）は抑える。ループ先頭で音量は戻るが
     中身も静かな頭に戻るので、体感の大きさは揃う（2026-08-28 ヒデさん指示）。 */
  const applyVol = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    /* 実測ラウドネス（bgmGain.ts）を打ち消す。うるさい所ほど下げ、頭はそのまま */
    a.volume = clampVolume(volRef.current * bgmGainAt(a.currentTime));
  }, []);

  const play = () => {
    const a = audioRef.current;
    if (!a || duckRef.current) return;
    if (devSilent()) return; /* 開発中(localhost)は鳴らさない。?sound で解除 */
    applyVol();
    a.muted = false;
    a.play().catch(() => {});
  };

  /* 再生位置に合わせて常に音量エンベロープを反映する */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.addEventListener("timeupdate", applyVol);
    return () => a.removeEventListener("timeupdate", applyVol);
  }, [applyVol]);

  const saveIntent = (next: boolean) => {
    intentRef.current = next;
    setAudible(next); /* ボタン表示は意思に即追従（鳴るのを待たない） */
    try {
      sessionStorage.setItem(KEY, next ? "on" : "off");
    } catch {}
  };

  /* 調整パネルからの音量変更。鳴っている最中でもその場で反映する */
  useEffect(() => {
    const onVol = (e: Event) => {
      const v = (e as CustomEvent<{ v: number }>).detail?.v;
      if (typeof v !== "number") return;
      volRef.current = clampVolume(v);
      setVol(volRef.current); /* インジケーターのスライダーも追従 */
      applyVol();
    };
    window.addEventListener(BGM_VOLUME_EVENT, onVol);
    return () => window.removeEventListener(BGM_VOLUME_EVENT, onVol);
  }, []);

  /* インジケーターは「鳴っている時」だけ意味を持つ。OFFになったら閉じる */
  useEffect(() => {
    if (!audible) setShowVol(false);
  }, [audible]);

  /* インジケーターの外側をクリックしたら閉じる（ボタン自身の中は閉じない） */
  useEffect(() => {
    if (!showVol) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowVol(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [showVol]);

  /* 以前は audio の play/pause イベントに表示を同期していたが、
     自動再生ブロック中に OFF 表示へ落ちてしまうためやめた（saveIntent で更新する）。
     動画中の一時停止（duck）はここでは表示に反映しない＝意思はONのまま */

  /* 初期化：記憶を読む＋必要ならダイアログ。
     ON記憶で自動再生がブロックされたら、最初の操作でそっと再開 */
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(KEY);
    } catch {}
    if (askConsent && (alwaysAsk || saved === null)) {
      setShowDialog(true);
    } else {
      /* ダイアログを出さない時は、すぐアニメーション開始してよい */
      setShowDialog(false);
      markConsentDone();
    }
    /* リロード（記憶あり）では、前回OFFでも環境音ONで開始する
       （2026-08-31 ヒデさん指示「リロードした際はデフォルトON」）。
       自動再生がブロックされた時は、最初の操作でそっと鳴り始める */
    if (saved !== null) {
      intentRef.current = true;
      saveIntent(true);
      play();
      const resume = () => {
        if (intentRef.current && !duckRef.current && audioRef.current?.paused) play();
        window.removeEventListener("pointerdown", resume);
        window.removeEventListener("keydown", resume);
      };
      window.addEventListener("pointerdown", resume);
      window.addEventListener("keydown", resume);
      return () => {
        window.removeEventListener("pointerdown", resume);
        window.removeEventListener("keydown", resume);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 動画の音声優先：再生中は環境音を止める */
  useEffect(() => {
    const handler = (e: Event) => {
      const active = Boolean((e as CustomEvent).detail?.active);
      duckRef.current = active;
      const a = audioRef.current;
      if (!a) return;
      if (active) a.pause();
      else if (intentRef.current) play();
    };
    window.addEventListener(VIDEO_AUDIO_EVENT, handler);
    return () => window.removeEventListener(VIDEO_AUDIO_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (next: boolean) => {
    setShowDialog(false);
    saveIntent(next);
    if (next) play();
    else audioRef.current?.pause();
    /* ON/OFFを選んだらアニメーション開始の合図を出す */
    markConsentDone();
  };

  /* ボタンは「今鳴っているか」で切り替える：
     無音なら押すと鳴る／鳴っていれば押すと止まる */
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      saveIntent(true);
      play();
    } else {
      saveIntent(false);
      a.pause();
    }
  };

  return (
    <>
      <audio ref={audioRef} src="/audio/cape-sound.mp4" loop preload="auto" />

      {/* 初回のON/OFF確認（白カードのモーダル）。
          一度「文言なし・白40%」へ変えたが、元のこの形に戻した（2026-08-22 ヒデさん指示） */}
      {showDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-shadow/30 backdrop-blur-22">
          <div className="mx-4 flex w-[400px] max-w-full flex-col items-center rounded-30 bg-white/90 p-8 text-center shadow-modal">
            <p className="mb-6 text-body-16 font-bold leading-[1.6] text-ink">
              網走の環境音を楽しむことができます。
              <br />
              再生しますか？
            </p>
            <div className="flex w-full items-center gap-3">
              <button
                onClick={() => answer(true)}
                className="flex-1 cursor-pointer rounded-full bg-brand py-3 text-body-16 font-black text-white transition-transform hover:scale-105"
              >
                ON
              </button>
              {/* OFF は塗りなし（ヒデさん指示 2026-08-21。白ベタをやめて文字だけ） */}
              <button
                onClick={() => answer(false)}
                className="flex-1 cursor-pointer rounded-full py-3 text-body-16 font-black text-ink transition-transform hover:scale-105"
              >
                OFF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 常設のBGMスイッチ（カンプ 15492:21886・2026-08-22 ブラッシュアップ版）
          ピル型・ON/OFF表記・SF Pro（font-num）。今の状態の側が青いピルになる。
          アイコンはカンプの 17.82px → 18px に丸め（DESIGN-SYSTEM-V2 の丸めルール）。
          白モック内の置き場があればそこ（左上・ヘッダーと上下中央ぞろえ）、無いページでは画面左下 */}
      {!showDialog &&
        (() => {
          const seg = (
            on: boolean,
            label: string,
            iconActive: string,
            iconInactive: string
          ) => {
            const active = on === audible;
            const icon = active ? iconActive : iconInactive;
            return (
              <button
                key={label}
                onClick={() => {
                  if (active) {
                    /* ONが青い（＝鳴っている）状態でもう一度ONを押したら、
                       音量インジケーターを出し入れする（2026-08-30 ヒデさん依頼）。
                       OFF側の再クリックでは何も出さない */
                    if (on) setShowVol((s) => !s);
                    return;
                  }
                  if (on) {
                    /* OFF→ON にした時はインジケーターは出さない（仕様） */
                    saveIntent(true);
                    play();
                  } else {
                    saveIntent(false);
                    audioRef.current?.pause();
                  }
                }}
                aria-pressed={active}
                className={`font-num flex w-[90px] cursor-pointer items-center justify-center gap-1 rounded-full px-[10px] py-[5px] text-body-16 font-light leading-[1.2] transition-colors duration-300 ease-standard ${
                  active
                    ? "bgm-seg-active bg-brand text-white"
                    : "bgm-seg-inactive text-white/50 hover:text-white/80"
                }`}
              >
                <img src={icon} alt="" className="size-[18px]" />
                {label}
              </button>
            );
          };
          const btn = (
            <div
              ref={wrapRef}
              className={`${slot ? "relative" : "fixed bottom-4 left-4 z-50"}`}
            >
              <div className="bgm-switch flex items-center justify-center rounded-full bg-white/40 p-[2px] backdrop-blur-[62px] transition-colors duration-500 ease-standard">
                {/* アイコンは状態ごとに別アセット（カンプ 15492:21886=ON時 / 15492:22168=OFF時） */}
                {seg(true, "ON", "/img/icon-bgm-on.svg", "/img/icon-bgm-on-dim.svg")}
                {seg(false, "OFF", "/img/icon-bgm-off-active.svg", "/img/icon-bgm-off.svg")}
              </div>

              {/* 音量インジケーター：ONが鳴っている状態でもう一度ONを押すと出る。
                  スイッチと同じ白ガラスのピルに、スピーカー小アイコン＋スライダー＋% */}
              <div
                className={`bgm-switch absolute left-0 top-[calc(100%+8px)] flex w-[184px] items-center gap-2 rounded-full bg-white/40 py-[7px] pl-3 pr-4 backdrop-blur-[62px] transition-all duration-300 ease-standard ${
                  showVol
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0"
                }`}
              >
                <img src="/img/icon-bgm-on.svg" alt="" className="size-[16px] shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(vol * 100)}
                  aria-label="環境音の音量"
                  onChange={(e) => {
                    const v = clampVolume(Number(e.target.value) / 100);
                    volRef.current = v;
                    setVol(v);
                    applyVol();
                    /* 調整パネルのスライダーにも追従してもらう（逆方向同期） */
                    window.dispatchEvent(
                      new CustomEvent(BGM_VOLUME_UI_EVENT, { detail: { v } })
                    );
                  }}
                  className="bgm-vol-slider h-[4px] min-w-0 flex-1 cursor-pointer appearance-none rounded-full"
                  style={{
                    background: `linear-gradient(to right, #fff ${Math.round(vol * 100)}%, rgba(255,255,255,0.35) ${Math.round(vol * 100)}%)`,
                  }}
                />
                <span className="font-num w-[34px] shrink-0 text-right text-[13px] font-light leading-none text-white">
                  {Math.round(vol * 100)}%
                </span>
              </div>
            </div>
          );
          return slot ? createPortal(btn, slot) : btn;
        })()}
    </>
  );
}
