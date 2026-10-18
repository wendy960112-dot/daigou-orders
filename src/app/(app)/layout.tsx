import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { getDb } from "@/db";
import { countInbox } from "@/db/orders";
import { requireUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const path = (await headers()).get("x-pathname") || "/";

  if (user.role === "pending" && path !== "/pending") redirect("/pending");
  if (user.role !== "pending" && path === "/pending") redirect("/");
  if (user.role !== "admin" && (path.startsWith("/summary") || path.startsWith("/helpers") || path.startsWith("/settings") || path.startsWith("/orders/deleted"))) {
    redirect("/");
  }
  if (user.role !== "admin" && path === "/orders/new") redirect(user.role === "helper" ? "/inbox" : "/");
  if (user.role !== "admin" && /\/edit$/.test(path)) redirect("/");
  if (user.role === "admin" && path.startsWith("/inbox")) redirect("/");

  const inboxCount = user.role === "helper" ? countInbox(getDb(), user.id) : 0;
  return (
    <Shell user={user} inboxCount={inboxCount}>
      {children}
    </Shell>
  );
}
