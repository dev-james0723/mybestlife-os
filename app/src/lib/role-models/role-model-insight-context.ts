/**
 * Compact, privacy-aware Life OS context builder for Role Model AI insights.
 *
 * Principles (see task §11):
 *   - Linked items first, then active/recent items, then everything else.
 *   - Hard caps on item counts and per-field text length so we never ship the
 *     user's entire database to the model.
 *   - Only titles + short snippets — never full private note bodies.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type {
  Goal,
  Idea,
  Note,
  Project,
  RoleModel,
  Task,
  AboutMe,
} from "@/types/database";
import type { RoleModelInsightContextPayload } from "@/types/role-model-intelligence";

const MAX_PROJECTS = 12;
const MAX_GOALS = 10;
const MAX_TASKS = 14;
const MAX_NOTES = 10;
const MAX_IDEAS = 8;
const MAX_OTHER_ROLE_MODELS = 12;
const MAX_TEXT = 220;

function clip(value: string | null | undefined, max = MAX_TEXT): string | null {
  if (!value) return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Put linked items first, then keep array order for the rest, then cap. */
function prioritize<T extends { id: string }>(
  items: T[],
  linkedIds: Set<string>,
  cap: number,
): T[] {
  const linked = items.filter((i) => linkedIds.has(i.id));
  const rest = items.filter((i) => !linkedIds.has(i.id));
  return [...linked, ...rest].slice(0, cap);
}

export type BuildContextArgs = {
  roleModel: RoleModel;
  locale: AppLocale;
  projects: Project[];
  goals: Goal[];
  tasks: Task[];
  notes: Note[];
  ideas: Idea[];
  aboutMe: AboutMe | null | undefined;
  allRoleModels: RoleModel[];
};

export function buildRoleModelInsightContext({
  roleModel,
  locale,
  projects,
  goals,
  tasks,
  notes,
  ideas,
  aboutMe,
  allRoleModels,
}: BuildContextArgs): RoleModelInsightContextPayload {
  const linkedProjectIds = new Set(roleModel.linked_project_ids ?? []);
  const linkedGoalIds = new Set(roleModel.linked_goal_ids ?? []);
  const linkedNoteIds = new Set(roleModel.linked_note_ids ?? []);

  // Active projects/goals/tasks bubble up over completed/cancelled ones.
  const activeProjects = [...projects].sort(
    (a, b) => Number(b.status === "active") - Number(a.status === "active"),
  );
  const activeGoals = [...goals].sort(
    (a, b) => Number(b.status === "active") - Number(a.status === "active"),
  );
  const openTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");

  return {
    locale,
    roleModel: {
      id: roleModel.id,
      name: roleModel.name,
      category: roleModel.category,
      admiration_blurb: clip(roleModel.admiration_blurb),
      bio: clip(roleModel.bio ?? roleModel.description, 600),
      tags: (roleModel.tags ?? []).slice(0, 12),
      quotes: (roleModel.quotes ?? [])
        .map((q) => clip(q.text, 160))
        .filter((t): t is string => Boolean(t))
        .slice(0, 4),
      keyLessons: (roleModel.key_lessons ?? [])
        .map((l) => clip(l.title, 120))
        .filter((t): t is string => Boolean(t))
        .slice(0, 5),
    },
    linkedProjectIds: [...linkedProjectIds],
    linkedGoalIds: [...linkedGoalIds],
    linkedNoteIds: [...linkedNoteIds],
    projects: prioritize(activeProjects, linkedProjectIds, MAX_PROJECTS).map((p) => ({
      id: p.id,
      title: p.name,
      status: p.status,
      description: clip(p.description, 140),
    })),
    goals: prioritize(activeGoals, linkedGoalIds, MAX_GOALS).map((g) => ({
      id: g.id,
      title: g.name,
      status: g.status,
      description: clip(g.description, 140),
    })),
    tasks: openTasks.slice(0, MAX_TASKS).map((t) => ({
      id: t.id,
      title: clip(t.title, 120) ?? t.title,
      status: t.status,
    })),
    notes: prioritize(notes, linkedNoteIds, MAX_NOTES).map((n) => ({
      id: n.id,
      title: clip(n.title, 120) ?? n.title,
      snippet: clip(n.content, 160),
    })),
    ideas: ideas.slice(0, MAX_IDEAS).map((i) => ({
      id: i.id,
      title: clip(i.content, 120) ?? i.content,
    })),
    aboutMe: aboutMe
      ? {
          mission: clip(aboutMe.mission, 300),
          coreValues: clip(aboutMe.core_values, 300),
          personality: clip(aboutMe.personality_insights, 300),
        }
      : null,
    otherRoleModels: allRoleModels
      .filter((rm) => rm.id !== roleModel.id)
      .map((rm) => rm.name)
      .slice(0, MAX_OTHER_ROLE_MODELS),
  };
}
