import type { Project } from "@/types/database";

export type ProjectCreatePreset = {
  name: string;
  description: string;
  status: Project["status"];
  priority: Project["priority"];
  suggestedTasks: string[];
  tags: string[];
};

export type ProjectTemplate = ProjectCreatePreset & {
  id: string;
  icon: string;
};

const STORAGE_KEY = "mylifeos:project-templates:v1";

export const SEED_PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "concert-production",
    icon: "🎭",
    name: "Concert Production",
    description: "Venue, program, artists, marketing, and day-of logistics.",
    status: "planning",
    priority: "high",
    tags: ["music", "production"],
    suggestedTasks: [
      "Confirm venue and date",
      "Draft program and running order",
      "Artist contracts and tech rider",
      "Marketing and ticket sales plan",
      "Rehearsal schedule",
    ],
  },
  {
    id: "grant-application",
    icon: "📄",
    name: "Grant Application",
    description: "Research funder requirements, narrative, budget, and submission.",
    status: "planning",
    priority: "urgent",
    tags: ["grant", "research"],
    suggestedTasks: [
      "Read guidelines and eligibility",
      "Outline aims and methodology",
      "Budget and timeline",
      "Letters of support",
      "Internal review before submit",
    ],
  },
  {
    id: "course-learning",
    icon: "📚",
    name: "Course / Learning",
    description: "Syllabus, readings, assignments, and exam prep.",
    status: "active",
    priority: "medium",
    tags: ["learning"],
    suggestedTasks: [
      "Capture syllabus and key dates",
      "Weekly reading and problem sets",
      "Study group or office hours",
      "Midterm / final prep checklist",
    ],
  },
  {
    id: "research-project",
    icon: "🔬",
    name: "Research Project",
    description: "Literature, experiments, writing, and dissemination.",
    status: "planning",
    priority: "high",
    tags: ["research"],
    suggestedTasks: [
      "Define research question",
      "Literature review pass 1",
      "Data / experiment plan",
      "Draft paper sections",
      "Conference or journal target",
    ],
  },
  {
    id: "web-app-build",
    icon: "💻",
    name: "Web App / Build",
    description: "Product spec, stack, milestones, and launch.",
    status: "active",
    priority: "high",
    tags: ["build", "tech"],
    suggestedTasks: [
      "User stories and scope",
      "Design system and core screens",
      "Auth and data model",
      "MVP implementation sprint",
      "QA and deployment checklist",
    ],
  },
];

export function getMergedTemplates(): ProjectTemplate[] {
  if (typeof window === "undefined") return SEED_PROJECT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PROJECT_TEMPLATES;
    const custom = JSON.parse(raw) as ProjectTemplate[];
    if (!Array.isArray(custom)) return SEED_PROJECT_TEMPLATES;
    const byId = new Map<string, ProjectTemplate>();
    for (const t of SEED_PROJECT_TEMPLATES) byId.set(t.id, t);
    for (const t of custom) {
      if (t?.id && typeof t.name === "string") byId.set(t.id, t);
    }
    return [...byId.values()];
  } catch {
    return SEED_PROJECT_TEMPLATES;
  }
}

export function saveUserTemplate(template: ProjectTemplate): void {
  const merged = getMergedTemplates().filter(
    (t) => !SEED_PROJECT_TEMPLATES.some((s) => s.id === t.id),
  );
  const next = [...merged.filter((t) => t.id !== template.id), template];
  const seeds = new Set(SEED_PROJECT_TEMPLATES.map((s) => s.id));
  const toStore = next.filter((t) => !seeds.has(t.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}
