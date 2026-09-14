"use client";

/*
 * タブレット浮遊シャドウ（案3「斜め光」採用版）の調整パネル
 * - 影の位置・ぼかし・広がり・色・濃さを数値でいじれる
 * - パネルはドラッグで移動・右下ドラッグでサイズ変更・折りたたみ可能
 * - 影は保存しなくてもその場で反映される（リロード不要）
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import TunePanel from "@/components/TunePanel";
import {
  DEFAULT_SHADOW,
  SHADOW_STORAGE_KEY,
  mergeShadow,
  type ShadowTune,
} from "@/components/shadowConfig";

function Row({
  label,
  value,
  step = 1,
  min = -200,
  max = 200,
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

export default function ShadowTunePage() {
  const [loaded, setLoaded] = useState(false);
  const [tune, setTune] = useState<ShadowTune>(DEFAULT_SHADOW);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHADOW_STORAGE_KEY);
      if (raw) setTune(mergeShadow(JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  const save = () => {
    localStorage.setItem(SHADOW_STORAGE_KEY, JSON.stringify(tune));
  };
  const reset = () => {
    localStorage.removeItem(SHADOW_STORAGE_KEY);
    setTune(DEFAULT_SHADOW);
  };

  return (
    <>
      {loaded && (
        <Stage illustration="tamannee" illustEntrance>
          <TopPage intro={2} blurSeq bubbleAnim={4} shadowTune={tune} />
        </Stage>
      )}

      <TunePanel title="🌫 浮遊シャドウ調整（案3ベース）">
        <Section title="影の位置と形" defaultOpen>
          <Row
            label="横ずれ（−で左へ）"
            value={tune.x}
            onChange={(v) => setTune((t) => ({ ...t, x: v }))}
          />
          <Row
            label="縦ずれ（＋で下へ）"
            value={tune.y}
            onChange={(v) => setTune((t) => ({ ...t, y: v }))}
          />
          <Row
            label="ぼかし"
            value={tune.blur}
            min={0}
            max={300}
            onChange={(v) => setTune((t) => ({ ...t, blur: v }))}
          />
          <Row
            label="広がり（−で締まる）"
            value={tune.spread}
            min={-100}
            max={100}
            onChange={(v) => setTune((t) => ({ ...t, spread: v }))}
          />
        </Section>

        <Section title="色と濃さ" defaultOpen>
          <label className="flex items-center justify-between gap-2 py-1 pl-4">
            <span className="text-[12px] font-bold text-[#1e1e1e]">影の色</span>
            <span className="flex items-center gap-1">
              <input
                type="color"
                value={tune.color}
                onChange={(e) => setTune((t) => ({ ...t, color: e.target.value }))}
                className="h-[26px] w-[44px] cursor-pointer rounded border border-[#bcd6ea] bg-white"
              />
              <span className="w-[54px] text-[10px] font-bold text-[#7ba7cc]">
                {tune.color}
              </span>
            </span>
          </label>
          <Row
            label="濃さ"
            value={tune.opacity}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => setTune((t) => ({ ...t, opacity: v }))}
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
          影はその場で反映されます（リロード不要）。決まったら数値をClaudeに伝えてください（本番に反映します）
        </p>
        <Link
          href="/mock/shadow"
          className="mt-2 inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
        >
          ← シャドウ一覧へ
        </Link>
      </TunePanel>
    </>
  );
}
