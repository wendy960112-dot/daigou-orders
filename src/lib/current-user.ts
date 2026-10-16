import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { User } from "@/db/schema";
import { getUserById } from "@/db/users";
import { PREVIEW_HELPER_ID } from "@/lib/preview";
import { clearSession, readSession } from "./session";

export type AppUser = User & { previewing: boolean; actorId: string };

export async function getSessionContext() {
  const session = await readSession();
  if (!session) return null;
  const user = getUserById(getDb(), session.userId);
  if (!user) {
    await clearSession();
    return null;
  }
  return { user, previewing: session.preview && user.role === "admin" };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  if (!ctx.previewing) return { ...ctx.user, previewing: false, actorId: ctx.user.id };

  const sandbox = getUserById(getDb(), PREVIEW_HELPER_ID);
  if (!sandbox) return { ...ctx.user, previewing: false, actorId: ctx.user.id };
  return { ...sandbox, previewing: true, actorId: ctx.user.id };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
