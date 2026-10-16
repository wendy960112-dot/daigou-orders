import type { Currency } from "./types";

export function nowIso() {
  return new Date().toISOString();
}

export function todayTaipei(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function currentMonthTaipei(now = new Date()) {
  return todayTaipei(now).slice(0, 7);
}

export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  if (!year || !month || !day) return isoDate;
  return `${year}/${month}/${day}`;
}

export function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}年${Number(monthNumber)}月`;
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatMoney(amount: number, currency: Currency) {
  const formatted = new Intl.NumberFormat("zh-Hant", { maximumFractionDigits: 0 }).format(amount);
  return currency === "JPY" ? `¥${formatted}` : `NT$${formatted}`;
}

export function currencyLabel(currency: Currency) {
  return currency === "JPY" ? "日圓" : "新台幣";
}

export function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isSafeId(id: string) {
  return /^[A-Za-z0-9_-]{1,80}$/.test(id);
}
