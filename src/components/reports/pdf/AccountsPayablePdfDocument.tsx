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
  asOfDate: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#000',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 'bold',
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
  groupHeader: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 4,
    marginTop: 8,
    fontWeight: 'bold',
    fontSize: 10,
    backgroundColor: '#f5f5f5',
  },
  subtotalRow: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 6,
    marginTop: 2,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#000',
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9',
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
  colDate: {
    width: '12%',
    fontSize: 9,
  },
  colNum: {
    width: '18%',
    fontSize: 9,
  },
  colName: {
    width: '32%',
    fontSize: 9,
  },
  colDueDate: {
    width: '12%',
    fontSize: 9,
  },
  colAging: {
    width: '8%',
    textAlign: 'right',
    fontSize: 9,
  },
  colBalance: {
    width: '18%',
    textAlign: 'right',
    fontSize: 9,
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

export interface APAgingBill {
  id: string;
  billDate: string;
  referenceNumber: string | null;
  vendorName: string;
  dueDate: string | null;
  aging: number;
  openBalance: number;
}

interface AccountsPayablePdfDocumentProps {
  projectAddress?: string;
  lotName?: string;
  asOfDate: string;
  agingBuckets: {
    '1-30': APAgingBill[];
    '31-60': APAgingBill[];
    '61-90': APAgingBill[];
    '>90': APAgingBill[];
  };
  grandTotal: number;
}

export const AccountsPayablePdfDocument: React.FC<AccountsPayablePdfDocumentProps> = ({
  projectAddress,
  lotName,
  asOfDate,
  agingBuckets,
  grandTotal,
}) => {
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  const formatAsOfDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${month}-${day}-${year}`;
  };

  const calculateBucketTotal = (bills: APAgingBill[]): number => {
    return bills.reduce((sum, bill) => sum + bill.openBalance, 0);
  };

  const bucketLabels: Record<string, string> = {
    '1-30': '1 - 30 Days',
    '31-60': '31 - 60 Days',
    '61-90': '61 - 90 Days',
    '>90': 'Over 90 Days',
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>A/P Aging Detail</Text>
          {projectAddress && <Text style={styles.subtitle}>{projectAddress}</Text>}
          {lotName && <Text style={styles.subtitle}>{lotName}</Text>}
          <Text style={styles.asOfDate}>As of {formatAsOfDate(asOfDate)}</Text>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDate}>Date</Text>
          <Text style={styles.colNum}>Num</Text>
          <Text style={styles.colName}>Name</Text>
          <Text style={styles.colDueDate}>Due Date</Text>
          <Text style={styles.colAging}>Aging</Text>
          <Text style={styles.colBalance}>Open Balance</Text>
        </View>

        {/* Aging Buckets */}
        <View style={styles.table}>
          {(Object.entries(agingBuckets) as [keyof typeof agingBuckets, APAgingBill[]][]).map(([bucketKey, bills]) => {
            if (bills.length === 0) return null;
            const bucketTotal = calculateBucketTotal(bills);

            return (
              <View key={bucketKey}>
                {/* Bucket Header */}
                <View style={styles.groupHeader}>
                  <Text style={{ width: '100%' }}>{bucketLabels[bucketKey]}</Text>
                </View>

                {/* Bill Rows */}
                {bills.map((bill, index) => (
                  <View key={`${bill.id}-${index}`} style={styles.tableRow}>
                    <Text style={styles.colDate}>{formatDate(bill.billDate)}</Text>
                    <Text style={styles.colNum}>{bill.referenceNumber || '-'}</Text>
                    <Text style={styles.colName}>{bill.vendorName}</Text>
                    <Text style={styles.colDueDate}>{formatDate(bill.dueDate)}</Text>
                    <Text style={styles.colAging}>{bill.aging}</Text>
                    <Text style={styles.colBalance}>{formatCurrency(bill.openBalance)}</Text>
                  </View>
                ))}

                {/* Bucket Subtotal */}
                <View style={styles.subtotalRow}>
                  <Text style={{ width: '82%', fontSize: 9 }}>Subtotal - {bucketLabels[bucketKey]}</Text>
                  <Text style={{ width: '18%', textAlign: 'right', fontSize: 9 }}>
                    {formatCurrency(bucketTotal)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Grand Total */}
        <View style={styles.totalRow}>
          <Text style={{ width: '82%' }}>Total Outstanding</Text>
          <Text style={{ width: '18%', textAlign: 'right' }}>
            {formatCurrency(grandTotal)}
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
