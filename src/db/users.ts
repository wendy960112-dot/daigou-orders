import { asc, count, eq } from "drizzle-orm";
import { adminLineIds } from "@/lib/auth-policy";
import { nowIso } from "@/lib/format";
import type { Role, Viewer } from "@/lib/types";
import type { AppDb } from "./types";
import { users, type User } from "./schema";

export function getUserById(db: AppDb, id: string) {
  return db.select().from(users).where(eq(users.id, id)).get() ?? null;
}

export function getUserByLineId(db: AppDb, lineUserId: string) {
  return db.select().from(users).where(eq(users.lineUserId, lineUserId)).get() ?? null;
}

export function listUsers(db: AppDb) {
  return db.select().from(users).orderBy(asc(users.role), asc(users.displayName)).all();
}

export function listHelpers(db: AppDb) {
  return db.select().from(users).where(eq(users.role, "helper")).orderBy(asc(users.displayName)).all();
}

export function countAdmins(db: AppDb) {
  return db.select({ value: count() }).from(users).where(eq(users.role, "admin")).get()?.value ?? 0;
}

export function upsertLineUser(
  db: AppDb,
  profile: { lineUserId: string; displayName: string; pictureUrl: string | null },
): User {
  const now = nowIso();
  const existing = getUserByLineId(db, profile.lineUserId);
  const shouldBeAdmin = adminLineIds().includes(profile.lineUserId);

  if (existing) {
    const role = shouldBeAdmin ? "admin" : existing.role;
    db.update(users)
      .set({
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        role,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .run();
    return { ...existing, displayName: profile.displayName, pictureUrl: profile.pictureUrl, role, updatedAt: now };
  }

  let role: Role = "pending";
  if (shouldBeAdmin || (adminLineIds().length === 0 && countAdmins(db) === 0)) role = "admin";
  const created: User = {
    id: crypto.randomUUID(),
    lineUserId: profile.lineUserId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    role,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(users).values(created).run();
  return created;
}

export function setUserRole(
  db: AppDb,
  actor: Viewer,
  targetId: string,
  role: "helper" | "pending",
): { ok: true } | { ok: false; code: string } {
  if (actor.role !== "admin") return { ok: false, code: "forbidden" };
  if (actor.id === targetId) return { ok: false, code: "self" };
  const target = getUserById(db, targetId);
  if (!target) return { ok: false, code: "not_found" };
  if (target.role === "admin" && countAdmins(db) <= 1) return { ok: false, code: "last_admin" };
  db.update(users).set({ role, updatedAt: nowIso() }).where(eq(users.id, targetId)).run();
  return { ok: true };
}
