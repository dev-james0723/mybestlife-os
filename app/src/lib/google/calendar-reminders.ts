import type { calendar_v3 } from "googleapis";

/** Required Google Calendar popup reminders for planner-created events. */
export const PLANNER_GOOGLE_REMINDERS: calendar_v3.Schema$EventReminder[] = [
  { method: "popup", minutes: 5 },
  { method: "popup", minutes: 30 },
  { method: "popup", minutes: 60 },
  { method: "popup", minutes: 360 },
];

export function plannerEventReminders(): calendar_v3.Schema$Event["reminders"] {
  return {
    useDefault: false,
    overrides: PLANNER_GOOGLE_REMINDERS,
  };
}
