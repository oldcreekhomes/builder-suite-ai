import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { apartmentPdfStyles, ApartmentPdfHeader, ApartmentPdfFooter } from './ApartmentPdfLayout';
import type { ApartmentInputs } from '@/hooks/useApartmentInputs';
import { fmt, fmtPct } from '@/hooks/useApartmentInputs';

const localStyles = StyleSheet.create({
  colLabel: { width: '52%' },
  colAnnual: { width: '16%', textAlign: 'right' },
  colMonthly: { width: '16%', textAlign: 'right' },
  colPct: { width: '16%', textAlign: 'right' },
  sectionRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 3,
    fontWeight: 'bold',
  },
  bodyRow: {
    flexDirection: 'row',
    paddingVertical: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    borderTopWidth: 0.5,
    borderTopColor: '#000',
  },
  negative: { color: '#dc2626' },
});

interface Computed {
  grossPotentialRent: number;
  vacancyLoss: number;
  egi: number;
  taxes: number;
  managementFee: number;
  reserves: number;
  totalOpEx: number;
  noi: number;
  annualDebtService: number;
  cashFlowAfterDebt: number;
}

interface Props {
  projectAddress?: string;
  inputs: ApartmentInputs;
  computed: Computed;
  isVisible: (field: string) => boolean;
}

