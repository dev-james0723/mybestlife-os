/** Habits logs calendar dates on the device. Capture the same date/zone in the
 * durable command; the server validates it before selecting a new occurrence. */
export function pondHabitCalendar(timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, instant: number = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value;
  return { date: `${part("year")}-${part("month")}-${part("day")}`, timezone };
}
