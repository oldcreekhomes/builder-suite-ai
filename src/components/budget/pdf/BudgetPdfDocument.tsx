import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';


const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
    textAlign: 'center',
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
  col1: { width: '10%' }, // Code
  col2: { width: '30%' }, // Name
  col3: { width: '20%' }, // Source
  col4: { width: '20%', textAlign: 'right' }, // Budget Total
  col5: { width: '10%', textAlign: 'right' }, // Historical
  col6: { width: '10%', textAlign: 'right' }, // Variance
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
  },
  footerLeft: {
    textAlign: 'left',
  },
  footerCenter: {
    textAlign: 'center',
  },
  footerRight: {
    textAlign: 'right',
  },
});

interface BudgetPdfDocumentProps {
  projectAddress?: string;
  groupedBudgetItems: Record<string, any[]>;
  visibleColumns: {
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


  const getHistoricalCost = (item: any): number => {
    const costCode = item.cost_codes as any;
    if (!costCode?.code || !historicalActualCosts?.mapByCode) return 0;
    return historicalActualCosts.mapByCode[costCode.code] || 0;
  };

  const getSourceLabel = (item: any): string => {
    // Check for vendor bid first
    if (item.selected_bid_id && item.selected_bid) {
      return 'Vendor Bid';
    }
    
    if (item.budget_source) {
      switch (item.budget_source) {
        case 'vendor-bid': return 'Vendor Bid';
        case 'estimate': return 'Estimate';
        case 'historical': return 'Historical';
        case 'settings': return 'Settings';
        case 'manual': return 'Manual';
      }
    }
    
    const costCode = item.cost_codes;
    if (costCode?.has_subcategories) {
      return 'Estimate';
    }
    
    if ((item.quantity !== null && item.quantity > 0) || (item.unit_price !== null && item.unit_price > 0)) {
      return 'Manual';
    }
    
    return 'Manual';
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
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Project Budget</Text>
          {projectAddress && <Text style={styles.subtitle}>{projectAddress}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Cost Code</Text>
            <Text style={styles.col2}>Name</Text>
            <Text style={styles.col3}>Source</Text>
            <Text style={styles.col4}>Total Budget</Text>
            {visibleColumns.historical && <Text style={styles.col5}>Historical</Text>}
            {visibleColumns.variance && <Text style={styles.col6}>Variance</Text>}
          </View>

          {Object.entries(groupedBudgetItems).map(([group, items]) => (
            <View key={group}>
              {items.map((item) => {
                const costCode = item.cost_codes as any;
                const total = itemTotalsMap[item.id] || 0;
                const historical = getHistoricalCost(item);
                const variance = calculateVariance(total, historical);

                return (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={styles.col1}>{costCode?.code || '-'}</Text>
                    <Text style={styles.col2}>{costCode?.name || '-'}</Text>
                    <Text style={styles.col3}>{getSourceLabel(item)}</Text>
                    <Text style={styles.col4}>{formatCurrency(total)}</Text>
                    {visibleColumns.historical && (
                      <Text style={styles.col5}>{formatCurrency(historical)}</Text>
                    )}
                    {visibleColumns.variance && (
                      <Text style={styles.col6}>
                        {showVarianceAsPercentage
                          ? `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`
                          : `${variance >= 0 ? '+' : ''}${formatCurrency(Math.abs(variance))}`}
                      </Text>
                    )}
                  </View>
                );
              })}

              <View style={styles.groupHeader}>
                <Text style={styles.col1}></Text>
                <Text style={{ ...styles.col2, fontWeight: 'bold' }}>Subtotal for {group.split(' - ')[0]}</Text>
                <Text style={styles.col3}></Text>
                <Text style={{ ...styles.col4, fontWeight: 'bold' }}>
                  {formatCurrency(calculateGroupTotal(items))}
                </Text>
                {visibleColumns.historical && (
                  <Text style={{ ...styles.col5, fontWeight: 'bold' }}>
                    {formatCurrency(calculateGroupHistorical(items))}
                  </Text>
                )}
                {visibleColumns.variance && <Text style={styles.col6}></Text>}
              </View>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.col1}></Text>
            <Text style={{ ...styles.col2, fontWeight: 'bold' }}>Project Total:</Text>
            <Text style={styles.col3}></Text>
            <Text style={{ ...styles.col4, fontWeight: 'bold' }}>
              {formatCurrency(calculateProjectTotal())}
            </Text>
            {visibleColumns.historical && (
              <Text style={{ ...styles.col5, fontWeight: 'bold' }}>
                {formatCurrency(calculateProjectHistorical())}
              </Text>
            )}
            {visibleColumns.variance && (
              <Text style={{ ...styles.col6, fontWeight: 'bold' }}>
                {(() => {
                  const total = calculateProjectTotal();
                  const historical = calculateProjectHistorical();
                  const variance = calculateVariance(total, historical);
                  return showVarianceAsPercentage
                    ? `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`
                    : `${variance >= 0 ? '+' : ''}${formatCurrency(Math.abs(variance))}`;
                })()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footerContainer} fixed>
          <Text style={styles.footerLeft}>{new Date().toLocaleDateString()}</Text>
          <Text style={styles.footerCenter}>{new Date().toLocaleTimeString()}</Text>
          <Text 
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
