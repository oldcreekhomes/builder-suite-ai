import type { Tables } from "@/integrations/supabase/types";

export type CostCode = Tables<'cost_codes'>;
export type CostCodeSpecification = Tables<'cost_code_specifications'>;

// Combined type for specifications with cost code data
export type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};