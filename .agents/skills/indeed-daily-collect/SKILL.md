---
name: indeed-daily-collect
description: >-
  Use when collecting the configured Indeed jobs for the daily PoC run.
  Opens the Indeed search results in the approved browser session, waits for
  rendered cards, extracts job-card fields, deduplicates by data-jk, and saves
  the accessible result set to the project's Neon Postgres database.
---

# Indeed日次求人取得

## 対象

- 検索キーワード: `エンジニア`
- 勤務地: `東京都`
- URL: `https://jp.indeed.com/jobs?q=%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%8B%E3%82%A2&l=%E6%9D%B1%E4%BA%AC%E9%83%BD&radius=25&start={offset}`
- 保存先: Neon Postgresの`jobs`、実行履歴は`search_runs`

## 実行手順

1. Indeedを通常HTTPで取得せず、利用可能なブラウザセッションで開く。
2. `start=0`から10刻みでページングする。ページごとにDOM描画完了を確認し、短い待機後に求人カードを読む。
3. `[data-jk]`を求人IDとして、同一実行内で重複排除する。
4. 以下をカードから抽出する。
   - `source_job_id`, `title`, `company_name`, `location`
   - `salary_text`, `employment_type`, `posted_text`
   - タグ配列とカードの元テキストを`raw_data`に保存する
5. 取得したデータを`jobs`へUPSERTする。キーは`(source, source_job_id)`とし、再取得時は内容が同じでも必ず`last_seen_at`を更新する。内容が変わった場合だけ`last_changed_at`を更新する。`content_hash`が同じという理由でUPDATE全体を省略してはならない。
6. UPSERT後、今回の観測集合を`search_run_jobs`へ保存する。`logical_key`には正規化した企業名・タイトル・勤務地を使い、`source_job_id`とは別の同一案件候補キーとして扱う。
7. 前回の成功実行と比較し、`data_jk`単位と`logical_key`単位の結果を`job_comparisons`へ保存する。
8. `search_runs`に結果件数、新規件数、更新件数、ステータスを記録する。

## 停止条件

- CAPTCHA、robotチェック、403、アクセス拒否が表示された場合
- 求人カードが空になった場合
- ページングが同一結果を繰り返し、新規IDが増えない状態が続いた場合
- 並列化や大量アクセスが必要になった場合

「画面上の5,000件以上」を全件取得できるとは仮定しない。取得範囲、重複率、停止理由を実行ログに残す。

## 制約

- CAPTCHAやアクセス制限を迂回しない。
- プロキシ、並列大量アクセス、認証情報の収集を行わない。
- DB接続文字列を出力・コミットしない。
- ブラウザセッションがない場合は、取得不能として報告し、HTTP取得へ無断で切り替えない。
- ブラウザやWebエージェントの切り替えを、アクセス制限・bot検知・CAPTCHAの回避目的で行わない。

## 確認

実行後は、DBの`jobs`件数と`search_runs`の最新行を確認する。取得できた範囲のみを成功として報告し、全件取得とは表現しない。
