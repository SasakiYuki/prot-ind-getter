import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const sql = neon(connectionString);

async function main() {
await sql`
  CREATE TABLE IF NOT EXISTS search_conditions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    keyword TEXT NOT NULL,
    location TEXT NOT NULL,
    max_pages INTEGER NOT NULL DEFAULT 3,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS search_runs (
    id SERIAL PRIMARY KEY,
    search_condition_id INTEGER REFERENCES search_conditions(id),
    keyword TEXT NOT NULL,
    location TEXT NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result_count INTEGER NOT NULL DEFAULT 0,
    new_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    error_message TEXT
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'indeed',
    source_job_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company_name TEXT,
    location TEXT,
    salary_text TEXT,
    employment_type TEXT,
    posted_text TEXT,
    summary TEXT,
    description TEXT,
    source_url TEXT NOT NULL,
    search_keyword TEXT NOT NULL,
    search_location TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_changed_at TIMESTAMPTZ,
    content_hash TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    tags JSONB,
    raw_data JSONB,
    CONSTRAINT jobs_source_job_unique UNIQUE (source, source_job_id)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS search_run_jobs (
    id SERIAL PRIMARY KEY,
    search_run_id INTEGER NOT NULL REFERENCES search_runs(id),
    job_id INTEGER REFERENCES jobs(id),
    source TEXT NOT NULL,
    source_job_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company_name TEXT,
    location TEXT,
    salary_text TEXT,
    employment_type TEXT,
    logical_key TEXT NOT NULL,
    content_hash TEXT,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_data JSONB,
    CONSTRAINT search_run_jobs_run_source_job_unique UNIQUE (search_run_id, source, source_job_id)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS job_comparisons (
    id SERIAL PRIMARY KEY,
    previous_run_id INTEGER NOT NULL REFERENCES search_runs(id),
    current_run_id INTEGER NOT NULL REFERENCES search_runs(id),
    comparison_type TEXT NOT NULL,
    previous_count INTEGER NOT NULL DEFAULT 0,
    current_count INTEGER NOT NULL DEFAULT 0,
    common_count INTEGER NOT NULL DEFAULT 0,
    previous_only_count INTEGER NOT NULL DEFAULT 0,
    current_only_count INTEGER NOT NULL DEFAULT 0,
    relisted_candidate_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT job_comparisons_runs_type_unique UNIQUE (previous_run_id, current_run_id, comparison_type)
  )
`;

await sql`
  INSERT INTO search_conditions (name, keyword, location, max_pages, enabled)
  SELECT 'engineer_tokyo', 'エンジニア', '東京都', 3, 1
  WHERE NOT EXISTS (
    SELECT 1 FROM search_conditions WHERE name = 'engineer_tokyo'
  )
`;

const result = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM search_conditions) AS search_conditions,
    (SELECT COUNT(*)::int FROM search_runs) AS search_runs,
    (SELECT COUNT(*)::int FROM jobs) AS jobs,
    (SELECT COUNT(*)::int FROM search_run_jobs) AS search_run_jobs,
    (SELECT COUNT(*)::int FROM job_comparisons) AS job_comparisons
`;

console.log(JSON.stringify(result[0]));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
