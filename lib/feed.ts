import { prisma } from "@/lib/db";
import { authorOf } from "@/lib/serialize";
import type { Prisma } from "@prisma/client";

export const PAGE_SIZE = 20;

const postInclude = {
  author: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
} satisfies Prisma.PostInclude;

type PostRow = Prisma.PostGetPayload<{ include: typeof postInclude }>;

export function encodeCursor(p: { createdAt: Date; id: string }): string {
  return `${p.createdAt.toISOString()}_${p.id}`;
}

export function decodeCursor(
  cursor?: string
): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const idx = cursor.lastIndexOf("_");
  if (idx < 0) return null;
  const createdAt = new Date(cursor.slice(0, idx));
  const id = cursor.slice(idx + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

function serializePost(row: PostRow, likedByMe: boolean, mine: boolean) {
  return {
    id: row.id,
    text: row.text,
    imageUrl: row.imageUrl,
    visibility: row.visibility,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    createdAt: row.createdAt.toISOString(),
    author: authorOf(row.author),
    likedByMe,
    mine,
  };
}

export type SerializedPost = ReturnType<typeof serializePost>;

/**
 * Keyset-paginated feed: public posts + the viewer's own private posts,
 * newest first. Resolves the viewer's like-state for the whole page in one
 * extra query (no N+1).
 */
export async function getFeed(
  viewerId: string,
  cursor: string | undefined,
  limit = PAGE_SIZE
) {
  const key = decodeCursor(cursor);

  const visibilityFilter: Prisma.PostWhereInput = {
    OR: [{ visibility: "PUBLIC" }, { authorId: viewerId }],
  };

  const keysetFilter: Prisma.PostWhereInput | undefined = key
    ? {
        OR: [
          { createdAt: { lt: key.createdAt } },
          { createdAt: key.createdAt, id: { lt: key.id } },
        ],
      }
    : undefined;

  const where: Prisma.PostWhereInput = keysetFilter
    ? { AND: [visibilityFilter, keysetFilter] }
    : visibilityFilter;

  const rows = await prisma.post.findMany({
    where,
    include: postInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1, // fetch one extra to detect next page
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const likedIds = await likedPostIds(
    viewerId,
    page.map((p) => p.id)
  );

  const posts = page.map((row) =>
    serializePost(row, likedIds.has(row.id), row.authorId === viewerId)
  );

  return {
    posts,
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  };
}

export async function likedPostIds(
  viewerId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const likes = await prisma.postLike.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(likes.map((l) => l.postId));
}

export { serializePost };
