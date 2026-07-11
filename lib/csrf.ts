import { fail } from "./http";

// Defense-in-depth on top of SameSite=Lax cookies: require a custom header that
// only same-origin JS (via apiFetch) can set. Simple cross-site <form> posts and
// image/GET tricks cannot add custom headers, and CORS blocks them cross-origin.
export function assertCsrf(req: Request) {
  if (req.headers.get("x-buddy-csrf") !== "1") {
    throw fail(403, "Invalid or missing CSRF header");
  }
}
