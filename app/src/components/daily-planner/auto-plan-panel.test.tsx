import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AutoPlanPanel,
  type AutoPlanCopy,
  type AutoPlanPanelProps,
  type AutoPlanResult,
} from "./auto-plan-panel";

const copy: AutoPlanCopy = {
  title: "AUTO_PLAN_TITLE",
  description: "AUTO_PLAN_DESCRIPTION",
  statusLabels: {
    empty: "STATUS_EMPTY",
    ready: "STATUS_READY",
    preview: "STATUS_PREVIEW",
    accepted: "STATUS_ACCEPTED",
  },
  stateTitles: {
    empty: "EMPTY_TITLE",
    ready: "READY_TITLE",
    preview: "PREVIEW_TITLE",
    accepted: "ACCEPTED_TITLE",
  },
  stateDescriptions: {
    empty: "EMPTY_DESCRIPTION",
    ready: "READY_DESCRIPTION",
    preview: "PREVIEW_DESCRIPTION",
    accepted: "ACCEPTED_DESCRIPTION",
  },
  candidateCount: (count) => `CANDIDATES:${count}`,
  calendarBusyWindowCount: (count) => `BUSY_WINDOWS:${count}`,
  availableLabel: "AVAILABLE",
  plannedLabel: "PLANNED",
  remainingLabel: "REMAINING",
  formatMinutes: (minutes) => `${minutes}_MINUTES`,
  capacityProgressLabel: "CAPACITY_PROGRESS",
  capacityProgressValue: (planned, available) => `${planned}_OF_${available}`,
  bufferIntensityLabel: "BUFFER_INTENSITY",
  bufferIntensityDescription: "BUFFER_DESCRIPTION",
  formatBufferOption: (minutes) => `BUFFER:${minutes}`,
  scheduledTitle: "SCHEDULED_TITLE",
  scheduledCount: (count) => `SCHEDULED:${count}`,
  noScheduledItems: "NO_SCHEDULED_ITEMS",
  unscheduledTitle: "UNSCHEDULED_TITLE",
  unscheduledCount: (count) => `UNSCHEDULED:${count}`,
  allCandidatesScheduled: "ALL_CANDIDATES_SCHEDULED",
  priorityLabels: {
    must: "PRIORITY_MUST",
    should: "PRIORITY_SHOULD",
    could: "PRIORITY_COULD",
  },
  formatTimeRange: (start, end) => `${start}_TO_${end}`,
  lockItem: (title) => `LOCK:${title}`,
  unlockItem: (title) => `UNLOCK:${title}`,
  reviewNoticeTitle: "REVIEW_NOTICE_TITLE",
  reviewNoticeDescription: "REVIEW_NOTICE_DESCRIPTION",
  buildMyDay: "BUILD_MY_DAY",
  buildingPlan: "BUILDING_PLAN",
  acceptPlan: "ACCEPT_PLAN",
  acceptingPlan: "ACCEPTING_PLAN",
  replanRemaining: "REPLAN_REMAINING",
};

const result: AutoPlanResult = {
  availableMinutes: 480,
  plannedMinutes: 330,
  remainingMinutes: 150,
  scheduledItems: [
    {
      id: "schedule-1",
      title: "Deep work",
      start: "09:00",
      end: "10:30",
      priority: "must",
      locked: true,
    },
    {
      id: "schedule-2",
      title: "Email review",
      start: "11:00",
      end: "11:30",
      priority: "should",
      locked: false,
    },
  ],
  unscheduledItems: [
    {
      id: "unscheduled-1",
      title: "Optional reading",
      reason: "Not enough room after protected breaks",
    },
  ],
};

const baseProps: AutoPlanPanelProps = {
  state: "ready",
  copy,
  candidateCount: 3,
  result: null,
  bufferMinutes: 15,
  bufferOptions: [10, 15, 20],
  onBuildMyDay: vi.fn(),
  onAcceptPlan: vi.fn(),
  onReplanRemaining: vi.fn(),
  onToggleLock: vi.fn(),
  onBufferChange: vi.fn(),
};

