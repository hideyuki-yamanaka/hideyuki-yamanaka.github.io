/* スマホモード（実機ライブ同期）の中継サーバを、網走V3 の手元のサーバーと一緒に立ち上げる入口
 * （2026-10-21 ヒデさん「PCのローカル環境を立ち上げたら、スマホの方も同時に立ち上がっているようにしてほしい」）
 *
 *   node scripts/start-phone-sync.mjs   … npm run dev の前に自動で走る（package.json の predev）
 *
 * ・中継サーバの本体は settings/tune-panel/phone-mode/server.mjs（共通の部品）。網走は ページ 3095／中継 8780
 *   （8779 は AnyFlow が使うので使わない）
 * ・もう 8780 で動いていたら何もしない（2回目の npm run dev でも二重に立ち上げない）
 * ・手元のサーバーとは切り離して動かす（detached）。手元のサーバーを止め直しても、中継サーバは動いたまま
 *   ＝次に立ち上げた時も、そのままスマホとつながる。ログは abashiri/.phone-sync-v3.log
 * ・中継サーバが見つからない時（Vercel など）は、失敗させずに何もしない
 */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PAGE_PORT = 3095;
const SYNC_PORT = 8780;
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); /* abashiri/v3 */
const DIR = path.resolve(SITE, '../../settings/tune-panel/phone-mode');
const LOG = path.resolve(SITE, '../.phone-sync-v3.log');

if (!fs.existsSync(path.join(DIR, 'server.mjs'))) {
  console.log('[スマホモード] 中継サーバが見つからないので立ち上げません（手元以外では使わないため）');
  process.exit(0);
}

/* もう動いているか（つながれば動いている） */
const busy = await new Promise((resolve) => {
  const s = net.connect({ port: SYNC_PORT, host: '127.0.0.1' });
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false));
  s.setTimeout(800, () => { s.destroy(); resolve(false); });
});
if (busy) {
  console.log(`[スマホモード] 中継サーバはもう動いています（${SYNC_PORT}）`);
  process.exit(0);
}

if (!fs.existsSync(path.join(DIR, 'node_modules'))) {
  console.log('[スマホモード] 中継サーバの部品を入れています（初回だけ）');
  const r = spawnSync('npm', ['install'], { cwd: DIR, stdio: 'inherit' });
  if (r.status !== 0) {
    console.log('[スマホモード] 部品を入れられなかったので、中継サーバは立ち上げません（手元のサーバーはそのまま動きます）');
    process.exit(0);
  }
}

const out = fs.openSync(LOG, 'a');
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: DIR,
  env: { ...process.env, PAGE_PORT: String(PAGE_PORT), SYNC_PORT: String(SYNC_PORT) },
  detached: true,
  stdio: ['ignore', out, out],
});
child.unref();
console.log(`[スマホモード] 中継サーバを立ち上げました（ページ ${PAGE_PORT}／中継 ${SYNC_PORT}・ログ abashiri/.phone-sync-v3.log）`);
