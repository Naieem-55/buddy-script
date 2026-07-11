import { prisma } from "@/lib/db";
import { fail } from "@/lib/http";

/**
 * Ensure a post is visible to the viewer (public, or the viewer's own private
 * post). Throws a 404 (not 403) so private posts are indistinguishable from
 * non-existent ones. Returns the post's authorId + visibility.
 */
export async function assertPostVisible(viewerId: string, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!post) throw fail(404, "Post not found");
  if (post.visibility === "PRIVATE" && post.authorId !== viewerId) {
    throw fail(404, "Post not found");
  }
  return post;
}

/** Resolve a comment and confirm its post is visible to the viewer. */
export async function assertCommentVisible(viewerId: string, commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, postId: true },
  });
  if (!comment) throw fail(404, "Comment not found");
  await assertPostVisible(viewerId, comment.postId);
  return comment;
}
