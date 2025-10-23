
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
  manualOverrideEnabled: boolean = false
): number => {
  const costCode = item.cost_codes;
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
