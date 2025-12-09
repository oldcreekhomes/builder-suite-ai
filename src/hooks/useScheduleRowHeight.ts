import { useDensity } from "@/contexts/DensityContext";

// Maps density to row height in pixels for schedule timeline calculations
const DENSITY_ROW_HEIGHTS: Record<string, number> = {
  comfortable: 40,  // 2.5rem
  cozy: 32,         // 2rem  
  compact: 24       // 1.5rem
};

export function useScheduleRowHeight(): number {
  const { density } = useDensity();
  return DENSITY_ROW_HEIGHTS[density] || 40;
}
