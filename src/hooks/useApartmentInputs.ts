import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ApartmentInputs {
  number_of_units: number;
  avg_rent_per_unit: number;
  vacancy_rate: number;
  purchase_price: number;
  construction_costs: number;
  ltv: number;
  interest_rate: number;
  amortization_years: number;
  loan_term_years: number;
  tax_rate: number;
  estimated_value: number;
  taxes: number;
  insurance: number;
  utilities: number;
  repairs_maintenance: number;
  management_fee_percent: number;
  payroll: number;
  general_admin: number;
  marketing: number;
  reserves_per_unit: number;
  landscaping: number;
  snow_removal: number;
  trash_removal: number;
  pest_control: number;
  security: number;
  professional_fees: number;
  capex_reserve: number;
  other_misc: number;
}

const DEFAULT_INPUTS: ApartmentInputs = {
  number_of_units: 200,
  avg_rent_per_unit: 1500,
  vacancy_rate: 5,
  purchase_price: 25000000,
  construction_costs: 0,
  ltv: 75,
  interest_rate: 6.5,
  amortization_years: 30,
  loan_term_years: 30,
  tax_rate: 2.0,
  estimated_value: 25000000,
  taxes: 500000,
  insurance: 250000,
  utilities: 200000,
  repairs_maintenance: 180000,
  management_fee_percent: 5,
  payroll: 200000,
  general_admin: 100000,
  marketing: 50000,
  reserves_per_unit: 295,
  landscaping: 0,
  snow_removal: 0,
  trash_removal: 0,
  pest_control: 0,
  security: 0,
  professional_fees: 0,
  capex_reserve: 0,
  other_misc: 0,
};

const INPUT_FIELDS = Object.keys(DEFAULT_INPUTS) as (keyof ApartmentInputs)[];

function computeFinancials(inputs: ApartmentInputs) {
  const units = inputs.number_of_units || 0;
  const grossPotentialRent = units * inputs.avg_rent_per_unit * 12;
  const vacancyLoss = grossPotentialRent * (inputs.vacancy_rate / 100);
  const egi = grossPotentialRent - vacancyLoss;

  const managementFee = egi * (inputs.management_fee_percent / 100);
  const reserves = units * inputs.reserves_per_unit;
  const taxes = inputs.estimated_value * inputs.tax_rate;

  const totalOpEx =
    taxes +
    inputs.insurance +
    inputs.utilities +
    inputs.repairs_maintenance +
    inputs.landscaping +
    inputs.snow_removal +
    inputs.trash_removal +
    inputs.pest_control +
    managementFee +
    inputs.general_admin +
    inputs.marketing +
    inputs.security +
    inputs.professional_fees +
    inputs.capex_reserve +
    inputs.other_misc +
    reserves;

  const noi = egi - totalOpEx;

  const loanAmount = (inputs.purchase_price + inputs.construction_costs) * (inputs.ltv / 100);
  const monthlyRate = inputs.interest_rate / 100 / 12;
  const totalPayments = inputs.amortization_years * 12;
  const monthlyPayment =
    monthlyRate > 0 && totalPayments > 0
      ? loanAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0;
  const annualDebtService = monthlyPayment * 12;

  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const cashFlowAfterDebt = noi - annualDebtService;
  const equityInvested = inputs.purchase_price - loanAmount;
  const cashOnCash = equityInvested > 0 ? (cashFlowAfterDebt / equityInvested) * 100 : 0;
  const capRate = inputs.purchase_price > 0 ? (noi / inputs.purchase_price) * 100 : 0;
  const pricePerUnit = units > 0 ? inputs.purchase_price / units : 0;
  const grm = grossPotentialRent > 0 ? inputs.purchase_price / grossPotentialRent : 0;
  const expenseRatio = egi > 0 ? (totalOpEx / egi) * 100 : 0;

  return {
    grossPotentialRent,
    vacancyLoss,
    egi,
    managementFee,
    reserves,
    taxes,
    totalOpEx,
    noi,
    loanAmount,
    annualDebtService,
    dscr,
    cashFlowAfterDebt,
    cashOnCash,
    capRate,
    pricePerUnit,
    grm,
    expenseRatio,
    equityInvested,
  };
}

export function useApartmentInputs(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const queryKey = ["apartment-inputs", projectId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId || !user) return null;

      // Try to fetch existing row
      const { data: existing, error } = await supabase
        .from("apartment_inputs")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching apartment inputs:", error);
        throw error;
      }

      if (existing) return existing;

      // Determine owner_id: for employees use home_builder_id, for owners use own id
      const { data: userData } = await supabase
        .from("users")
        .select("role, home_builder_id")
        .eq("id", user.id)
        .single();

      const ownerId =
        userData?.role === "employee" && userData?.home_builder_id
          ? userData.home_builder_id
          : user.id;

      // Create default row
      const { data: newRow, error: insertError } = await supabase
        .from("apartment_inputs")
        .insert({ project_id: projectId, owner_id: ownerId })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating apartment inputs:", insertError);
        throw insertError;
      }

      return newRow;
    },
    enabled: !!projectId && !!user,
    staleTime: 5000,
  });

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const inputs: ApartmentInputs = data
    ? INPUT_FIELDS.reduce((acc, key) => {
        acc[key] = Number(data[key]) || DEFAULT_INPUTS[key];
        return acc;
      }, {} as ApartmentInputs)
    : DEFAULT_INPUTS;

  const computed = computeFinancials(inputs);

  const updateInput = useCallback(
    (field: keyof ApartmentInputs, value: string) => {
      if (!projectId || !data?.id) return;

      const numValue = parseFloat(value) || 0;

      // Optimistic update
      queryClient.setQueryData(queryKey, (old: any) =>
        old ? { ...old, [field]: numValue } : old
      );

      // Debounce the save
      if (debounceTimers.current[field]) {
        clearTimeout(debounceTimers.current[field]);
      }

      debounceTimers.current[field] = setTimeout(async () => {
        const { error } = await supabase
          .from("apartment_inputs")
          .update({ [field]: numValue } as any)
          .eq("id", data.id);

        if (error) {
          console.error("Error saving apartment input:", error);
          // Refetch on error to restore correct state
          queryClient.invalidateQueries({ queryKey });
        }
      }, 300);
    },
    [projectId, data?.id, queryClient]
  );

  return { inputs, computed, isLoading, updateInput };
}

export const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export const fmtPct = (n: number, decimals = 1) => `${n.toFixed(decimals)}%`;
