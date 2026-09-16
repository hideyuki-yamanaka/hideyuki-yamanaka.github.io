#!/bin/bash
# ===== anyflow V5 の自動デプロイ =====
# Vercel 無料プランの「1日100デプロイ」上限に当たった時、リセットされたら自動で上げる。
#   anyflow/v5 → anyflow-embed-v5 (https://anyflow-embed-v5.vercel.app)
# 成功したら done マーカーを置き、二度と実行しない（何度呼ばれても安全）。
# もう一度デプロイしたい時は $ROOT/.deploy-v5.done を消す（次のcronで上がる）。

set -u
ROOT="/Users/hideyuki/Developer/Claude Code/anyflow"
LOG="$ROOT/.deploy-v5.log"
DONE="$ROOT/.deploy-v5.done"

say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

if [ -f "$DONE" ]; then
  exit 0
fi

say "=== v5 自動デプロイ開始 ==="
cd "$ROOT/v5" || { say "ディレクトリが無い ($ROOT/v5)"; exit 1; }

# 誤ったプロジェクトへ上げないよう、毎回リンク先を確認してログに残す
proj=$(python3 -c "import json;print(json.load(open('.vercel/project.json'))['projectName'])" 2>/dev/null)
say "プロジェクト = ${proj:-不明}"
if [ "$proj" != "anyflow-embed-v5" ]; then
  say "プロジェクト名が anyflow-embed-v5 でないので中止（誤爆防止）"
  exit 1
fi

out=$(npx vercel --prod --yes 2>&1); rc=$?
if [ $rc -ne 0 ]; then
  if echo "$out" | grep -q "api-deployments-free-per-day"; then
    say "まだ1日の上限中。次回リトライ"
    exit 2
  fi
  say "失敗 → $(echo "$out" | tail -3 | tr '\n' ' ')"
  exit 1
fi

# 本番URLが実際に 200 を返すかまで確かめてから完了にする
c5=$(curl -s -o /dev/null -w "%{http_code}" https://anyflow-embed-v5.vercel.app/)
say "疎通確認: v5=$c5"
if [ "$c5" = "200" ]; then
  date '+%Y-%m-%d %H:%M:%S' > "$DONE"
  say "=== v5 の公開が完了しました ==="
  exit 0
fi

say "デプロイは通ったが疎通が 200 ではない。次回もう一度試す"
exit 1
