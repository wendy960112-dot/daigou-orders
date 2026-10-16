import nodemailer from "nodemailer";

export function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isFinite(port) || port <= 0) return null;
  const user = process.env.SMTP_USER?.trim() || undefined;
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    from,
    user,
    pass: process.env.SMTP_PASS,
  };
}

export async function sendPasswordResetEmail(to: string, link: string) {
  const config = smtpConfig();
  if (!config) return { ok: false as const, code: "smtp_off" as const };
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });
  await transport.sendMail({
    from: config.from,
    to,
    subject: "代購單：重設密碼",
    text: `請在一個小時內打開這個連結重設密碼。用過一次就失效。\n\n${link}\n\n如果不是你要請重設，可以忽略這封信。`,
  });
  return { ok: true as const };
}
