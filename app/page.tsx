import { redirect } from "next/navigation";

// Root -> feed. The proxy bounces unauthenticated users to /login.
export default function Home() {
  redirect("/feed");
}
