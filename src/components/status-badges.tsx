export function StatusBadges({
  paid,
  goodsReceived,
  shippingCost,
  shippingReimbursed,
}: {
  paid: boolean;
  goodsReceived: boolean;
  shippingCost: number | null;
  shippingReimbursed: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge on={paid} onText="已匯款" offText="未匯款" />
      <Badge on={goodsReceived} onText="已收到貨" offText="未收貨" />
      {shippingCost == null ? (
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-muted">運費未填</span>
      ) : (
        <Badge on={shippingReimbursed} onText="運費已報銷" offText="運費未報銷" />
      )}
    </div>
  );
}

function Badge({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span
      className={
        on
          ? "rounded-full bg-good-soft px-2.5 py-1 text-xs font-medium text-good"
          : "rounded-full bg-warn-soft px-2.5 py-1 text-xs font-medium text-warn"
      }
    >
      {on ? onText : offText}
    </span>
  );
}
