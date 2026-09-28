import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "logos";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
};

// POST /api/upload/logo  (multipart form-data, field "file")
// Auth-gated: only a logged-in user can upload. Stores the image in the public
// `logos` bucket via the service role and returns its public URL. Saving that
// URL onto a brand/placement is done separately by the profile form.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PNG, JPG, WEBP, SVG, or GIF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Max 2MB." },
      { status: 400 }
    );
  }

  const path = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": file.type,
        "cache-control": "public, max-age=31536000, immutable",
      },
      body: bytes,
    }
  );

  if (!uploadRes.ok) {
    const detail = await uploadRes.text();
    console.error("Logo upload failed:", uploadRes.status, detail);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 502 }
    );
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return NextResponse.json({ ok: true, url });
}
