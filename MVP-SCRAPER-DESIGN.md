# Indeed求人スクレイパー MVP設計

## 1. 目的

指定した検索条件のIndeed求人情報を1日1回収集し、データベースに保存する。
MVPでは、求人の重複排除、更新検知、取得実行ログを提供する。

## 2. 前提・利用上の制約

- 本システムは、Indeedから自動取得する許可がある環境で利用する。
- Indeedの利用規約、robots.txt、API・連携機能の利用条件を確認してから運用する。
- CAPTCHA、アクセス制限、認証、その他の保護機構を回避しない。
- プロキシローテーションや大量並列アクセスを行わない。
- 取得できない場合は停止・記録し、無理に継続しない。
- 個人情報や応募者情報は収集対象にしない。

## 3. MVPの対象範囲

### 含める機能

- 検索条件を設定ファイルまたは環境変数で指定
- 1日1回の定期実行
- 検索結果ページから求人URL・求人IDを収集
- 求人詳細ページから基本情報を抽出
- PostgreSQLへの保存・更新
- 求人IDによる重複排除
- 求人内容のハッシュによる更新検知
- 実行件数・エラー・処理時間の記録
- 新規求人・更新求人のログ出力

### MVPでは含めない機能

- Web管理画面
- 複数ユーザー管理
- 応募処理
- CAPTCHAやアクセス制限への対応
- 高頻度クロール
- 求人情報の外部公開・再配布
- 複数サイトの横断検索

## 4. システム構成

```text
cron / AWS EventBridge
          |
          v
    Scraper Worker
      |       |
      |       +--> 実行ログ
      v
  PostgreSQL
      |
      v
 新規・更新求人のログ/通知
```

## 5. 推奨技術

- 言語: Python 3.12以上
- ブラウザ操作: Playwright
- HTML解析: BeautifulSoup または lxml
- DB: PostgreSQL
- DBアクセス: SQLAlchemy
- 定期実行: cron、またはAWS EventBridge Scheduler
- 実行環境: Docker
- テスト: pytest

JavaScript描画やページ遷移が必要になる可能性があるため、MVPではPlaywrightを採用する。
ただし、対象ページが静的に取得できることを確認できた場合は、requests + BeautifulSoupに置き換えてよい。

## 6. 処理フロー

```text
1. スクレイピング実行レコードを作成
2. 検索条件を読み込む
3. 許可された範囲で検索結果ページを取得
4. 求人カードから求人ID・詳細URLを抽出
5. 未取得または更新候補の求人詳細を取得
6. タイトル、会社名、勤務地、給与、本文などを抽出
7. テキストを正規化し、content_hashを計算
8. 求人IDをキーにINSERTまたはUPDATE
9. 新規・更新件数を集計
10. 実行レコードを成功または失敗として更新
```

ページ間・詳細ページ間には待機時間を設定し、同時実行数は低く抑える。
タイムアウトや一時的なHTTPエラーは限定回数だけ再試行し、保護機構が検出された場合は処理を中止する。

## 7. 検索条件

MVPでは、環境変数または `config/searches.yml` で管理する。

```yaml
searches:
  - name: python_tokyo
    keyword: Python
    location: 東京都
    max_pages: 3
    enabled: true
```

## 8. 保存データ

### jobs

| カラム | 内容 |
|---|---|
| id | 内部ID |
| source | データソース名。例: indeed |
| source_job_id | Indeed側の求人ID |
| title | 求人タイトル |
| company_name | 会社名 |
| location | 勤務地 |
| salary | 給与表記 |
| employment_type | 雇用形態 |
| description | 求人本文 |
| source_url | 詳細ページURL |
| published_at | 掲載日。取得できる場合のみ |
| first_seen_at | 初回取得日時 |
| last_seen_at | 最終取得日時 |
| content_hash | 正規化済み内容のハッシュ |
| status | active / possibly_closed |

### scrape_runs

| カラム | 内容 |
|---|---|
| id | 実行ID |
| started_at | 開始日時 |
| finished_at | 終了日時 |
| status | running / success / failed |
| result_count | 取得件数 |
| new_count | 新規件数 |
| updated_count | 更新件数 |
| error_message | エラー内容 |

### 一意制約

```text
UNIQUE(source, source_job_id)
```

求人IDが取得できない場合は、正規化した詳細URLを代替キーとして利用する。

## 9. 抽出ルール

抽出元の優先順位は次のとおりとする。

1. JSON-LD
2. `data-*`属性
3. `aria-label`や見出し構造
4. CSSセレクタ
5. 抽出失敗として警告ログに記録

CSSクラス名だけに依存しない。抽出できない項目があっても求人全体を破棄せず、NULLとして保存する。

HTML構造変更に備えて、以下をログに出力する。

- 抽出対象ページURL
- 抽出できなかった項目
- 求人カード件数
- 詳細ページのHTTPステータス

## 10. 重複排除・更新検知

求人IDを基準にUPSERTする。

```text
未登録の求人ID       -> new
登録済みかつhash同一 -> unchanged
登録済みかつhash変更 -> updated
```

ハッシュ対象は、タイトル、会社名、勤務地、給与、雇用形態、求人本文とする。
空白・改行・HTMLタグを除去してからSHA-256を計算する。

一定回数連続して取得できない求人は、すぐに削除せず `possibly_closed` とする。

## 11. ディレクトリ構成

```text
job-scraper/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── scheduler.py
│   ├── scraper/
│   │   ├── browser.py
│   │   ├── search.py
│   │   ├── detail.py
│   │   ├── parser.py
│   │   └── selectors.py
│   ├── storage/
│   │   ├── models.py
│   │   ├── database.py
│   │   └── repository.py
│   └── logging_config.py
├── config/
│   └── searches.yml
├── migrations/
├── tests/
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── README.md
```

## 12. 失敗時の扱い

- ページ単位の失敗はエラーとして記録し、許可された範囲で次のページへ進む
- DB接続失敗時は実行全体を失敗にする
- タイムアウトは最大2〜3回まで再試行する
- CAPTCHAやアクセス拒否を検知した場合は即時停止する
- 途中まで保存できた求人はロールバックせず、次回実行時に再確認する
- 実行結果とエラーログを最低30日保存する

## 13. MVPの完了条件

- 1つの検索条件で定期実行できる
- 指定ページ数まで求人URLを取得できる
- 求人詳細をDBへ保存できる
- 同一求人が重複登録されない
- 求人内容の変更を検出できる
- 実行成功・失敗・取得件数を確認できる
- HTML構造の変更や抽出失敗をログで確認できる
- 保護機構を回避せず安全に停止できる

## 14. 次の拡張候補

1. 検索条件のDB管理
2. Slack・メール通知
3. 求人の検索・閲覧画面
4. 求人終了判定
5. HTMLスナップショットによる差分確認
6. 複数の許可済み求人ソースへの対応
