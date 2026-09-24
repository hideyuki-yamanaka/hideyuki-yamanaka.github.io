"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** スマホのヘッダー（左＝環境音ON/OFFの置き場、右＝ハンバーガー）とメニュー。
 *
 * 【2026-09-24 ヒデさん指摘】
 *   「詳細ページのヘッダーなどのパーツが微妙に違うので、
 *     トップで使われているものにしてください」
 *   → スマホのトップ（MobileTop）は PC のナビ（GlobalNav）ではなく
 *     この形のヘッダーを出している。詳細ページだけ PC のナビを出していたので、
 *     同じ部品をここへ切り出して【1つのコピー】を両方から使う。
 *
 * ⚠️ 置き場（#abashiri-sound-slot）が画面に無いと、SoundUi は左下に出てしまう。
 *    この部品を出すときは、ほかに置き場を作らないこと（IDは1画面に1つ）。
 */

export const MOBILE_NAV: { label: string; scene: number }[] = [
  { label: "ホーム", scene: 0 },
  { label: "ぼーっとスポット", scene: 2 },
  { label: "グルメ", scene: 6 },
  { label: "体験", scene: 7 },
];

/** トップ以外のページからメニューで飛ぶ時の行き先の預け先 */
export const MOBILE_GOTO_KEY = "abashiri-goto-scene";

export default function MobileHeader({
  dark,
  onScene,
}: {
  /** 白い背景の上に出ている時は true（線と字を黒へ） */
  dark: boolean;
  /** トップページのとき：その場で場面を移す。
      渡されない時（詳細ページなど）はトップへ移動してからその場面を開く */
  onScene?: (scene: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const go = (scene: number) => {
    setOpen(false);
    if (onScene) {
      onScene(scene);
      return;
    }
    try {
      sessionStorage.setItem(MOBILE_GOTO_KEY, String(scene));
    } catch {}
    router.push("/");
  };

  return (
    <>
      {/* 固定追従ヘッダー：左=環境音ON/OFF、右=ハンバーガー
          （全シーン共通。2026-08-28 ヒデさん指示） */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 pt-5">
        <div
          id="abashiri-sound-slot"
          className="pointer-events-auto flex h-[22px] origin-left scale-[0.72] items-center"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          className="pointer-events-auto flex size-9 items-center justify-center"
        >
          <span className="relative block h-[11px] w-[24px]">
            <span
              className={`absolute left-0 top-0 h-[1.5px] w-full rounded-full ${dark ? "bg-ink" : "bg-white"}`}
            />
            <span
              className={`absolute bottom-0 left-0 h-[1.5px] w-full rounded-full ${dark ? "bg-ink" : "bg-white"}`}
            />
          </span>
        </button>
      </header>

      {open && (
        <nav className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-9 bg-brand/95 text-white backdrop-blur-lg">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="閉じる"
            className="absolute right-6 top-6 flex size-9 items-center justify-center text-white"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 2L14 14M14 2L2 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {MOBILE_NAV.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => go(item.scene)}
              className="text-body-18 font-light leading-none text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
