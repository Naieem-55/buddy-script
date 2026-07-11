import { prisma } from "@/lib/db";
import { requireUser, handler, ok, fail } from "@/lib/http";
import { assertCsrf } from "@/lib/csrf";
import { createPostSchema, cursorSchema } from "@/lib/validation";
import { processAndStoreImage } from "@/lib/storage";
import { getFeed, serializePost } from "@/lib/feed";

export const runtime = "nodejs";

// GET /api/posts?cursor=&limit=  -> keyset feed
export const GET = handler(async (req: Request) => {
  const viewerId = await requireUser();
  const { searchParams } = new URL(req.url);
  const { cursor, limit } = cursorSchema.parse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  const feed = await getFeed(viewerId, cursor, limit);
  return ok(feed);
});

// POST /api/posts  (multipart: text, visibility, image?)
export const POST = handler(async (req: Request) => {
  const viewerId = await requireUser();
  assertCsrf(req);

  const form = await req.formData();
  const { text, visibility } = createPostSchema.parse({
    text: (form.get("text") as string) ?? "",
    visibility: (form.get("visibility") as string) ?? "PUBLIC",
  });

  let imageUrl: string | null = null;
  const image = form.get("image");
  if (image && image instanceof File && image.size > 0) {
    try {
      imageUrl = await processAndStoreImage(image);
    } catch (e) {
      return fail(422, e instanceof Error ? e.message : "Invalid image");
    }
  }

  if (!text.trim() && !imageUrl) {
    return fail(422, "A post needs text or an image");
  }

  const created = await prisma.post.create({
    data: {
      authorId: viewerId,
      text: text.trim() || null,
      imageUrl,
      visibility,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  });

  return ok({ post: serializePost(created, false, true) }, { status: 201 });
});
