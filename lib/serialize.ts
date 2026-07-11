import type { User } from "@prisma/client";

const DEFAULT_AVATAR = "/assets/images/profile.png";

export type PublicUser = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  avatarUrl: string;
};

export function publicUser(u: User): PublicUser {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    avatarUrl: u.avatarUrl || DEFAULT_AVATAR,
  };
}

/** Minimal author shape used inside posts/comments. */
export function authorOf(u: {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}) {
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    avatarUrl: u.avatarUrl || DEFAULT_AVATAR,
  };
}
