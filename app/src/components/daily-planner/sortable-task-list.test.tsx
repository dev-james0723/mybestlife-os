import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import { SortableTaskList, type LocalPlanTask } from "./sortable-task-list";

const tasks: LocalPlanTask[] = ["a", "b", "c", "d", "e"].map(
  (id, order) => ({
    plannerTaskId: `planner-${id}`,
    _uid: `stale-local-${id}`,
    taskName: `Task ${id.toUpperCase()}`,
    blocks: 1,
    order,
  }),
);

function renderList() {
  return renderToStaticMarkup(
    <SortableTaskList
      tasks={tasks}
      meta={tasks.map((_, index) => ({
        color: "#6366f1",
        blocks: 1,
        durationLabel: "10 min",
        timeRangeLabel: `09:${index}0 – 09:${index + 1}0`,
      }))}
      isMobile
      copy={getDailyPlannerUiCopy("en")}
      onReorder={vi.fn()}
      onChangeBlocks={vi.fn()}
      onDelete={vi.fn()}
      onRitual={vi.fn()}
      onTaskClick={vi.fn()}
    />,
  );
}

describe("SortableTaskList drag activator contract", () => {
  it("renders one accessible, touch-isolated handle per stable planner row", () => {
    const markup = renderList();

    for (const task of tasks) {
      expect(markup).toContain(`data-planner-task-id="${task.plannerTaskId}"`);
      expect(markup).not.toContain(`data-planner-task-id="${task._uid}"`);
    }
    expect(markup.match(/data-drag-handle="true"/g)).toHaveLength(5);
    expect(markup.match(/aria-label="Hold to drag and reorder"/g)).toHaveLength(5);
    expect(markup.match(/touch-none/g)).toHaveLength(5);
    expect(markup.match(/touch-action:pan-y/g)).toHaveLength(5);
    expect(markup.match(/data-dnd-state="idle"/g)).toHaveLength(5);
  });

  it("keeps closed mobile swipe actions from bleeding through the task card", () => {
    const markup = renderList();

    expect(markup.match(/ bg-white /g)).toHaveLength(10);
    expect(markup.match(/dark:bg-slate-950/g)).toHaveLength(10);
    expect(markup).not.toContain("bg-white/62");
    expect(markup).not.toContain("dark:bg-white/[0.045]");
    expect(markup.match(/relative overflow-hidden rounded-xl/g) ?? []).toHaveLength(5);
    expect(markup.match(/right-\[1px\] inset-y-\[1px\]/g) ?? []).toHaveLength(5);
    expect(markup.match(/rounded-r-\[13px\]/g) ?? []).toHaveLength(5);
    expect(markup.match(/rounded-r-none/g) ?? []).toHaveLength(5);
    expect(markup.match(/width:calc\(100% \+ 2px\)/g) ?? []).toHaveLength(5);
    expect(markup).not.toContain("relative overflow-hidden rounded-lg");
    expect(markup).not.toContain("translate3d(-0px,0,0)");
  });
});
