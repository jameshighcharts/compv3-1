import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** GET /api/tasks/:id */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const { rows } = await sql`SELECT * FROM tasks WHERE id = ${Number(id)}`;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/tasks/:id — update fields. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { title, description, status, priority, assignee, file_url, file_name } = body as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      file_url?: string | null;
      file_name?: string | null;
    };

    const { rows } = await sql`
      UPDATE tasks
      SET
        title       = COALESCE(${title ?? null}, title),
        description = COALESCE(${description ?? null}, description),
        status      = COALESCE(${status ?? null}, status),
        priority    = COALESCE(${priority ?? null}, priority),
        assignee    = COALESCE(${assignee ?? null}, assignee),
        file_url    = COALESCE(${file_url ?? null}, file_url),
        file_name   = COALESCE(${file_name ?? null}, file_name),
        updated_at  = now()
      WHERE id = ${Number(id)}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/tasks/:id */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const { rowCount } = await sql`DELETE FROM tasks WHERE id = ${Number(id)}`;

    if (rowCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
