"use client";

/*
 * カモメの位置・見た目の調整パネル
 * - カモメ本体を直接ドラッグして好きな場所へ動かせる（数値も連動）
 * - パネルはドラッグで移動・折りたたみ可能
 * - 「保存」でこのブラウザに記憶、「▶ 再生し直す」でリロード再生
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import TunePanel from "@/components/TunePanel";
import {
  BIRDS_STORAGE_KEY,
  DEFAULT_BIRDS,
  mergeBirds,
  type BirdTune,
  type BirdsConfig,
} from "@/components/birdConfig";

const LABELS: Record<keyof BirdsConfig, string> = {
  skyTopLeft: "空・左上の小さいカモメ",
  skyRight: "空・右中の大きいカモメ（手前）",
  promo1: "プロモ内・右上のカモメ",
  promo2: "プロモ内・左の小さいカモメ",
};

const UNITS: Record<keyof BirdsConfig, string> = {
  skyTopLeft: "px",
  skyRight: "px（右端から）",
  promo1: "%",
  promo2: "%",
};

function Row({
  label,
  value,
  step = 1,
  min = -400,
  max = 2000,
  unit = "",
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
          className="w-[74px] rounded border border-[#bcd6ea] bg-white px-1.5 py-0.5 text-right text-[12px] font-bold text-[#0070c9]"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="w-[64px] text-[10px] text-[#7ba7cc]">{unit}</span>
      </span>
    </label>
  );
}

export default function BirdsTunePage() {
  const [loaded, setLoaded] = useState(false);
  const [birds, setBirds] = useState<BirdsConfig>(DEFAULT_BIRDS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BIRDS_STORAGE_KEY);
      if (raw) setBirds(mergeBirds(JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  const upd = (key: keyof BirdsConfig, patch: Partial<BirdTune>) =>
    setBirds((b) => ({ ...b, [key]: { ...b[key], ...patch } }));

  const save = () => localStorage.setItem(BIRDS_STORAGE_KEY, JSON.stringify(birds));
  const replay = () => {
    save();
    location.reload();
  };
  const reset = () => {
    localStorage.removeItem(BIRDS_STORAGE_KEY);
    location.reload();
  };

  return (
    <>
      {loaded && (
        <Stage
          illustration="tamannee"
          illustEntrance
          birds={birds}
          birdsEditable
          onBirdMove={(key, patch) => upd(key, patch)}
        >
          <TopPage
            intro={2}
            blurSeq
            birds={birds}
            birdsEditable
            onBirdMove={(key, patch) => upd(key, patch)}
          />
        </Stage>
      )}

      <TunePanel title="🕊 カモメ調整（本体をドラッグでも動かせます）">
        <div>
          {(Object.keys(LABELS) as (keyof BirdsConfig)[]).map((key, i) => (
            <details key={key} open={i === 1} className="border-b border-[#e0eefb] py-1">
              <summary className="cursor-pointer select-none py-1 text-[13px] font-black text-[#0070c9]">
                {LABELS[key]}
              </summary>
              <div className="pb-1">
                <Row label="位置X" value={birds[key].x} unit={UNITS[key]} onChange={(v) => upd(key, { x: v })} />
                <Row label="位置Y" value={birds[key].y} unit={UNITS[key].startsWith("%") ? "%" : "px"} onChange={(v) => upd(key, { y: v })} />
                <Row label="大きさ（横幅）" value={birds[key].w} min={16} max={400} unit="px" onChange={(v) => upd(key, { w: v })} />
                <Row label="傾き" value={birds[key].rotate} min={-90} max={90} unit="度" onChange={(v) => upd(key, { rotate: v })} />
                <Row label="線の太さ" value={birds[key].stroke} step={0.5} min={1} max={14} onChange={(v) => upd(key, { stroke: v })} />
                <Row label="羽ばたき周期" value={birds[key].flap} step={0.05} min={0.2} max={2} unit="秒" onChange={(v) => upd(key, { flap: v })} />
                <Row label="ふわふわ周期" value={birds[key].drift} step={0.5} min={2} max={20} unit="秒" onChange={(v) => upd(key, { drift: v })} />
              </div>
            </details>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={replay}
            className="flex-1 cursor-pointer rounded-full bg-[#0070c9] py-2 text-[13px] font-black text-white transition-transform hover:scale-105"
          >
            ▶ 保存して再生し直す
          </button>
          <button
            onClick={reset}
            className="cursor-pointer rounded-full bg-[#e6f3ff] px-3 py-2 text-[12px] font-bold text-[#0070c9]"
          >
            初期値
          </button>
        </div>
        <p className="mt-2 text-[10px] font-bold leading-relaxed text-[#7ba7cc]">
          カモメは画面上で直接ドラッグでも動かせます（数値に反映）。
          決まったら数値をClaudeに伝えてください（本番に反映します）
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
          >
            ← TOPへ
          </Link>
          <Link
            href="/mock/layout"
            className="inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
          >
            📐 レイアウト調整
          </Link>
        </div>
      </TunePanel>
    </>
  );
}
