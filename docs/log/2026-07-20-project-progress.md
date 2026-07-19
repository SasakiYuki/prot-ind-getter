# Indeed求人モニタリングPoC 作業ログ

## 概要

Indeedの「エンジニア × 東京都」求人を日次収集し、案件数の推移をモニタリングするBIダッシュボードPoCを構築している。

## 2026-07-17: 調査・設計

- Indeedの検索結果ページを確認。
- 検索条件は「エンジニア」「東京都」とした。
- 検索結果から以下の項目を確認。
  - 求人タイトル
  - Indeed求人ID（`data-jk`）
  - 企業名
  - 勤務地
  - 給与表記
  - 雇用形態
  - 掲載日表記
  - 求人タグ
  - 求人概要
- 求人詳細には仕事内容、求める人材、スキル、勤務条件、企業情報等が存在することを確認。
- MVPのDB設計を決定。
- Indeed自動取得は、利用規約・robots.txt・許可範囲を確認し、保護機構の迂回を行わない方針とした。

## MVP設計

### 収集対象

- データソース: Indeed
- キーワード: エンジニア
- 勤務地: 東京都
- 実行頻度: 1日1回

### DBテーブル

- `search_conditions`: 検索条件
- `search_runs`: 取得実行履歴
- `jobs`: 求人情報

### 重複排除

```text
UNIQUE(source, source_job_id)
```

### 技術方針

- Next.js
- Vercel
- Neon Postgres
- `@neondatabase/serverless`
- Drizzle ORMのスキーマ定義
- 環境変数によるDB接続

## 2026-07-17: ダッシュボードPoC実装

- Next.jsのダッシュボードを作成。
- サンプルデータを使い、以下を表示。
  - 現在の案件数
  - 7日 / 30日 / 90日の案件数推移
  - 最新取得状況
  - 最新求人一覧
- レスポンシブレイアウトを実装。
- `npm run build`でビルド成功を確認。

## 2026-07-20: GitHub・Vercel設定

- GitHubリモートを確認。
  - `https://github.com/SasakiYuki/prot-ind-getter.git`
- `main`ブランチへ初回コミット・プッシュ。
- Vercel CLIを導入。
- Vercel CLIへログイン。
- Vercelチーム`wacorggen-gmailcom's projects`を選択。
- Vercelプロジェクト`prot-ind-getter`を作成。
- CLIから本番デプロイを実行。
- 公開URL:
  - https://prot-ind-getter.vercel.app
- GitHub自動連携は、Vercel側のGitHub App権限不足により未設定。
- 現在はCLIから手動デプロイ可能な状態。

## 2026-07-20: Neon Postgres・DB初期化

- Vercel MarketplaceからNeon Postgresを作成。
- Neonリソース名: `neon-beige-book`
- NeonをVercelプロジェクト`prot-ind-getter`へ接続。
- 以下の環境変数をVercelへ登録。
  - `DATABASE_URL`
  - `DATABASE_URL_UNPOOLED`
  - `NEON_PROJECT_ID`
  - その他Neon接続用変数
- 環境変数はProduction / Preview / Developmentへ登録済み。
- ローカル接続情報は`.env.local`へ取得。
- `.env.local`、`.vercel/`、Neon補助スキル用ファイルはGit管理対象外とした。
- DBマイグレーションを実行。
- 初期検索条件を1件登録。

### DB初期状態

```json
{
  "search_conditions": 1,
  "search_runs": 0,
  "jobs": 0
}
```

### 接続確認

以下のAPIを追加し、本番環境からDB接続を確認した。

```text
GET /api/health/db
```

確認結果:

```json
{
  "ok": true,
  "database": "connected",
  "counts": {
    "search_conditions": 1,
    "search_runs": 0,
    "jobs": 0
  }
}
```

## 現在の状態

- GitHub: `main`へプッシュ済み
- Vercel: 本番デプロイ済み
- Neon Postgres: 作成・接続済み
- DBスキーマ: 作成済み
- DB接続ヘルスチェック: 成功
- 求人スクレイピング: 未実装
- 日次スケジューラー: 未実装
- ダッシュボードの実DB連携: 未実装（現在はサンプルデータ）
- GitHub自動デプロイ: 未設定

## 主要コミット

| コミット | 内容 |
|---|---|
| `6b95cee` | Indeed求人モニタリングPoCダッシュボード作成 |
| `c0c8b6b` | VercelローカルメタデータをGit管理対象外に追加 |
| `447320b` | Neon Postgres接続とDBスキーマ追加 |
| `d86ee05` | Neonローカル補助ファイルをGit管理対象外に追加 |

## 次の作業候補

1. Indeed取得処理を実装
2. `jobs`へのUPSERT処理を実装
3. `search_runs`への実行結果保存を実装
4. 日次実行をGitHub Actionsまたは別のジョブ基盤に設定
5. ダッシュボードをDBの実データに接続
6. 案件数推移を`search_runs`から集計
7. VercelとGitHubの自動デプロイ連携を設定

## セキュリティ・運用メモ

- 接続文字列・パスワード・OIDCトークンはログやGitへ記録しない。
- `.env.local`はコミットしない。
- Indeed側の利用規約・アクセス制限・取得許可を確認して運用する。
- CAPTCHAやアクセス制限の迂回は行わない。

## 2026-07-20: スクレイパー取得可否ドライラン

DBへは書き込まず、ブラウザセッション上で「エンジニア × 東京都」の検索結果をページングして確認した。

### 確認結果

- 通常のHTTPアクセス（`curl`）はHTTP 403となった。
- ブラウザ経由では、`start=0`〜`start=320`まで各ページの求人カードを取得できた。
- 1ページあたりのカード数は原則16件。
- `data-jk`を求人IDとして重複排除できることを確認。
- `start=0`〜`start=500`を確認した範囲では、51ページ・重複排除後400件のIDを確認した。
- `start=330`以降は新規IDがほぼ増えず、`start=500`でもページ自体は16件を返す一方、ページネーションUIは`start=300`付近までしか示さなかった。
- 画面上の検索結果表示は「5,000件以上」だったが、今回の取得経路では5,000件以上を網羅できるページングにはなっていない。

### 判断

現時点では「全件取得できる」とは判定できない。Indeedの検索結果は表示件数とページング可能な結果集合が一致しない可能性があり、同一求人の再掲も確認された。したがって、MVPでは取得ページ数だけを完了条件にせず、以下を実装する。

- `data-jk`による重複排除
- ページ間の新規ID増加率と重複率の記録
- 同一ページ相当の結果が続いた場合の安全停止
- HTTP 403、CAPTCHA、空ページを検知した場合の停止と`search_runs`への失敗記録
- DB書き込み前のドライランで取得件数を確認

なお、本試験では利用規約・アクセス制限を尊重し、CAPTCHAやブロックの迂回、並列大量アクセスは行っていない。
