import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { handler, ok, fail } from "@/lib/http";
import { publicUser } from "@/lib/serialize";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const uid = await getUserId();
  if (!uid) return fail(401, "Not authenticated");
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return fail(401, "Not authenticated");
  return ok({ user: publicUser(user) });
});
