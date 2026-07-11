import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { handler, ok, fail } from "@/lib/http";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";
import { publicUser } from "@/lib/serialize";

export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  assertCsrf(req);
  const rl = rateLimit(`register:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return fail(429, "Too many attempts, try again later");

  const body = registerSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true },
  });
  if (existing) return fail(409, "An account with this email already exists");

  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      passwordHash,
    },
  });

  await createSession(user.id);
  return ok({ user: publicUser(user) }, { status: 201 });
});
