import { sql } from "../../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM search_conditions) AS search_conditions,
        (SELECT COUNT(*)::int FROM search_runs) AS search_runs,
        (SELECT COUNT(*)::int FROM jobs) AS jobs
    `;

    return Response.json({ ok: true, database: "connected", counts: result[0] });
  } catch (error) {
    console.error("Database health check failed", error);
    return Response.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
