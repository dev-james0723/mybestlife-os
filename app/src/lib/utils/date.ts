import { format, formatDistanceToNow, isAfter, isBefore, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;

  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";

  return format(d, "MMM d");
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy h:mm a");
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? parseISO(date) : date;
  return isBefore(d, new Date()) && !isToday(d);
}

export function isUpcoming(date: string | Date | null | undefined, withinDays = 7): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? parseISO(date) : date;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);
  return isAfter(d, new Date()) && isBefore(d, futureDate);
}
