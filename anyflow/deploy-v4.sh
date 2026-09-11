#!/bin/bash
# ===== anyflow V4.0 の自動デプロイ（1日100デプロイ上限のリセット後に自動実行） =====
# 2026-09-11: モック(cta-notds) と本流の合わせ込み修正のあと上限に達したため、
#             リセット後に自動で本番へ上げるためのスクリプト。
#   anyflow/v4 → anyflow-embed-v4
# 成功したらこのスクリプトと LaunchAgent を自ら片付ける（二度と走らない）。

set -u
ROOT="/Users/hideyuki/Developer/Claude Code/anyflow"
LOG="$ROOT/.deploy-v4.log"
DONE="$ROOT/.deploy-v4.done"
PLIST="$HOME/Library/LaunchAgents/com.hideyuki.anyflow-deploy-v4.plist"

say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

if [ -f "$DONE" ]; then
  say "すでに完了済み（$DONE があるので何もしない）"
  exit 0
fi

deploy_one() {
  local dir="$1" label="$2" out rc
  cd "$dir" || { say "$label: ディレクトリが無い ($dir)"; return 1; }
  local proj
  proj=$(python3 -c "import json;print(json.load(open('.vercel/project.json'))['projectName'])" 2>/dev/null)
  say "$label: プロジェクト = ${proj:-不明}"
  out=$(npx vercel --prod --yes 2>&1); rc=$?
  if [ $rc -eq 0 ]; then
    say "$label: デプロイ成功"
    return 0
  fi
  if echo "$out" | grep -q "api-deployments-free-per-day"; then
    say "$label: まだ1日の上限中。次回リトライ"
    return 2
  fi
  say "$label: 失敗 → $(echo "$out" | tail -3 | tr '\n' ' ')"
  return 1
}

say "=== V4.0 自動デプロイ開始 ==="
deploy_one "$ROOT/v4" "V4.0(新規開発版)"; r4=$?

if [ $r4 -eq 0 ]; then
  # 反映確認: mock/cta-notds の local と prod の md5 一致まで見る
  L_MOCK=$(md5 -q "$ROOT/v4/mock/cta-notds/index.html" 2>/dev/null)
  P_MOCK=$(curl -s "https://anyflow-embed-v4.vercel.app/mock/cta-notds/?v=$RANDOM" | md5 -q 2>/dev/null)
  L_IDX=$(md5 -q "$ROOT/v4/index.html" 2>/dev/null)
  P_IDX=$(curl -s "https://anyflow-embed-v4.vercel.app/?v=$RANDOM" | md5 -q 2>/dev/null)
  say "疎通確認: index local=$L_IDX prod=$P_IDX / mock local=$L_MOCK prod=$P_MOCK"
  if [ "$L_IDX" = "$P_IDX" ] && [ "$L_MOCK" = "$P_MOCK" ]; then
    date '+%Y-%m-%d %H:%M:%S' > "$DONE"
    # 自己片付け（LaunchAgent をアンロードしてから plist を削除）
    launchctl unload "$PLIST" 2>/dev/null
    rm -f "$PLIST" 2>/dev/null
    say "=== V4.0 公開完了。LaunchAgent を削除しました ==="
    exit 0
  fi
  say "デプロイは通ったが md5 が一致しない。次回もう一度試す"
  exit 1
fi

say "=== まだ完了していない（次回リトライ） ==="
exit 1
