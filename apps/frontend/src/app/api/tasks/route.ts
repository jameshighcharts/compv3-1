import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

/** GET /api/tasks — list all tasks, newest first. */
export async function GET() {
  try {
    const { rows } = await sql`
      SELECT * FROM tasks ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/tasks — create a new task. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, status, priority, assignee, file_url, file_name } = body as {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      file_url?: string;
      file_name?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO tasks (title, description, status, priority, assignee, file_url, file_name)
      VALUES (
        ${title.trim()},
        ${description?.trim() ?? null},
        ${status ?? "todo"},
        ${priority ?? "medium"},
        ${assignee?.trim() ?? null},
        ${file_url ?? null},
        ${file_name ?? null}
      )
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
