import { ApartmentInputs } from "@/lib/apartmentCalculations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  inputs: ApartmentInputs;
  onChange: (inputs: ApartmentInputs) => void;
}

function Field({ label, value, onChange, unit, guidance, isPercent, isCurrency }: {
  label: string; value: number; onChange: (v: number) => void;
  unit: string; guidance?: string; isPercent?: boolean; isCurrency?: boolean;
}) {
  const displayValue = isPercent ? (value * 100).toFixed(1) : isCurrency ? value.toString() : value.toString();

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-border/40">
      <Label className="col-span-4 text-sm font-medium">{label}</Label>
      <div className="col-span-3">
        <div className="relative">
          {isCurrency && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
          <Input
            type="number"
            value={displayValue}
            onChange={e => {
              const raw = parseFloat(e.target.value) || 0;
              onChange(isPercent ? raw / 100 : raw);
            }}
            className={`h-8 text-sm ${isCurrency ? 'pl-6' : ''}`}
          />
          {isPercent && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
        </div>
      </div>
      <span className="col-span-1 text-xs text-muted-foreground">{unit}</span>
      <span className="col-span-4 text-xs text-muted-foreground">{guidance}</span>
    </div>
  );
}

export default function ApartmentInputsTab({ inputs, onChange }: Props) {
  const set = (key: keyof ApartmentInputs) => (v: number) => onChange({ ...inputs, [key]: v });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        All inputs live here — edit your values below. All other tabs are calculated outputs.
      </div>

      <section>
        <h3 className="text-base font-semibold mb-2 text-foreground border-b pb-1">Property & Revenue</h3>
        <Field label="Total Number of Units" value={inputs.totalUnits} onChange={set('totalUnits')} unit="units" guidance="Enter your total unit count" />
        <Field label="Average Monthly Rent per Unit" value={inputs.avgMonthlyRent} onChange={set('avgMonthlyRent')} unit="$/unit/mo" guidance="Blended avg across all unit types" isCurrency />
        <Field label="Other Income per Unit per Month" value={inputs.otherIncomePerUnit} onChange={set('otherIncomePerUnit')} unit="$/unit/mo" guidance="Parking, laundry, fees; $30–$100 typical" isCurrency />
        <Field label="Physical Vacancy Rate" value={inputs.vacancyRate} onChange={set('vacancyRate')} unit="%" guidance="Typical market range: 4–8%" isPercent />
        <Field label="Credit Loss / Bad Debt Rate" value={inputs.creditLossRate} onChange={set('creditLossRate')} unit="%" guidance="Uncollectible rent estimate: 0.5–2%" isPercent />
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2 text-foreground border-b pb-1">Operating Expenses</h3>
        <Field label="Property Management Fee" value={inputs.propertyMgmtFee} onChange={set('propertyMgmtFee')} unit="% EGI" guidance="6–10% of EGI typical" isPercent />
        <Field label="Real Estate Taxes" value={inputs.realEstateTaxes} onChange={set('realEstateTaxes')} unit="$/unit/yr" guidance="Verify with local assessor" isCurrency />
        <Field label="Property Insurance" value={inputs.insurance} onChange={set('insurance')} unit="$/unit/yr" guidance="Verify with broker" isCurrency />
        <Field label="Repairs & Maintenance" value={inputs.repairsMaint} onChange={set('repairsMaint')} unit="$/unit/yr" guidance="$300–$600 typical" isCurrency />
        <Field label="Landscaping / Snow Removal" value={inputs.landscaping} onChange={set('landscaping')} unit="$/unit/yr" isCurrency />
        <Field label="Utilities — Common Area" value={inputs.utilities} onChange={set('utilities')} unit="$/unit/yr" guidance="Electric, water, gas" isCurrency />
        <Field label="Trash Removal" value={inputs.trash} onChange={set('trash')} unit="$/unit/yr" isCurrency />
        <Field label="Pest Control" value={inputs.pestControl} onChange={set('pestControl')} unit="$/unit/yr" isCurrency />
        <Field label="Security / Access Control" value={inputs.security} onChange={set('security')} unit="$/unit/yr" isCurrency />
        <Field label="Payroll / On-Site Staff" value={inputs.payroll} onChange={set('payroll')} unit="$/unit/yr" guidance="Includes benefit load" isCurrency />
        <Field label="Marketing & Advertising" value={inputs.marketing} onChange={set('marketing')} unit="$/unit/yr" guidance="Ads + leasing commissions" isCurrency />
        <Field label="Professional Fees (legal / acctg)" value={inputs.professionalFees} onChange={set('professionalFees')} unit="$/unit/yr" isCurrency />
        <Field label="Administrative / Office" value={inputs.admin} onChange={set('admin')} unit="$/unit/yr" isCurrency />
        <Field label="Reserve for Replacement" value={inputs.reserveForReplacement} onChange={set('reserveForReplacement')} unit="$/unit/yr" guidance="$200–$350 typical" isCurrency />
        <Field label="Capital Expenditure Reserve" value={inputs.capexReserve} onChange={set('capexReserve')} unit="$/unit/yr" guidance="Long-term capex buffer" isCurrency />
        <Field label="Other / Miscellaneous" value={inputs.otherExpense} onChange={set('otherExpense')} unit="$/unit/yr" isCurrency />
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2 text-foreground border-b pb-1">Loan Inputs</h3>
        <Field label="Total Project Cost — Hard + Soft + Land" value={inputs.totalProjectCost} onChange={set('totalProjectCost')} unit="$" guidance="Sum of all development costs" isCurrency />
        <Field label="As-Stabilized Appraised Value" value={inputs.appraisedValue} onChange={set('appraisedValue')} unit="$" guidance="Estimated stabilized market value" isCurrency />
        <Field label="Loan Amount" value={inputs.loanAmount} onChange={set('loanAmount')} unit="$" guidance="Enter desired loan amount" isCurrency />
        <Field label="Interest Rate (Annual)" value={inputs.interestRate} onChange={set('interestRate')} unit="%/yr" guidance="e.g. 6.500%" isPercent />
        <Field label="Loan Term" value={inputs.loanTermYears} onChange={set('loanTermYears')} unit="years" guidance="Maturity / balloon date" />
        <Field label="Amortization Period" value={inputs.amortYears} onChange={set('amortYears')} unit="years" guidance="30 yrs conventional; match term for I/O" />
        <Field label="Interest-Only Period (if any)" value={inputs.interestOnlyYears} onChange={set('interestOnlyYears')} unit="years" guidance="0 = fully amortizing from day 1" />
      </section>

      <p className="text-xs text-muted-foreground italic">
        DISCLAIMER: For planning purposes only. Consult qualified financial, legal, and tax advisors.
      </p>
    </div>
  );
}
