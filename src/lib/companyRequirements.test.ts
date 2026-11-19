// @ts-ignore
import { expect, test } from "bun:test";
import {
  getCompanyRequirementErrors,
  getRequiredCompanyFieldLabels,
  hasServiceArea,
} from "./companyRequirements";

const complete = {
  engagementType: "supplier" as const,
  companyName: "IRS",
  companyType: "Utility",
  serviceAreas: ["Washington, DC"],
};

test("General Payee with name, type and service area has no errors", () => {
  expect(getCompanyRequirementErrors(complete)).toEqual({});
});

test("General Payee without a service area is blocked", () => {
  expect(
    getCompanyRequirementErrors({ ...complete, serviceAreas: [] }).service_areas
  ).toBe("Select at least one service area");
  expect(
    getCompanyRequirementErrors({ ...complete, serviceAreas: null }).service_areas
  ).toBe("Select at least one service area");
});

test("General Payee without a company type is blocked", () => {
  expect(getCompanyRequirementErrors({ ...complete, companyType: "" }).company_type).toBe(
    "Company type is required"
  );
  expect(
    getCompanyRequirementErrors({ ...complete, companyType: "   " }).company_type
  ).toBe("Company type is required");
});

test("General Payee without a company name is blocked", () => {
  expect(getCompanyRequirementErrors({ ...complete, companyName: "  " }).company_name).toBe(
    "Company name is required"
  );
});

test("General Payee does not need a street address", () => {
  expect(getCompanyRequirementErrors({ ...complete, addressLine1: "" })).toEqual({});
});

test("unrecognized service area text does not count as a service area", () => {
  expect(
    getCompanyRequirementErrors({ ...complete, serviceAreas: ["Somewhere Else"] })
      .service_areas
  ).toBe("Select at least one service area");
  expect(hasServiceArea(["Northern VA"])).toBe(true);
});

test("Trade Partner still needs a street address but not an explicit service area", () => {
  const errors = getCompanyRequirementErrors({
    engagementType: "trade_partner",
    companyName: "Acme Plumbing",
    companyType: "Subcontractor",
    serviceAreas: [],
    addressLine1: "",
  });
  expect(errors.address_line_1).toBe("Street address is required");
  expect(errors.service_areas).toBeUndefined();
});

test("Trade Partner with an address has no errors", () => {
  expect(
    getCompanyRequirementErrors({
      engagementType: "trade_partner",
      companyName: "Acme Plumbing",
      companyType: "Subcontractor",
      serviceAreas: [],
      addressLine1: "123 Main St",
    })
  ).toEqual({});
});

test("required field list names the three General Payee fields", () => {
  expect(getRequiredCompanyFieldLabels("supplier")).toEqual([
    "Company name",
    "Company type",
    "Service area",
  ]);
});
