#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ルール集の「★ いちばん大事な決まり」を、長い会話の中で薄れないように目の前へ出す仕掛け（2026-09-27）。

  session … 会話の始め・再開・要約の直後（SessionStart）に、★の節を丸ごと出す
  prompt  … ヒデさんの指示（UserPromptSubmit）のたびに「★0 経過報告」を出し、
            言葉から場面を見分けて、その場面の決まりも出す
            場面A カンプから作る／B カンプなしで作る／C Figmaに書き出す／デプロイ／直ってない
  tick    … 道具を1回使うたび（PostToolUse）に時計を見て、前の合図から3分たっていたら
            「表で経過報告して」の合図を出す（★0・2026-09-27 ヒデさん「最長3分」）

中身は settings/docs/general/RULES.md の <!-- 名前:start --> 〜 <!-- 名前:end --> から毎回読む。
ルールを直す時は RULES.md だけ直せばよい（この仕掛けは触らなくてよい）。
止める時は .claude/settings.json の "SessionStart"・"UserPromptSubmit"・"PostToolUse" を消す。
何かで失敗しても、会話は止めずに何も出さないだけにしてある。
"""
import json
import os
import re
import sys
import tempfile
import time
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(os.path.dirname(HERE))
RULES = os.path.join(ROOT, "settings", "docs", "general", "RULES.md")

# 経過報告の合図の間隔（秒）。ヒデさん指定「最長3分」（2026-09-27）。試す時だけ環境変数で短くできる
INTERVAL = float(os.environ.get("RULES_REPORT_INTERVAL", "180"))
TIMER_DIR = os.path.join(tempfile.gettempdir(), "claude-report-timer")

# 場面を見分ける言葉。指示は音声入力なので、よくある誤変換も入れる（カンプ→完封 など）
TRIGGERS = [
    # 「カンプないけど」「完封用意してないけど」は場面Bなので、Aからは外す
    ("scene-a", r"figma\.com/(design|file|proto)"
                r"|(カンプ|完封|かんぷ|コンプ(?![リレラロ]))(?!(が|は|を|も)?(ない|無い|なし|無し|用意して(い)?(ない|へん)))"
                r"|デザイン(通り|どおり)|(figma|フィグマ).{0,20}(通り|どおり|実装|再現)"),
    ("scene-b", r"(カンプ|完封|かんぷ)(が|は|を|も)?(ない|無い|なし|無し|用意して(い)?(ない|へん))"
                r"|よしなに|良しなに|吉なに|いい感じ|いいかんじ|おまかせ|お任せ"
                r"|[0-9一二三四五六七八九十〇○]+案|案を?出|モック|mock"),
    ("scene-c", r"(figma|フィグマ).{0,30}(書き出|書きだ|吐き出|はき出|はきだ|出力|起こし|トレース|反映|移し|入れ|置い|置き)"
                r"|(書き出|吐き出|はき出).{0,10}(figma|フィグマ)"),
    # 「デプロイ済み」「デプロイした」など、終わった話には反応しない
    ("deploy", r"デプロイ(?!済|した|しました|完了|され|してあ)|本番(に|へ)(上げ|出し|反映)"),
    ("fix", r"直ってない|直ってへん|なおってない|治ってない|直らない|変わってない|かわってない|戻ってない"
            r"|まだ(ずれ|おかしい|出ない|動かない|効かない)"),
    # 調整パネルの話（スライダーは「インジケーター」「つまみ」とも呼ばれる。音声入力の「インジゲーター」も）
    ("panel", r"調整パネル|パネル|スライダー|インジケーター|インジゲーター|つまみ|tune-?panel"),
]

LABELS = {
    "scene-a": "場面A（カンプから作る）",
    "scene-b": "場面B（カンプなしで作る）",
    "scene-c": "場面C（作った画面をFigmaに書き出す）",
    "deploy": "デプロイ",
    "fix": "「直ってない」",
    "panel": "調整パネル",
}

SUFFIX = {
    "deploy": "送り先の表は CLAUDE.md の「🚀 各プロジェクトの本番 URL とデプロイ先」。",
    "panel": "調整パネルの仕様の正は settings/tune-panel/README.md の「📌 共通仕様（AnyFlow V5 準拠）」。新しく作る時は共通の部品 settings/tune-panel/tune-panel.js を使う。",
}

SESSION_HEAD = {
    "startup": "【ルールの自動表示・会話の始め】ルール集（RULES.md）の最優先の節です。"
               "作業の最初に、今どの場面か（A カンプから作る／B カンプなしで作る／C Figmaに書き出す）を見きわめてください。",
    "resume": "【ルールの自動表示・会話の再開】ルール集（RULES.md）の最優先の節をもう一度出します。"
              "今どの場面かを見きわめ直してください。",
    "clear": "【ルールの自動表示・会話のリセット】ルール集（RULES.md）の最優先の節です。"
             "作業の最初に、今どの場面かを見きわめてください。",
    "compact": "【ルールの自動表示・会話が要約された直後】要約で薄れやすい、いちばん大事な決まりをもう一度出します。"
               "要約の直後の3回の返事は、途中の一言まで日本語になっているかを自分で点検してください（RULES 1-6）。",
}


def timer_path(data):
    sid = re.sub(r"[^A-Za-z0-9_-]", "", str(data.get("session_id", ""))) or "default"
    return os.path.join(TIMER_DIR, sid)


def timer_reset(data):
    try:
        os.makedirs(TIMER_DIR, exist_ok=True)
        with open(timer_path(data), "w") as f:
            f.write(str(time.time()))
    except Exception:
        pass


def timer_due(data):
    """前の合図（またはヒデさんの指示）から INTERVAL 秒たったら True。True の時は時計を0に戻す"""
    try:
        with open(timer_path(data)) as f:
            last = float(f.read().strip())
    except Exception:
        timer_reset(data)
        return False
    if time.time() - last >= INTERVAL:
        timer_reset(data)
        return True
    return False


def block(text, name):
    m = re.search(r"<!-- %s:start -->\n(.*?)\n?<!-- %s:end -->" % (name, name), text, re.S)
    if not m:
        return ""
    # 中に入れ子になっている印（<!-- scene-a:start --> など）は、出す時には消す
    body = re.sub(r"^<!-- [\w-]+:(start|end) -->\n?", "", m.group(1), flags=re.M)
    return body.strip()


def emit(event, context):
    if not context:
        return
    print(json.dumps(
        {"hookSpecificOutput": {"hookEventName": event, "additionalContext": context}},
        ensure_ascii=False))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "prompt"
    try:
        data = json.load(sys.stdin)
    except Exception:
        data = {}
    if mode == "tick":
        # 裏の手伝い役（サブエージェント）の中では合図を出さない。報告はメインの会話でする
        # （手伝い役の道具の知らせには agent_id と agent_type が付く。2026-09-27 に実物で確認）
        if data.get("agent_id") or data.get("agent_type"):
            return
        if not timer_due(data):
            return
    try:
        with open(RULES, encoding="utf-8") as f:
            text = f.read()
    except Exception:
        return  # ルール集が無い場所では何もしない

    report = block(text, "report")

    if mode == "tick":
        if report:
            emit("PostToolUse",
                 "【ルールの自動表示・3分の合図】前の合図から3分たちました。"
                 "今の手を区切りのいい所で止めて、表で経過報告してください（★0・〔絶対〕）。\n\n" + report)
        return

    if mode == "session":
        timer_reset(data)
        core = block(text, "core")
        if not core:
            return
        head = SESSION_HEAD.get(str(data.get("source", "")), SESSION_HEAD["startup"])
        emit("SessionStart", head + "\n\n" + core)
        return

    timer_reset(data)  # ヒデさんの指示が来たら、3分の時計はそこから数え直す
    raw = str(data.get("prompt", ""))
    prompt = unicodedata.normalize("NFKC", raw).lower()
    hits = [name for name, pat in TRIGGERS if re.search(pat, prompt)]
    # 裏の作業の知らせや、ほかの作業からの連絡はヒデさんの指示ではないので、場面の決まりは出さない（★0だけ出す）
    if re.search(r"<task-notification>|<cross-session-message|\[SYSTEM NOTIFICATION", raw):
        hits = []
    report_ctx = ("【ルールの自動表示・いちばん上の決まり】\n" + report) if report else ""
    if not hits:
        emit("UserPromptSubmit", report_ctx)
        return
    parts = []
    for name in hits:
        body = block(text, name)
        if body:
            parts.append(body + (("\n" + SUFFIX[name]) if name in SUFFIX else ""))
    if ("scene-a" in hits or "scene-b" in hits):
        cross = block(text, "cross")
        if cross:
            parts.append(cross)
    if not parts:
        emit("UserPromptSubmit", report_ctx)
        return
    head = ("【ルールの自動表示】指示の言葉から見て、今回は " + "・".join(LABELS[h] for h in hits)
            + " の可能性があります。当てはまる時は、次の決まりを先に守ってください"
            "（最優先は RULES.md の ★ いちばん大事な決まり）。")
    emit("UserPromptSubmit", (report_ctx + "\n\n" if report_ctx else "") + head + "\n\n" + "\n\n".join(parts))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass  # 仕掛けの失敗で会話を止めない
