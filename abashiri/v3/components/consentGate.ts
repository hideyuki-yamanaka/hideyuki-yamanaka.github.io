/*
 * 環境音のON/OFF確認が済んでから登場アニメーションを始めるためのゲート。
 * SoundUi が回答時（またはダイアログ不要時）に markConsentDone() を呼び、
 * 演出側は waitForConsent() で待つ。
 */
export const CONSENT_EVENT = "abashiri:consent-done";

declare global {
  interface Window {
    __abashiriConsent?: boolean;
  }
}

export function markConsentDone() {
  if (typeof window === "undefined") return;
  window.__abashiriConsent = true;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

export function waitForConsent(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || window.__abashiriConsent) return resolve();
    const h = () => {
      window.removeEventListener(CONSENT_EVENT, h);
      resolve();
    };
    window.addEventListener(CONSENT_EVENT, h);
  });
}
