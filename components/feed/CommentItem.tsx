"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import type { Comment } from "@/lib/types";
import CommentInput from "./CommentInput";
import LikersModal from "./LikersModal";

export default function CommentItem({
  comment,
  currentUserAvatar,
  canReply,
  onReply,
  onDeleted,
}: {
  comment: Comment;
  currentUserAvatar: string;
  canReply: boolean;
  onReply?: (parentId: string, text: string) => Promise<void>;
  onDeleted: (id: string) => void;
}) {
  const [liked, setLiked] = useState(comment.likedByMe);
  const [count, setCount] = useState(comment.likeCount);
  const [replying, setReplying] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  async function toggleLike() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await (nextLiked
        ? api.postJson<{ likeCount: number }>(
            `/api/comments/${comment.id}/like`,
            {}
          )
        : api.del<{ likeCount: number }>(`/api/comments/${comment.id}/like`));
      setCount(res.likeCount);
    } catch {
      setLiked(!nextLiked);
      setCount((c) => c + (nextLiked ? -1 : 1));
    }
  }

  async function del() {
    onDeleted(comment.id);
    try {
      await api.del(`/api/comments/${comment.id}`);
    } catch {
      /* best-effort; feed refetch would reconcile */
    }
  }

  async function submitReply(text: string) {
    if (!onReply) return;
    setReplyBusy(true);
    try {
      await onReply(comment.id, text);
      setReplying(false);
    } finally {
      setReplyBusy(false);
    }
  }

  return (
    <div className="_comment_main">
      <div className="_comment_image">
        <span className="_comment_image_link">
          <img src={comment.author.avatarUrl} alt="" className="_comment_img1" />
        </span>
      </div>
      <div className="_comment_area">
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">{comment.author.name}</h4>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text">
              <span>{comment.text}</span>
            </p>
          </div>

          {count > 0 && (
            <div className="_total_reactions">
              <div className="_total_react">
                <span className="_reaction_like">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                </span>
              </div>
              <button
                className="_total bs-inline-btn"
                onClick={() => setShowLikers(true)}
              >
                {count}
              </button>
            </div>
          )}

          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list">
                <li>
                  <span
                    className={liked ? "bs-liked" : ""}
                    onClick={toggleLike}
                  >
                    Like.
                  </span>
                </li>
                {canReply && (
                  <li>
                    <span onClick={() => setReplying((r) => !r)}>Reply.</span>
                  </li>
                )}
                {comment.mine && (
                  <li>
                    <span onClick={del}>Delete.</span>
                  </li>
                )}
                <li>
                  <span className="_time_link">.{timeAgo(comment.createdAt)}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* replies (one level deep) */}
        {comment.replies?.map((r) => (
          <CommentItem
            key={r.id}
            comment={r}
            currentUserAvatar={currentUserAvatar}
            canReply={false}
            onDeleted={onDeleted}
          />
        ))}

        {replying && canReply && (
          <CommentInput
            avatarUrl={currentUserAvatar}
            placeholder="Write a reply"
            busy={replyBusy}
            onSubmit={submitReply}
          />
        )}
      </div>

      {showLikers && (
        <LikersModal
          title="Liked by"
          endpoint={`/api/comments/${comment.id}/likers`}
          onClose={() => setShowLikers(false)}
        />
      )}
    </div>
  );
}
