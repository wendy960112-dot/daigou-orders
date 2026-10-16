import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl, lineConfigured } from "@/lib/line";

export async function GET() {
  if (!lineConfigured()) {
    return NextResponse.redirect(new URL("/login?error=line_config", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }
  const state = crypto.randomUUID().replaceAll("-", "");
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const jar = await cookies();
  jar.set("line_oauth_state", `${state}.${nonce}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return NextResponse.redirect(buildAuthorizeUrl(state, nonce));
}
