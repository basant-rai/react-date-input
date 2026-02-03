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


export function convertDate(dateString: string | number | Date): string {
  if (!dateString) return "-";

  let year: number, month: number, day: number;

  // CASE 1: Pure date "YYYY-MM-DD"
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    [year, month, day] = dateString.split("-").map(Number);
  }
  // CASE 2: ISO timestamp — extract only the date part, ignore time
  else if (typeof dateString === "string" && dateString.includes("T")) {
    const datePart = dateString.split("T")[0];
    [year, month, day] = datePart.split("-").map(Number);
  }
  // CASE 3: MM/DD/YYYY format
  else if (typeof dateString === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const parts = dateString.split("/");
    month = Number(parts[0]);
    day = Number(parts[1]);
    year = Number(parts[2]);
  }
  // CASE 4: Real Date object or timestamp
  else {
    const d = new Date(dateString);
    year = d.getUTCFullYear();
    month = d.getUTCMonth() + 1;
    day = d.getUTCDate();
  }

  // Build a date in UTC so it's stable
  const date = new Date(Date.UTC(year, month - 1, day));

  return date
    .toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC", // ← Uncomment this for stability!
    })
    .replace(/(\w{3}) (\d{4})$/, "$1, $2");
}