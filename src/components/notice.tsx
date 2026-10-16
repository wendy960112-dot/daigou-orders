import { noticeTone, NOTICES } from "@/lib/notices";

export function Notice({ code }: { code?: string }) {
  if (!code || !NOTICES[code]) return null;
  const tone = noticeTone(code);
  return (
    <p
      className={
        tone === "warn"
          ? "rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn"
          : "rounded-xl bg-good-soft px-3 py-2 text-sm text-good"
      }
      role="status"
    >
      {NOTICES[code]}
    </p>
  );
}
