/*
 * 網走の環境音（BGM）の音量。
 *
 * ヒデさん指示（2026-08-19）で、初期音量を 0.45 → 0.62 に上げた。
 *
 * ⚠️ 1.0 を超える値は置かないこと。
 *    HTMLAudioElement の volume は「音源を絞る」方向にしか効かないので、
 *    1.0 ＝ 音源そのままの大きさが上限。ここを超える指定はできないし、
 *    増幅（WebAudio の GainNode 等）に手を出すと音割れの原因になる。
 */
export const BGM_VOLUME_MAX = 1;

/** 初期音量（0〜1）。/mock や右下の調整パネルから触って詰められる */
export const DEFAULT_BGM_VOLUME = 0.66; /* 基準音量。曲の進行で後半を絞る（下の envelope）。最初はしっかり聞こえる（2026-08-28 ヒデさん指示） */

/** 調整パネルから音量を変える時に飛ばすイベント */
export const BGM_VOLUME_EVENT = "abashiri:bgm-volume";

/** 逆方向：画面上の音量インジケーターで変えた時に、調整パネルへ知らせるイベント
    （パネルのスライダー表示を追従させる。2026-08-30） */
export const BGM_VOLUME_UI_EVENT = "abashiri:bgm-volume-ui";

/** 0〜1 に収める（1を超えさせない） */
export function clampVolume(v: number): number {
  return Math.min(BGM_VOLUME_MAX, Math.max(0, v));
}
