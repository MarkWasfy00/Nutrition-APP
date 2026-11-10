import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { currentUser, managedAthlete } from "@/lib/auth/guards";
import { ALLOWED_IMAGE_TYPES, UPLOAD_ROOT } from "@/lib/uploads";

const TYPES = Object.fromEntries(Object.entries(ALLOWED_IMAGE_TYPES).map(([mime, ext]) => [ext, mime]));

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await currentUser();
  const parts = (await params).path;
  // Users read their own uploads (/api/uploads/<userId>/<file>); coaches also read their athletes'.
  if (!user || parts.length !== 2 || !/^[\w-]+\.(jpg|png|webp)$/.test(parts[1])) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (parts[0] !== user.id && !(await managedAthlete(user, parts[0]))) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const data = await readFile(path.join(UPLOAD_ROOT, parts[0], parts[1]));
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": TYPES[parts[1].split(".").pop()!], "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
