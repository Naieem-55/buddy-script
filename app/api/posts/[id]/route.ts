import { prisma } from "@/lib/db";
import { requireUser, handler, ok, fail } from "@/lib/http";
import { assertCsrf } from "@/lib/csrf";

export const runtime = "nodejs";

// DELETE /api/posts/:id  (author only)
export const DELETE = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    assertCsrf(req);
    const { id } = await ctx.params;

    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!post) return fail(404, "Post not found");
    if (post.authorId !== viewerId) return fail(403, "Not your post");

    await prisma.post.delete({ where: { id } });
    return ok({ ok: true });
  }
);
