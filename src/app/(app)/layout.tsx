import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const path = (await headers()).get("x-pathname") || "/";

  if (user.role === "pending" && path !== "/pending") redirect("/pending");
  if (user.role !== "pending" && path === "/pending") redirect("/");
  if (user.role !== "admin" && (path.startsWith("/summary") || path.startsWith("/helpers"))) redirect("/");

  return <Shell user={user}>{children}</Shell>;
}
