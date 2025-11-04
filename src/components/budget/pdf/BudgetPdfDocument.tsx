import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';


const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  header: {
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
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  groupHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: 8,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#000',
    fontWeight: 'bold',
  },
  col1: { width: '8%' },
  col2: { width: '22%' },
  col3: { width: '8%', textAlign: 'right' },
  col4: { width: '8%', textAlign: 'right' },
  col5: { width: '12%', textAlign: 'right' },
  col6: { width: '12%', textAlign: 'right' },
  col7: { width: '15%', textAlign: 'center' },
  col8: { width: '15%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 10,
  },
});

interface BudgetPdfDocumentProps {
  projectAddress?: string;
  groupedBudgetItems: Record<string, any[]>;
  visibleColumns: {
    quantity: boolean;
    unitPrice: boolean;
    source: boolean;
    historical: boolean;
    variance: boolean;
  };
  selectedHistoricalProject: any;
  showVarianceAsPercentage: boolean;
  historicalActualCosts: any;
  subcategoryTotals: Record<string, number>;
  itemTotalsMap: Record<string, number>;
}

export function BudgetPdfDocument({
  projectAddress,
  groupedBudgetItems,
  visibleColumns,
  selectedHistoricalProject,
  showVarianceAsPercentage,
  historicalActualCosts,
  subcategoryTotals,
  itemTotalsMap,
}: BudgetPdfDocumentProps) {
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getHistoricalCost = (item: any): number => {
    const costCode = item.cost_codes as any;
    if (!costCode?.code || !historicalActualCosts?.mapByCode) return 0;
    return historicalActualCosts.mapByCode[costCode.code] || 0;
  };

  const getSourceLabel = (item: any): string => {
    if (item.budget_source === 'vendor-bid' && item.selected_bid?.companies?.name) {
      return item.selected_bid.companies.name;
    }
    if (item.budget_source === 'historical') return 'Historical';
    if (item.budget_source === 'settings') return 'Settings';
    if (item.budget_source === 'manual') return 'Manual';
    return '-';
  };

  const calculateVariance = (budgetedAmount: number, historicalAmount: number): number => {
    if (historicalAmount === 0) return 0;
    if (showVarianceAsPercentage) {
      return ((budgetedAmount - historicalAmount) / historicalAmount) * 100;
    }
    return budgetedAmount - historicalAmount;
  };

  const calculateGroupTotal = (items: any[]): number => {
    return items.reduce((sum, item) => sum + (itemTotalsMap[item.id] || 0), 0);
  };

  const calculateGroupHistorical = (items: any[]): number => {
    return items.reduce((sum, item) => sum + getHistoricalCost(item), 0);
  };

  const calculateProjectTotal = (): number => {
    return Object.values(groupedBudgetItems).reduce(
      (sum, items) => sum + calculateGroupTotal(items),
      0
    );
  };

  const calculateProjectHistorical = (): number => {
    return Object.values(groupedBudgetItems).reduce(
      (sum, items) => sum + calculateGroupHistorical(items),
      0
    );
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page} orientation="landscape">
        <View style={styles.header}>
          <Text style={styles.title}>Project Budget</Text>
          {projectAddress && <Text style={styles.subtitle}>{projectAddress}</Text>}
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Code</Text>
            <Text style={styles.col2}>Description</Text>
            {visibleColumns.quantity && <Text style={styles.col3}>Quantity</Text>}
            {visibleColumns.unitPrice && <Text style={styles.col4}>Unit Price</Text>}
            <Text style={styles.col5}>Budget Total</Text>
            {visibleColumns.historical && <Text style={styles.col6}>Historical</Text>}
            {visibleColumns.source && <Text style={styles.col7}>Source</Text>}
            {visibleColumns.variance && <Text style={styles.col8}>Variance</Text>}
          </View>

          {Object.entries(groupedBudgetItems).map(([group, items]) => (
            <View key={group} wrap={false}>
              <View style={styles.groupHeader}>
                <Text style={styles.col1}></Text>
                <Text style={{ ...styles.col2, fontWeight: 'bold' }}>{group}</Text>
                <Text style={styles.col3}></Text>
                <Text style={styles.col4}></Text>
                <Text style={{ ...styles.col5, fontWeight: 'bold' }}>
                  {formatCurrency(calculateGroupTotal(items))}
                </Text>
                {visibleColumns.historical && (
                  <Text style={{ ...styles.col6, fontWeight: 'bold' }}>
                    {formatCurrency(calculateGroupHistorical(items))}
                  </Text>
                )}
                {visibleColumns.source && <Text style={styles.col7}></Text>}
                {visibleColumns.variance && <Text style={styles.col8}></Text>}
              </View>

              {items.map((item) => {
                const costCode = item.cost_codes as any;
                const total = itemTotalsMap[item.id] || 0;
                const historical = getHistoricalCost(item);
                const variance = calculateVariance(total, historical);

                return (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={styles.col1}>{costCode?.code || '-'}</Text>
                    <Text style={styles.col2}>{item.description || '-'}</Text>
                    {visibleColumns.quantity && (
                      <Text style={styles.col3}>{formatNumber(item.quantity)}</Text>
                    )}
                    {visibleColumns.unitPrice && (
                      <Text style={styles.col4}>{formatCurrency(item.unit_price)}</Text>
                    )}
                    <Text style={styles.col5}>{formatCurrency(total)}</Text>
                    {visibleColumns.historical && (
                      <Text style={styles.col6}>{formatCurrency(historical)}</Text>
                    )}
                    {visibleColumns.source && (
                      <Text style={styles.col7}>{getSourceLabel(item)}</Text>
                    )}
                    {visibleColumns.variance && (
                      <Text style={styles.col8}>
                        {showVarianceAsPercentage
                          ? `${variance.toFixed(1)}%`
                          : formatCurrency(variance)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.col1}></Text>
            <Text style={{ ...styles.col2, fontWeight: 'bold' }}>Project Total</Text>
            <Text style={styles.col3}></Text>
            <Text style={styles.col4}></Text>
            <Text style={{ ...styles.col5, fontWeight: 'bold' }}>
              {formatCurrency(calculateProjectTotal())}
            </Text>
            {visibleColumns.historical && (
              <Text style={{ ...styles.col6, fontWeight: 'bold' }}>
                {formatCurrency(calculateProjectHistorical())}
              </Text>
            )}
            {visibleColumns.source && <Text style={styles.col7}></Text>}
            {visibleColumns.variance && <Text style={styles.col8}></Text>}
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber }) => `${pageNumber}`}
          fixed
        />
      </Page>
    </Document>
  );
}
