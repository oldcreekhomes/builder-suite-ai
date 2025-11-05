import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  table: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    paddingTop: 4,
    paddingBottom: 4,
  },
  accountCode: {
    width: '15%',
    fontSize: 9,
  },
  accountName: {
    width: '60%',
    fontSize: 9,
  },
  amount: {
    width: '25%',
    textAlign: 'right',
    fontSize: 9,
  },
  subtotalRow: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#000',
    fontWeight: 'bold',
  },
  netIncomeRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#000',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    fontWeight: 'bold',
    fontSize: 10,
    backgroundColor: '#f5f5f5',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#666',
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingTop: 8,
  },
  footerLeft: {
    width: '33%',
    textAlign: 'left',
  },
  footerCenter: {
    width: '34%',
    textAlign: 'center',
  },
  footerRight: {
    width: '33%',
    textAlign: 'right',
  },
});

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  balance: number;
}

interface IncomeStatementPdfDocumentProps {
  projectAddress?: string;
  asOfDate: string;
  revenue: AccountBalance[];
  expenses: AccountBalance[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export const IncomeStatementPdfDocument: React.FC<IncomeStatementPdfDocumentProps> = ({
  projectAddress,
  asOfDate,
  revenue,
  expenses,
  totalRevenue,
  totalExpenses,
  netIncome,
}) => {
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Income Statement</Text>
          {projectAddress && <Text style={styles.subtitle}>{projectAddress}</Text>}
        </View>

        {/* Revenue Section */}
        <Text style={styles.sectionHeader}>REVENUE</Text>
        <View style={styles.table}>
          {revenue.map((account) => (
            <View key={account.id} style={styles.tableRow}>
              <Text style={styles.accountCode}>{account.code}</Text>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.amount}>{formatCurrency(account.balance)}</Text>
            </View>
          ))}
        </View>
        
        {/* Total Revenue */}
        <View style={styles.subtotalRow}>
          <Text style={{ width: '75%', fontSize: 10 }}>Total Revenue</Text>
          <Text style={{ width: '25%', textAlign: 'right', fontSize: 10 }}>
            {formatCurrency(totalRevenue)}
          </Text>
        </View>

        {/* Expenses Section */}
        <Text style={styles.sectionHeader}>EXPENSES</Text>
        <View style={styles.table}>
          {expenses.map((account) => (
            <View key={account.id} style={styles.tableRow}>
              <Text style={styles.accountCode}>{account.code}</Text>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.amount}>{formatCurrency(account.balance)}</Text>
            </View>
          ))}
        </View>
        
        {/* Total Expenses */}
        <View style={styles.subtotalRow}>
          <Text style={{ width: '75%', fontSize: 10 }}>Total Expenses</Text>
          <Text style={{ width: '25%', textAlign: 'right', fontSize: 10 }}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>

        {/* Net Income */}
        <View style={styles.netIncomeRow}>
          <Text style={{ width: '75%' }}>Net Income</Text>
          <Text style={{ width: '25%', textAlign: 'right' }}>
            {formatCurrency(netIncome)}
          </Text>
        </View>

        <View style={styles.footerContainer} fixed>
          <Text style={styles.footerLeft}>{new Date().toLocaleDateString()}</Text>
          <Text style={styles.footerCenter}>{new Date().toLocaleTimeString()}</Text>
          <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};
