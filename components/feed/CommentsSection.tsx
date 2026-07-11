"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Comment, CommentsPage, CurrentUser } from "@/lib/types";
import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";

export default function CommentsSection({
  postId,
  user,
  onCountChange,
}: {
  postId: string;
  user: CurrentUser;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<CommentsPage>(`/api/posts/${postId}/comments`)
      .then((d) => {
        if (active) setComments(d.comments);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [postId]);

  async function addComment(text: string) {
    setBusy(true);
    try {
      const { comment } = await api.postJson<{ comment: Comment }>(
        `/api/posts/${postId}/comments`,
        { text }
      );
      setComments((c) => [...c, { ...comment, replies: [] }]);
      onCountChange(1);
    } finally {
      setBusy(false);
    }
  }

  async function addReply(parentId: string, text: string) {
    const { comment } = await api.postJson<{ comment: Comment }>(
      `/api/posts/${postId}/comments`,
      { text, parentId }
    );
    setComments((list) =>
      list.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies ?? []), comment] }
          : c
      )
    );
    onCountChange(1);
  }

  function removeComment(id: string) {
    setComments((list) => {
      // top-level?
      const top = list.find((c) => c.id === id);
      if (top) {
        onCountChange(-(1 + (top.replies?.length ?? 0)));
        return list.filter((c) => c.id !== id);
      }
      // reply
      onCountChange(-1);
      return list.map((c) => ({
        ...c,
        replies: c.replies?.filter((r) => r.id !== id),
      }));
    });
  }

  return (
    <>
      <div className="_feed_inner_timeline_cooment_area">
        <CommentInput
          avatarUrl={user.avatarUrl}
          busy={busy}
          onSubmit={addComment}
        />
      </div>
      <div className="_timline_comment_main">
        {loading && <div className="bs-spin">Loading comments…</div>}
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            currentUserAvatar={user.avatarUrl}
            canReply
            onReply={addReply}
            onDeleted={removeComment}
          />
        ))}
      </div>
    </>
  );
}
