// @ts-ignore bun test runner
import { describe, expect, it } from "bun:test";
import { planCarryOver } from "./carryOver";

describe("planCarryOver", () => {
  it("moves a job link to the new account with the same last 4 digits", () => {
    const res = planCarryOver(
      [{ mask: "3630", project_id: "nobhill", account_id: "1015" }],
      [{ id: "new-3630", mask: "3630", project_id: null }],
    );
    expect(res).toEqual([{ id: "new-3630", project_id: "nobhill", account_id: "1015" }]);
  });

  it("does not overwrite a new account that is already linked", () => {
    const res = planCarryOver(
      [{ mask: "3630", project_id: "nobhill", account_id: "1015" }],
      [{ id: "new-3630", mask: "3630", project_id: "other" }],
    );
    expect(res).toEqual([]);
  });

  it("leaves accounts with different last 4 digits unlinked", () => {
    const res = planCarryOver(
      [{ mask: "3630", project_id: "nobhill", account_id: "1015" }],
      [{ id: "new-5398", mask: "5398", project_id: null }],
    );
    expect(res).toEqual([]);
  });
});
