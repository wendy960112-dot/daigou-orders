import { afterEach, describe, expect, it, vi } from "vitest";
import { canManagePurchases, canManageStatus, canViewOrder, devLoginAllowed, isAdminOnlyPath } from "./auth-policy";

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

describe("purchase access", () => {
  it("keeps purchasing pages and actions to the admin", () => {
    expect(canManagePurchases({ role: "admin" })).toBe(true);
    expect(canManagePurchases({ role: "helper" })).toBe(false);
    expect(canManagePurchases({ role: "pending" })).toBe(false);
    expect(isAdminOnlyPath("/purchases")).toBe(true);
    expect(isAdminOnlyPath("/purchases/new")).toBe(true);
    expect(isAdminOnlyPath("/purchases/skus")).toBe(true);
    expect(isAdminOnlyPath("/purchases/report")).toBe(true);
    expect(isAdminOnlyPath("/purchases/deleted")).toBe(true);
    expect(isAdminOnlyPath("/")).toBe(false);
    expect(isAdminOnlyPath("/inbox")).toBe(false);
    expect(isAdminOnlyPath("/orders/order_mei_oct")).toBe(false);
  });
});
