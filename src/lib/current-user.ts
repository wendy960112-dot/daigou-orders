import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getUserById } from "@/db/users";
import { clearSession, readSessionUserId } from "./session";

export async function getCurrentUser() {
  const id = await readSessionUserId();
  if (!id) return null;
  const user = getUserById(getDb(), id);
  if (!user) {
    await clearSession();
    return null;
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
