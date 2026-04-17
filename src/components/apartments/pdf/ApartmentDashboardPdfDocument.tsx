import { Document, Page, Text, View } from '@react-pdf/renderer';
import { apartmentPdfStyles, ApartmentPdfHeader, ApartmentPdfFooter, PdfRow } from './ApartmentPdfLayout';
import type { ApartmentInputs } from '@/hooks/useApartmentInputs';
import { fmt, fmtPct } from '@/hooks/useApartmentInputs';

interface Computed {
  units: number;
  grossPotentialRent: number;
  vacancyLoss: number;
  egi: number;
  totalOpEx: number;
  noi: number;
  loanAmount: number;
  ltvComputed: number;
  annualDebtService: number;
  dscr: number;
  expenseRatio: number;
  assetValue: number;
  equityCreated: number;
}

interface Props {
  projectAddress?: string;
  inputs: ApartmentInputs;
  computed: Computed;
}

export function ApartmentDashboardPdfDocument({ projectAddress, inputs, computed }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={apartmentPdfStyles.page}>
        <ApartmentPdfHeader title="Apartment Dashboard" address={projectAddress} />

        <View style={apartmentPdfStyles.twoCol}>
          <View style={apartmentPdfStyles.col}>
            <Text style={apartmentPdfStyles.sectionTitle}>Income Summary</Text>
            <PdfRow label="Number of Units" value={String(computed.units)} />
            <PdfRow label="Gross Potential Rent (Annual)" value={fmt(computed.grossPotentialRent)} />
            <PdfRow label={`Vacancy Loss (${fmtPct(inputs.vacancy_rate)})`} value={`(${fmt(computed.vacancyLoss)})`} negative />
            <PdfRow label="Effective Gross Income" value={fmt(computed.egi)} bold />
            <PdfRow label="Total Operating Expenses" value={`(${fmt(computed.totalOpEx)})`} negative />
            <PdfRow label="Net Operating Income (NOI)" value={fmt(computed.noi)} bold />
          </View>

          <View style={apartmentPdfStyles.col}>
            <Text style={apartmentPdfStyles.sectionTitle}>Loan Summary</Text>
            <PdfRow label="Purchase Price" value={fmt(inputs.purchase_price)} />
            <PdfRow label="Loan-to-Value (LTV)" value={computed.ltvComputed > 0 ? fmtPct(computed.ltvComputed, 2) : fmtPct(inputs.ltv)} />
            <PdfRow label="Loan Amount" value={fmt(computed.loanAmount)} />
            <PdfRow label="Interest Rate" value={fmtPct(inputs.interest_rate, 2)} />
            <PdfRow label="Amortization Period" value={`${inputs.amortization_years} years`} />
            <PdfRow label="Annual Debt Service" value={`(${fmt(computed.annualDebtService)})`} negative />
            <PdfRow label="DSCR" value={`${computed.dscr.toFixed(2)}x`} bold />
          </View>
        </View>

        <View style={[apartmentPdfStyles.twoCol, { marginTop: 12 }]}>
          <View style={apartmentPdfStyles.col}>
            <Text style={apartmentPdfStyles.sectionTitle}>Property Assumptions</Text>
            <PdfRow label="Number of Units" value={String(computed.units)} />
            <PdfRow label="Market Rate Units" value={`${inputs.market_units} x ${fmt(inputs.market_rent)}`} />
            <PdfRow label="Affordable Rate Units" value={`${inputs.affordable_units} x ${fmt(inputs.affordable_rent)}`} />
            <PdfRow label="Vacancy Rate" value={fmtPct(inputs.vacancy_rate)} />
            <PdfRow label="Operating Expense Ratio" value={fmtPct(computed.expenseRatio)} />
            <PdfRow label="Target Cap Rate" value={inputs.target_cap_rate > 0 ? fmtPct(inputs.target_cap_rate, 2) : '—'} />
          </View>

          <View style={apartmentPdfStyles.col}>
            <Text style={apartmentPdfStyles.sectionTitle}>Asset Valuation</Text>
            <PdfRow label="Net Operating Income (NOI)" value={fmt(computed.noi)} bold />
            <PdfRow label="Cap Rate" value={inputs.target_cap_rate > 0 ? fmtPct(inputs.target_cap_rate, 2) : '—'} />
            <PdfRow label="Asset Value (NOI / Cap Rate)" value={computed.assetValue > 0 ? fmt(computed.assetValue) : '—'} bold />
            <PdfRow label="Loan Amount" value={`(${fmt(computed.loanAmount)})`} negative />
            <PdfRow label="Equity Created" value={computed.assetValue > 0 ? fmt(computed.equityCreated) : '—'} bold />
          </View>
        </View>

        <ApartmentPdfFooter />
      </Page>
    </Document>
  );
}
