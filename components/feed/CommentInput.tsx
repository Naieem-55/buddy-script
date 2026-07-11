"use client";

import { useState } from "react";

// Reuses the theme's _feed_inner_comment_box markup for both top-level
// comments and replies.
export default function CommentInput({
  avatarUrl,
  placeholder = "Write a comment",
  busy,
  onSubmit,
}: {
  avatarUrl: string;
  placeholder?: string;
  busy?: boolean;
  onSubmit: (text: string) => void | Promise<void>;
}) {
  const [text, setText] = useState("");

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    await onSubmit(t);
    setText("");
  }

  return (
    <div className="_feed_inner_comment_box">
      <div className="_feed_inner_comment_box_form">
        <div className="_feed_inner_comment_box_content">
          <div className="_feed_inner_comment_box_content_image">
            <img src={avatarUrl} alt="" className="_comment_img" />
          </div>
          <div className="_feed_inner_comment_box_content_txt">
            <textarea
              className="form-control _comment_textarea"
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
          </div>
        </div>
        <div className="_feed_inner_comment_box_icon">
          <button
            type="button"
            className="_feed_inner_comment_box_icon_btn bs-liked"
            onClick={send}
            disabled={busy}
            aria-label="Send comment"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
