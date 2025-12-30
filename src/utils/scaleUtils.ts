/**
 * Scale utilities for converting between drawing coordinates and real-world measurements
 */

export interface ScaleResult {
  pixelsPerFoot: number | null;
  needsCalibration: boolean;
  reason?: string;
}

/**
 * Determines the correct pixelsPerFoot for a sheet based on its type and calibration status.
 * 
 * Priority:
 * 1. If scale_ratio is set (from calibration), use it directly
 * 2. If it's a PDF and drawing_scale exists, compute from drawing_scale with 72 DPI
 * 3. If it's an image (PNG/JPG) without scale_ratio, return null (needs calibration)
 * 
 * @param sheet - The takeoff sheet object
 * @returns ScaleResult with pixelsPerFoot or null with reason
 */
export function getPixelsPerFootForSheet(sheet: {
  file_name?: string | null;
  drawing_scale?: string | null;
  scale_ratio?: number | null;
  ai_processing_width?: number | null;
  ai_processing_height?: number | null;
}): ScaleResult {
  // 1. If scale_ratio is set (calibrated), use it directly
  if (sheet.scale_ratio && sheet.scale_ratio > 0) {
    console.debug('[Scale] Using calibrated scale_ratio:', sheet.scale_ratio);
    return { 
      pixelsPerFoot: sheet.scale_ratio, 
      needsCalibration: false 
    };
  }

  // Check if we have a drawing scale at all
  if (!sheet.drawing_scale) {
    return { 
      pixelsPerFoot: null, 
      needsCalibration: true,
      reason: 'No drawing scale specified. Please set the scale or calibrate.'
    };
  }

  // Determine if this is a PDF or an image
  const fileName = sheet.file_name?.toLowerCase() || '';
  const isPDF = fileName.endsWith('.pdf');
  const isImage = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');

  // 2. For PDFs, we can use 72 DPI assumption (PDF points)
  if (isPDF) {
    const pixelsPerFoot = parseDrawingScale(sheet.drawing_scale, 72);
    console.debug('[Scale] PDF mode - using 72 DPI. pixelsPerFoot:', pixelsPerFoot);
    return { 
      pixelsPerFoot, 
      needsCalibration: false 
    };
  }

  // 3. For images without calibration, we cannot reliably compute measurements
  if (isImage) {
    console.debug('[Scale] Image mode - needs calibration. drawing_scale exists but DPI unknown.');
    return { 
      pixelsPerFoot: null, 
      needsCalibration: true,
      reason: `This sheet is a raster image. The scale "${sheet.drawing_scale}" requires calibration to measure accurately.`
    };
  }

  // Fallback: treat unknown file types as PDF-like (legacy behavior)
  const pixelsPerFoot = parseDrawingScale(sheet.drawing_scale, 72);
  console.debug('[Scale] Unknown file type, using 72 DPI fallback. pixelsPerFoot:', pixelsPerFoot);
  return { 
    pixelsPerFoot, 
    needsCalibration: false 
  };
}

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
