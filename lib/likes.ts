import { prisma } from "@/lib/db";

/**
 * Like a post idempotently: insert the like and bump the denormalized counter
 * in one transaction. A duplicate (already liked) is a no-op thanks to the
 * unique composite PK. Returns the current like count.
 */
export async function likePost(userId: string, postId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    // skipDuplicates avoids throwing on a re-like (which would abort the txn).
    const res = await tx.postLike.createMany({
      data: [{ userId, postId }],
      skipDuplicates: true,
    });
    if (res.count === 1) {
      const p = await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
      return p.likeCount;
    }
    const p = await tx.post.findUnique({
      where: { id: postId },
      select: { likeCount: true },
    });
    return p?.likeCount ?? 0;
  });
}

export async function unlikePost(userId: string, postId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const deleted = await tx.postLike.deleteMany({ where: { userId, postId } });
    if (deleted.count === 0) {
      const p = await tx.post.findUnique({
        where: { id: postId },
        select: { likeCount: true },
      });
      return p?.likeCount ?? 0;
    }
    const p = await tx.post.update({
      where: { id: postId },
      data: { likeCount: { decrement: 1 } },
      select: { likeCount: true },
    });
    return p.likeCount;
  });
}

export async function likeComment(
  userId: string,
  commentId: string
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const res = await tx.commentLike.createMany({
      data: [{ userId, commentId }],
      skipDuplicates: true,
    });
    if (res.count === 1) {
      const c = await tx.comment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
      return c.likeCount;
    }
    const c = await tx.comment.findUnique({
      where: { id: commentId },
      select: { likeCount: true },
    });
    return c?.likeCount ?? 0;
  });
}

export async function unlikeComment(
  userId: string,
  commentId: string
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const deleted = await tx.commentLike.deleteMany({
      where: { userId, commentId },
    });
    if (deleted.count === 0) {
      const c = await tx.comment.findUnique({
        where: { id: commentId },
        select: { likeCount: true },
      });
      return c?.likeCount ?? 0;
    }
    const c = await tx.comment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
      select: { likeCount: true },
    });
    return c.likeCount;
  });
}
