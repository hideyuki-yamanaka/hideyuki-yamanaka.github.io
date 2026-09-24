"use client";

import { useEffect, useState } from "react";

/** トップページの土台（Stage.tsx）が画面に合わせて縮めている倍率。
 *
 * 【2026-09-24 ヒデさん指摘】
 *   「詳細ページのヘッダーなどのパーツが微妙に違うので、
 *     トップで使われているものにしてください」
 *   実測（1440×900）… ナビ幅 トップ322.2px / 詳細351.5px（比 0.917）
 *                    上位置 トップ29.3px  / 詳細32px
 *   原因は【縮尺】。トップは 1512×982 のカンプ1枚を画面に合わせて縮めた
 *   土台の中にナビを置いているので、ナビも一緒に縮む。詳細ページは等倍だった。
 *
 * ⚠️ 計算式は Stage.tsx の calc() と同じものを使うこと（ここだけ直しても
 *    向こうが変われば合わなくなる）。値がひとつなら住み家もひとつにしたいので、
 *    以後どちらもこの関数を通す。
 */
export const stageScaleOf = (vw: number, vh: number) =>
  Math.min(vh / 982, vw / 1512);

export function useStageScale() {
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const calc = () =>
      setScale(stageScaleOf(window.innerWidth, window.innerHeight));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return scale;
}
