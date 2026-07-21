import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
const currentRunId = Number(process.argv[2]);

if (!connectionString) throw new Error("DATABASE_URL is not configured");
if (!Number.isInteger(currentRunId)) throw new Error("Usage: npm run db:compare -- <current_run_id>");

const sql = neon(connectionString);

async function main() {
  const rows = await sql.query(
    `WITH previous_run AS (
       SELECT id FROM search_runs
       WHERE status = 'success' AND id < $1
       ORDER BY executed_at DESC LIMIT 1
     ), previous_set AS (
       SELECT source, source_job_id, logical_key FROM search_run_jobs
       WHERE search_run_id = (SELECT id FROM previous_run)
     ), current_set AS (
       SELECT source, source_job_id, logical_key FROM search_run_jobs
       WHERE search_run_id = $1
     ), previous_data AS (
       SELECT DISTINCT source, source_job_id FROM previous_set
     ), current_data AS (
       SELECT DISTINCT source, source_job_id FROM current_set
     ), previous_logical AS (
       SELECT DISTINCT logical_key FROM previous_set
     ), current_logical AS (
       SELECT DISTINCT logical_key FROM current_set
     ), relisted AS (
       SELECT DISTINCT c.source, c.source_job_id
       FROM current_set c
       LEFT JOIN previous_data p USING (source, source_job_id)
       JOIN previous_logical old_key USING (logical_key)
       WHERE p.source_job_id IS NULL
     )
     SELECT
       (SELECT id FROM previous_run) AS previous_run_id,
       (SELECT COUNT(*)::int FROM previous_data) AS previous_data_count,
       (SELECT COUNT(*)::int FROM current_data) AS current_data_count,
       (SELECT COUNT(*)::int FROM previous_data p JOIN current_data c USING (source, source_job_id)) AS common_data_count,
       (SELECT COUNT(*)::int FROM previous_data p LEFT JOIN current_data c USING (source, source_job_id) WHERE c.source_job_id IS NULL) AS previous_only_data_count,
       (SELECT COUNT(*)::int FROM current_data c LEFT JOIN previous_data p USING (source, source_job_id) WHERE p.source_job_id IS NULL) AS current_only_data_count,
       (SELECT COUNT(*)::int FROM previous_logical p JOIN current_logical c USING (logical_key)) AS common_logical_count,
       (SELECT COUNT(*)::int FROM previous_logical p LEFT JOIN current_logical c USING (logical_key) WHERE c.logical_key IS NULL) AS previous_only_logical_count,
       (SELECT COUNT(*)::int FROM current_logical c LEFT JOIN previous_logical p USING (logical_key) WHERE p.logical_key IS NULL) AS current_only_logical_count,
       (SELECT COUNT(*)::int FROM relisted) AS relisted_candidate_count`,
    [currentRunId]
  );

  const result = rows[0];
  if (!result?.previous_run_id || Number(result.previous_data_count) === 0) {
    console.log(JSON.stringify({ currentRunId, status: "skipped", reason: "no_previous_snapshot" }));
    return;
  }

  const values = [result.previous_run_id, currentRunId, result.previous_data_count, result.current_data_count, result.common_data_count, result.previous_only_data_count, result.current_only_data_count, result.relisted_candidate_count];
  await sql.query(
    `INSERT INTO job_comparisons
      (previous_run_id, current_run_id, comparison_type, previous_count, current_count, common_count, previous_only_count, current_only_count, relisted_candidate_count)
     VALUES ($1, $2, $9, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (previous_run_id, current_run_id, comparison_type) DO UPDATE SET
       previous_count = EXCLUDED.previous_count, current_count = EXCLUDED.current_count,
       common_count = EXCLUDED.common_count, previous_only_count = EXCLUDED.previous_only_count,
       current_only_count = EXCLUDED.current_only_count, relisted_candidate_count = EXCLUDED.relisted_candidate_count`,
    [...values, "data_jk"]
  );

  const logicalValues = [result.previous_run_id, currentRunId, result.previous_data_count, result.current_data_count, result.common_logical_count, result.previous_only_logical_count, result.current_only_logical_count, result.relisted_candidate_count];
  await sql.query(
    `INSERT INTO job_comparisons
      (previous_run_id, current_run_id, comparison_type, previous_count, current_count, common_count, previous_only_count, current_only_count, relisted_candidate_count)
     VALUES ($1, $2, $9, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (previous_run_id, current_run_id, comparison_type) DO UPDATE SET
       previous_count = EXCLUDED.previous_count, current_count = EXCLUDED.current_count,
       common_count = EXCLUDED.common_count, previous_only_count = EXCLUDED.previous_only_count,
       current_only_count = EXCLUDED.current_only_count, relisted_candidate_count = EXCLUDED.relisted_candidate_count`,
    [...logicalValues, "logical_key"]
  );

  console.log(JSON.stringify({ currentRunId, previousRunId: result.previous_run_id, status: "success", result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
