import { afterEach, describe, expect, it, vi } from "vitest";
import { canEnterPreview, canManageStatus, canViewOrder, devLoginAllowed } from "./auth-policy";
import { PREVIEW_HELPER_ID } from "./preview";

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
  });

  it("keeps the preview sandbox visible only inside helper preview", () => {
    const sandbox = { helperId: PREVIEW_HELPER_ID };
    expect(canViewOrder({ id: "user_wendy", role: "admin" }, sandbox)).toBe(false);
    expect(canViewOrder({ id: "user_mei", role: "helper" }, sandbox)).toBe(false);
    expect(canViewOrder({ id: PREVIEW_HELPER_ID, role: "helper", preview: true }, sandbox)).toBe(true);
    expect(canManageStatus({ id: "user_wendy", role: "admin", preview: true })).toBe(false);
    expect(canEnterPreview({ role: "admin" })).toBe(true);
    expect(canEnterPreview({ role: "helper" })).toBe(false);
    expect(canEnterPreview({ role: "pending" })).toBe(false);
  });
});
