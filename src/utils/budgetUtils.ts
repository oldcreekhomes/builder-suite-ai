
export const formatUnitOfMeasure = (unit: string | null) => {
  if (!unit) return "-";
  
  const unitMap: Record<string, string> = {
    "each": "EA",
    "square-feet": "SF", 
    "linear-feet": "LF",
    "square-yard": "SY",
    "cubic-yard": "CY"
  };
  
  return unitMap[unit] || unit.toUpperCase();
};
