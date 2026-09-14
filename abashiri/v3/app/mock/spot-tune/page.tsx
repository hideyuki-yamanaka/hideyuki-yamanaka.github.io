"use client";

/*
 * キービジュアル → ぼーっとスポット の入れ替わり調整パネル
 *
 * 上から下に「作字 → 背景写真 → スポット写真 → 固定ビュー」の順で並んでいて、
 * それぞれ「何px スクロールした時点か」で指定する。
 * パネルの一番上に、いま自分がどの段階にいるかが出る（スクロールしながら見る用）。
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import TunePanel from "@/components/TunePanel";
import {
  DEFAULT_SPOT_TRANSITION,
  SPOT_TRANSITION_STORAGE_KEY,
  mergeSpotTransition,
  totalScroll,
  type SpotTransition,
} from "@/components/spotTransition";

function Row({
  label,
  value,
  step = 10,
  min = 0,
  max = 2000,
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
    <label className="flex items-center justify-between gap-2 py-1 pl-3">
      <span className="text-[12px] font-bold leading-[1.3] text-[#1e1e1e]">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        <input
          type="number"
          className="w-[72px] rounded border border-[#bcd6ea] bg-white px-1.5 py-0.5 text-right text-[12px] font-bold text-[#0070c9]"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="w-[20px] text-[10px] text-[#7ba7cc]">{unit}</span>
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

/** いま何px スクロールしているか（ステージ内のスクローラーを見張る） */
function useStageScroll() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let el: HTMLElement | null = null;
    const onScroll = () => setY(Math.round(el?.scrollTop ?? 0));
    /* TopPage の描画を待ってから掴む */
    const timer = window.setInterval(() => {
      const found = document.querySelector<HTMLElement>(".no-scrollbar");
      if (found && found !== el) {
        el?.removeEventListener("scroll", onScroll);
        el = found;
        el.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      }
    }, 300);
    return () => {
      window.clearInterval(timer);
      el?.removeEventListener("scroll", onScroll);
    };
  }, []);
  return y;
}

export default function SpotTunePage() {
  const [loaded, setLoaded] = useState(false);
  const [tune, setTune] = useState<SpotTransition>(DEFAULT_SPOT_TRANSITION);
  const y = useStageScroll();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SPOT_TRANSITION_STORAGE_KEY);
      if (raw) setTune(mergeSpotTransition(JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  const save = () =>
    localStorage.setItem(SPOT_TRANSITION_STORAGE_KEY, JSON.stringify(tune));
  const reset = () => {
    localStorage.removeItem(SPOT_TRANSITION_STORAGE_KEY);
    setTune(DEFAULT_SPOT_TRANSITION);
  };

  const total = totalScroll(tune);
  const phase =
    y < tune.kvOut
      ? "① 作字が消えていってる"
      : y < tune.bgTo
        ? "② 背景写真がボケていってる"
        : y < tune.spotTo
          ? "③ スポット写真のブラーが晴れてきてる"
          : "④ 固定ビュー（サムネイルを押せる）";

  return (
    <>
      {loaded && (
        <Stage illustration="tamannee" illustEntrance>
          <TopPage intro={2} blurSeq spotTune={tune} />
        </Stage>
      )}

      <TunePanel title="🌫 KV → ぼーっとスポットの入れ替わり">
        <div className="mb-2 rounded-xl bg-[#f2f9ff] px-3 py-2">
          <p className="text-[11px] font-bold text-[#7ba7cc]">
            いまのスクロール位置 {y} / {total} px
          </p>
          <p className="text-[13px] font-black text-[#0070c9]">{phase}</p>
          <div className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full bg-[#d8ecfb]">
            <div
              className="h-full rounded-full bg-[#0070c9] transition-[width] duration-100"
              style={{ width: `${Math.min(100, (y / Math.max(1, total)) * 100)}%` }}
            />
          </div>
        </div>

        <Section title="① 作字（な〜んにもない たまらない）" defaultOpen>
          <Row
            label="消えきる位置"
            value={tune.kvOut}
            max={1200}
            onChange={(v) => setTune((t) => ({ ...t, kvOut: v }))}
          />
        </Section>

        <Section title="② 背景写真（灯台のカット）" defaultOpen>
          <Row
            label="ボケ始める位置"
            value={tune.bgFrom}
            max={1200}
            onChange={(v) => setTune((t) => ({ ...t, bgFrom: v }))}
          />
          <Row
            label="ボケが最大になる位置"
            value={tune.bgTo}
            max={1600}
            onChange={(v) => setTune((t) => ({ ...t, bgTo: v }))}
          />
          <Row
            label="最大のボケ量"
            value={tune.bgBlur}
            step={1}
            max={60}
            onChange={(v) => setTune((t) => ({ ...t, bgBlur: v }))}
          />
        </Section>

        <Section title="③ スポット写真" defaultOpen>
          <Row
            label="出はじめる位置"
            value={tune.spotFrom}
            max={1600}
            onChange={(v) => setTune((t) => ({ ...t, spotFrom: v }))}
          />
          <Row
            label="ブラーが晴れきる位置"
            value={tune.spotTo}
            max={2000}
            onChange={(v) => setTune((t) => ({ ...t, spotTo: v }))}
          />
          <Row
            label="最初のボケ量"
            value={tune.spotBlur}
            step={1}
            max={80}
            onChange={(v) => setTune((t) => ({ ...t, spotBlur: v }))}
          />
        </Section>

        <Section title="④ 固定ビュー" defaultOpen>
          <Row
            label="留まっている長さ"
            value={tune.hold}
            max={3000}
            onChange={(v) => setTune((t) => ({ ...t, hold: v }))}
          />
          <p className="pl-3 pt-1 text-[10px] font-bold leading-relaxed text-[#7ba7cc]">
            総スクロール量 = {tune.spotTo} + {tune.hold} = {total}px。
            ここを長くすると、晴れたあと画面に留まる時間が長くなります
          </p>
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
          その場で反映されます（リロード不要）。決まったら数値をClaudeに伝えてください（本番に入れます）
        </p>
        <Link
          href="/mock"
          className="mt-2 inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
        >
          ← mock 一覧へ
        </Link>
      </TunePanel>
    </>
  );
}
