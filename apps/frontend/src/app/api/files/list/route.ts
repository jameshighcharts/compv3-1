import { NextResponse } from "next/server";

import { list } from "@/lib/blob";

/** GET /api/files/list — list all uploaded files. */
export async function GET() {
  try {
    const { blobs } = await list({ prefix: "uploads/" });

    const files = blobs.map((b) => ({
      url: b.url,
      name: b.pathname.replace("uploads/", "").replace(/^\d+-/, ""),
      size: b.size,
      uploadedAt: b.uploadedAt,
    }));

    return NextResponse.json(files);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
