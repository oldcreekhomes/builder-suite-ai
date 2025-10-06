/**
 * Date-only utilities for schedule functionality
 * All functions work with YYYY-MM-DD strings to avoid time/timezone issues
 */

export type DateString = string; // YYYY-MM-DD format

/**
 * Get today's date as YYYY-MM-DD string
 */
export const today = (): DateString => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Parse YYYY-MM-DD string into year, month, day integers
 */
export const parseDateString = (dateStr: DateString): { year: number; month: number; day: number } => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
};

/**
 * Create YYYY-MM-DD string from year, month, day
 */
export const formatDateString = (year: number, month: number, day: number): DateString => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Check if a date string is a business day (Mon-Fri)
 */
export const isBusinessDay = (dateStr: DateString): boolean => {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday = 1, Friday = 5
};

/**
 * Add days to a date string
 */
export const addDays = (dateStr: DateString, days: number): DateString => {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

/**
 * Get the next business day
 */
export const getNextBusinessDay = (dateStr: DateString): DateString => {
  let current = dateStr;
  do {
    current = addDays(current, 1);
  } while (!isBusinessDay(current));
  return current;
};

/**
 * Get the previous business day
 */
export const getPreviousBusinessDay = (dateStr: DateString): DateString => {
  let current = dateStr;
  do {
    current = addDays(current, -1);
  } while (!isBusinessDay(current));
  return current;
};

/**
 * Add business days to a date string
 */
export const addBusinessDays = (startDateStr: DateString, businessDays: number): DateString => {
  if (businessDays <= 0) return startDateStr;
  
  let current = startDateStr;
  let remainingDays = businessDays;
  
  while (remainingDays > 0) {
    current = addDays(current, 1);
    if (isBusinessDay(current)) {
      remainingDays--;
    }
  }
  
  return current;
};

/**
 * Calculate business days between two date strings (inclusive)
 */
export const getBusinessDaysBetween = (startDateStr: DateString, endDateStr: DateString): number => {
  if (startDateStr === endDateStr) return isBusinessDay(startDateStr) ? 1 : 0;
  
  let count = 0;
  let current = startDateStr;
  
  while (current <= endDateStr) {
    if (isBusinessDay(current)) {
      count++;
    }
    current = addDays(current, 1);
  }
  
  return count;
};

/**
 * Calculate end date from start date and business day duration (INCLUSIVE)
 * Duration of 1 means start and end on the same day
 */
export const calculateBusinessEndDate = (startDateStr: DateString, businessDaysDuration: number): DateString => {
  if (businessDaysDuration <= 0) return startDateStr;
  
  // Ensure we start on a business day
  const adjustedStart = isBusinessDay(startDateStr) ? startDateStr : getNextBusinessDay(startDateStr);
  
  if (businessDaysDuration === 1) {
    return adjustedStart; // Same day for 1-day duration
  }
  
  return addBusinessDays(adjustedStart, businessDaysDuration - 1);
};

/**
 * Get calendar days between two date strings (inclusive)
 */
export const getCalendarDaysBetween = (startDateStr: DateString, endDateStr: DateString): number => {
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);
  
  const startDate = new Date(start.year, start.month - 1, start.day);
  const endDate = new Date(end.year, end.month - 1, end.day);
  
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays + 1; // +1 for inclusive calculation
};

/**
 * Ensure a date is a business day, adjusting to next business day if needed
 */
export const ensureBusinessDay = (dateStr: DateString): DateString => {
  return isBusinessDay(dateStr) ? dateStr : getNextBusinessDay(dateStr);
};

/**
 * Format date string as YYYY-MM-DD (for backward compatibility)
 */
export const formatYMD = (dateStr: DateString): string => {
  return dateStr; // Already in YYYY-MM-DD format
};

/**
 * Format date string for display (MM/dd/yy)
 */
export const formatDisplayDate = (dateStr: DateString): string => {
  const { year, month, day } = parseDateString(dateStr);
  const shortYear = year.toString().slice(-2);
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${shortYear}`;
};

/**
 * Get month name from date string
 */
export const getMonthName = (dateStr: DateString, format: 'short' | 'long' = 'short'): string => {
  const { year, month } = parseDateString(dateStr);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { 
    month: format === 'short' ? 'short' : 'long',
    year: 'numeric'
  });
};

/**
 * Get day of month from date string
 */
export const getDayOfMonth = (dateStr: DateString): string => {
  const { day } = parseDateString(dateStr);
  return String(day).padStart(2, '0');
};

/**
 * Normalize any date input to YYYY-MM-DD string (date-only, no timezone shift)
 * Handles: YYYY-MM-DD, ISO strings, MM/DD/YYYY, Date objects
 */
export const normalizeToYMD = (input: string | Date): DateString => {
  if (!input) return '';
  
  // If already YYYY-MM-DD format
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  
  // If ISO string (YYYY-MM-DDTHH:mm:ss.sssZ), extract date part
  if (typeof input === 'string' && input.includes('T')) {
    return input.split('T')[0];
  }
  
  // If MM/DD/YYYY format
  if (typeof input === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(input)) {
    const [month, day, year] = input.split('/').map(Number);
    return formatDateString(year, month, day);
  }
  
  // For Date objects or other formats, use local date components
  try {
    const date = typeof input === 'string' ? new Date(input) : input;
    return formatDateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
  } catch {
    return '';
  }
};

/**
 * Create a Date object from YYYY-MM-DD string using local timezone (no UTC drift)
 * Use this for date pickers to avoid off-by-one errors
 */
export const toDateLocal = (ymd: DateString): Date => {
  const { year, month, day } = parseDateString(ymd);
  return new Date(year, month - 1, day);
};

/**
 * Format any date input for display (MM/dd/yy) without timezone issues
 */
export const formatDisplayFromAny = (input: string | Date): string => {
  const ymd = normalizeToYMD(input);
  return ymd ? formatDisplayDate(ymd) : '';
};