"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CurrentUser, FeedPage, Post } from "@/lib/types";
import Composer from "./Composer";
import PostCard from "./PostCard";

const KEY = ["feed"];

export default function FeedColumn({
  user,
  initialFeed,
}: {
  user: CurrentUser;
  initialFeed: FeedPage;
}) {
  const qc = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) =>
      api.get<FeedPage>(
        `/api/posts${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: { pages: [initialFeed], pageParams: [undefined] },
  });

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  const onCreated = useCallback(
    (post: Post) => {
      qc.setQueryData<InfiniteData<FeedPage>>(KEY, (old) => {
        if (!old) return old;
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [{ ...first, posts: [post, ...first.posts] }, ...rest],
        };
      });
    },
    [qc]
  );

  const onDeleted = useCallback(
    (id: string) => {
      qc.setQueryData<InfiniteData<FeedPage>>(KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((pg) => ({
            ...pg,
            posts: pg.posts.filter((p) => p.id !== id),
          })),
        };
      });
    },
    [qc]
  );

  // Infinite scroll sentinel.
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
      <div className="_layout_middle_wrap">
        <Composer user={user} onCreated={onCreated} />

        {posts.length === 0 && (
          <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
            <p className="bs-muted">No posts yet. Be the first to post!</p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            user={user}
            onDeleted={onDeleted}
          />
        ))}

        <div ref={sentinel} />
        {isFetchingNextPage && <div className="bs-spin">Loading…</div>}
        {!hasNextPage && posts.length > 0 && (
          <div className="bs-spin">You&apos;re all caught up.</div>
        )}
      </div>
    </div>
  );
}
