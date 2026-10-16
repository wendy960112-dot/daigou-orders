import { describe, expect, it } from "vitest";
import { deletionWarning } from "./delete-order";

describe("deletionWarning", () => {
  it("uses a plain confirm when nothing has been paid", () => {
    const warning = deletionWarning({ productName: "丸久小山園", paid: false, shippingReimbursed: false });
    expect(warning.strong).toBe(false);
    expect(warning.title).toBe("刪除這張任務？");
    expect(warning.body).toContain("丸久小山園");
  });

  it("warns harder when goods or shipping were already settled", () => {
    const paid = deletionWarning({ productName: "白色戀人", paid: true, shippingReimbursed: false });
    expect(paid.strong).toBe(true);
    expect(paid.body).toContain("已匯款");
    expect(paid.body).not.toContain("運費已報銷");

    const both = deletionWarning({ productName: "保溫瓶", paid: true, shippingReimbursed: true });
    expect(both.body).toContain("已匯款和運費已報銷");
  });
});
