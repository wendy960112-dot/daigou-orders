import { afterEach, describe, expect, it, vi } from "vitest";
import { loginMethodLabel, normalizeEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";
import { smtpConfig } from "@/lib/smtp";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  RESET_TTL_MS,
  adminIssueReset,
  authenticateEmail,
  getUserByEmail,
  registerEmailUser,
  resetPasswordWithToken,
} from "./email-auth";
import { openAppDatabase } from "./index";
import { upsertLineUser } from "./users";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("email accounts", () => {
  it("hashes passwords and keeps the first account as admin", () => {
    const db = openAppDatabase(":memory:");
    const password = "correct-horse";
    const created = registerEmailUser(db, {
      email: "Wendy@Example.com",
      displayName: "溫蒂",
      passwordHash: hashPassword(password),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.user.role).toBe("admin");
    expect(created.user.email).toBe("wendy@example.com");
    expect(created.user.passwordHash).not.toContain(password);
    expect(verifyPassword(password, created.user.passwordHash!)).toBe(true);
    expect(verifyPassword("nope", created.user.passwordHash!)).toBe(false);

    const helper = registerEmailUser(db, {
      email: "mei@example.com",
      displayName: "小美",
      passwordHash: hashPassword("helper-pass"),
    });
    expect(helper.ok && helper.user.role).toBe("pending");
    expect(registerEmailUser(db, { email: "mei@example.com", displayName: "另一個", passwordHash: hashPassword("helper-pass") })).toEqual({
      ok: false,
      code: "email_taken",
    });
    expect(loginMethodLabel(created.user)).toBe("電子郵件");
    expect(normalizeEmail("  Mei@Example.com ")).toBe("mei@example.com");
  });

  it("promotes an address listed in ADMIN_EMAILS and blocks repeated failures", () => {
    const db = openAppDatabase(":memory:");
    registerEmailUser(db, { email: "owner@example.com", displayName: "老闆", passwordHash: hashPassword("owner-pass") });
    vi.stubEnv("ADMIN_EMAILS", "Boss@Example.com");
    const boss = registerEmailUser(db, {
      email: "boss@example.com",
      displayName: "溫蒂",
      passwordHash: hashPassword("boss-pass-1"),
    });
    expect(boss.ok && boss.user.role).toBe("admin");

    const now = Date.parse("2026-10-16T00:00:00.000Z");
    for (let i = 0; i < LOGIN_MAX_FAILURES; i += 1) {
      expect(authenticateEmail(db, "boss@example.com", "wrong", now)).toEqual({ ok: false, code: "bad_credentials" });
    }
    expect(authenticateEmail(db, "boss@example.com", "boss-pass-1", now)).toEqual({ ok: false, code: "rate_limited" });
    const later = authenticateEmail(db, "Boss@Example.com", "boss-pass-1", now + LOGIN_WINDOW_MS + 1000);
    expect(later.ok).toBe(true);
    if (!later.ok) return;
    expect(getUserByEmail(db, "boss@example.com")?.role).toBe("admin");
  });

  it("lets an admin issue a one-time reset and refuses everyone else", () => {
    const db = openAppDatabase(":memory:");
    const admin = upsertLineUser(db, { lineUserId: "Uwendy", displayName: "溫蒂", pictureUrl: null });
    const helper = registerEmailUser(db, {
      email: "mei@example.com",
      displayName: "小美",
      passwordHash: hashPassword("old-password"),
    });
    expect(helper.ok).toBe(true);
    if (!helper.ok) return;

    expect(adminIssueReset(db, { id: helper.user.id, role: "pending" }, helper.user.id)).toEqual({
      ok: false,
      code: "forbidden",
    });
    expect(adminIssueReset(db, admin, admin.id)).toEqual({ ok: false, code: "no_email" });

    const now = new Date("2026-10-16T00:00:00.000Z");
    const issued = adminIssueReset(db, admin, helper.user.id, now);
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.email).toBe("mei@example.com");
    expect(issued.token).not.toContain("scrypt");

    const nextHash = hashPassword("new-password");
    expect(resetPasswordWithToken(db, issued.token, nextHash, new Date(now.getTime() + 1000)).ok).toBe(true);
    expect(resetPasswordWithToken(db, issued.token, hashPassword("again"), new Date(now.getTime() + 2000))).toEqual({
      ok: false,
      code: "invalid",
    });
    expect(authenticateEmail(db, "mei@example.com", "new-password").ok).toBe(true);
    expect(authenticateEmail(db, "mei@example.com", "old-password").ok).toBe(false);

    const again = adminIssueReset(db, admin, helper.user.id, now);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(resetPasswordWithToken(db, again.token, hashPassword("too-late"), new Date(now.getTime() + RESET_TTL_MS + 1000))).toEqual({
      ok: false,
      code: "expired",
    });
  });
});

describe("smtpConfig", () => {
  it("stays off unless host and from are both set", () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_FROM", "代購單 <orders@example.com>");
    expect(smtpConfig()).toBeNull();
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "2525");
    expect(smtpConfig()).toMatchObject({ host: "smtp.example.com", port: 2525, from: "代購單 <orders@example.com>", secure: false });
  });
});
