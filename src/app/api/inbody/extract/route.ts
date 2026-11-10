import { NextResponse } from "next/server";
import { actingAthlete } from "@/lib/auth/guards";
import { extractInBody, geminiEnabled } from "@/lib/ai/gemini";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, saveUpload } from "@/lib/uploads";

const STATUS: Record<string, number> = { UNAUTHORIZED: 401, SUBSCRIPTION_REQUIRED: 402, CONSENT_REQUIRED: 403 };

/** Athlete uploads their own scan, or a coach uploads one for an athlete in their team (`athleteId`). */
export async function POST(req: Request) {
  const form = await req.formData();
  let athleteId: string;
  try {
    const athleteField = form.get("athleteId");
    ({ athlete: { id: athleteId } } = await actingAthlete(typeof athleteField === "string" ? athleteField : null));
  } catch (e) {
    const code = (e as Error).message;
    return NextResponse.json({ error: STATUS[code] ? code : "UNAUTHORIZED" }, { status: STATUS[code] ?? 401 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  if (!ALLOWED_IMAGE_TYPES[file.type]) return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const imageUrl = await saveUpload(athleteId, buf, file.type);
  if (!geminiEnabled()) return NextResponse.json({ imageUrl, extraction: null, error: "AI_DISABLED" });

  try {
    const extraction = await extractInBody(buf, file.type);
    return NextResponse.json({ imageUrl, extraction });
  } catch (e) {
    console.error("[inbody] extraction failed", e);
    return NextResponse.json({ imageUrl, extraction: null, error: "EXTRACTION_FAILED" });
  }
}