export function ApartmentIncomeStatementPdfDocument({ projectAddress, inputs, computed, isVisible }: Props) {
  const egi = computed.egi || 1;
  const monthly = (v: number) => fmt(v / 12);
  const pctEgi = (v: number) => fmtPct((v / egi) * 100);

  const expenseRows: Array<{ field: string; label: string; value: number }> = [
    { field: 'taxes', label: 'Real Estate Taxes', value: computed.taxes },
    { field: 'insurance', label: 'Insurance', value: inputs.insurance },
    { field: 'utilities', label: 'Utilities', value: inputs.utilities },
    { field: 'repairs_maintenance', label: 'Repairs & Maintenance', value: inputs.repairs_maintenance },
    { field: 'landscaping', label: 'Landscaping', value: inputs.landscaping },
    { field: 'snow_removal', label: 'Snow Removal', value: inputs.snow_removal },
    { field: 'trash_removal', label: 'Trash Removal', value: inputs.trash_removal },
    { field: 'pest_control', label: 'Pest Control', value: inputs.pest_control },
    { field: 'management_fee_percent', label: `Management (${fmtPct(inputs.management_fee_percent)})`, value: computed.managementFee },
    { field: 'general_admin', label: 'General & Administrative', value: inputs.general_admin },
    { field: 'marketing', label: 'Marketing', value: inputs.marketing },
    { field: 'security', label: 'Security', value: inputs.security },
    { field: 'professional_fees', label: 'Professional Fees', value: inputs.professional_fees },
    { field: 'capex_reserve', label: 'CapEx Reserve', value: inputs.capex_reserve },
    { field: 'other_misc', label: 'Other / Miscellaneous', value: inputs.other_misc },
    { field: 'reserves_per_unit', label: 'Reserves', value: computed.reserves },
  ].filter((r) => isVisible(r.field));

  return (
    <Document>
      <Page size="LETTER" style={apartmentPdfStyles.page}>
        <ApartmentPdfHeader title="Income Statement" address={projectAddress} />

        <View style={apartmentPdfStyles.tableHeader}>
          <Text style={localStyles.colLabel}>Line Item</Text>
          <Text style={localStyles.colAnnual}>Annual</Text>
          <Text style={localStyles.colMonthly}>Monthly</Text>
          <Text style={localStyles.colPct}>% of EGI</Text>
        </View>

        <View style={localStyles.sectionRow}><Text>Revenue</Text></View>
        <View style={localStyles.bodyRow}>
          <Text style={localStyles.colLabel}>Gross Potential Rent</Text>
          <Text style={localStyles.colAnnual}>{fmt(computed.grossPotentialRent)}</Text>
          <Text style={localStyles.colMonthly}>{monthly(computed.grossPotentialRent)}</Text>
          <Text style={localStyles.colPct}>{pctEgi(computed.grossPotentialRent)}</Text>
        </View>
        <View style={localStyles.bodyRow}>
          <Text style={[localStyles.colLabel, localStyles.negative]}>{`Less: Vacancy (${fmtPct(inputs.vacancy_rate)})`}</Text>
          <Text style={[localStyles.colAnnual, localStyles.negative]}>{`(${fmt(computed.vacancyLoss)})`}</Text>
          <Text style={[localStyles.colMonthly, localStyles.negative]}>{`(${monthly(computed.vacancyLoss)})`}</Text>
          <Text style={[localStyles.colPct, localStyles.negative]}>{`-${pctEgi(computed.vacancyLoss)}`}</Text>
        </View>
        <View style={localStyles.totalRow}>
          <Text style={localStyles.colLabel}>Effective Gross Income</Text>
          <Text style={localStyles.colAnnual}>{fmt(computed.egi)}</Text>
          <Text style={localStyles.colMonthly}>{monthly(computed.egi)}</Text>
          <Text style={localStyles.colPct}>100.0%</Text>
        </View>

        <View style={localStyles.sectionRow}><Text>Operating Expenses</Text></View>
        {expenseRows.map((r) => (
          <View key={r.field} style={localStyles.bodyRow}>
            <Text style={localStyles.colLabel}>{r.label}</Text>
            <Text style={localStyles.colAnnual}>{fmt(r.value)}</Text>
            <Text style={localStyles.colMonthly}>{monthly(r.value)}</Text>
            <Text style={localStyles.colPct}>{pctEgi(r.value)}</Text>
          </View>
        ))}
        <View style={localStyles.totalRow}>
          <Text style={localStyles.colLabel}>Total Operating Expenses</Text>
          <Text style={localStyles.colAnnual}>{fmt(computed.totalOpEx)}</Text>
          <Text style={localStyles.colMonthly}>{monthly(computed.totalOpEx)}</Text>
          <Text style={localStyles.colPct}>{pctEgi(computed.totalOpEx)}</Text>
        </View>

        <View style={[localStyles.totalRow, { marginTop: 6 }]}>
          <Text style={localStyles.colLabel}>Net Operating Income (NOI)</Text>
          <Text style={localStyles.colAnnual}>{fmt(computed.noi)}</Text>
          <Text style={localStyles.colMonthly}>{monthly(computed.noi)}</Text>
          <Text style={localStyles.colPct}>{pctEgi(computed.noi)}</Text>
        </View>

        <View style={localStyles.sectionRow}><Text>Debt Service</Text></View>
        <View style={localStyles.bodyRow}>
          <Text style={[localStyles.colLabel, localStyles.negative]}>Annual Debt Service</Text>
          <Text style={[localStyles.colAnnual, localStyles.negative]}>{`(${fmt(computed.annualDebtService)})`}</Text>
          <Text style={[localStyles.colMonthly, localStyles.negative]}>{`(${monthly(computed.annualDebtService)})`}</Text>
          <Text style={[localStyles.colPct, localStyles.negative]}>{pctEgi(computed.annualDebtService)}</Text>
        </View>

        <View style={[localStyles.totalRow, { marginTop: 6 }]}>
          <Text style={localStyles.colLabel}>Cash Flow After Debt Service</Text>
          <Text style={localStyles.colAnnual}>{fmt(computed.cashFlowAfterDebt)}</Text>
          <Text style={localStyles.colMonthly}>{monthly(computed.cashFlowAfterDebt)}</Text>
          <Text style={localStyles.colPct}>{pctEgi(computed.cashFlowAfterDebt)}</Text>
        </View>

        <ApartmentPdfFooter />
      </Page>
    </Document>
  );
}
