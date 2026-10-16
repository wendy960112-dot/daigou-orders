import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { upsertLineUser } from "@/db/users";
import { exchangeLineCode } from "@/lib/line";
import { setSession } from "@/lib/session";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) redirect("/login?error=line_denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const saved = jar.get("line_oauth_state")?.value ?? "";
  jar.delete("line_oauth_state");
  const [savedState, nonce] = saved.split(".");
  if (!code || !state || !savedState || !nonce || !safeEqual(state, savedState)) {
    redirect("/login?error=line_state");
  }

  try {
    const profile = await exchangeLineCode(code, nonce);
    const user = upsertLineUser(getDb(), profile);
    await setSession(user.id);
    redirect(user.role === "pending" ? "/pending" : "/");
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    console.error("LINE login failed", error instanceof Error ? error.message : "unknown");
    redirect("/login?error=line_failed");
  }
}
