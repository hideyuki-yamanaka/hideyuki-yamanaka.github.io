/*
 * 開発中（localhost）はサウンドを鳴らさない…という仕組みだったが、
 * 2026-08-23 ヒデさん指示で廃止。BGMスイッチ（ON/OFF）ができたので、
 * ローカルでも本番と同じに鳴らし、切りたい時はスイッチで切る運用に。
 * 呼び出し側を残したまま挙動だけ止めるため、常に false を返す。
 */
export function devSilent(): boolean {
  return false;
}
