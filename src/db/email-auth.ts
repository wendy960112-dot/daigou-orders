import { createHash, randomBytes } from "crypto";
import { and, count, eq, gte, isNull, lt } from "drizzle-orm";
import { adminEmails } from "@/lib/auth-policy";
import { isSafeId } from "@/lib/format";
import { dummyPasswordHash, verifyPassword } from "@/lib/password";
import type { Viewer } from "@/lib/types";
import { loginAttempts, passwordResets, users, type User } from "./schema";
import type { AppDb } from "./types";
import { countAdmins, getUserById } from "./users";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 8;
export const RESET_TTL_MS = 60 * 60 * 1000;

export function getUserByEmail(db: AppDb, email: string) {
  return db.select().from(users).where(eq(users.email, email)).get() ?? null;
}

export function countRecentFailures(db: AppDb, email: string, now = Date.now()) {
  const since = new Date(now - LOGIN_WINDOW_MS).toISOString();
  return (
    db
      .select({ value: count() })
      .from(loginAttempts)
      .where(and(eq(loginAttempts.email, email), gte(loginAttempts.createdAt, since)))
      .get()?.value ?? 0
  );
}

export function recordLoginFailure(db: AppDb, email: string, now = Date.now()) {
  const since = new Date(now - LOGIN_WINDOW_MS).toISOString();
  db.delete(loginAttempts).where(lt(loginAttempts.createdAt, since)).run();
  db.insert(loginAttempts)
    .values({ id: crypto.randomUUID(), email, createdAt: new Date(now).toISOString() })
    .run();
}

export function clearLoginFailures(db: AppDb, email: string) {
  db.delete(loginAttempts).where(eq(loginAttempts.email, email)).run();
}

export function registerEmailUser(
  db: AppDb,
  input: { email: string; displayName: string; passwordHash: string },
): { ok: true; user: User } | { ok: false; code: "email_taken" } {
  const email = input.email.trim().toLowerCase();
  if (getUserByEmail(db, email)) return { ok: false, code: "email_taken" };
  const now = new Date().toISOString();
  const role = adminEmails().includes(email) || countAdmins(db) === 0 ? "admin" : "pending";
  const created: User = {
    id: crypto.randomUUID(),
    lineUserId: null,
    email,
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    pictureUrl: null,
    role,
    createdAt: now,
    updatedAt: now,
  };
  try {
    db.insert(users).values(created).run();
  } catch {
    return { ok: false, code: "email_taken" };
  }
  return { ok: true, user: created };
}

export function authenticateEmail(
  db: AppDb,
  emailRaw: string,
  password: string,
  now = Date.now(),
): { ok: true; user: User } | { ok: false; code: "bad_credentials" | "rate_limited" } {
  const email = emailRaw.trim().toLowerCase();
  if (!email || email.length > 254) return { ok: false, code: "bad_credentials" };
  if (countRecentFailures(db, email, now) >= LOGIN_MAX_FAILURES) return { ok: false, code: "rate_limited" };

  const user = getUserByEmail(db, email);
  const stored = user?.passwordHash || dummyPasswordHash();
  const valid = Boolean(user?.passwordHash) && verifyPassword(password, stored);
  if (!user || !valid) {
    recordLoginFailure(db, email, now);
    return { ok: false, code: "bad_credentials" };
  }

  let next = user;
  if (user.email && adminEmails().includes(user.email) && user.role !== "admin") {
    const updatedAt = new Date(now).toISOString();
    db.update(users).set({ role: "admin", updatedAt }).where(eq(users.id, user.id)).run();
    next = { ...user, role: "admin", updatedAt };
  }
  clearLoginFailures(db, email);
  return { ok: true, user: next };
}

export function issueResetToken(db: AppDb, userId: string, now = new Date()) {
  const user = getUserById(db, userId);
  if (!user?.email) return null;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS).toISOString();
  db.transaction((tx) => {
    tx.update(passwordResets)
      .set({ usedAt: createdAt })
      .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)))
      .run();
    tx.insert(passwordResets)
      .values({
        id: crypto.randomUUID(),
        userId,
        tokenHash,
        expiresAt,
        usedAt: null,
        createdAt,
      })
      .run();
  });
  return { token, email: user.email, expiresAt };
}

export function adminIssueReset(db: AppDb, actor: Viewer, targetId: string, now = new Date()) {
  if (actor.role !== "admin") return { ok: false as const, code: "forbidden" as const };
  if (!isSafeId(targetId)) return { ok: false as const, code: "not_found" as const };
  const issued = issueResetToken(db, targetId, now);
  if (!issued) return { ok: false as const, code: "no_email" as const };
  return { ok: true as const, ...issued };
}

export function resetPasswordWithToken(db: AppDb, token: string, passwordHash: string, now = new Date()) {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return { ok: false as const, code: "invalid" as const };
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = db.select().from(passwordResets).where(eq(passwordResets.tokenHash, tokenHash)).get();
  if (!row || row.usedAt) return { ok: false as const, code: "invalid" as const };
  if (row.expiresAt <= now.toISOString()) return { ok: false as const, code: "expired" as const };
  const user = getUserById(db, row.userId);
  if (!user?.email) return { ok: false as const, code: "invalid" as const };

  db.transaction((tx) => {
    tx.update(users)
      .set({ passwordHash, updatedAt: now.toISOString() })
      .where(eq(users.id, user.id))
      .run();
    tx.update(passwordResets).set({ usedAt: now.toISOString() }).where(eq(passwordResets.id, row.id)).run();
    tx.delete(loginAttempts).where(eq(loginAttempts.email, user.email!)).run();
  });
  return { ok: true as const, userId: user.id };
}
