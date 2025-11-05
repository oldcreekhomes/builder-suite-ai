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
  dateIndicator: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
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
  colCode: {
    width: '12%',
    fontSize: 9,
  },
  colName: {
    width: '38%',
    fontSize: 9,
  },
  colBudget: {
    width: '16%',
    textAlign: 'right',
    fontSize: 9,
  },
  colActual: {
    width: '16%',
    textAlign: 'right',
    fontSize: 9,
  },
  colVariance: {
    width: '18%',
    textAlign: 'right',
    fontSize: 9,
  },
  positiveVariance: {
    color: '#16a34a',
  },
  negativeVariance: {
    color: '#dc2626',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
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

interface JobCostRow {
  costCode: string;
  costCodeName: string;
  budget: number;
  actual: number;
  variance: number;
}

interface JobCostsPdfDocumentProps {
  projectAddress?: string;
  asOfDate: string;
  groupedCostCodes: Record<string, JobCostRow[]>;
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
}

export const JobCostsPdfDocument: React.FC<JobCostsPdfDocumentProps> = ({
  projectAddress,
  asOfDate,
  groupedCostCodes,
  totalBudget,
  totalActual,
  totalVariance,
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

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const calculateGroupTotal = (rows: JobCostRow[], field: 'budget' | 'actual' | 'variance') => {
    return rows.reduce((sum, row) => sum + (row[field] || 0), 0);
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Job Costs Report</Text>
          {projectAddress && <Text style={styles.subtitle}>{projectAddress}</Text>}
          <Text style={styles.dateIndicator}>As of {asOfDate}</Text>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.colCode}>Code</Text>
          <Text style={styles.colName}>Name</Text>
          <Text style={styles.colBudget}>Budget</Text>
          <Text style={styles.colActual}>Actual</Text>
          <Text style={styles.colVariance}>Variance</Text>
        </View>

        {/* Grouped Cost Codes */}
        <View style={styles.table}>
          {Object.entries(groupedCostCodes).map(([groupName, rows]) => {
            const groupBudget = calculateGroupTotal(rows, 'budget');
            const groupActual = calculateGroupTotal(rows, 'actual');
            const groupVariance = calculateGroupTotal(rows, 'variance');

            return (
              <View key={groupName}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <Text style={{ width: '100%' }}>{groupName}</Text>
                </View>

                {/* Cost Code Rows */}
                {rows.map((row, index) => (
                  <View key={`${row.costCode}-${index}`} style={styles.tableRow}>
                    <Text style={styles.colCode}>{row.costCode}</Text>
                    <Text style={styles.colName}>{row.costCodeName}</Text>
                    <Text style={styles.colBudget}>{formatCurrency(row.budget)}</Text>
                    <Text style={styles.colActual}>{formatCurrency(row.actual)}</Text>
                    <Text style={[
                      styles.colVariance,
                      row.variance > 0 ? styles.positiveVariance : styles.negativeVariance
                    ]}>
                      {formatCurrency(row.variance)}
                    </Text>
                  </View>
                ))}

                {/* Group Subtotal */}
                <View style={styles.subtotalRow}>
                  <Text style={{ width: '12%' }}></Text>
                  <Text style={{ width: '38%', fontSize: 9 }}>Subtotal - {groupName}</Text>
                  <Text style={{ width: '16%', textAlign: 'right', fontSize: 9 }}>
                    {formatCurrency(groupBudget)}
                  </Text>
                  <Text style={{ width: '16%', textAlign: 'right', fontSize: 9 }}>
                    {formatCurrency(groupActual)}
                  </Text>
                  <Text style={[
                    { width: '18%', textAlign: 'right', fontSize: 9 },
                    groupVariance > 0 ? styles.positiveVariance : styles.negativeVariance
                  ]}>
                    {formatCurrency(groupVariance)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Project Total */}
        <View style={styles.totalRow}>
          <Text style={{ width: '50%' }}>Project Total</Text>
          <Text style={{ width: '16%', textAlign: 'right' }}>
            {formatCurrency(totalBudget)}
          </Text>
          <Text style={{ width: '16%', textAlign: 'right' }}>
            {formatCurrency(totalActual)}
          </Text>
          <Text style={[
            { width: '18%', textAlign: 'right' },
            totalVariance > 0 ? styles.positiveVariance : styles.negativeVariance
          ]}>
            {formatCurrency(totalVariance)}
          </Text>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerLeft}>{currentDate}</Text>
          <Text style={styles.footerCenter}>Generated on {timestamp}</Text>
          <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};
