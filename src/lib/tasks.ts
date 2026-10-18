export const DELIVERY_METHODS = [
  { value: "handoff", label: "面交" },
  { value: "ship_address", label: "到貨後寄到指定地址" },
  { value: "warehouse", label: "寄到倉庫地址" },
] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]["value"];

export const DEFAULT_CARRIER = "EMS";

export const TASK_STATUSES = [
  { value: "pending", label: "待接單" },
  { value: "accepted", label: "已接單" },
  { value: "ordered", label: "已下單" },
  { value: "shipped", label: "已寄出" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

const TASK_VALUES = new Set<string>(TASK_STATUSES.map((item) => item.value));
const DELIVERY_VALUES = new Set<string>(DELIVERY_METHODS.map((item) => item.value));

export function isTaskStatus(value: string | null | undefined): value is TaskStatus {
  return Boolean(value && TASK_VALUES.has(value));
}

export function isDeliveryMethod(value: string | null | undefined): value is DeliveryMethod {
  return Boolean(value && DELIVERY_VALUES.has(value));
}

export function deliveryLabel(method: string | null | undefined) {
  return DELIVERY_METHODS.find((item) => item.value === method)?.label ?? "未填";
}

export function taskStatusLabel(status: TaskStatus) {
  return TASK_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function filled(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

export function isShippedReport(order: { shipDate?: string | null; trackingNumber?: string | null }) {
  return filled(order.shipDate) || filled(order.trackingNumber);
}

export function resolveTaskStatus(order: {
  taskStatus: string | null;
  shipDate: string | null;
  trackingNumber: string | null;
  carrier: string | null;
}): TaskStatus {
  if (isTaskStatus(order.taskStatus)) return order.taskStatus;
  if (isShippedReport(order)) return "shipped";
  return "ordered";
}
