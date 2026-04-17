/**
 * Canonical Budget Source label resolver.
 *
 * SINGLE SOURCE OF TRUTH for the "Source" column shown on the Budget page,
 * Print view, and PDF export. All three must call this helper so they cannot
 * drift apart again.
 *
 * Precedence:
 *   1. item.budget_source (new system) — exhaustive switch over known values.
 *   2. Legacy fallback (only when budget_source is missing/unknown).
 */
export type BudgetSourceLabel =
  | 'Vendor Bid'
  | 'Estimate'
  | 'Historical'
  | 'Settings'
  | 'Manual'
  | 'Actual'
  | 'Purchase Order';

export function getBudgetSourceLabel(item: any): BudgetSourceLabel {
  // 1) New system: budget_source field wins.
  if (item?.budget_source) {
    switch (item.budget_source) {
      case 'vendor-bid':
        return 'Vendor Bid';
      case 'estimate':
        return 'Estimate';
      case 'historical':
        return 'Historical';
      case 'settings':
        return 'Settings';
      case 'manual':
        return 'Manual';
      case 'actual':
        return 'Actual';
      case 'purchase-orders':
        return 'Purchase Order';
    }
  }

  // 2) Legacy fallback (no budget_source set).
  if (item?.selected_bid_id && item?.selected_bid) {
    return 'Vendor Bid';
  }

  const costCode = item?.cost_codes;
  if (costCode?.has_subcategories) {
    return 'Estimate';
  }

  return 'Manual';
}

export function getBudgetSourceTooltip(item: any): string {
  const label = getBudgetSourceLabel(item);
  switch (label) {
    case 'Vendor Bid':
      return `From bid: ${item?.selected_bid?.companies?.company_name || 'Vendor bid'}`;
    case 'Estimate':
      return 'From estimate with subcategories';
    case 'Historical':
      return 'From historical project actual costs';
    case 'Settings':
      return 'From default cost code settings';
    case 'Actual':
      return 'From actual costs';
    case 'Purchase Order':
      return 'From purchase order';
    case 'Manual':
    default:
      return 'Manual entry';
  }
}

export function getBudgetSourceBadgeClassName(item: any): string {
  const label = getBudgetSourceLabel(item);
  switch (label) {
    case 'Vendor Bid':
    case 'Actual':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'Estimate':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Historical':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'Settings':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Purchase Order':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'Manual':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}
