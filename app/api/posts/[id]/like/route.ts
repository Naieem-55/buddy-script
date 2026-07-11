import { requireUser, handler, ok } from "@/lib/http";
import { assertCsrf } from "@/lib/csrf";
import { assertPostVisible } from "@/lib/access";
import { likePost, unlikePost } from "@/lib/likes";

export const runtime = "nodejs";

// POST /api/posts/:id/like
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    assertCsrf(req);
    const { id } = await ctx.params;
    await assertPostVisible(viewerId, id);
    const likeCount = await likePost(viewerId, id);
    return ok({ likeCount, likedByMe: true });
  }
);

// DELETE /api/posts/:id/like
export const DELETE = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    assertCsrf(req);
    const { id } = await ctx.params;
    await assertPostVisible(viewerId, id);
    const likeCount = await unlikePost(viewerId, id);
    return ok({ likeCount, likedByMe: false });
  }
);
