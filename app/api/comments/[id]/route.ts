import { prisma } from "@/lib/db";
import { requireUser, handler, ok, fail } from "@/lib/http";
import { assertCsrf } from "@/lib/csrf";

export const runtime = "nodejs";

// DELETE /api/comments/:id  (author only). Cascade removes replies; the post's
// commentCount is decremented by the total number of rows removed.
export const DELETE = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    assertCsrf(req);
    const { id } = await ctx.params;

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { authorId: true, postId: true, parentId: true },
    });
    if (!comment) return fail(404, "Comment not found");
    if (comment.authorId !== viewerId) return fail(403, "Not your comment");

    await prisma.$transaction(async (tx) => {
      // Count self + replies (only top-level comments have replies).
      const replyCount = comment.parentId
        ? 0
        : await tx.comment.count({ where: { parentId: id } });
      await tx.comment.delete({ where: { id } });
      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 + replyCount } },
      });
    });

    return ok({ ok: true });
  }
);
