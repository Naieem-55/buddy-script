import { destroySession } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { handler, ok } from "@/lib/http";

export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  assertCsrf(req);
  await destroySession();
  return ok({ ok: true });
});
