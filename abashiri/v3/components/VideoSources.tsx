/*
 * 動画の読み込み先（軽い形式から順に並べる・サイト共通）
 *
 * 【2026-10-29 ヒデさん「動画（合計 約24MB）を、見た目を保ったまま縮められるか」】
 * 同じ映像を、新しい形式（AV1・HEVC）でも作っておき、<source> を軽い順に並べる。
 * ブラウザは「自分が再生できる最初の1つ」だけを読むので、
 *   ・AV1 が見られる所（Chrome・Edge・Firefox・新しい iPhone / Mac）… AV1
 *   ・HEVC が見られる所（Safari・iPhone のほとんど・Chrome＋対応のパソコン）… HEVC
 *   ・どちらも見られない古い所 … 今までの H.264（元のファイルのまま）
 * になる。どれも同じ長さ・同じ大きさ・同じ音（音は元の動画からそのまま写した）。
 * 画質は、元の高画質データ（_source/流氷クルーズ.mp4）と比べた点数（VMAF）が
 * 今までの H.264 を下回らない物だけを採用している（TASKS 23-306）。
 *
 * 新しい動画を足す時は、VARIANTS に1行足す（無ければ元のファイルだけを読む）。
 *
 * 作り方（流氷・2026-10-29）：元データを 1280×574 に縮めて、音は今までの動画から写す
 *   AV1 … ffmpeg -c:v libsvtav1 -preset 5 -crf 44 -g 150（16.8MB・点数 97.6）
 *   HEVC … ffmpeg -c:v libx265 -preset slow -crf 30 -tag:v hvc1（18.0MB・点数 96.5）
 *   どちらも -c:a copy -movflags +faststart。今までの H.264 は 24.7MB・点数 95.3
 */
const VARIANTS: Record<string, { av1?: string; hevc?: string }> = {
  "/video/ryuhyo.mp4": { av1: "/video/ryuhyo-av1.mp4", hevc: "/video/ryuhyo-hevc.mp4" },
};

/* 形式の名札（ブラウザが「再生できるか」を判断するのに使う）。
   AV1 は Main・レベル3.1・8bit、HEVC は Main・レベル3.1、H.264 は High・レベル3.1（実際のファイルを ffprobe で確かめた値） */
const TYPE_AV1 = 'video/mp4; codecs="av01.0.05M.08, mp4a.40.2"';
const TYPE_HEVC = 'video/mp4; codecs="hvc1.1.6.L93.B0, mp4a.40.2"';
const TYPE_H264 = 'video/mp4; codecs="avc1.64001F, mp4a.40.2"';

export default function VideoSources({ src }: { src: string }) {
  const v = VARIANTS[src];
  return (
    <>
      {v?.av1 && <source src={v.av1} type={TYPE_AV1} />}
      {v?.hevc && <source src={v.hevc} type={TYPE_HEVC} />}
      <source src={src} type={TYPE_H264} />
    </>
  );
}
