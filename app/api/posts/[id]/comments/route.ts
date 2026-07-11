import { prisma } from "@/lib/db";
import { requireUser, handler, ok, fail } from "@/lib/http";
import { assertCsrf } from "@/lib/csrf";
import { assertPostVisible } from "@/lib/access";
import { createCommentSchema, cursorSchema } from "@/lib/validation";
import { getComments, serializeComment } from "@/lib/comments";

export const runtime = "nodejs";

// GET /api/posts/:id/comments?cursor=
export const GET = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    const { id } = await ctx.params;
    await assertPostVisible(viewerId, id);
    const { searchParams } = new URL(req.url);
    const { cursor, limit } = cursorSchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    const data = await getComments(viewerId, id, cursor, limit);
    return ok(data);
  }
);

// POST /api/posts/:id/comments  { text, parentId? }
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const viewerId = await requireUser();
    assertCsrf(req);
    const { id: postId } = await ctx.params;
    await assertPostVisible(viewerId, postId);

    const body = createCommentSchema.parse(await req.json());

    // Enforce single-level nesting: a reply's parent must be a top-level
    // comment on this same post.
    if (body.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: body.parentId },
        select: { postId: true, parentId: true },
      });
      if (!parent || parent.postId !== postId) {
        return fail(422, "Invalid parent comment");
      }
      if (parent.parentId) {
        return fail(422, "Replies can only be one level deep");
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          postId,
          authorId: viewerId,
          text: body.text,
          parentId: body.parentId ?? null,
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      });
      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return c;
    });

    return ok(
      { comment: serializeComment(created, false, true) },
      { status: 201 }
    );
  }
);
