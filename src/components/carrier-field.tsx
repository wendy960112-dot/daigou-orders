import { CARRIERS, DEFAULT_CARRIER, isCarrier } from "@/lib/tasks";
import { Field } from "./field";
import { inputClass } from "./styles";

export function CarrierField({ value }: { value?: string | null }) {
  const selected = isCarrier(value) ? value : DEFAULT_CARRIER;
  const legacy = value && !isCarrier(value) ? value : null;
  return (
    <Field
      label="物流公司"
      hint={
        legacy
          ? `目前紀錄是「${legacy}」。請改選 EMS 或 ヤマト。只選物流公司不會變成已寄出。`
          : "預設是 EMS，也可以改選 ヤマト。只選物流公司不會變成已寄出。"
      }
    >
      <select name="carrier" required className={inputClass} defaultValue={selected} aria-label="物流公司">
        {CARRIERS.map((carrier) => (
          <option key={carrier} value={carrier}>
            {carrier}
          </option>
        ))}
      </select>
    </Field>
  );
}
