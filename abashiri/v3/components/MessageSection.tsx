"use client";

/*
 * メッセージセクション（KV直下・カンプ 15480:22896。2026-08-21 ヒデさん依頼）
 *
 * 作字がブラーで消えたあと、ブラーのかかった背景の上にメッセージが出る。
 * スクロール量 [start .. start+len] の間で読み進み、終わると
 * ぼーっとスポットへ入れ替わる（入れ替えのずらしは TopPage 側で行う）。
 *
 * 文言・書体はカンプの実測値：
 *   見出し「網走は何もない。」 Noto Sans JP Thin(100) 90px / 行間1 / 白80%
 *   本文 Noto Sans JP Light(300) 20px / 行間2 / 字間0.4px / 白
 *   置き場所 left140 top172 幅720 / 見出しと本文の間120px
 *
 * 出方は5案（msgConfig.ts）。スクロール駆動なので、戻せば巻き戻る。
 */
import { useState } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { mergeMsg, parseMsgBody, type MsgTune } from "./msgConfig";

/* 文言は msgConfig.ts の DEFAULT_MSG（title / body）から取り、
   パネルの「メッセージ｜文言」で編集できる（2026-08-30 ヒデさん依頼）。
   body は空行＝段落・改行＝行 で parseMsgBody が段落配列に変換する */

/** 0〜1 に丸めた区間進捗 */
const seg = (p: number, from: number, span: number) =>
  Math.max(0, Math.min(1, (p - from) / Math.max(0.0001, span)));

