/**
 * Business day utilities for Monday-Friday work week scheduling
 */

/**
 * Check if a date is a business day (Monday-Friday)
 */
export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday (1) to Friday (5)
};

/**
 * Get the next business day from a given date
 */
export const getNextBusinessDay = (date: Date): Date => {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  
  while (!isBusinessDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
};

/**
 * Get the previous business day from a given date
 */
export const getPreviousBusinessDay = (date: Date): Date => {
  const prevDay = new Date(date);
  prevDay.setDate(date.getDate() - 1);
  
  while (!isBusinessDay(prevDay)) {
    prevDay.setDate(prevDay.getDate() - 1);
  }
  
  return prevDay;
};

/**
 * Add business days to a start date (skipping weekends)
 */
export const addBusinessDays = (startDate: Date, businessDays: number): Date => {
  if (businessDays === 0) return new Date(startDate);
  
  let currentDate = new Date(startDate);
  let remainingDays = businessDays;
  
  // If start date is not a business day, move to next business day first
  if (!isBusinessDay(currentDate)) {
    currentDate = getNextBusinessDay(currentDate);
  }
  
  while (remainingDays > 0) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (isBusinessDay(currentDate)) {
      remainingDays--;
    }
  }
  
  return currentDate;
};

/**
 * Count business days between two dates (inclusive)
 */
export const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
  if (startDate > endDate) return 0;
  
  let businessDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (isBusinessDay(currentDate)) {
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return businessDays;
};

/**
 * Calculate end date from start date and business day duration
 */
export const calculateBusinessEndDate = (startDate: Date, businessDaysDuration: number): Date => {
  if (businessDaysDuration <= 0) {
    return new Date(startDate);
  }
  
  // Add the full duration in business days to get the end date
  const adjustedStart = isBusinessDay(startDate) ? new Date(startDate) : getNextBusinessDay(startDate);
  return addBusinessDays(adjustedStart, businessDaysDuration);
};

/**
 * Ensure a date falls on a business day, moving to next business day if needed
 */
export const ensureBusinessDay = (date: Date): Date => {
  return isBusinessDay(date) ? new Date(date) : getNextBusinessDay(date);
};