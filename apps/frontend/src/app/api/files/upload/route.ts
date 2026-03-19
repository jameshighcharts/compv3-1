import { NextRequest, NextResponse } from "next/server";

import { put } from "@/lib/blob";

/** POST /api/files/upload — upload a PDF or CSV to Vercel Blob. */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowed = ["application/pdf", "text/csv"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and CSV files are allowed" },
        { status: 400 },
      );
    }

    const maxSize = 50 * 1024 * 1024; // 50 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File exceeds 50 MB limit" },
        { status: 400 },
      );
    }

    const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    return NextResponse.json({
      url: blob.url,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
