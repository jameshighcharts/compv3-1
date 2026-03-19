import { NextRequest, NextResponse } from "next/server";

import { del } from "@/lib/blob";

/** DELETE /api/files/delete — remove a file by URL. */
export async function DELETE(request: NextRequest) {
  try {
    const { url } = (await request.json()) as { url: string };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    await del(url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
