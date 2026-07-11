import { prisma } from "@/lib/db";
import { authorOf } from "@/lib/serialize";
import type { Prisma } from "@prisma/client";

export const COMMENT_PAGE = 20;

const authorSelect = {
  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
} satisfies Prisma.UserDefaultArgs;

type CommentRow = Prisma.CommentGetPayload<{
  include: { author: typeof authorSelect };
}>;

function serialize(row: CommentRow, likedByMe: boolean, mine: boolean) {
  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    text: row.text,
    likeCount: row.likeCount,
    createdAt: row.createdAt.toISOString(),
    author: authorOf(row.author),
    likedByMe,
    mine,
  };
}

export type SerializedComment = ReturnType<typeof serialize> & {
  replies?: SerializedComment[];
};

async function likedCommentIds(
  viewerId: string,
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const likes = await prisma.commentLike.findMany({
    where: { userId: viewerId, commentId: { in: ids } },
    select: { commentId: true },
  });
  return new Set(likes.map((l) => l.commentId));
}

/**
 * Fetch a page of top-level comments (chronological) with their replies.
 * Resolves the viewer's like-state for every comment + reply in one query.
 */
export async function getComments(
  viewerId: string,
  postId: string,
  cursor: string | undefined,
  limit = COMMENT_PAGE
) {
  const tops = await prisma.comment.findMany({
    where: { postId, parentId: null },
    include: {
      author: authorSelect,
      replies: {
        include: { author: authorSelect },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = tops.length > limit;
  const page = hasMore ? tops.slice(0, limit) : tops;

  const allIds = page.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]);
  const liked = await likedCommentIds(viewerId, allIds);

  const comments: SerializedComment[] = page.map((c) => ({
    ...serialize(c, liked.has(c.id), c.authorId === viewerId),
    replies: c.replies.map((r) =>
      serialize(r, liked.has(r.id), r.authorId === viewerId)
    ),
  }));

  return {
    comments,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export { serialize as serializeComment };
