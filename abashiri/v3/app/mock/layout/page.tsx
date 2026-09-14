"use client";

/*
 * 画面レイアウト＋サウンドボタンの調整パネル
 * - タブレット位置 / 右カラム（ロゴ・SNS・観光サイト）位置 / サウンドボタンの見た目
 * - すべてその場で即反映（リロード不要）
 * - パネルはドラッグで移動・右下ドラッグでサイズ変更・折りたたみ可能
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import TunePanel from "@/components/TunePanel";
import {
  DEFAULT_LAYOUT,
  LAYOUT_STORAGE_KEY,
  mergeLayout,
  type LayoutTune,
} from "@/components/layoutConfig";
import {
  DEFAULT_SOUND_BTN,
  SOUND_BTN_STORAGE_KEY,
  SOUND_BTN_TUNE_EVENT,
  mergeSoundBtn,
  type SoundBtnTune,
} from "@/components/soundBtnConfig";

function Row({
  label,
  value,
  step = 1,
  min = -300,
  max = 500,
  unit = "px",
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-1 pl-4">
      <span className="text-[12px] font-bold text-[#1e1e1e]">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          className="w-[76px] rounded border border-[#bcd6ea] bg-white px-1.5 py-0.5 text-right text-[12px] font-bold text-[#0070c9]"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="w-[22px] text-[10px] text-[#7ba7cc]">{unit}</span>
      </span>
    </label>
  );
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="border-b border-[#e0eefb] py-1">
      <summary className="cursor-pointer select-none py-1 text-[13px] font-black text-[#0070c9]">
        {title}
      </summary>
      <div className="pb-1">{children}</div>
    </details>
  );
}

export default function LayoutTunePage() {
  const [loaded, setLoaded] = useState(false);
  const [layout, setLayout] = useState<LayoutTune>(DEFAULT_LAYOUT);
  const [btn, setBtn] = useState<SoundBtnTune>(DEFAULT_SOUND_BTN);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (raw) setLayout(mergeLayout(JSON.parse(raw)));
      const rawB = localStorage.getItem(SOUND_BTN_STORAGE_KEY);
      if (rawB) setBtn(mergeSoundBtn(JSON.parse(rawB)));
    } catch {}
    setLoaded(true);
  }, []);

  /* サウンドボタンはSoundUi(共通UI)側にイベントでライブ反映 */
  const updBtn = (patch: Partial<SoundBtnTune>) => {
    setBtn((b) => {
      const next = { ...b, ...patch };
      window.dispatchEvent(
        new CustomEvent(SOUND_BTN_TUNE_EVENT, { detail: next })
      );
      return next;
    });
  };

  const save = () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    localStorage.setItem(SOUND_BTN_STORAGE_KEY, JSON.stringify(btn));
  };
  const reset = () => {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
    localStorage.removeItem(SOUND_BTN_STORAGE_KEY);
    setLayout(DEFAULT_LAYOUT);
    setBtn(DEFAULT_SOUND_BTN);
    window.dispatchEvent(
      new CustomEvent(SOUND_BTN_TUNE_EVENT, { detail: DEFAULT_SOUND_BTN })
    );
  };

  return (
    <>
      {loaded && (
        <Stage illustration="tamannee" illustEntrance layout={layout}>
          <TopPage intro={2} blurSeq layout={layout} />
        </Stage>
      )}

      <TunePanel title="📐 レイアウト調整">
        <Section title="タブレット位置" defaultOpen>
          <Row
            label="横ずらし（＋で右へ）"
            value={layout.tabletX}
            onChange={(v) => setLayout((l) => ({ ...l, tabletX: v }))}
          />
          <Row
            label="縦ずらし（−で上へ）"
            value={layout.tabletY}
            onChange={(v) => setLayout((l) => ({ ...l, tabletY: v }))}
          />
        </Section>

        <Section title="右カラム（ロゴ・SNS・観光サイト）" defaultOpen>
          <Row
            label="右端からの距離"
            value={layout.railX}
            min={0}
            max={400}
            onChange={(v) => setLayout((l) => ({ ...l, railX: v }))}
          />
          <Row
            label="上からの距離"
            value={layout.railY}
            min={0}
            max={600}
            onChange={(v) => setLayout((l) => ({ ...l, railY: v }))}
          />
        </Section>

        <Section title="サウンドボタン（左上の音声アイコン）" defaultOpen>
          <Row
            label="白の濃さ"
            value={btn.opacity}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => updBtn({ opacity: v })}
          />
          <Row
            label="背景ブラー"
            value={btn.blur}
            min={0}
            max={40}
            onChange={(v) => updBtn({ blur: v })}
          />
        </Section>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={save}
            className="flex-1 cursor-pointer rounded-full bg-[#0070c9] py-2 text-[13px] font-black text-white transition-transform hover:scale-105"
          >
            この値を保存
          </button>
          <button
            onClick={reset}
            className="cursor-pointer rounded-full bg-[#e6f3ff] px-3 py-2 text-[12px] font-bold text-[#0070c9]"
          >
            初期値
          </button>
        </div>
        <p className="mt-2 text-[10px] font-bold leading-relaxed text-[#7ba7cc]">
          すべてその場で反映されます。決まったら数値をClaudeに伝えてください（本番に反映します）
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
          >
            ← TOPへ
          </Link>
          <Link
            href="/mock/birds"
            className="inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
          >
            🕊 カモメ調整
          </Link>
        </div>
      </TunePanel>
    </>
  );
}
