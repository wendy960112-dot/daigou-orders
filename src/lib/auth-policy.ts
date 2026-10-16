import type { Role, Viewer } from "./types";

/**
 * Dev login stays off unless both are true:
 * NODE_ENV is exactly "development" (npm run dev), and DEV_LOGIN_ENABLED is exactly "true".
 * `next start`, Render, and Vercel set NODE_ENV=production, so the bypass cannot turn on there.
 */
export function devLoginAllowed() {
  return process.env.NODE_ENV === "development" && process.env.DEV_LOGIN_ENABLED === "true";
}

export function adminLineIds() {
  return (process.env.ADMIN_LINE_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function canViewOrder(viewer: Viewer, order: { helperId: string }) {
  if (viewer.role === "admin") return true;
  if (viewer.role === "helper") return viewer.id === order.helperId;
  return false;
}

export function canEditOrder(viewer: Viewer, order: { helperId: string }) {
  return canViewOrder(viewer, order);
}

export function canManageStatus(viewer: Viewer) {
  return viewer.role === "admin";
}

export function canReviewHelpers(viewer: Viewer) {
  return viewer.role === "admin";
}

export function roleLabel(role: Role) {
  if (role === "admin") return "管理員";
  if (role === "helper") return "小幫手";
  return "待核准";
}
