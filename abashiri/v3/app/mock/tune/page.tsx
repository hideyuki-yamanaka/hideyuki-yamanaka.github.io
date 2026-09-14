"use client";

/*
 * 登場演出タイミングの調整パネル（決定版ブラー順出しに対応）
 * - 本物のTOPページを表示しながら、階層化されたパラメーターをいじれる
 * - パネルはドラッグで移動・折りたたみ可能
 * - 「保存して再生」で値をこのブラウザに保存してリロード再生
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import TunePanel from "@/components/TunePanel";
import {
  DEFAULT_HERO_TIMING,
  HERO_TIMING_STORAGE_KEY,
  mergeHeroTiming,
  type HeroTiming,
} from "@/components/heroTiming";

function Row({
  label,
  value,
  step = 50,
  min = 0,
  max = 5000,
  unit = "ms",
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

export default function TunePage() {
  const [loaded, setLoaded] = useState(false);
  const [timing, setTiming] = useState<HeroTiming>(DEFAULT_HERO_TIMING);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HERO_TIMING_STORAGE_KEY);
      if (raw) setTiming(mergeHeroTiming(JSON.parse(raw).timing ?? JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  const upd = <K extends keyof HeroTiming>(key: K, patch: Partial<HeroTiming[K]>) =>
    setTiming((t) => ({ ...t, [key]: { ...(t[key] as object), ...patch } as HeroTiming[K] }));

  const saveAndReplay = () => {
    localStorage.setItem(HERO_TIMING_STORAGE_KEY, JSON.stringify({ timing }));
    location.reload();
  };
  const reset = () => {
    localStorage.removeItem(HERO_TIMING_STORAGE_KEY);
    location.reload();
  };

  return (
    <>
      {loaded && (
        <Stage illustration="tamannee" illustEntrance timing={timing}>
          <TopPage intro={2} blurSeq timing={timing} />
        </Stage>
      )}

      <TunePanel title="⏱ 演出タイミング調整">
        <Section title="全体" defaultOpen>
          <Row
            label="開始までの間（景色を見せる）"
            value={timing.start}
            onChange={(v) => setTiming((t) => ({ ...t, start: v }))}
          />
          <Row
            label="ヘッダーの追いディレイ"
            value={timing.header.extraDelay}
            onChange={(v) => upd("header", { extraDelay: v })}
          />
        </Section>

        <Section title="な〜んにもない（文字のブラー）">
          <Row label="出現にかける時間" value={timing.kotoba.duration} onChange={(v) => upd("kotoba", { duration: v })} />
          <Row label="ブラー量(px)" value={timing.kotoba.blur} step={1} max={40} unit="px" onChange={(v) => upd("kotoba", { blur: v })} />
        </Section>

        <Section title="ぼーっとしてみるボタン">
          <Row label="たまらない後の間" value={timing.button.gap} onChange={(v) => upd("button", { gap: v })} />
          <Row label="出現にかける時間" value={timing.button.duration} onChange={(v) => upd("button", { duration: v })} />
          <Row label="ブラー量(px)" value={timing.button.blur} step={1} max={40} unit="px" onChange={(v) => upd("button", { blur: v })} />
        </Section>

        <Section title="イラスト（一番最後・クルン付き）">
          <Row label="ボタン後の間" value={timing.illust.gap} onChange={(v) => upd("illust", { gap: v })} />
          <Row label="出現にかける時間" value={timing.illust.duration} onChange={(v) => upd("illust", { duration: v })} />
          <Row label="ブラー量(px)" value={timing.illust.blur} step={1} max={40} unit="px" onChange={(v) => upd("illust", { blur: v })} />
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
          href="/"
          className="mt-2 inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
        >
          ← TOPへ
        </Link>
      </TunePanel>
    </>
  );
}
