-- Indeed求人モニタリング用の読み取り専用クエリ

-- 1. 実行履歴と件数推移
SELECT
  id,
  executed_at AT TIME ZONE 'Asia/Tokyo' AS executed_at_jst,
  keyword,
  location,
  result_count,
  new_count,
  updated_count,
  status,
  error_message
FROM search_runs
ORDER BY executed_at DESC;

-- 2. 最新2回の取得件数比較
WITH successful_runs AS (
  SELECT
    id,
    executed_at,
    result_count,
    ROW_NUMBER() OVER (ORDER BY executed_at DESC) AS run_order
  FROM search_runs
  WHERE status = 'success'
)
SELECT
  MAX(result_count) FILTER (WHERE run_order = 2) AS previous_count,
  MAX(result_count) FILTER (WHERE run_order = 1) AS current_count,
  MAX(result_count) FILTER (WHERE run_order = 1)
    - MAX(result_count) FILTER (WHERE run_order = 2) AS count_difference;

-- 3. 最新実行で新しく観測された求人
WITH latest_run AS (
  SELECT executed_at
  FROM search_runs
  WHERE status = 'success'
  ORDER BY executed_at DESC
  LIMIT 1
)
SELECT
  source_job_id,
  title,
  company_name,
  location,
  first_seen_at,
  source_url
FROM jobs, latest_run
WHERE jobs.first_seen_at >= latest_run.executed_at
ORDER BY first_seen_at DESC;

-- 4. 前回実行では観測されたが、最新実行では観測されなかった求人
-- 注意: 現行スキーマではjobs.last_seen_atを使った近似比較。
-- 後続実行が行われると過去時点の厳密な集合比較はできない。
WITH successful_runs AS (
  SELECT
    executed_at,
    ROW_NUMBER() OVER (ORDER BY executed_at DESC) AS run_order
  FROM search_runs
  WHERE status = 'success'
), bounds AS (
  SELECT
    MAX(executed_at) FILTER (WHERE run_order = 1) AS current_at,
    MAX(executed_at) FILTER (WHERE run_order = 2) AS previous_at
  FROM successful_runs
)
SELECT
  source_job_id,
  title,
  company_name,
  location,
  last_seen_at,
  source_url
FROM jobs, bounds
WHERE jobs.last_seen_at >= bounds.previous_at
  AND jobs.last_seen_at < bounds.current_at
ORDER BY last_seen_at ASC;

-- 5. 「消えた」件数の集計（求人停止・再ランキング・取得範囲外を含む）
WITH successful_runs AS (
  SELECT
    executed_at,
    ROW_NUMBER() OVER (ORDER BY executed_at DESC) AS run_order
  FROM search_runs
  WHERE status = 'success'
), bounds AS (
  SELECT
    MAX(executed_at) FILTER (WHERE run_order = 1) AS current_at,
    MAX(executed_at) FILTER (WHERE run_order = 2) AS previous_at
  FROM successful_runs
)
SELECT COUNT(*)::int AS not_seen_in_latest_run
FROM jobs, bounds
WHERE jobs.last_seen_at >= bounds.previous_at
  AND jobs.last_seen_at < bounds.current_at;
