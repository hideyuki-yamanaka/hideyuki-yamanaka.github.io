/* トップの調整パネル（TopTunePanel）の保存場所。
 * 【2026-09-26】スマホのハンバーガーメニューは、トップの調整パネルが無い画面（MobileTop・
 *  詳細ページのスマホ表示）でも「どの案か」を読む必要があるので、保存キーをここに1つだけ置く。
 * ⚠️ 版（VERSION）を上げると古い保存値が捨てられる。TopTunePanel と必ず同じ値を使うこと
 *    （ここを直せば両方に効く）。 */
export const TOP_TUNE_KEY = "abashiri-top-tune";
export const TOP_TUNE_VERSION = 41;
/** localStorage のキー（tune-panel.js の _pKey と同じ形） */
export const topTuneStorageKey = () => `tp:${TOP_TUNE_KEY}:v${TOP_TUNE_VERSION}`;
