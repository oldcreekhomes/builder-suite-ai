import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { apartmentPdfStyles, ApartmentPdfHeader, ApartmentPdfFooter } from './ApartmentPdfLayout';
import { fmt, fmtPct } from '@/hooks/useApartmentInputs';

const localStyles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
  },
  summaryCell: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  th: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  td: {
    fontSize: 8,
  },
  colYear: { width: '6%' },
  colNum: { width: '11.75%', textAlign: 'right' },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginBottom: 2,
  },
  bodyRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    borderBottomWidth: 0.25,
    borderBottomColor: '#eee',
  },
});

interface AmortRow {
  year: number;
  beginningBalance: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  endingBalance: number;
  monthlyPayment: number;
  monthlyPrincipal: number;
  monthlyInterest: number;
}

interface Props {
  projectAddress?: string;
  loanAmount: number;
  interestRate: number;
  amortizationYears: number;
  loanTermYears: number;
  monthlyPayment: number;
  rows: AmortRow[];
}

export function ApartmentAmortizationPdfDocument({
  projectAddress,
  loanAmount,
  interestRate,
  amortizationYears,
  loanTermYears,
  monthlyPayment,
  rows,
}: Props) {
  return (
    <Document>
      <Page size="LETTER" style={apartmentPdfStyles.page} orientation="landscape">
        <ApartmentPdfHeader title="Amortization Schedule" address={projectAddress} />

        <View style={localStyles.summaryGrid}>
          <View style={localStyles.summaryCell}>
            <Text style={localStyles.summaryLabel}>Loan Amount</Text>
            <Text style={localStyles.summaryValue}>{fmt(loanAmount)}</Text>
          </View>
          <View style={localStyles.summaryCell}>
            <Text style={localStyles.summaryLabel}>Interest Rate</Text>
            <Text style={localStyles.summaryValue}>{fmtPct(interestRate, 2)}</Text>
          </View>
          <View style={localStyles.summaryCell}>
            <Text style={localStyles.summaryLabel}>Amortization</Text>
            <Text style={localStyles.summaryValue}>{amortizationYears} years</Text>
          </View>
          <View style={localStyles.summaryCell}>
            <Text style={localStyles.summaryLabel}>Loan Term</Text>
            <Text style={localStyles.summaryValue}>{loanTermYears} years</Text>
          </View>
          <View style={localStyles.summaryCell}>
            <Text style={localStyles.summaryLabel}>Monthly Payment</Text>
            <Text style={localStyles.summaryValue}>{fmt(monthlyPayment)}</Text>
          </View>
        </View>

        <View style={localStyles.headerRow} fixed>
          <Text style={[localStyles.colYear, localStyles.th]}>Year</Text>
          <Text style={[localStyles.colNum, localStyles.th]}>Beginning Balance</Text>
          <Text style={[localStyles.colNum, localStyles.th]}>Annual Payment</Text>
          <Text style={[localStyles.colNum, localStyles.th]}>Annual Principal</Text>
          <Text style={[localStyles.colNum, localStyles.th]}>Annual Interest</Text>
          <Text style={[localStyles.colNum, localStyles.th]}>Monthly Payment</Text>
          <Text style={[localStyles.colNum, localStyles.th]}>Monthly Principal</Text>
          <Text style={[localStyles.colNum, localStyles.th]}>Monthly Interest</Text>
          <Text style={[localStyles.colNum, localStyles.th]}>Ending Balance</Text>
        </View>

        {rows.map((r) => (
          <View key={r.year} style={localStyles.bodyRow} wrap={false}>
            <Text style={[localStyles.colYear, localStyles.td]}>{r.year}</Text>
            <Text style={[localStyles.colNum, localStyles.td]}>{fmt(r.beginningBalance)}</Text>
            <Text style={[localStyles.colNum, localStyles.td]}>{fmt(r.totalPayment)}</Text>
            <Text style={[localStyles.colNum, localStyles.td]}>{fmt(r.totalPrincipal)}</Text>
            <Text style={[localStyles.colNum, localStyles.td]}>{fmt(r.totalInterest)}</Text>
            <Text style={[localStyles.colNum, localStyles.td]}>{fmt(r.monthlyPayment)}</Text>
            <Text style={[localStyles.colNum, localStyles.td]}>{fmt(r.monthlyPrincipal)}</Text>
            <Text style={[localStyles.colNum, localStyles.td]}>{fmt(r.monthlyInterest)}</Text>
            <Text style={[localStyles.colNum, localStyles.td]}>{fmt(r.endingBalance)}</Text>
          </View>
        ))}

        <ApartmentPdfFooter />
      </Page>
    </Document>
  );
}
