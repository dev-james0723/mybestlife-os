import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

export function getLastSixMonthsInclusiveRange(): { from: string; to: string } {
  const end = endOfMonth(new Date());
  const start = startOfMonth(subMonths(end, 5));
  return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
}
