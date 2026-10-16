export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function normalizeDisplayName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 40) return null;
  if (/[\u0000-\u001f]/.test(name)) return null;
  return name;
}

export function loginMethodLabel(user: { lineUserId: string | null; email: string | null }) {
  const methods: string[] = [];
  if (user.lineUserId) methods.push("LINE");
  if (user.email) methods.push("電子郵件");
  return methods.length > 0 ? methods.join("、") : "開發用帳號";
}

export function resetUrl(token: string, origin?: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const base = configured || origin?.replace(/\/$/, "") || "";
  const path = `/reset-password?token=${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}
