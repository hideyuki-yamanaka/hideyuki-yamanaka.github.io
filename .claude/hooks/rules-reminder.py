#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ルール集の「★ いちばん大事な決まり」を、長い会話の中で薄れないように目の前へ出す仕掛け（2026-09-27）。

  session … 会話の始め・再開・要約の直後（SessionStart）に、★の節を丸ごと出す
  prompt  … ヒデさんの指示（UserPromptSubmit）の言葉から場面を見分けて、その場面の決まりだけ出す
            場面A カンプから作る／B カンプなしで作る／C Figmaに書き出す／デプロイ／直ってない

中身は settings/docs/general/RULES.md の <!-- 名前:start --> 〜 <!-- 名前:end --> から毎回読む。
ルールを直す時は RULES.md だけ直せばよい（この仕掛けは触らなくてよい）。
止める時は .claude/settings.json の "SessionStart" と "UserPromptSubmit" を消す。
何かで失敗しても、会話は止めずに何も出さないだけにしてある。
"""
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(os.path.dirname(HERE))
RULES = os.path.join(ROOT, "settings", "docs", "general", "RULES.md")

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
]

LABELS = {
    "scene-a": "場面A（カンプから作る）",
    "scene-b": "場面B（カンプなしで作る）",
    "scene-c": "場面C（作った画面をFigmaに書き出す）",
    "deploy": "デプロイ",
    "fix": "「直ってない」",
}

SUFFIX = {
    "deploy": "送り先の表は CLAUDE.md の「🚀 各プロジェクトの本番 URL とデプロイ先」。",
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
    try:
        with open(RULES, encoding="utf-8") as f:
            text = f.read()
    except Exception:
        return  # ルール集が無い場所では何もしない

    if mode == "session":
        core = block(text, "core")
        if not core:
            return
        head = SESSION_HEAD.get(str(data.get("source", "")), SESSION_HEAD["startup"])
        emit("SessionStart", head + "\n\n" + core)
        return

    prompt = unicodedata.normalize("NFKC", str(data.get("prompt", ""))).lower()
    hits = [name for name, pat in TRIGGERS if re.search(pat, prompt)]
    if not hits:
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
        return
    head = ("【ルールの自動表示】指示の言葉から見て、今回は " + "・".join(LABELS[h] for h in hits)
            + " の可能性があります。当てはまる時は、次の決まりを先に守ってください"
            "（最優先は RULES.md の ★ いちばん大事な決まり）。")
    emit("UserPromptSubmit", head + "\n\n" + "\n\n".join(parts))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass  # 仕掛けの失敗で会話を止めない
