"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import type { CurrentUser, Post } from "@/lib/types";
import CommentsSection from "./CommentsSection";
import LikersModal from "./LikersModal";

export default function PostCard({
  post,
  user,
  onDeleted,
}: {
  post: Post;
  user: CurrentUser;
  onDeleted: (id: string) => void;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const res = await (next
        ? api.postJson<{ likeCount: number }>(`/api/posts/${post.id}/like`, {})
        : api.del<{ likeCount: number }>(`/api/posts/${post.id}/like`));
      setLikeCount(res.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function del() {
    setDropOpen(false);
    onDeleted(post.id);
    try {
      await api.del(`/api/posts/${post.id}`);
    } catch {
      /* best-effort */
    }
  }

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <img src={post.author.avatarUrl} alt="" className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">
                {post.author.name}
              </h4>
              <p className="_feed_inner_timeline_post_box_para">
                {timeAgo(post.createdAt)} .{" "}
                <span>{post.visibility === "PRIVATE" ? "Private" : "Public"}</span>
              </p>
            </div>
          </div>
          {post.mine && (
            <div className="_feed_inner_timeline_post_box_dropdown">
              <div className="_feed_timeline_post_dropdown">
                <button
                  className="_feed_timeline_post_dropdown_link bs-inline-btn"
                  onClick={() => setDropOpen((o) => !o)}
                  aria-label="Post options"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="4"
                    height="17"
                    fill="none"
                    viewBox="0 0 4 17"
                  >
                    <circle cx="2" cy="2" r="2" fill="#C4C4C4" />
                    <circle cx="2" cy="8" r="2" fill="#C4C4C4" />
                    <circle cx="2" cy="15" r="2" fill="#C4C4C4" />
                  </svg>
                </button>
              </div>
              <div
                className={`_feed_timeline_dropdown _timeline_dropdown${
                  dropOpen ? " show" : ""
                }`}
              >
                <ul className="_feed_timeline_dropdown_list">
                  <li className="_feed_timeline_dropdown_item">
                    <button
                      className="_feed_timeline_dropdown_link bs-inline-btn"
                      onClick={del}
                    >
                      <span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          fill="none"
                          viewBox="0 0 18 18"
                        >
                          <path
                            stroke="#1890FF"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.2"
                            d="M2.25 4.5h13.5M6 4.5V3a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0112 3v1.5m2.25 0V15a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5V4.5h10.5zM7.5 8.25v4.5M10.5 8.25v4.5"
                          />
                        </svg>
                      </span>
                      Delete Post
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {post.text && (
          <h4 className="_feed_inner_timeline_post_title">{post.text}</h4>
        )}
        {post.imageUrl && (
          <div className="_feed_inner_timeline_image">
            <img src={post.imageUrl} alt="" className="_time_img" />
          </div>
        )}
      </div>

      {(likeCount > 0 || commentCount > 0) && (
        <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
          <button
            className="_feed_inner_timeline_total_reacts_image bs-inline-btn"
            onClick={() => likeCount > 0 && setShowLikers(true)}
          >
            <img
              src="/assets/images/react_img1.png"
              alt=""
              className="_react_img1"
            />
            <img
              src="/assets/images/react_img2.png"
              alt=""
              className="_react_img"
            />
            <p className="_feed_inner_timeline_total_reacts_para">{likeCount}</p>
          </button>
          <div className="_feed_inner_timeline_total_reacts_txt">
            <p className="_feed_inner_timeline_total_reacts_para1">
              <button
                className="bs-inline-btn"
                onClick={() => setShowComments((s) => !s)}
              >
                <span>{commentCount}</span> Comment
              </button>
            </p>
          </div>
        </div>
      )}

      <div className="_feed_inner_timeline_reaction">
        <button
          className={`_feed_inner_timeline_reaction_emoji _feed_reaction${
            liked ? " _feed_reaction_active" : ""
          }`}
          onClick={toggleLike}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              {liked ? "Liked" : "Like"}
            </span>
          </span>
        </button>
        <button
          className="_feed_inner_timeline_reaction_comment _feed_reaction"
          onClick={() => setShowComments((s) => !s)}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>Comment</span>
          </span>
        </button>
        <button className="_feed_inner_timeline_reaction_share _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span>Share</span>
          </span>
        </button>
      </div>

      {showComments && (
        <CommentsSection
          postId={post.id}
          user={user}
          onCountChange={(d) => setCommentCount((c) => Math.max(0, c + d))}
        />
      )}

      {showLikers && (
        <LikersModal
          title="Liked by"
          endpoint={`/api/posts/${post.id}/likers`}
          onClose={() => setShowLikers(false)}
        />
      )}
    </div>
  );
}
