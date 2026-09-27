/*
 * スマホモードの「QR・実機への反映」を、共通の phone-mode（settings/tune-panel/phone-mode）でつなぐ
 *
 * 【2026-09-27 ヒデさん決定】調整パネルを共通部品 v2.0.0 に上げた。
 *   旧：網走のパネルのコピーに QR・送信が入っていて、受け手は LivePhone.tsx、中継は tools/live-sync.mjs
 *   新：共通の phone-mode.client.js（public/ にコピー）がボタン・QR・送信・受け手を受け持つ。
 *       中継サーバは共通の server.mjs を網走の番号（8780）で動かす：
 *         cd settings/tune-panel/phone-mode && (test -d node_modules || npm install) && PAGE_PORT=3095 SYNC_PORT=8780 node server.mjs
 *   旧仕組みにあった「PC が別のページを開いたら、スマホも同じページへ」は、
 *   PC のいまのページを PATH_KEY に書いて一緒に送り、受け手側（LivePhone）で移る形で引き継いだ。
 * ⚠️ 開発（localhost・同じ Wi-Fi のアドレス）でだけ動く。本番では何もしない。
 */

export const PHONE_SYNC_PORT = 8780;
/** PC がいま開いているページ（スマホを同じページへ連れていくため） */
export const PATH_KEY = "abashiri-pm-path";

const isDevHost = (h: string) =>
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
  h.endsWith(".local");

type PhonePanel = {
  phoneModeConfig?: (extra?: Record<string, unknown>) => { storageKeys?: string[] } & Record<string, unknown>;
};

export function attachPhoneMode(panel: PhonePanel | null) {
  if (typeof window === "undefined" || !panel?.phoneModeConfig) return;
  if (!isDevHost(location.hostname)) return;
  const live = new URLSearchParams(location.search).get("live") === "phone";
  if (!live) {
    try {
      localStorage.setItem(PATH_KEY, location.pathname);
    } catch {}
  }
  const base = panel.phoneModeConfig({ syncPort: PHONE_SYNC_PORT });
  (window as unknown as { PHONE_MODE_CONFIG: unknown }).PHONE_MODE_CONFIG = {
    ...base,
    storageKeys: [...(base.storageKeys || []), PATH_KEY],
  };
  /* ページを移るたびにパネルが作り直されるので、前のページの QR の窓と帯を片付けてから読み直す
     （クライアントは読み込んだ時に1回だけ動く作り） */
  document.querySelectorAll(".pm-pop, .pm-banner").forEach((el) => el.remove());
  document.querySelectorAll("script[data-phone-mode]").forEach((el) => el.remove());
  const s = document.createElement("script");
  s.src = `/phone-mode.client.js?t=${Date.now()}`;
  s.dataset.phoneMode = "1";
  document.body.appendChild(s);
}
