import { integer, jsonb, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const searchConditions = pgTable("search_conditions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keyword: text("keyword").notNull(),
  location: text("location").notNull(),
  maxPages: integer("max_pages").notNull().default(3),
  enabled: integer("enabled").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const searchRuns = pgTable("search_runs", {
  id: serial("id").primaryKey(),
  searchConditionId: integer("search_condition_id").references(() => searchConditions.id),
  keyword: text("keyword").notNull(),
  location: text("location").notNull(),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
  resultCount: integer("result_count").notNull().default(0),
  newCount: integer("new_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  status: text("status").notNull().default("running"),
  errorMessage: text("error_message")
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull().default("indeed"),
  sourceJobId: text("source_job_id").notNull(),
  title: text("title").notNull(),
  companyName: text("company_name"),
  location: text("location"),
  salaryText: text("salary_text"),
  employmentType: text("employment_type"),
  postedText: text("posted_text"),
  summary: text("summary"),
  description: text("description"),
  sourceUrl: text("source_url").notNull(),
  searchKeyword: text("search_keyword").notNull(),
  searchLocation: text("search_location").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastChangedAt: timestamp("last_changed_at", { withTimezone: true }),
  contentHash: text("content_hash"),
  status: text("status").notNull().default("active"),
  tags: jsonb("tags"),
  rawData: jsonb("raw_data")
}, (table) => ({
  sourceJobUnique: unique("jobs_source_job_unique").on(table.source, table.sourceJobId)
}));

export const searchRunJobs = pgTable("search_run_jobs", {
  id: serial("id").primaryKey(),
  searchRunId: integer("search_run_id").notNull().references(() => searchRuns.id),
  jobId: integer("job_id").references(() => jobs.id),
  source: text("source").notNull(),
  sourceJobId: text("source_job_id").notNull(),
  title: text("title").notNull(),
  companyName: text("company_name"),
  location: text("location"),
  salaryText: text("salary_text"),
  employmentType: text("employment_type"),
  logicalKey: text("logical_key").notNull(),
  contentHash: text("content_hash"),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  rawData: jsonb("raw_data")
}, (table) => ({
  runJobUnique: unique("search_run_jobs_run_source_job_unique").on(table.searchRunId, table.source, table.sourceJobId)
}));

export const jobComparisons = pgTable("job_comparisons", {
  id: serial("id").primaryKey(),
  previousRunId: integer("previous_run_id").notNull().references(() => searchRuns.id),
  currentRunId: integer("current_run_id").notNull().references(() => searchRuns.id),
  comparisonType: text("comparison_type").notNull(),
  previousCount: integer("previous_count").notNull().default(0),
  currentCount: integer("current_count").notNull().default(0),
  commonCount: integer("common_count").notNull().default(0),
  previousOnlyCount: integer("previous_only_count").notNull().default(0),
  currentOnlyCount: integer("current_only_count").notNull().default(0),
  relistedCandidateCount: integer("relisted_candidate_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  comparisonUnique: unique("job_comparisons_runs_type_unique").on(table.previousRunId, table.currentRunId, table.comparisonType)
}));
