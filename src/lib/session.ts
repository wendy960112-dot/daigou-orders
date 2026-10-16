import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "daigou_session";

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("正式環境必須設定 SESSION_SECRET（至少 16 個字）");
  }
  return "dev-only-session-secret";
}

function secretKey() {
  return new TextEncoder().encode(sessionSecret());
}

export async function setSession(userId: string, options?: { preview?: boolean }) {
  const token = await new SignJWT({ uid: userId, preview: options?.preview === true })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<{ userId: string; preview: boolean } | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub, preview: payload.preview === true };
  } catch {
    return null;
  }
}

export async function readSessionUserId() {
  const session = await readSession();
  return session?.userId ?? null;
}
