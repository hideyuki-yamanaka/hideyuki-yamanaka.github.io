"use client";

/*
 * 眉毛（新イラスト用）の確認・調整ページ
 *
 * 見るもの
 *   1. 眉が持ち上がる量
 *   2. 元の眉を隠す肌色パッチが、ちゃんと元の眉を覆えているか
 *      （「パッチを赤くする」を ON にすると、はみ出し・覆い残しが一目で分かる）
 *
 * 眉のパスは scripts/illust-brow-trace.py が illustMainPaths.ts に書き出したもの。
 * 絵を描き直したらスクリプトを流し直すこと（手で書き換えない）。
 */
import { useState } from "react";
import Link from "next/link";
import TunePanel from "@/components/TunePanel";
import IllustTamannee from "@/components/IllustTamannee";
import { DEFAULT_FACE } from "@/components/faceConfig";
import {
  BROW_FILL,
  ILLUST_VIEWBOX,
  PATCH_SPREAD,
  SKIN_FILL,
} from "@/components/illustMainPaths";

/* 本番の表示サイズ（162x227）。ここでは倍率をかけて大きく見せる */
const BASE_W = 162;
const BASE_H = 266.75; /* 下 40px は画面外へ隠す延長ぶん */

function Row({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-1 pl-3">
      <span className="text-[12px] font-bold leading-[1.3] text-[#1e1e1e]">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        <input
          type="range"
          className="w-[96px]"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="w-[52px] text-right text-[12px] font-bold text-[#0070c9]">
          {value}
          {unit}
        </span>
      </span>
    </label>
  );
}

export default function BrowMockPage() {
  const [lift, setLift] = useState(DEFAULT_FACE.browLift);
  const [spread, setSpread] = useState(PATCH_SPREAD);
  const [zoom, setZoom] = useState(3);
  const [debugPatch, setDebugPatch] = useState(false);
  const [hover, setHover] = useState(true);

  const w = BASE_W * zoom;
  const h = BASE_H * zoom;

  return (
    <main className="h-dvh overflow-y-auto bg-[#e6f3ff] px-6 py-10">
      <div className="mx-auto w-full max-w-[860px]">
        <p className="text-[13px] font-medium tracking-[0.12em] text-[#0070c9]">
          ABASHIRI v1.2 / 人物イラスト
        </p>
        <h1 className="mt-2 text-[28px] font-light leading-[1.4] text-[#0b3c69]">
          眉毛と口元のホバー演出（新しい絵）
        </h1>
        <p className="mt-3 text-[15px] font-light leading-[1.8] text-[#3c4a57]">
          新しいイラストから眉だけをトレースし直しました。
          <br />
          元の眉は<strong className="font-medium">肌色のパッチで塗りつぶし</strong>、その上に動く眉を重ねています。
          <br />
          「パッチを赤くする」を ON にすると、元の眉を覆えているかが分かります
          （赤の外に黒がはみ出していたら覆い残し）。
        </p>

        <div className="mt-8 flex flex-wrap items-start gap-8">
          <div
            className="relative shrink-0 rounded-2xl bg-[#b5d7ff] p-4"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            {/* IllustTamannee の中身は絶対配置なので、外側で必ず大きさを与える */}
            <div style={{ width: w, height: h }}>
              <IllustTamannee
                lift={hover ? lift : 0}
                patchSpread={spread}
                debugPatch={debugPatch}
                mouthOpen={hover}
                className="size-full"
              />
            </div>
            <p className="mt-2 text-center text-[12px] font-bold text-[#0b3c69]">
              {zoom}倍表示（本番は {BASE_W}x{BASE_H}）
            </p>
          </div>

          <div className="min-w-[260px] flex-1 rounded-2xl bg-white p-5">
            <p className="text-[13px] font-black text-[#0070c9]">トレース結果</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px] font-light text-[#3c4a57]">
              <dt>座標系</dt>
              <dd>
                {ILLUST_VIEWBOX.w} x {ILLUST_VIEWBOX.h}
              </dd>
              <dt>眉の色</dt>
              <dd className="flex items-center gap-2">
                <span
                  className="inline-block size-[14px] rounded border border-[#ccc]"
                  style={{ background: BROW_FILL }}
                />
                {BROW_FILL}
              </dd>
              <dt>パッチの色</dt>
              <dd className="flex items-center gap-2">
                <span
                  className="inline-block size-[14px] rounded border border-[#ccc]"
                  style={{ background: SKIN_FILL }}
                />
                {SKIN_FILL}
              </dd>
            </dl>
            <p className="mt-3 text-[12px] font-light leading-[1.7] text-[#5a6b7a]">
              値はイラストから実測したものです。描き直した時は
              <code className="mx-1 rounded bg-[#eef6ff] px-1">
                python3 scripts/illust-brow-trace.py
              </code>
              を流し直してください。
            </p>
          </div>
        </div>

        <TunePanel title="🙂 眉毛の調整">
          <Row
            label="持ち上げる量"
            value={lift}
            min={0}
            max={20}
            onChange={setLift}
          />
          <Row
            label="パッチの太らせ"
            value={spread}
            min={0}
            max={200}
            step={5}
            unit=""
            onChange={setSpread}
          />
          <Row label="表示倍率" value={zoom} min={1} max={6} unit="倍" onChange={setZoom} />
          <label className="flex items-center justify-between gap-2 py-2 pl-3">
            <span className="text-[12px] font-bold text-[#1e1e1e]">パッチを赤くする</span>
            <input
              type="checkbox"
              checked={debugPatch}
              onChange={(e) => setDebugPatch(e.target.checked)}
              className="size-[16px]"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-2 pl-3">
            <span className="text-[12px] font-bold text-[#1e1e1e]">眉を上げた状態にする</span>
            <input
              type="checkbox"
              checked={hover}
              onChange={(e) => setHover(e.target.checked)}
              className="size-[16px]"
            />
          </label>
          <p className="mt-2 text-[10px] font-bold leading-relaxed text-[#7ba7cc]">
            決まったら数値をClaudeに伝えてください（faceConfig.ts / illustMainPaths.ts に入れます）
          </p>
          <Link
            href="/"
            className="mt-2 inline-block rounded-full bg-[#e6f3ff] px-4 py-1.5 text-[12px] font-black text-[#0070c9]"
          >
            ← トップへ
          </Link>
        </TunePanel>
      </div>
    </main>
  );
}
