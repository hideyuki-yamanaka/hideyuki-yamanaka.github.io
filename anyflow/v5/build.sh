#!/bin/bash
# ===== anyflow V5: JavaScript を1本にまとめる（2026-09-26 整理D） =====
# 編集するのは js/parts/ の7ファイル(番号順に読み込まれる)。ブラウザに配るのは、それを順番どおりに
# つなげただけの js/app.js 1本。1本にしているのは、ファイルを分けて読み込ませると、ファイルとファイルの
# 間でタイマーやアニメのコマが先に動き、まだ読み込まれていない関数を呼んでしまう事故が起き得るため。
#
#   使い方:  ./build.sh           … js/app.js を作り直す(js/parts を直したら必ず実行)
#            ./build.sh --check   … js/app.js が js/parts と一致しているかだけ確かめる(ずれていたら終了コード1)
#
# CSS(css/style.css)はそのまま配っているので、CSS だけ直した時は実行しなくてよい。
set -euo pipefail
cd "$(dirname "$0")"
HEADER='/* ⚠️ 自動生成ファイル(つなげただけ)。直接編集しない。js/parts/ のファイルを直して ./build.sh を実行する(2026-09-26 整理D) */'
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
out="$work/app.js"
{ printf '%s\n' "$HEADER"; cat js/parts/[0-9][0-9]-*.js; } > "$out"
if [ "${1:-}" = "--check" ]; then
  if cmp -s "$out" js/app.js; then echo "js/app.js は最新です"; exit 0; fi
  echo "⚠️ js/app.js が js/parts と一致しません。./build.sh を実行してください"; exit 1
fi
# 構文エラーのまま配らないように、つなげた結果を node で確かめてから置き換える
if command -v node >/dev/null 2>&1; then
  node --check "$out" || { echo "❌ 構文エラーがあるので js/app.js は更新していません"; exit 1; }
fi
cp "$out" js/app.js
echo "js/app.js を作り直しました（$(wc -l < js/app.js | tr -d ' ')行 / $(ls js/parts/[0-9][0-9]-*.js | wc -l | tr -d ' ')ファイルから）"
