import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/current-user";
import { setSession } from "@/lib/session";

export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  await setSession(ctx.user.id);
  redirect("/");
}
