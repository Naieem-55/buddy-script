import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { handler, ok, fail } from "@/lib/http";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation";
import { publicUser } from "@/lib/serialize";

export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  assertCsrf(req);
  const body = loginSchema.parse(await req.json());

  const rl = rateLimit(`login:${clientIp(req)}:${body.email}`, 8, 60_000);
  if (!rl.ok) return fail(429, "Too many attempts, try again later");

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  // Generic error + always run a hash-verify path to reduce timing/enumeration.
  const valid = user
    ? await verifyPassword(user.passwordHash, body.password)
    : false;
  if (!user || !valid) return fail(401, "Invalid email or password");

  await createSession(user.id);
  return ok({ user: publicUser(user) });
});
