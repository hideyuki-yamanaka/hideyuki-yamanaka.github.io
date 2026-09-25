// MP4 書き出し: node render.mjs （playwright がある場所で実行。例: design-gallery にコピーして実行）
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
const DIR = process.env.MOVIE_DIR, FPS = 30;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file://' + encodeURI(path.join(DIR, 'index.html')) + '?render', { waitUntil: 'networkidle' });
await p.evaluate(() => window.ready);
const dur = await p.evaluate(() => window.DURATION);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart',
  path.join(DIR, 'out', 'anyflow-brand-movie.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
const N = Math.round(dur * FPS);
for (let i = 0; i < N; i++) {
  const url = await p.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/png'); }, i / FPS);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 120 === 0) console.log(`frame ${i}/${N}`);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r));
await b.close(); console.log('done');
