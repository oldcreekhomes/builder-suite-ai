import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ProjectVendorData } from '@/hooks/useVendorPaymentsReport';

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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    marginBottom: 2,
  },
  asOfDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  projectHeader: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  projectTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  vendorHeader: {
    backgroundColor: '#fafafa',
    padding: 6,
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  vendorName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    paddingTop: 3,
    paddingBottom: 3,
  },
  vendorTotalRow: {
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#999',
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9',
  },
  projectTotalRow: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 6,
    marginTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#666',
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
  },
  grandTotalRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 10,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#000',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    fontWeight: 'bold',
    fontSize: 11,
  },
  colType: {
    width: '12%',
    fontSize: 9,
  },
  colDate: {
    width: '14%',
    fontSize: 9,
  },
  colNum: {
    width: '14%',
    fontSize: 9,
  },
  colMemo: {
    width: '40%',
    fontSize: 9,
  },
  colAmount: {
    width: '20%',
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

interface VendorPaymentsPdfDocumentProps {
  companyName: string;
  startDate: string;
  endDate: string;
  projects: ProjectVendorData[];
  grandTotal: number;
}

export const VendorPaymentsPdfDocument: React.FC<VendorPaymentsPdfDocumentProps> = ({
  companyName,
  startDate,
  endDate,
  projects,
  grandTotal,
}) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  const formatDateRange = (start: string, end: string): string => {
    const formatSingle = (dateString: string): string => {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };
    return `${formatSingle(start)} - ${formatSingle(end)}`;
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Vendor Payments Report (1099-Style)</Text>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.asOfDate}>{formatDateRange(startDate, endDate)}</Text>
        </View>

        {/* Projects */}
        {projects.map((project) => (
          <View key={project.id} wrap={false}>
            {/* Project Header */}
            <View style={styles.projectHeader}>
              <Text style={styles.projectTitle}>PROJECT: {project.address}</Text>
            </View>

            {/* Vendors in Project */}
            {project.vendors.map((vendor) => (
              <View key={vendor.id}>
                {/* Vendor Header */}
                <View style={styles.vendorHeader}>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                </View>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={styles.colType}>Type</Text>
                  <Text style={styles.colDate}>Date</Text>
                  <Text style={styles.colNum}>Num</Text>
                  <Text style={styles.colMemo}>Memo</Text>
                  <Text style={styles.colAmount}>Amount</Text>
                </View>

                {/* Transactions */}
                {vendor.transactions.map((tx, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.colType}>{tx.type}</Text>
                    <Text style={styles.colDate}>{formatDate(tx.date)}</Text>
                    <Text style={styles.colNum}>{tx.num || ''}</Text>
                    <Text style={styles.colMemo}>{tx.memo || ''}</Text>
                    <Text style={styles.colAmount}>{formatCurrency(tx.amount)}</Text>
                  </View>
                ))}

                {/* Vendor Total */}
                <View style={styles.vendorTotalRow}>
                  <Text style={{ width: '80%', fontSize: 9 }}>Total - {vendor.name}</Text>
                  <Text style={{ width: '20%', textAlign: 'right', fontSize: 9 }}>
                    {formatCurrency(vendor.total)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Project Total */}
            <View style={styles.projectTotalRow}>
              <Text style={{ width: '80%', fontSize: 10 }}>PROJECT TOTAL: {project.address}</Text>
              <Text style={{ width: '20%', textAlign: 'right', fontSize: 10 }}>
                {formatCurrency(project.projectTotal)}
              </Text>
            </View>
          </View>
        ))}

        {/* Grand Total */}
        <View style={styles.grandTotalRow}>
          <Text style={{ width: '80%' }}>GRAND TOTAL (All Builder Suite Projects)</Text>
          <Text style={{ width: '20%', textAlign: 'right' }}>
            {formatCurrency(grandTotal)}
          </Text>
        </View>

        {/* Footer */}
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
