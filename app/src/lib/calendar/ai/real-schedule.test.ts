import { describe, expect, it } from "vitest";
import { detectConflicts, findFreeWindows, generatePlan, summarizeDay } from ".";
import type { CalendarItemTask } from "../types";
const date = "2026-09-07";
const task = (id: string, props: Partial<CalendarItemTask> = {}): CalendarItemTask => ({ id, source_id: id, source_type: "task", title: id, date, start_time: null, end_time: null, color: null, subtitle: null, priority: "medium", status: "todo", estimated_blocks: null, project_id: null, overdue: false, tags: [], ...props });
describe("calendar suggestions from recorded data", () => {
  it("does not invent conflicts or scheduled items for an empty day", async () => {
    expect(await detectConflicts([])).toEqual([]);
    expect(await generatePlan(date, [], [])).toEqual([]);
    expect((await summarizeDay(date, [task("other", {date: "2026-09-08"})])).text).toContain("No items recorded");
  });
  it("reports the exact overlap and source ids only on the same date", async () => {
    const result = await detectConflicts([task("a", {start_time:"09:00", end_time:"10:00"}),task("b", {start_time:"09:30", end_time:"11:00"}),task("c", {date:"2026-09-08",start_time:"09:30", end_time:"11:00"})]);
    expect(result).toHaveLength(1);expect(result[0].item_ids).toEqual(["a","b"]);expect(result[0].message).toContain("09:30–10:00");
  });
  it("does not aggregate heavy tasks across different dates", async () => {
    expect(await detectConflicts([task("a", {estimated_blocks:8}),task("b",{date:"2026-09-08",estimated_blocks:8}),task("c",{date:"2026-09-09",estimated_blocks:8})])).toEqual([]);
  });
  it("returns no fabricated free windows for a fully occupied day", async () => {
    expect(await findFreeWindows(date,[task("busy",{start_time:"09:00",end_time:"19:00"})])).toEqual([]);
    expect(await findFreeWindows(date,[task("other-day",{date:"2026-09-08",start_time:"09:00",end_time:"19:00"})])).toHaveLength(1);
  });
  it("fits distinct unfinished tasks to available windows without modifying them", async () => {
    const windows=[{date,start:"09:00",end:"09:45",duration_minutes:45,label:"9–9:45"}];
    const result=await generatePlan(date,[task("a"),task("a"),task("done",{status:"done"}),task("b"),task("c")],windows);
    expect(result.map(x=>x.task_id)).toEqual(["a","b"]);expect(result.map(x=>x.slot)).toEqual([{start:"09:00",end:"09:20"},{start:"09:20",end:"09:40"}]);expect(windows[0].start).toBe("09:00");
  });
});
