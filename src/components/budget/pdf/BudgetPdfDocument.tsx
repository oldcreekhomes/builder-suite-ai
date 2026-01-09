import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';


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
  col1Base: { width: '8%' }, // Code
  col2Base: { width: '42%' }, // Name
  col3Base: { width: '18%' }, // Source
  col4: { width: '10%', textAlign: 'right' }, // Historical
  col5: { width: '10%', textAlign: 'right' }, // Variance
  col6Base: { width: '12%', textAlign: 'left' }, // Budget Total (far right)
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
}

export function BudgetPdfDocument({
  projectAddress,
  groupedBudgetItems,
  visibleColumns,
  selectedHistoricalProject,
  showVarianceAsPercentage,
  historicalActualCosts,
  subcategoryTotals,
}: BudgetPdfDocumentProps) {
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
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
    return items.reduce((sum, item) => {
      const subcategoryTotal = subcategoryTotals[item.id];
      const historicalCost = getHistoricalCost(item);
      return sum + calculateBudgetItemTotal(item, subcategoryTotal, false, historicalCost);
    }, 0);
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

  // Calculate dynamic column widths based on visible columns
  const showHistorical = visibleColumns.historical;
  const showVariance = visibleColumns.variance;
  
  // Handle all four visibility combinations
  const getColumnWidths = () => {
    if (showHistorical && showVariance) {
      // Both visible: Code 8%, Name 35%, Source 15%, Historical 12%, Variance 12%, Total 18%
      return { col1: '8%', col2: '35%', col3: '15%', col4: '12%', col5: '12%', col6: '18%' };
    } else if (showHistorical && !showVariance) {
      // Only Historical: Code 8%, Name 40%, Source 17%, Historical 15%, Total 20%
      return { col1: '8%', col2: '40%', col3: '17%', col4: '15%', col5: '0%', col6: '20%' };
    } else if (!showHistorical && showVariance) {
      // Only Variance: Code 8%, Name 40%, Source 17%, Variance 15%, Total 20%
      return { col1: '8%', col2: '40%', col3: '17%', col4: '0%', col5: '15%', col6: '20%' };
    } else {
      // Neither visible: Code 10%, Name 50%, Source 22%, Total 18%
      return { col1: '10%', col2: '50%', col3: '22%', col4: '0%', col5: '0%', col6: '18%' };
    }
  };

  const columnWidths = getColumnWidths();

  const col1Style = { ...styles.col1Base, width: columnWidths.col1 };
  const col2Style = { ...styles.col2Base, width: columnWidths.col2 };
  const col3Style = { ...styles.col3Base, width: columnWidths.col3 };
  const col4Style = { ...styles.col4, width: columnWidths.col4 };
  const col5Style = { ...styles.col5, width: columnWidths.col5 };
  const col6Style = { ...styles.col6Base, width: columnWidths.col6 };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Project Budget</Text>
          {projectAddress && <Text style={styles.subtitle}>{projectAddress}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={col1Style}>Cost Code</Text>
            <Text style={col2Style}>Name</Text>
            <Text style={col3Style}>Source</Text>
            {visibleColumns.historical && <Text style={col4Style}>Historical</Text>}
            {visibleColumns.variance && <Text style={col5Style}>Variance</Text>}
            <Text style={col6Style}>Total Budget</Text>
          </View>

          {Object.entries(groupedBudgetItems).map(([group, items]) => (
            <View key={group}>
              {items.map((item) => {
                const costCode = item.cost_codes as any;
                const subcategoryTotal = subcategoryTotals[item.id];
                const historical = getHistoricalCost(item);
                const total = calculateBudgetItemTotal(item, subcategoryTotal, false, historical);
                const variance = calculateVariance(total, historical);

                return (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={col1Style}>{costCode?.code || '-'}</Text>
                    <Text style={col2Style}>{costCode?.name || '-'}</Text>
                    <Text style={col3Style}>{getSourceLabel(item)}</Text>
                    {visibleColumns.historical && (
                      <Text style={col4Style}>{formatCurrency(historical)}</Text>
                    )}
                    {visibleColumns.variance && (
                      <Text style={col5Style}>
                        {showVarianceAsPercentage
                          ? `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`
                          : `${variance >= 0 ? '+' : ''}${formatCurrency(Math.abs(variance))}`}
                      </Text>
                    )}
                    <Text style={col6Style}>{formatCurrency(total)}</Text>
                  </View>
                );
              })}

              <View style={styles.groupHeader}>
                <Text style={col1Style}></Text>
                <Text style={{ ...col2Style, fontWeight: 'bold' }}>Subtotal for {group.split(' - ')[0]}</Text>
                <Text style={col3Style}></Text>
                {visibleColumns.historical && (
                  <Text style={{ ...col4Style, fontWeight: 'bold' }}>
                    {formatCurrency(calculateGroupHistorical(items))}
                  </Text>
                )}
                {visibleColumns.variance && <Text style={col5Style}></Text>}
                <Text style={{ ...col6Style, fontWeight: 'bold' }}>
                  {formatCurrency(calculateGroupTotal(items))}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={col1Style}></Text>
            <Text style={{ ...col2Style, fontWeight: 'bold' }}>Project Total:</Text>
            <Text style={col3Style}></Text>
            {visibleColumns.historical && (
              <Text style={{ ...col4Style, fontWeight: 'bold' }}>
                {formatCurrency(calculateProjectHistorical())}
              </Text>
            )}
            {visibleColumns.variance && (
              <Text style={{ ...col5Style, fontWeight: 'bold' }}>
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
            <Text style={{ ...col6Style, fontWeight: 'bold' }}>
              {formatCurrency(calculateProjectTotal())}
            </Text>
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
