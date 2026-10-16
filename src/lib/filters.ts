import { isTaskStatus, type TaskStatus } from "./tasks";

export const STATUS_FILTERS = [
  { value: "unpaid", label: "未匯款" },
  { value: "paid", label: "已匯款" },
  { value: "not_received", label: "未收貨" },
  { value: "received", label: "已收到貨" },
  { value: "shipping_open", label: "運費未報銷" },
  { value: "shipping_done", label: "運費已報銷" },
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

const STATUS_VALUES = new Set<string>(STATUS_FILTERS.map((item) => item.value));

export type OrderFilters = {
  month: string | null;
  status: StatusFilter | null;
  helperId: string | null;
  task: TaskStatus | null;
};

export function parseFilters(
  input: { helperId?: string; status?: string; month?: string; task?: string },
  options: { defaultMonth: string },
): OrderFilters {
  let month: string | null;
  if (input.month === undefined) month = options.defaultMonth;
  else if (input.month === "" || input.month === "all") month = null;
  else if (/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) month = input.month;
  else month = options.defaultMonth;

  const status = input.status && STATUS_VALUES.has(input.status) ? (input.status as StatusFilter) : null;
  const helperId =
    input.helperId && /^[A-Za-z0-9_-]{1,80}$/.test(input.helperId) ? input.helperId : null;
  const task = input.task && isTaskStatus(input.task) ? input.task : null;

  return { month, status, helperId, task };
}
