export function lineConfigured() {
  return Boolean(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET);
}

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function callbackUrl() {
  if (process.env.LINE_CALLBACK_URL) return process.env.LINE_CALLBACK_URL;
  return `${appBaseUrl()}/api/auth/line/callback`;
}

export function buildAuthorizeUrl(state: string, nonce: string) {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) throw new Error("尚未設定 LINE_CHANNEL_ID");
  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", channelId);
  url.searchParams.set("redirect_uri", callbackUrl());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "profile openid");
  url.searchParams.set("nonce", nonce);
  return url.toString();
}

export type LineProfile = {
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
};

export async function exchangeLineCode(code: string, nonce: string): Promise<LineProfile> {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !channelSecret) throw new Error("LINE 尚未設定");

  const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
      client_id: channelId,
      client_secret: channelSecret,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenResponse.ok) throw new Error(`LINE token 失敗（${tokenResponse.status}）`);
  const token = (await tokenResponse.json()) as { access_token?: string; id_token?: string };

  if (token.id_token) {
    const verifyResponse = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: token.id_token, client_id: channelId, nonce }),
      signal: AbortSignal.timeout(10000),
    });
    if (verifyResponse.ok) {
      const profile = (await verifyResponse.json()) as { sub?: string; name?: string; picture?: string; nonce?: string };
      if (profile.nonce && profile.nonce !== nonce) throw new Error("LINE nonce 不符");
      if (!profile.sub) throw new Error("LINE 沒有回傳使用者");
      return { lineUserId: profile.sub, displayName: profile.name || "LINE 使用者", pictureUrl: profile.picture ?? null };
    }
  }

  if (!token.access_token) throw new Error("LINE 沒有回傳存取權杖");
  const profileResponse = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!profileResponse.ok) throw new Error(`LINE 個人資料失敗（${profileResponse.status}）`);
  const profile = (await profileResponse.json()) as { userId?: string; displayName?: string; pictureUrl?: string };
  if (!profile.userId) throw new Error("LINE 沒有回傳使用者");
  return {
    lineUserId: profile.userId,
    displayName: profile.displayName || "LINE 使用者",
    pictureUrl: profile.pictureUrl ?? null,
  };
}
