import { describe, it, expect } from "vitest";
import { isParentForProject } from "./bankParentGuard";

const kids = [{ parent_id: "1015", project_id: "228" }];
describe("isParentForProject", () => {
  it("1015 is a parent at 228 S Washington, where 1015.1 exists", () => {
    expect(isParentForProject("1015", "228", kids)).toBe(true);
  });
  it("1015 is a normal bank at other jobs", () => {
    expect(isParentForProject("1015", "nelson", kids)).toBe(false);
  });
  it("company-wide sub-accounts make it a parent everywhere", () => {
    expect(isParentForProject("1015", "nelson", [{ parent_id: "1015", project_id: null }])).toBe(true);
  });
});
