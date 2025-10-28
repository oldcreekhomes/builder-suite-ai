
export const formatUnitOfMeasure = (unit: string | null) => {
  if (!unit) return "-";
  
  const unitMap: Record<string, string> = {
    "each": "EA",
    "square-feet": "SF", 
    "linear-feet": "LF",
    "square-yard": "SY",
    "cubic-yard": "CY",
    "month": "MTH",
    "hour": "HR",
    "lump-sum": "LS"
  };
  
  return unitMap[unit] || unit.toUpperCase();
};

export const calculateBudgetItemTotal = (
  item: any,
  subcategoryTotal?: number,
  manualOverrideEnabled: boolean = false,
  historicalActualCost?: number
): number => {
  const costCode = item.cost_codes;
  
  // Use budget_source if available
  if (item.budget_source) {
    switch (item.budget_source) {
      case 'vendor-bid':
        const selectedBid = item.selected_bid as any;
        if (selectedBid?.price) return selectedBid.price;
        break;
      
      case 'estimate':
        const hasSubcategories = costCode?.has_subcategories || false;
        if (hasSubcategories && subcategoryTotal !== undefined) {
          return subcategoryTotal;
        }
        break;
      
      case 'historical':
        if (historicalActualCost !== undefined && historicalActualCost !== null) {
          return historicalActualCost;
        }
        break;
      
      case 'settings':
        if (costCode?.price) {
          return (costCode.price || 0) * (item.quantity || 1);
        }
        break;
      
      case 'manual':
        return (item.quantity || 0) * (item.unit_price || 0);
    }
  }
  
  // Legacy fallback logic (for items without budget_source set)
  const hasSubcategories = costCode?.has_subcategories || false;
  const hasManualValues = item.quantity !== null && item.quantity !== 0 && 
                          item.unit_price !== null && item.unit_price !== 0;
  
  // Priority 1: Selected bid
  const selectedBid = item.selected_bid as any;
  const hasSelectedBid = !!item.selected_bid_id && selectedBid;
  if (hasSelectedBid) {
    return selectedBid.price || 0;
  }
  
  // Priority 2: Subcategory total (if no manual override)
  if (hasSubcategories && !manualOverrideEnabled && !hasManualValues && subcategoryTotal !== undefined) {
    return subcategoryTotal;
  }
  
  // Priority 3: Fallback to quantity * unit_price
  return (item.quantity || 0) * (item.unit_price || 0);
};
