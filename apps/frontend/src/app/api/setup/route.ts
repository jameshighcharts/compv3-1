import { NextResponse } from "next/server";

import { ensureTasksTable } from "@/lib/db";

/** POST /api/setup — create the tasks table (idempotent). */
export async function POST() {
  try {
    await ensureTasksTable();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
