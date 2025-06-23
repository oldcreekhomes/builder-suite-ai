
import { format, parseISO, addDays } from "date-fns";

export const getTaskNumber = (taskCode: string) => {
  if (!taskCode) return 0;
  const num = parseInt(taskCode);
  return isNaN(num) ? 0 : num;
};

export const formatTaskDate = (dateString: string) => {
  return format(parseISO(dateString), 'MMM dd');
};

export const calculateEndDate = (startDate: string, duration: number) => {
  const start = parseISO(startDate);
  return addDays(start, duration - 1);
};
