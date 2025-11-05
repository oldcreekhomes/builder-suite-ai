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
  tableRowNoBorder: {
    flexDirection: 'row',
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
  totalRow: {
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
  },
  column: {
    width: '50%',
    paddingRight: 20,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    marginTop: 20,
  },
  balanceCheckRow: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 8,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#000',
    fontWeight: 'bold',
    fontSize: 11,
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

interface BalanceSheetPdfDocumentProps {
  projectAddress?: string;
  asOfDate: string;
  assets: {
    current: AccountBalance[];
    fixed: AccountBalance[];
  };
  liabilities: {
    current: AccountBalance[];
    longTerm: AccountBalance[];
  };
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export const BalanceSheetPdfDocument: React.FC<BalanceSheetPdfDocumentProps> = ({
  projectAddress,
  asOfDate,
  assets,
  liabilities,
  equity,
  totalAssets,
  totalLiabilities,
  totalEquity,
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
          <Text style={styles.title}>Balance Sheet</Text>
          {projectAddress && <Text style={styles.subtitle}>{projectAddress}</Text>}
        </View>

        <View style={styles.twoColumnLayout}>
          {/* Left Column - Assets */}
          <View style={styles.column}>
            <Text style={styles.sectionHeader}>ASSETS</Text>
            
            {/* Current Assets */}
            {assets.current.length > 0 && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>
                  Current Assets
                </Text>
                <View style={styles.table}>
                  {assets.current.map((account) => (
                    <View key={account.id} style={styles.tableRow}>
                      <Text style={styles.accountCode}>{account.code}</Text>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.amount}>{formatCurrency(account.balance)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Fixed Assets */}
            {assets.fixed.length > 0 && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>
                  Fixed Assets
                </Text>
                <View style={styles.table}>
                  {assets.fixed.map((account) => (
                    <View key={account.id} style={styles.tableRow}>
                      <Text style={styles.accountCode}>{account.code}</Text>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.amount}>{formatCurrency(account.balance)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Total Assets */}
            <View style={styles.subtotalRow}>
              <Text style={{ width: '75%', fontSize: 10 }}>Total Assets</Text>
              <Text style={{ width: '25%', textAlign: 'right', fontSize: 10 }}>
                {formatCurrency(totalAssets)}
              </Text>
            </View>
          </View>

          {/* Right Column - Liabilities & Equity */}
          <View style={styles.column}>
            <Text style={styles.sectionHeader}>LIABILITIES & EQUITY</Text>
            
            {/* Current Liabilities */}
            {liabilities.current.length > 0 && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>
                  Current Liabilities
                </Text>
                <View style={styles.table}>
                  {liabilities.current.map((account) => (
                    <View key={account.id} style={styles.tableRow}>
                      <Text style={styles.accountCode}>{account.code}</Text>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.amount}>{formatCurrency(account.balance)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Long-term Liabilities */}
            {liabilities.longTerm.length > 0 && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>
                  Long-term Liabilities
                </Text>
                <View style={styles.table}>
                  {liabilities.longTerm.map((account) => (
                    <View key={account.id} style={styles.tableRow}>
                      <Text style={styles.accountCode}>{account.code}</Text>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.amount}>{formatCurrency(account.balance)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Total Liabilities */}
            <View style={styles.subtotalRow}>
              <Text style={{ width: '75%', fontSize: 10 }}>Total Liabilities</Text>
              <Text style={{ width: '25%', textAlign: 'right', fontSize: 10 }}>
                {formatCurrency(totalLiabilities)}
              </Text>
            </View>

            {/* Equity */}
            {equity.length > 0 && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>
                  Equity
                </Text>
                <View style={styles.table}>
                  {equity.map((account) => (
                    <View key={account.id} style={styles.tableRow}>
                      <Text style={styles.accountCode}>{account.code}</Text>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.amount}>{formatCurrency(account.balance)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Total Equity */}
            <View style={styles.subtotalRow}>
              <Text style={{ width: '75%', fontSize: 10 }}>Total Equity</Text>
              <Text style={{ width: '25%', textAlign: 'right', fontSize: 10 }}>
                {formatCurrency(totalEquity)}
              </Text>
            </View>

            {/* Total Liabilities & Equity */}
            <View style={styles.totalRow}>
              <Text style={{ width: '75%' }}>Total Liabilities & Equity</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatCurrency(totalLiabilities + totalEquity)}
              </Text>
            </View>
          </View>
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
