"use client";

/*
 * 吹き出しの調整パネル
 * - パスの平滑化（歪みならし）と、ぷにぷに呼吸（案1）の動きを数値でいじれる
 * - パネルはドラッグで移動・右下ドラッグでサイズ変更・折りたたみ可能
 * - 「保存して再生」でこのブラウザに保存してリロード再生
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import TunePanel from "@/components/TunePanel";
import {
  BUBBLE_STORAGE_KEY,
  DEFAULT_BUBBLE,
  mergeBubble,
  type BubbleTune,
} from "@/components/bubbleConfig";

function Row({
  label,
  value,
  step = 1,
  min = 0,
  max = 100,
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

export default function BubbleTunePage() {
  const [loaded, setLoaded] = useState(false);
  const [tune, setTune] = useState<BubbleTune>(DEFAULT_BUBBLE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUBBLE_STORAGE_KEY);
      if (raw) setTune(mergeBubble(JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  const upd = <K extends keyof BubbleTune>(key: K, patch: Partial<BubbleTune[K]>) =>
    setTune((t) => ({ ...t, [key]: { ...(t[key] as object), ...patch } as BubbleTune[K] }));

  const saveAndReplay = () => {
    localStorage.setItem(BUBBLE_STORAGE_KEY, JSON.stringify(tune));
    location.reload();
  };
  const reset = () => {
    localStorage.removeItem(BUBBLE_STORAGE_KEY);
    location.reload();
  };

  return (
    <>
      {loaded && (
        <Stage illustration="tamannee" illustEntrance>
          <TopPage intro={2} blurSeq bubbleAnim={4} bubbleTune={tune} />
        </Stage>
      )}

      <TunePanel title="🫧 吹き出し調整">
        <Section title="なめらか補正（歪みならし）" defaultOpen>
          <Row
            label="ならす回数（0でオフ）"
            value={tune.smooth.passes}
            min={0}
            max={10}
            unit="回"
            onChange={(v) => upd("smooth", { passes: v })}
          />
          <Row
            label="輪郭の点の数（少=丸っこい）"
            value={tune.smooth.points}
            step={8}
            min={24}
            max={160}
            unit="点"
            onChange={(v) => upd("smooth", { points: v })}
          />
        </Section>

        <Section title="しっぽが伸びる（しゃべり出す演出）" defaultOpen>
          <Row
            label="伸び出すまでの間"
            value={tune.tail.delay}
            step={50}
            min={0}
            max={3000}
            unit="ms"
            onChange={(v) => upd("tail", { delay: v })}
          />
          <Row
            label="伸びきるまでの時間"
            value={tune.tail.duration}
            step={50}
            min={0}
            max={4000}
            unit="ms"
            onChange={(v) => upd("tail", { duration: v })}
          />
          <Row
            label="はじめの引っ込み量（100でしっぽなし）"
            value={tune.tail.retract}
            step={5}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => upd("tail", { retract: v })}
          />
          <Row
            label="伸びきる時の行き過ぎ（ぽよん）"
            value={tune.tail.overshoot}
            step={2}
            min={0}
            max={60}
            unit="%"
            onChange={(v) => upd("tail", { overshoot: v })}
          />
          <Row
            label="先の角丸を弱める（0=今まで/100=元絵）"
            value={tune.tail.sharp}
            step={5}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => upd("tail", { sharp: v })}
          />
        </Section>

        <Section title="波打ちアニメ（パスに沿って波が流れる）" defaultOpen>
          <Row
            label="波の高さ"
            value={tune.wave.amp}
            step={0.5}
            min={0}
            max={12}
            unit="px"
            onChange={(v) => upd("wave", { amp: v })}
          />
          <Row
            label="波の数（一周あたり）"
            value={tune.wave.waves}
            step={1}
            min={1}
            max={14}
            unit="個"
            onChange={(v) => upd("wave", { waves: v })}
          />
          <Row
            label="波が一周流れる時間"
            value={tune.wave.period}
            step={0.2}
            min={0.5}
            max={12}
            unit="秒"
            onChange={(v) => upd("wave", { period: v })}
          />
        </Section>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={saveAndReplay}
            className="flex-1 cursor-pointer rounded-full bg-[#0070c9] py-2 text-[13px] font-black text-white transition-transform hover:scale-105"
          >
            ▶ 保存して再生
          </button>
          <button
            onClick={reset}
            className="cursor-pointer rounded-full bg-[#e6f3ff] px-3 py-2 text-[12px] font-bold text-[#0070c9]"
          >
            初期値
          </button>
        </div>
        <p className="mt-2 text-[10px] font-bold leading-relaxed text-[#7ba7cc]">
          値はこのブラウザにだけ保存されます。決まったら数値をClaudeに伝えてください（本番に反映します）
        </p>
        <Link
          href="/mock/bubble"
          className="mt-2 inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
        >
          ← 吹き出し一覧へ
        </Link>
      </TunePanel>
    </>
  );
}
