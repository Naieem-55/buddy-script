import { prisma } from "@/lib/db";
import { requireUser, handler, ok } from "@/lib/http";
import { assertPostVisible } from "@/lib/access";
import { authorOf } from "@/lib/serialize";

export const runtime = "nodejs";

// GET /api/posts/:id/likers  -> who liked this post
export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    const { id } = await ctx.params;
    await assertPostVisible(viewerId, id);

    const likes = await prisma.postLike.findMany({
      where: { postId: id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({ likers: likes.map((l) => authorOf(l.user)) });
  }
);
