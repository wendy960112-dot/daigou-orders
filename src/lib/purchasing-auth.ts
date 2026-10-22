import { createHash, timingSafeEqual } from "crypto";

export function purchasingToken() {
  const token = process.env.PURCHASING_API_TOKEN ?? "";
  const trimmed = token.trim();
  return trimmed ? trimmed : null;
}

function sameSecret(provided: string, expected: string) {
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function purchasingDenied(request: Request) {
  const expected = purchasingToken();
  if (!expected) return new Response(null, { status: 404 });
  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix) || !sameSecret(header.slice(prefix.length), expected)) {
    return new Response(null, { status: 404 });
  }
  return null;
}