function renderPanel(overrides: Partial<AutoPlanPanelProps> = {}) {
  return renderToStaticMarkup(<AutoPlanPanel {...baseProps} {...overrides} />);
}

describe("AutoPlanPanel", () => {
  it("renders an inert empty-candidates state", () => {
    const markup = renderPanel({ state: "empty", candidateCount: 0 });

    expect(markup).toContain('data-auto-plan-state="empty"');
    expect(markup).toContain("EMPTY_TITLE");
    expect(markup).toContain("CANDIDATES:0");
    expect(markup).toContain("BUILD_MY_DAY");
    expect(markup).not.toContain("data-auto-plan-result");
    expect(markup).not.toContain("data-auto-plan-accept");
    expect(markup.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("renders a ready state with calendar context and 44px controls", () => {
    const markup = renderPanel({
      calendarNotice: "CALENDAR_NOTICE",
      busyWindowCount: 4,
    });

    expect(markup).toContain('data-auto-plan-state="ready"');
    expect(markup).toContain("READY_TITLE");
    expect(markup).toContain("BUSY_WINDOWS:4");
    expect(markup).toContain("CALENDAR_NOTICE");
    expect(markup).toContain('data-auto-plan-calendar-notice="true"');
    expect(markup).toContain('data-buffer-minutes="15"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("min-h-11");
    expect(markup).toContain("BUILD_MY_DAY");
  });

  it("keeps a generated preview explicitly reviewable before acceptance", () => {
    const markup = renderPanel({ state: "preview", result });

    expect(markup).toContain('data-auto-plan-state="preview"');
    expect(markup).toContain('data-auto-plan-review-notice="true"');
    expect(markup).toContain("REVIEW_NOTICE_TITLE");
    expect(markup).toContain("REVIEW_NOTICE_DESCRIPTION");
    expect(markup).toContain('data-auto-plan-item="schedule-1"');
    expect(markup).toContain('data-locked="true"');
    expect(markup).toContain("09:00_TO_10:30");
    expect(markup).toContain("UNLOCK:Deep work");
    expect(markup).toContain("LOCK:Email review");
    expect(markup).toContain('data-auto-plan-unscheduled-tray="true"');
    expect(markup).toContain("Not enough room after protected breaks");
    expect(markup).toContain('data-auto-plan-accept="true"');
    expect(markup).toContain("ACCEPT_PLAN");
    expect(markup.indexOf("REVIEW_NOTICE_TITLE")).toBeLessThan(
      markup.indexOf("ACCEPT_PLAN"),
    );
  });

  it("shows an accepted result without offering acceptance a second time", () => {
    const markup = renderPanel({ state: "accepted", result });

    expect(markup).toContain('data-auto-plan-state="accepted"');
    expect(markup).toContain("ACCEPTED_TITLE");
    expect(markup).toContain('data-auto-plan-unscheduled-tray="true"');
    expect(markup).toContain("REPLAN_REMAINING");
    expect(markup).not.toContain("data-auto-plan-accept");
    expect(markup).not.toContain("REVIEW_NOTICE_TITLE");
  });

  it("reflects controlled build and acceptance loading states", () => {
    const buildingMarkup = renderPanel({ isBuilding: true });
    const acceptingMarkup = renderPanel({
      state: "preview",
      result,
      isAccepting: true,
    });

    expect(buildingMarkup).toContain('aria-busy="true"');
    expect(buildingMarkup).toContain("BUILDING_PLAN");
    expect(acceptingMarkup).toContain('aria-busy="true"');
    expect(acceptingMarkup).toContain("ACCEPTING_PLAN");
    expect(acceptingMarkup).toContain('data-auto-plan-accept="true"');
  });
});
