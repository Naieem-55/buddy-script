import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { handler, fail } from "@/lib/http";

export const runtime = "nodejs";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

// GET /api/uploads/<file>  -> serve a stored image
export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ path: string[] }> }) => {
    const { path: segments } = await ctx.params;
    // Resolve and confine to UPLOAD_DIR (block ../ traversal).
    const target = path.resolve(UPLOAD_DIR, ...segments);
    if (target !== UPLOAD_DIR && !target.startsWith(UPLOAD_DIR + path.sep)) {
      return fail(400, "Invalid path");
    }
    const ext = path.extname(target).toLowerCase();
    const type = MIME[ext];
    if (!type) return fail(415, "Unsupported media type");

    try {
      const data = await readFile(target);
      return new NextResponse(new Uint8Array(data), {
        headers: {
          "Content-Type": type,
          "Content-Disposition": "inline",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return fail(404, "Not found");
    }
  }
);
