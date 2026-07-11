export type Author = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  avatarUrl: string;
};

export type Visibility = "PUBLIC" | "PRIVATE";

export type Post = {
  id: string;
  text: string | null;
  imageUrl: string | null;
  visibility: Visibility;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: Author;
  likedByMe: boolean;
  mine: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  parentId: string | null;
  text: string;
  likeCount: number;
  createdAt: string;
  author: Author;
  likedByMe: boolean;
  mine: boolean;
  replies?: Comment[];
};

export type FeedPage = { posts: Post[]; nextCursor: string | null };
export type CommentsPage = { comments: Comment[]; nextCursor: string | null };
export type Liker = Author;
