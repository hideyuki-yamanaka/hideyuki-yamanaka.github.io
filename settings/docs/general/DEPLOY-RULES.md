# デプロイの運用ルール（無駄デプロイ削減・上限対策）

Vercel 無料枠の上限は **1日100デプロイ**（全プロジェクト合算・24時間ローリング）。
2026-09-11 に「anyflow を触っただけで tabinoshiori/design-gallery まで巻き添え自動デプロイ」して
143件/24h まで膨らみ上限に達した。以下のルールで再発防止する。

## 🔧 モノレポ内サブディレクトリ型プロジェクトは「Ignored Build Step」必須

親リポ `hideyuki-yamanaka.github.io` の中に複数の Vercel プロジェクトが同居している。
GitHub 連携ありのものは **どのファイルを変えても main push で全プロジェクト自動ビルドが走る** ので、
必ず「該当フォルダに変更がある時だけ build」の条件を入れる。

Vercel 側の設定コマンド（各プロジェクトの Settings > Git > Ignored Build Step）:

```bash
git diff HEAD^ HEAD --quiet .
```

- **戻り値 0（差分なし）= build スキップ** / **非0（差分あり or エラー）= build 実行**
- Vercel は Root Directory を作業ディレクトリにして実行する。`.` はその Root Directory を指す
- git が失敗した場合（HEAD^ が無い等）は必ずビルドが走る＝**サービスは絶対止まらない安全側倒し**

適用済み（2026-09-11）:
| プロジェクト | Root Directory | Ignored Build Step |
|---|---|---|
| tabinoshiori | `travel-shiori` | `git diff HEAD^ HEAD --quiet .` |
| design-gallery | `design-gallery` | `git diff HEAD^ HEAD --quiet .` |

新しく親リポにサブディレクトリ型プロジェクトを追加する時は、この設定も同時に入れる。

## 💡 API で一括設定するコマンド（Claude 用）

Vercel API から PATCH で入れる。トークンは `~/Library/Application Support/com.vercel.cli/auth.json`。

```bash
TOKEN=$(cat ~/Library/Application\ Support/com.vercel.cli/auth.json | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))")
curl -X PATCH "https://api.vercel.com/v9/projects/<PROJECT_NAME>?teamId=team_QLgrOjDs1OkQZB4wukaNHsvG" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"commandForIgnoringBuildStep":"git diff HEAD^ HEAD --quiet ."}'
```

## 📊 直近24hの消費を数える（token不要、CLI版）

```bash
for p in <project-name>...; do
  cnt=$(npx vercel ls "$p" 2>&1 | grep 'Ready' | awk '{print $1}' | grep -cE '^[0-9]+m$|^[0-9]+s$|^([0-9]|1[0-9]|2[0-3])h$')
  echo "$p: ${cnt}件"
done
```

## 🚨 上限に到達した時のリカバリ

- 手動デプロイなら 24h 待つしかない
- CLAUDE.md にある `anyflow/deploy-v4.sh` のような**リセット後自動リトライ・成功時セルフクリーン**の
  LaunchAgent を用意しておくと、寝ている間に反映される

