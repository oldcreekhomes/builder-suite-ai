/**
 * Scale utilities for converting between drawing coordinates and real-world measurements
 */

/**
 * Parses a drawing scale string and returns pixels per foot.
 * 
 * Standard architectural scales:
 * - 1/8" = 1'-0" means 0.125 inches on paper = 1 foot real
 * - 1/4" = 1'-0" means 0.25 inches on paper = 1 foot real
 * - etc.
 * 
 * @param scaleString - The scale string (e.g., "1/4\" = 1'-0\"")
 * @param dpi - The DPI of the drawing (default: 72 for screen/PDF)
 * @returns pixels per foot
 */
export function parseDrawingScale(scaleString: string | null | undefined, dpi: number = 72): number {
  if (!scaleString) {
    // Default to 1/4" = 1'-0" if no scale specified
    return 0.25 * dpi; // 18 pixels per foot at 72 DPI
  }

  // Normalize the scale string
  const normalized = scaleString.replace(/['"]/g, '"').replace(/'/g, "'").toLowerCase().trim();
  
  // Common architectural scales mapping to inches on paper per foot real
  const scalePatterns: { pattern: RegExp; inchesPerFoot: number }[] = [
    { pattern: /1\/16.*=.*1.*-?0/, inchesPerFoot: 0.0625 },
    { pattern: /1\/8.*=.*1.*-?0/, inchesPerFoot: 0.125 },
    { pattern: /3\/16.*=.*1.*-?0/, inchesPerFoot: 0.1875 },
    { pattern: /1\/4.*=.*1.*-?0/, inchesPerFoot: 0.25 },
    { pattern: /3\/8.*=.*1.*-?0/, inchesPerFoot: 0.375 },
    { pattern: /1\/2.*=.*1.*-?0/, inchesPerFoot: 0.5 },
    { pattern: /3\/4.*=.*1.*-?0/, inchesPerFoot: 0.75 },
    { pattern: /1.*=.*1.*-?0/, inchesPerFoot: 1.0 },
    { pattern: /1-?1\/2.*=.*1.*-?0/, inchesPerFoot: 1.5 },
    { pattern: /3.*=.*1.*-?0/, inchesPerFoot: 3.0 },
  ];

  for (const { pattern, inchesPerFoot } of scalePatterns) {
    if (pattern.test(normalized)) {
      return inchesPerFoot * dpi;
    }
  }

  // Try to parse numeric scale (e.g., "0.25" meaning 1/4")
  const numericMatch = normalized.match(/^(\d*\.?\d+)/);
  if (numericMatch) {
    const inches = parseFloat(numericMatch[1]);
    if (!isNaN(inches) && inches > 0) {
      return inches * dpi;
    }
  }

  // Default fallback: 1/4" = 1'-0"
  console.warn(`Could not parse scale: "${scaleString}", defaulting to 1/4" = 1'-0"`);
  return 0.25 * dpi;
}

/**
 * Calculates the area of a rectangle in square feet.
 * 
 * @param geometry - The rectangle geometry with width and height in pixels
 * @param pixelsPerFoot - The number of pixels per real-world foot
 * @returns Area in square feet
 */
export function calculateRectangleArea(
  geometry: { width: number; height: number },
  pixelsPerFoot: number
): number {
  const widthFeet = (geometry.width || 0) / pixelsPerFoot;
  const heightFeet = (geometry.height || 0) / pixelsPerFoot;
  return Math.abs(widthFeet * heightFeet);
}

/**
 * Calculates the area of a polygon in square feet using the Shoelace formula.
 * 
 * @param points - Array of points with x,y coordinates in pixels
 * @param pixelsPerFoot - The number of pixels per real-world foot
 * @returns Area in square feet
 */
export function calculatePolygonArea(
  points: { x: number; y: number }[],
  pixelsPerFoot: number
): number {
  if (!points || points.length < 3) {
    return 0;
  }

  // Shoelace formula for polygon area in pixels
  let areaPixels = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaPixels += points[i].x * points[j].y;
    areaPixels -= points[j].x * points[i].y;
  }
  
  areaPixels = Math.abs(areaPixels) / 2;
  
  // Convert pixel area to square feet
  const sqPixelsPerSqFoot = pixelsPerFoot * pixelsPerFoot;
  return areaPixels / sqPixelsPerSqFoot;
}

/**
 * Calculates the length of a line in linear feet.
 * 
 * @param geometry - The line geometry with x1, y1, x2, y2 in pixels
 * @param pixelsPerFoot - The number of pixels per real-world foot
 * @returns Length in linear feet
 */
export function calculateLineLength(
  geometry: { x1: number; y1: number; x2: number; y2: number },
  pixelsPerFoot: number
): number {
  const dx = (geometry.x2 || 0) - (geometry.x1 || 0);
  const dy = (geometry.y2 || 0) - (geometry.y1 || 0);
  const lengthPixels = Math.sqrt(dx * dx + dy * dy);
  return lengthPixels / pixelsPerFoot;
}

/**
 * Determines if a unit of measure represents area measurement.
 */
export function isAreaMeasurement(unitOfMeasure: string | null | undefined): boolean {
  if (!unitOfMeasure) return false;
  const unit = unitOfMeasure.toLowerCase();
  return unit.includes('square') || unit === 'sf' || unit === 'sq-ft' || unit === 'sqft';
}

/**
 * Determines if a unit of measure represents linear measurement.
 */
export function isLinearMeasurement(unitOfMeasure: string | null | undefined): boolean {
  if (!unitOfMeasure) return false;
  const unit = unitOfMeasure.toLowerCase();
  return unit.includes('linear') || unit === 'lf' || unit === 'ft' || unit === 'feet';
}
