import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getFeed } from "@/lib/feed";
import { publicUser } from "@/lib/serialize";
import FeedShell from "@/components/feed/FeedShell";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const uid = await getUserId();
  if (!uid) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) redirect("/login");

  // SSR the first keyset page for a fast, populated first paint.
  const initialFeed = await getFeed(uid, undefined);

  return <FeedShell user={publicUser(user)} initialFeed={initialFeed} />;
}
