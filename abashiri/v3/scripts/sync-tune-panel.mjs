/* 調整パネルの写しを、原本（settings/tune-panel）から網走V3 の public/ へ写す入口（2026-10-20 ヒデさん「一元管理したいです。わかりやすく」）
 *
 *   node scripts/sync-tune-panel.mjs          … 写す（npm run dev／npm run build の前に自動で走る：package.json の predev・prebuild）
 *   node scripts/sync-tune-panel.mjs --check  … 写しが原本と同じかを調べるだけ（違えば終了コード 1）
 *
 * ・中身は原本の側の道具 settings/tune-panel/sync-copies.mjs を呼ぶだけ。「原本 → 写す先」の一覧もそちらの1か所にある
 * ・原本が見つからない時（Vercel では網走のフォルダだけが送られる）は、失敗させずに何もしない（いまの写しをそのまま使う）
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   /* abashiri/v3 */
const TOOL = path.resolve(SITE, '../../settings/tune-panel/sync-copies.mjs');
if (!fs.existsSync(TOOL)) {
  console.log('[調整パネルの写し] 原本が見つからないので、いまの写しをそのまま使います（Vercel では網走のフォルダだけが送られるため）');
  process.exit(0);
}
const r = spawnSync(process.execPath, [TOOL, '--site', 'abashiri/v3', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status == null ? 0 : r.status);
