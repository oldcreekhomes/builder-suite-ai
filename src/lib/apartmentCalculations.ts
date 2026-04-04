export interface ApartmentInputs {
  // Property & Revenue
  totalUnits: number;
  avgMonthlyRent: number;
  otherIncomePerUnit: number;
  vacancyRate: number;
  creditLossRate: number;

  // Operating Expenses
  propertyMgmtFee: number; // % of EGI
  realEstateTaxes: number; // $/unit/yr
  insurance: number;
  repairsMaint: number;
  landscaping: number;
  utilities: number;
  trash: number;
  pestControl: number;
  security: number;
  payroll: number;
  marketing: number;
  professionalFees: number;
  admin: number;
  reserveForReplacement: number;
  capexReserve: number;
  otherExpense: number;

  // Loan
  totalProjectCost: number;
  appraisedValue: number;
  loanAmount: number;
  interestRate: number; // decimal e.g. 0.06
  loanTermYears: number;
  amortYears: number;
  interestOnlyYears: number;
}

export const DEFAULT_INPUTS: ApartmentInputs = {
  totalUnits: 19,
  avgMonthlyRent: 4200,
  otherIncomePerUnit: 0,
  vacancyRate: 0.05,
  creditLossRate: 0.01,
  propertyMgmtFee: 0.08,
  realEstateTaxes: 7000,
  insurance: 100,
  repairsMaint: 400,
  landscaping: 100,
  utilities: 200,
  trash: 60,
  pestControl: 40,
  security: 80,
  payroll: 600,
  marketing: 150,
  professionalFees: 75,
  admin: 50,
  reserveForReplacement: 250,
  capexReserve: 150,
  otherExpense: 50,
  totalProjectCost: 10500000,
  appraisedValue: 15200000,
  loanAmount: 10500000,
  interestRate: 0.06,
  loanTermYears: 35,
  amortYears: 35,
  interestOnlyYears: 0,
};

export interface IncomeResults {
  gpr: number;
  otherIncome: number;
  vacancyLoss: number;
  creditLoss: number;
  egi: number;
  expenses: { label: string; annual: number; perUnitMo: number; monthly: number; pctEgi: number }[];
  totalExpenses: number;
  noi: number;
  monthlyDebtService: number;
  annualDebtService: number;
  cfads: number;
}

export interface KeyMetrics {
  ltv: number;
  ltc: number;
  dscr: number;
  capRate: number;
  cashOnCash: number;
  breakEvenOccupancy: number;
  equityRequired: number;
  expenseRatio: number;
  noiPerUnit: number;
}

export interface AmortRow {
  year: number;
  beginBalance: number;
  annualPrincipal: number;
  annualInterest: number;
  totalPayment: number;
  endBalance: number;
  isInterestOnly: boolean;
}

