import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatDateSafe } from '@/utils/dateOnly';
import { getTransactionTypeLabel } from '@/lib/transactionTypeLabel';

export interface AccountDetailPdfRow {
  source_type: string;
  date: string;
  reference: string | null;
  accountDisplay: string | null;
  description: string | null;
  memo?: string | null;
  debit: number;
  credit: number;
  reconciled?: boolean;
  status?: 'pending' | 'approved' | 'cleared';
}

interface Props {
  accountLabel: string;
  projectName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  rows: AccountDetailPdfRow[];
  balances: number[];
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  openingBalance?: number;
}

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 8 },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 9, color: '#555', textAlign: 'center', marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  meta: { fontSize: 9, color: '#333' },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 4,
    marginTop: 6,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: '#000',
    fontWeight: 'bold',
  },
  cType: { width: '9%', paddingHorizontal: 2 },
  cDate: { width: '8%', paddingHorizontal: 2 },
  cName: { width: '14%', paddingHorizontal: 2 },
  cAccount: { width: '17%', paddingHorizontal: 2 },
  cDesc: { width: '25%', paddingHorizontal: 2 },
  cAmt: { width: '10%', paddingHorizontal: 2, textAlign: 'right' },
  cBal: { width: '10%', paddingHorizontal: 2, textAlign: 'right' },
  cStatus: { width: '7%', paddingHorizontal: 2, textAlign: 'center' },
  negative: { color: '#b91c1c' },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666',
  },
});

const fmt = (n: number) => {
  const abs = Math.abs(n);
  const s = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(abs);
  return n < 0 ? `(${s})` : s;
};

function statusLabel(row: AccountDetailPdfRow): string {
  const s = row.status || (row.reconciled ? 'cleared' : 'approved');
  const isBillPayment = row.source_type === 'bill_payment' || row.source_type === 'consolidated_bill_payment';
  if (s === 'cleared') return 'Cleared';
  if (s === 'pending') return 'Pending';
  return isBillPayment ? 'Paid' : 'Approved';
}

export function AccountDetailPdfDocument({
  accountLabel,
  projectName,
  dateFrom,
  dateTo,
  rows,
  balances,
  accountType,
  openingBalance = 0,
}: Props) {
  const rangeText =
    dateFrom || dateTo
      ? `${dateFrom ? formatDateSafe(dateFrom.toISOString(), 'MM/dd/yyyy') : 'Beginning'} — ${dateTo ? formatDateSafe(dateTo.toISOString(), 'MM/dd/yyyy') : 'Current'}`
      : 'All Dates';

  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const endingBalance = balances.length > 0 ? balances[balances.length - 1] : openingBalance;

  const totalDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);
  const netChange =
    accountType === 'asset' || accountType === 'expense'
      ? totalDebit - totalCredit
      : totalCredit - totalDebit;

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{accountLabel}</Text>
        {projectName && <Text style={styles.subtitle}>{projectName}</Text>}
        <Text style={styles.subtitle}>Account Detail — {rangeText}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>Opening Balance: {fmt(openingBalance)}</Text>
          <Text style={styles.meta}>Net Change: {fmt(netChange)}</Text>
          <Text style={styles.meta}>Ending Balance: {fmt(endingBalance)}</Text>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={styles.cType}>Type</Text>
          <Text style={styles.cDate}>Date</Text>
          <Text style={styles.cName}>Name</Text>
          <Text style={styles.cAccount}>Account</Text>
          <Text style={styles.cDesc}>Description</Text>
          <Text style={styles.cAmt}>Amount</Text>
          <Text style={styles.cBal}>Balance</Text>
          <Text style={styles.cStatus}>Status</Text>
        </View>

        {rows.map((row, i) => {
          const amt =
            accountType === 'asset' || accountType === 'expense'
              ? row.debit - row.credit
              : row.credit - row.debit;
          const bal = balances[i] ?? 0;
          return (
            <View key={i} style={styles.row} wrap={false}>
              <Text style={styles.cType}>{getTransactionTypeLabel(row.source_type)}</Text>
              <Text style={styles.cDate}>{formatDateSafe(row.date, 'MM/dd/yyyy')}</Text>
              <Text style={styles.cName}>{row.reference || '-'}</Text>
              <Text style={styles.cAccount}>{row.accountDisplay || '-'}</Text>
              <Text style={styles.cDesc}>{row.description || row.memo || '-'}</Text>
              <Text style={[styles.cAmt, amt < 0 ? styles.negative : {}]}>{fmt(amt)}</Text>
              <Text style={[styles.cBal, bal < 0 ? styles.negative : {}]}>{fmt(bal)}</Text>
              <Text style={styles.cStatus}>{statusLabel(row)}</Text>
            </View>
          );
        })}

        <View style={styles.totalRow}>
          <Text style={styles.cType}>Total</Text>
          <Text style={styles.cDate}></Text>
          <Text style={styles.cName}></Text>
          <Text style={styles.cAccount}></Text>
          <Text style={styles.cDesc}></Text>
          <Text style={[styles.cAmt, netChange < 0 ? styles.negative : {}]}>{fmt(netChange)}</Text>
          <Text style={[styles.cBal, endingBalance < 0 ? styles.negative : {}]}>{fmt(endingBalance)}</Text>
          <Text style={styles.cStatus}></Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Generated {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
