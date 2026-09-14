"use client";

/*
 * 人物イラストの登場演出 調整パネル
 * 2案をその場で切り替えて、何度でも見返せる。
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Stage from "@/components/Stage";
import TopPage from "@/components/TopPage";
import TunePanel from "@/components/TunePanel";
import { ILLUST_ENTER_PATTERNS } from "@/components/illustEnterPatterns";

export default function IllustEnterTune() {
  const [pattern, setPattern] = useState(1);
  /* key を変えると Stage ごと作り直されて、登場演出が最初から流れる */
  const [take, setTake] = useState(0);
  /* true: キービジュアルの演出を待たず、すぐ人物だけ出す（何度も見る用） */
  const [soloMode, setSoloMode] = useState(true);

  const pat = ILLUST_ENTER_PATTERNS[pattern - 1];
  const replay = () => setTake((t) => t + 1);

  /* 人物だけ見たい時は、キービジュアルの演出を待たずに自分で合図を出す
     （本番では TopPage が全部そろったタイミングで同じイベントを投げる） */
  useEffect(() => {
    if (!soloMode) return;
    const id = window.setTimeout(
      () => window.dispatchEvent(new Event("abashiri:illust-in")),
      500
    );
    return () => window.clearTimeout(id);
  }, [soloMode, pattern, take]);

  return (
    <>
      <div key={`${pattern}-${take}-${soloMode ? "solo" : "full"}`}>
        <Stage illustration="tamannee" illustEntrance illustEnter={pattern}>
          <TopPage intro={2} blurSeq={!soloMode} />
        </Stage>
      </div>

      <TunePanel title="🚶 人物イラストの登場演出">
        <div className="flex flex-col gap-3 p-1">
          <div>
            <p className="mb-1.5 text-[11px] font-bold text-[#0070c9]">案を切り替える</p>
            <div className="flex flex-col gap-1.5">
              {ILLUST_ENTER_PATTERNS.map((p, i) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setPattern(i + 1);
                    replay();
                  }}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-left text-[12px] leading-[1.5] transition-colors ${
                    pattern === i + 1
                      ? "bg-[#0070c9] font-bold text-white"
                      : "bg-[#e6f3ff] font-medium text-[#0b3c69] hover:bg-[#d3e9ff]"
                  }`}
                >
                  {p.label}
                  <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                    {p.note}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={replay}
            className="cursor-pointer rounded-lg bg-[#0b3c69] px-3 py-2 text-[12px] font-bold text-white transition-transform hover:scale-[1.02]"
          >
            ↺ もう一度見る
          </button>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-[#f4f8fc] px-3 py-2">
            <input
              type="checkbox"
              checked={soloMode}
              onChange={(e) => {
                setSoloMode(e.target.checked);
                replay();
              }}
              className="mt-0.5"
            />
            <span className="text-[11px] leading-[1.5] text-[#3c4a57]">
              人物だけすぐ出す
              <span className="mt-0.5 block text-[10px] text-[#8c9ba8]">
                外すと、本番と同じくキービジュアルの演出（約4.5秒）を待ってから出ます
              </span>
            </span>
          </label>

          <div className="rounded-lg bg-[#f4f8fc] px-3 py-2 text-[10px] leading-[1.7] text-[#5a6b7a]">
            <p className="font-bold text-[#0b3c69]">今の案の中身</p>
            <p>尺 {(Number(pat.transition.duration) || 0).toFixed(1)} 秒</p>
            <p>着地点はどちらも同じカンプ位置 (1245, 764)</p>
          </div>

          <Link
            href="/mock/illust-enter"
            className="rounded-lg bg-white px-3 py-2 text-center text-[11px] font-medium text-[#0070c9] ring-1 ring-[#cfe3f5]"
          >
            ← 一覧へ
          </Link>
        </div>
      </TunePanel>
    </>
  );
}
