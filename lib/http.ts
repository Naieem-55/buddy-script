import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUserId } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: unknown) {
  return NextResponse.json({ error: message, ...(extra ? { extra } : {}) }, { status });
}

/** Ensure a request is authenticated; returns the userId or throws a Response. */
export async function requireUser(): Promise<string> {
  const uid = await getUserId();
  if (!uid) throw fail(401, "Not authenticated");
  return uid;
}

/**
 * Wrap a route handler with uniform error handling.
 * Handlers may `throw` a NextResponse (e.g. from requireUser) or any error.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof Response) return e;
      if (e instanceof ZodError) {
        return fail(422, "Validation failed", e.flatten());
      }
      console.error("[api] unhandled error:", e);
      return fail(500, "Internal server error");
    }
  };
}
