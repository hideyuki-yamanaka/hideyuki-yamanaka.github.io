/* トップの調整パネル（TopTunePanel）の保存場所。
 * 【2026-09-26】スマホのハンバーガーメニューは、トップの調整パネルが無い画面（MobileTop・
 *  詳細ページのスマホ表示）でも「どの案か」を読む必要があるので、保存キーをここに1つだけ置く。
 * ⚠️ 版（VERSION）を上げると古い保存値が捨てられる。TopTunePanel と必ず同じ値を使うこと
 *    （ここを直せば両方に効く）。 */
export const TOP_TUNE_KEY = "abashiri-top-tune";
/** 画面の部品が作り直された時に、調整パネルへ「文字の行を当て直して」と知らせる合図（2026-10-28） */
export const TUNE_RESYNC_EVENT = "abashiri:tune-resync";
export const TOP_TUNE_VERSION = 42; /* 2026-10-14 体験の既定を案2・グルメはホバーで止めないに。古い保存値を破棄 */
