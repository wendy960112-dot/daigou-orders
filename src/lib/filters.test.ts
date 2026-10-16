import { describe, expect, it } from "vitest";
import { parseFilters } from "./filters";

describe("parseFilters", () => {
  it("defaults the month and treats an empty month as all months", () => {
    expect(parseFilters({}, { defaultMonth: "2026-10" }).month).toBe("2026-10");
    expect(parseFilters({ month: "" }, { defaultMonth: "2026-10" }).month).toBeNull();
    expect(parseFilters({ month: "2026-13", status: "nope", helperId: "../x" }, { defaultMonth: "2026-10" })).toEqual({
      month: "2026-10",
      status: null,
      helperId: null,
      task: null,
    });
    expect(parseFilters({ month: "2026-09", status: "unpaid", helperId: "user_mei", task: "pending" }, { defaultMonth: "2026-10" })).toEqual({
      month: "2026-09",
      status: "unpaid",
      helperId: "user_mei",
      task: "pending",
    });
  });
});
