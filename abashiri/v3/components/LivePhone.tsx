"use client";

/* スマホモード（実機ライブ同期）の「スマホ側」と、PC のプレビュー枠の「中身側」。
 *
 * 【2026-09-26 ヒデさん指示】
 *   「Anyflow の調整パネルの仕様、ローカル環境でスマホモードができる仕様も全部真似して」
 *   → anyflow/v5/index.html の liveSync（?live=phone の受け手）と同じ動き。
 *
 *   ・?preview=1  … PC の「📱 スマホモード」で出す 390×844 の枠の中身。
 *                   <html class="pp-inner"> を付けて、調整パネルを隠すだけ
 *   ・?live=phone … 本物のスマホで QR から開いた時。中継サーバ(:8780)から
 *                   PC の調整パネルの保存値を受け取り、このブラウザに書いて反映する
 *
 * ⚠️ 流すのは「調整パネルの保存値（localStorage の tp:*）」だけ。
 *    PC 画面の CSS 変数をそのまま流すと、スマホ専用の値（例：フッターの作字の大きさ）を
 *    PC の値で上書きしてスマホの見た目を壊すため。反映は各ページのパネルが
 *    自分のルール（スマホならスマホの値）で行う。
 * ⚠️ 開発（localhost / 同じ Wi-Fi のアドレス）でだけ動く。本番では何もしない。
 */
import { useEffect } from "react";

const SYNC_PORT = 8780;

const isDevHost = (h: string) =>
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
  h.endsWith(".local");

/* リロードをまたいでスクロール位置を保つ（ページごとにスクロールする箱が違う） */
const scroller = () =>
  document.querySelector<HTMLElement>("[data-abashiri-scroller]") ||
  document.querySelector<HTMLElement>("main");

export default function LivePhone() {
  useEffect(() => {
    if (!isDevHost(location.hostname)) return;
    const q = new URLSearchParams(location.search);
    const root = document.documentElement;

    if (q.get("preview") === "1") {
      root.classList.add("pp-inner");
      return;
    }
    if ((q.get("live") || "").toLowerCase() !== "phone") return;

    root.classList.add("live-phone");
    const badge = document.createElement("div");
    badge.className = "live-badge";
    badge.textContent = "📱 PCと接続中…";
    document.body.appendChild(badge);

    /* 前回リロード前のスクロール位置に戻す */
    try {
      const sv = sessionStorage.getItem("abashiri-live-scroll");
      if (sv != null) {
        const y = +sv;
        setTimeout(() => {
          const el = scroller();
          if (el) el.scrollTop = y;
        }, 400);
      }
    } catch {}

    let firstDone = false;
    try {
      firstDone = sessionStorage.getItem("abashiri-pm-firstdone") === "1";
    } catch {}
    let t = 0;

    const apply = (text: string) => {
      let d: { ls?: Record<string, string | null>; path?: string } | null = null;
      try {
        d = JSON.parse(text);
      } catch {
        return;
      }
      if (!d || typeof d !== "object" || !d.ls) return;
      badge.classList.remove("off");
      badge.textContent = "📱 PCと同期中";
      /* 接続のたびに前回値が送られてくるので、同じ中身なら何もしない
         （毎回リロードすると“チカチカ無限リロード”になる。anyflow で実際に起きた） */
      let last: string | null = null;
      try {
        last = sessionStorage.getItem("abashiri-pm-last");
      } catch {}
      if (text === last) return;
      try {
        sessionStorage.setItem("abashiri-pm-last", text);
      } catch {}
      try {
        for (const k of Object.keys(d.ls)) {
          const v = d.ls[k];
          if (v == null) localStorage.removeItem(k);
          else localStorage.setItem(k, v);
        }
      } catch {
        return;
      }
      /* PC が別のページを開いていたら、スマホも同じページへ */
      if (d.path && d.path !== location.pathname) {
        location.href = d.path + "?live=phone";
        return;
      }
      clearTimeout(t);
      t = window.setTimeout(
        () => {
          /* 初回だけは確実さ優先でリロード。以降はリロード無しで、
             パネルに「読み直して反映して」と知らせる（tune-panel.js が受ける） */
          if (!firstDone) {
            firstDone = true;
            try {
              sessionStorage.setItem("abashiri-pm-firstdone", "1");
              sessionStorage.setItem("abashiri-live-scroll", String(scroller()?.scrollTop || 0));
            } catch {}
            location.reload();
            return;
          }
          window.dispatchEvent(new CustomEvent("tp:remote-apply"));
        },
        firstDone ? 40 : 120
      );
    };

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${location.protocol}//${location.hostname}:${SYNC_PORT}/events`);
      es.onmessage = (ev) => ev.data && apply(ev.data);
      es.onerror = () => {
        badge.classList.add("off");
        badge.textContent = "📱 再接続中…";
      };
      es.onopen = () => {
        badge.classList.remove("off");
        badge.textContent = "📱 PCと同期中";
      };
    } catch {
      badge.classList.add("off");
      badge.textContent = "📱 同期サーバに接続できません";
    }
    return () => {
      es?.close();
      badge.remove();
    };
  }, []);
  return null;
}
