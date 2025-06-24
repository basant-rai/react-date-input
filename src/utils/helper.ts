import { addDays, endOfMonth, getDay, getDaysInMonth, startOfMonth } from "date-fns";


//* *** Generate calendar days with proper padding ***
export const generateDays = (currentMonth: string): Date[] => {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);
  const startWeekday = getDay(start);

  // Add padding for days from previous month
  const days: Date[] = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(addDays(start, - (startWeekday - i)));
  }

  // Add current month days
  for (let i = 0; i < daysInMonth; i++) {
    days.push(addDays(start, i));
  }

  // Add padding for days from next month
  const remainingDays = 42 - days.length; // 6 weeks
  for (let i = 1; i <= remainingDays; i++) {
    days.push(addDays(end, i));
  }

  return days;
};
