#!/bin/bash
# ===== 網走サイト V3.0 の自動デプロイ =====
# 2026-09-16: Vercel 無料プランの「1日100デプロイ」上限に当たったため、
# 上限がリセットされたら自動で上がるようにしたスクリプト。
#   abashiri/v3 → abashiri-site-v3 (https://abashiri-site-v3.vercel.app)
# 成功したら done マーカーを置き、二度と実行しない（何度呼ばれても安全）。
# 仕掛け方は anyflow/deploy-v2-v3.sh と同じ。

set -u
ROOT="/Users/hideyuki/Developer/Claude Code/abashiri"
LOG="$ROOT/.deploy-v3.log"
DONE="$ROOT/.deploy-v3.done"
# cron から呼ばれると PATH がほぼ空なので、node/npx の場所を明示的に足す
PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

if [ -f "$DONE" ]; then
  say "すでに完了済み（$DONE があるので何もしない）"
  exit 0
fi

cd "$ROOT/v3" || { say "ディレクトリが無い ($ROOT/v3)"; exit 1; }

# 誤ったプロジェクトへ上げないよう、毎回リンク先を確認してログに残す
proj=$(python3 -c "import json;print(json.load(open('.vercel/project.json'))['projectName'])" 2>/dev/null)
say "=== 自動デプロイ開始（プロジェクト = ${proj:-不明}）==="
if [ "$proj" != "abashiri-site-v3" ]; then
  say "プロジェクト名が abashiri-site-v3 ではないので中止（誤デプロイ防止）"
  exit 1
fi

out=$(npx vercel --prod --yes 2>&1); rc=$?
if [ $rc -ne 0 ]; then
  if echo "$out" | grep -q "api-deployments-free-per-day"; then
    say "まだ1日の上限中。次回リトライ"
    exit 1
  fi
  say "失敗 → $(echo "$out" | tail -3 | tr '\n' ' ')"
  exit 1
fi

# 本番URLが実際に応答するかまで確かめてから完了にする
code=$(curl -s -o /dev/null -w "%{http_code}" https://abashiri-site-v3.vercel.app/)
spot=$(curl -s -o /dev/null -w "%{http_code}" https://abashiri-site-v3.vercel.app/spot/kangoku)
say "疎通確認: トップ=$code / 詳細=$spot"
if [ "$code" = "200" ] && [ "$spot" = "200" ]; then
  date '+%Y-%m-%d %H:%M:%S' > "$DONE"
  say "=== 公開が完了しました ==="
  exit 0
fi

say "デプロイは通ったが疎通が 200 ではない。次回もう一度試す"
exit 1
