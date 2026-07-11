import { requireUser, handler, ok } from "@/lib/http";
import { assertCsrf } from "@/lib/csrf";
import { assertCommentVisible } from "@/lib/access";
import { likeComment, unlikeComment } from "@/lib/likes";

export const runtime = "nodejs";

// POST /api/comments/:id/like
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    assertCsrf(req);
    const { id } = await ctx.params;
    await assertCommentVisible(viewerId, id);
    const likeCount = await likeComment(viewerId, id);
    return ok({ likeCount, likedByMe: true });
  }
);

// DELETE /api/comments/:id/like
export const DELETE = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    assertCsrf(req);
    const { id } = await ctx.params;
    await assertCommentVisible(viewerId, id);
    const likeCount = await unlikeComment(viewerId, id);
    return ok({ likeCount, likedByMe: false });
  }
);
