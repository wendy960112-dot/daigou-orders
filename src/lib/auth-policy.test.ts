import { afterEach, describe, expect, it, vi } from "vitest";
import { canManageStatus, canViewOrder, devLoginAllowed } from "./auth-policy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("devLoginAllowed", () => {
  it("turns on only for development with the explicit flag", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_LOGIN_ENABLED", "true");
    expect(devLoginAllowed()).toBe(true);
  });

  it("stays off in production even if the flag is true", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_LOGIN_ENABLED", "true");
    expect(devLoginAllowed()).toBe(false);
  });

  it("stays off in development when the flag is missing or false", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_LOGIN_ENABLED", "false");
    expect(devLoginAllowed()).toBe(false);
    vi.stubEnv("DEV_LOGIN_ENABLED", "");
    expect(devLoginAllowed()).toBe(false);
  });

  it("stays off during tests unless development is set", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEV_LOGIN_ENABLED", "true");
    expect(devLoginAllowed()).toBe(false);
  });
});

describe("order access", () => {
  const order = { helperId: "user_mei" };

  it("lets an admin see every order and a helper see only their own", () => {
    expect(canViewOrder({ id: "user_wendy", role: "admin" }, order)).toBe(true);
    expect(canViewOrder({ id: "user_mei", role: "helper" }, order)).toBe(true);
    expect(canViewOrder({ id: "user_ken", role: "helper" }, order)).toBe(false);
    expect(canViewOrder({ id: "user_lin", role: "pending" }, order)).toBe(false);
    expect(canManageStatus({ id: "user_wendy", role: "admin" })).toBe(true);
    expect(canManageStatus({ id: "user_mei", role: "helper" })).toBe(false);
    expect(canViewOrder({ id: "user_mei", role: "helper" }, { ...order, deletedAt: "2026-10-16T00:00:00.000Z" })).toBe(false);
    expect(canViewOrder({ id: "user_wendy", role: "admin" }, { ...order, deletedAt: "2026-10-16T00:00:00.000Z" })).toBe(true);
  });
});