export default function MessageSection({
  scrollY,
  start,
  tune,
}: {
  scrollY: MotionValue<number>;
  /** メッセージが出はじめるスクロール量(px) */
  start: number;
  tune?: Partial<MsgTune> | null;
}) {
  const M = mergeMsg(tune);
  /* 文言（パネル編集対応）。空なら段落0件になり、見出しだけが出る */
  const TITLE = M.title;
  const BLOCKS = parseMsgBody(M.body);
  const ALL_LINES = BLOCKS.flat();
  const [v, setV] = useState(0);
  useMotionValueEvent(scrollY, "change", (val) => setV(val));

  /* 読みの進捗 0〜1（超えても計算は続く）。
     読み終わったあとは M.tail ぶんの「余韻」区間：最後の段落を見せたまま
     スクロールが進み、余韻が尽きてからブラーで退場する（2026-08-22 ヒデさん指摘） */
  const p = (v - start) / Math.max(1, M.len);
  /* 出はじめ：ふわっと。退場：余韻のあとにスポットへ譲る */
  const enter = seg(p, 0, 0.05);
  const exit = seg(v, start + M.len + M.tail, 300);
  const shellOpacity = enter * (1 - exit);
  const shellBlur = (1 - enter) * 10 + exit * 14;
  const minOp = M.minOpacity / 100;
  /* 見た目（透過率・ウェイト・行間）はパネルから（2026-08-23 ヒデさん依頼） */
  const titleBase = M.titleOpacity / 100;

  if (shellOpacity <= 0.001) return null;

  /* 「読む順」の通し番号：見出し=0、本文の行=1〜。案ごとの出しどころに使う。
     soft（にじみ幅）が大きいほど、1つの行が出るのに深いスクロールを使う
     ＝パッと切り替わらず、ゆーっくり にじみながら流れてくる（2026-08-21 ヒデさん指示） */
  const unitCount = 1 + ALL_LINES.length;
  /* 進捗の 0〜0.88 を読みに使い、残りは余韻（最後の行を読んでから間ができる） */
  const bandAt = (unit: number) => (unit / unitCount) * 0.88;
  const bandSpan = 0.88 / unitCount;
  const soft = Math.max(0.5, M.soft);

  /* ── 出現のさせ方（2026-08-23 作り直し） ──
     以前はスクロール量をそのまま透明度・位置に割り当てていた（スクラブ方式）。
     するとホイールの細かい進み戻りが文字の動きに直結して「上下にガタガタ」した。
     いまは「読み位置がしきい値を越えたら、時間ベースのトランジションでふわっと出す」。
     スクロールで順番に出る体験は同じで、スクロールのノイズは文字に乗らない。
     にじみ幅(soft)は「出るのにかける時間」として効く */
  const dur = Math.round(500 + soft * 350); /* soft1.3 ≒ 0.95秒 */
  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const trans = `opacity ${dur}ms ${ease}, filter ${dur}ms ${ease}, transform ${dur}ms ${ease}`;

  /* 案別：見出しと各行のスタイル（on/off の2状態＋トランジション）。
     見出しは本文と同じふわっとした出方のまま、
     ・出るタイミング（titleDelay: メッセージ開始からのスクロール量）
     ・アニメーション時間（titleAppearSec: 秒）
     を独立して調整できる（2026-08-23 ヒデさん指示：急に出るのでゆったりに） */
  const titleOn = p >= bandAt(0) + M.titleDelay / Math.max(1, M.len);
  const titleDur = Math.round(M.titleAppearSec * 1000);
  const titleTrans = `opacity ${titleDur}ms ${ease}, filter ${titleDur}ms ${ease}, transform ${titleDur}ms ${ease}`;
  const titleStyle = (): React.CSSProperties => {
    switch (M.pattern) {
      case 2:
        return {
          opacity: titleBase * (titleOn ? 1 : minOp),
          transition: titleTrans,
        };
      default: /* 1・3: 本文と同じブラーで登場 */
        return {
          opacity: titleOn ? titleBase : 0,
          filter: titleOn ? "none" : "blur(10px)",
          transform: titleOn ? "translateY(0)" : "translateY(18px)",
          transition: titleTrans,
        };
    }
  };

  const lineStyle = (globalLine: number, blockIdx: number): React.CSSProperties => {
    const unit = 1 + globalLine;
    switch (M.pattern) {
      case 2: {
        /* 浮かび上がり：全文うっすら置いてあり、読む順に濃くなる */
        const on = p >= bandAt(unit);
        return { opacity: on ? 1 : minOp, transition: trans };
      }
      case 3: {
        /* 行ごとに流れ込む */
        const on = p >= bandAt(unit);
        return {
          opacity: on ? 1 : 0,
          filter: on ? "none" : "blur(8px)",
          transform: on ? "translateY(0)" : "translateY(26px)",
          transition: trans,
        };
      }
      default: {
        /* 案1: 段落ごとにブラー出現（段落内は同時） */
        const firstUnit = 1 + BLOCKS.slice(0, blockIdx).flat().length;
        const on = p >= bandAt(firstUnit);
        return {
          opacity: on ? 1 : 0,
          filter: on ? "none" : "blur(10px)",
          transform: on ? "translateY(0)" : "translateY(18px)",
          transition: trans,
        };
      }
    }
  };

  let lineNo = -1;
  return (
    <div className="pointer-events-none sticky top-0 -mt-[982px] h-[982px]">
      <div
        /* 器(親)は pointer-events-none で KV ボタンのクリックを通すが、
           それを受けると本文がドラッグ選択（コピペ）できなくなる。
           本文ブロックだけ pointer-events を戻して選択可能にする
           （このセクションは KV が消えてから描画されるので誤クリック飲み込みは起きない。2026-08-30 ヒデさん依頼） */
        className="pointer-events-auto absolute left-[140px] top-[172px] w-[720px] text-white"
        style={{ opacity: shellOpacity, filter: `blur(${shellBlur}px)` }}
      >
        {/* 見出し：カンプ 15481:23022 の実測（Noto Sans JP Thin / Hero_90px / 行間1 / 白80%） */}
        <p
          className="text-hero-90 whitespace-nowrap"
          style={{
            fontWeight: M.titleWeight,
            lineHeight: M.titleLeading,
            ...titleStyle(),
          }}
        >
          {TITLE}
        </p>
        {/* 本文：カンプ 15480:23019 の実測（Noto Sans JP Light 20px / 行間2 / 字間0.4px / 白） */}
        <div
          className="mt-[120px] text-body-20 tracking-[0.4px]"
          style={{ fontWeight: M.bodyWeight, lineHeight: M.bodyLeading }}
        >
          {BLOCKS.map((lines, bi) => (
            <div key={bi} className={bi === 0 ? "" : "mt-[40px]"}>
              {lines.map((l) => {
                lineNo += 1;
                return (
                  <p key={l} style={lineStyle(lineNo, bi)}>
                    {l}
                  </p>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
