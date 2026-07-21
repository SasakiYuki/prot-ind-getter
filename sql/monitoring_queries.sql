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

-- 6. 実行ごとの観測集合（比較テーブル導入後）
SELECT
  search_run_id,
  COUNT(*)::int AS observed_count,
  COUNT(DISTINCT source || ':' || source_job_id)::int AS distinct_data_jk,
  COUNT(DISTINCT logical_key)::int AS distinct_logical_keys
FROM search_run_jobs
GROUP BY search_run_id
ORDER BY search_run_id DESC;

-- 7. 最新2回の正確な集合比較（data-jk単位）
WITH successful_runs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY executed_at DESC) AS run_order
  FROM search_runs
  WHERE status = 'success'
), previous_set AS (
  SELECT source, source_job_id
  FROM search_run_jobs
  WHERE search_run_id = (SELECT id FROM successful_runs WHERE run_order = 2)
), current_set AS (
  SELECT source, source_job_id
  FROM search_run_jobs
  WHERE search_run_id = (SELECT id FROM successful_runs WHERE run_order = 1)
)
SELECT
  (SELECT COUNT(*)::int FROM previous_set) AS previous_count,
  (SELECT COUNT(*)::int FROM current_set) AS current_count,
  (SELECT COUNT(*)::int FROM previous_set p JOIN current_set c USING (source, source_job_id)) AS common_count,
  (SELECT COUNT(*)::int FROM previous_set p LEFT JOIN current_set c USING (source, source_job_id) WHERE c.source_job_id IS NULL) AS previous_only_count,
  (SELECT COUNT(*)::int FROM current_set c LEFT JOIN previous_set p USING (source, source_job_id) WHERE p.source_job_id IS NULL) AS current_only_count;

-- 8. data-jkが変わった可能性のある再掲載候補
WITH successful_runs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY executed_at DESC) AS run_order
  FROM search_runs
  WHERE status = 'success'
), previous_set AS (
  SELECT source, source_job_id, logical_key
  FROM search_run_jobs
  WHERE search_run_id = (SELECT id FROM successful_runs WHERE run_order = 2)
), current_set AS (
  SELECT source, source_job_id, logical_key
  FROM search_run_jobs
  WHERE search_run_id = (SELECT id FROM successful_runs WHERE run_order = 1)
)
SELECT
  c.source_job_id AS current_source_job_id,
  c.logical_key
FROM current_set c
LEFT JOIN previous_set same_id USING (source, source_job_id)
JOIN (SELECT DISTINCT logical_key FROM previous_set) old_key USING (logical_key)
WHERE same_id.source_job_id IS NULL;
