import { sql } from "@vercel/postgres";

/**
 * Initialise the tasks table (idempotent).
 * Call once on first deploy or from a setup script.
 */
export async function ensureTasksTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id            SERIAL PRIMARY KEY,
      title         TEXT NOT NULL,
      description   TEXT,
      status        TEXT NOT NULL DEFAULT 'todo',
      priority      TEXT NOT NULL DEFAULT 'medium',
      assignee      TEXT,
      file_url      TEXT,
      file_name     TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

export { sql };
