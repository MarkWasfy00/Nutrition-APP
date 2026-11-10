import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/guards";
import { userHasAccess } from "@/lib/subscription";
import { extractInBody, geminiEnabled } from "@/lib/ai/gemini";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, saveUpload } from "@/lib/uploads";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!(await userHasAccess(user.id))) return NextResponse.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 402 });

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  if (!ALLOWED_IMAGE_TYPES[file.type]) return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const imageUrl = await saveUpload(user.id, buf, file.type);
  if (!geminiEnabled()) return NextResponse.json({ imageUrl, extraction: null, error: "AI_DISABLED" });

  try {
    const extraction = await extractInBody(buf, file.type);
    return NextResponse.json({ imageUrl, extraction });
  } catch (e) {
    console.error("[inbody] extraction failed", e);
    return NextResponse.json({ imageUrl, extraction: null, error: "EXTRACTION_FAILED" });
  }
}