export function calcMonthlyPayment(principal: number, annualRate: number, amortYears: number): number {
  if (principal <= 0 || amortYears <= 0) return 0;
  if (annualRate <= 0) return principal / (amortYears * 12);
  const r = annualRate / 12;
  const n = amortYears * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calculateIncome(inputs: ApartmentInputs): IncomeResults {
  const safe = { ...DEFAULT_INPUTS, ...inputs };
  const u = safe.totalUnits || 0;
  const gpr = u * safe.avgMonthlyRent * 12;
  const otherIncome = u * safe.otherIncomePerUnit * 12;
  const vacancyLoss = gpr * safe.vacancyRate;
  const creditLoss = gpr * safe.creditLossRate;
  const egi = gpr + otherIncome - vacancyLoss - creditLoss;

  const mgmtFee = egi * safe.propertyMgmtFee;

  const perUnitItems: { label: string; value: number }[] = [
    { label: "Real Estate Taxes", value: safe.realEstateTaxes },
    { label: "Property Insurance", value: safe.insurance },
    { label: "Repairs & Maintenance", value: safe.repairsMaint },
    { label: "Landscaping / Snow Removal", value: safe.landscaping },
    { label: "Utilities — Common Area", value: safe.utilities },
    { label: "Trash Removal", value: safe.trash },
    { label: "Pest Control", value: safe.pestControl },
    { label: "Security / Access Control", value: safe.security },
    { label: "Payroll / On-Site Staff", value: safe.payroll },
    { label: "Marketing & Advertising", value: safe.marketing },
    { label: "Professional Fees (legal / acctg)", value: safe.professionalFees },
    { label: "Administrative / Office", value: safe.admin },
    { label: "Reserve for Replacement", value: safe.reserveForReplacement },
    { label: "Capital Expenditure Reserve", value: safe.capexReserve },
    { label: "Other / Miscellaneous", value: safe.otherExpense },
  ];

  const expenses = [
    {
      label: "Property Management Fee",
      annual: mgmtFee,
      perUnitMo: u > 0 ? mgmtFee / u / 12 : 0,
      monthly: mgmtFee / 12,
      pctEgi: egi > 0 ? mgmtFee / egi : 0,
    },
    ...perUnitItems.map(item => {
      const annual = item.value * u;
      return {
        label: item.label,
        annual,
        perUnitMo: item.value / 12,
        monthly: annual / 12,
        pctEgi: egi > 0 ? annual / egi : 0,
      };
    }),
  ];

  const totalExpenses = expenses.reduce((s, e) => s + e.annual, 0);
  const noi = egi - totalExpenses;

  const monthlyPI = calcMonthlyPayment(safe.loanAmount, safe.interestRate, safe.amortYears);
  const monthlyDebtService = safe.interestOnlyYears > 0
    ? safe.loanAmount * safe.interestRate / 12
    : monthlyPI;
  const annualDebtService = monthlyDebtService * 12;
  const cfads = noi - annualDebtService;

  return { gpr, otherIncome, vacancyLoss, creditLoss, egi, expenses, totalExpenses, noi, monthlyDebtService, annualDebtService, cfads };
}

export function calculateMetrics(inputs: ApartmentInputs, income: IncomeResults): KeyMetrics {
  const equityRequired = inputs.appraisedValue - inputs.loanAmount;
  return {
    ltv: inputs.appraisedValue > 0 ? inputs.loanAmount / inputs.appraisedValue : 0,
    ltc: inputs.totalProjectCost > 0 ? inputs.loanAmount / inputs.totalProjectCost : 0,
    dscr: income.annualDebtService > 0 ? income.noi / income.annualDebtService : 0,
    capRate: inputs.appraisedValue > 0 ? income.noi / inputs.appraisedValue : 0,
    cashOnCash: equityRequired > 0 ? income.cfads / equityRequired : 0,
    breakEvenOccupancy: income.gpr > 0 ? (income.totalExpenses + income.annualDebtService) / income.gpr : 0,
    equityRequired,
    expenseRatio: income.egi > 0 ? income.totalExpenses / income.egi : 0,
    noiPerUnit: inputs.totalUnits > 0 ? income.noi / inputs.totalUnits : 0,
  };
}

export function calculateAmortization(inputs: ApartmentInputs): AmortRow[] {
  const safe = { ...DEFAULT_INPUTS, ...inputs };
  const rows: AmortRow[] = [];
  let balance = safe.loanAmount;
  const monthlyPI = calcMonthlyPayment(safe.loanAmount, safe.interestRate, safe.amortYears);
  const monthlyRate = safe.interestRate / 12;

  for (let year = 1; year <= safe.loanTermYears; year++) {
    if (balance <= 0) break;
    const isIO = year <= safe.interestOnlyYears;
    let annualPrincipal = 0;
    let annualInterest = 0;
    const beginBalance = balance;

    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = balance * monthlyRate;
      annualInterest += interest;
      if (isIO) {
        // Interest only — no principal reduction
      } else {
        const principal = Math.min(monthlyPI - interest, balance);
        annualPrincipal += principal;
        balance -= principal;
      }
    }

    rows.push({
      year,
      beginBalance,
      annualPrincipal: Math.round(annualPrincipal),
      annualInterest: Math.round(annualInterest),
      totalPayment: Math.round(annualPrincipal + annualInterest),
      endBalance: Math.max(0, Math.round(balance)),
      isInterestOnly: isIO,
    });
  }
  return rows;
}
