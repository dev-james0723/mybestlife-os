import { randomUUID } from "crypto";
import type { IntelligenceContextBundle } from "@/lib/life-agent/intelligence-context";
import type { LifeChapter, LifeChapterMapResponse } from "@/lib/life-agent/intelligence-types";
import { buildRadarOpenLoops } from "@/lib/life-agent/open-loop-radar";
import { groupOpenLoops } from "@/lib/life-agent/open-loop-radar";

type ChapterSeed = {
  title: string;
  keywords: RegExp;
};

const CHAPTER_SEEDS: ChapterSeed[] = [
  { title: "Music & Doctorate", keywords: /\b(music|doctorate|phd|piano|conservatory|recital)\b/i },
  { title: "D Festival / D Masters", keywords: /\b(d festival|d masters|festival|masters)\b/i },
  { title: "AI & Product Building", keywords: /\b(ai|product|software|startup|app|saas|code)\b/i },
  { title: "Japanese Learning", keywords: /\b(japanese|jlpt|nihongo|日本語)\b/i },
  { title: "Law / MBA Exploration", keywords: /\b(law|mba|legal|business school)\b/i },
  { title: "Relationships", keywords: /\b(family|friend|partner|relationship|mentor)\b/i },
  { title: "Assets / Admin / Company", keywords: /\b(asset|company|admin|tax|finance|invoice|corp)\b/i },
];

function matchChapter(text: string): ChapterSeed | null {
  for (const seed of CHAPTER_SEEDS) {
    if (seed.keywords.test(text)) return seed;
  }
  return null;
}

export function buildLifeChapterMap(ctx: IntelligenceContextBundle): LifeChapterMapResponse {
  const chapterMap = new Map<string, LifeChapter>();
  const ensure = (title: string): LifeChapter => {
    let ch = chapterMap.get(title);
    if (!ch) {
      ch = {
        id: randomUUID(),
        title,
        description: `Projects and goals that cluster around ${title}.`,
        activeProjects: [],
        relatedPeople: [],
        openLoops: [],
      };
      chapterMap.set(title, ch);
    }
    return ch;
  };

  const activeProjects = ctx.sources.projects.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  );

  for (const p of activeProjects) {
    const seed = matchChapter(p.name) ?? matchChapter(p.description ?? "");
    const title = seed?.title ?? "Other active work";
    const ch = ensure(title);
    if (!ch.activeProjects.includes(p.name)) {
      ch.activeProjects.push(p.name);
    }
  }

  for (const g of ctx.sources.goals.filter(
    (g) => g.status !== "completed" && g.status !== "cancelled",
  )) {
    const seed = matchChapter(g.name) ?? matchChapter(g.description ?? "");
    const title = seed?.title ?? "Other active work";
    const ch = ensure(title);
    if (!ch.description.includes(g.name)) {
      ch.description = `${ch.description} Goal: ${g.name}.`;
    }
  }

  for (const b of ctx.sources.bucketItems.slice(0, 12)) {
    const seed = matchChapter(b.title) ?? matchChapter(b.description ?? "");
    if (seed) {
      const ch = ensure(seed.title);
      if (!ch.description.includes(b.title)) {
        ch.description = `${ch.description} Bucket: ${b.title}.`;
      }
    }
  }

  const loops = buildRadarOpenLoops(ctx.sources);
  const groups = groupOpenLoops(loops);
  for (const group of groups) {
    for (const loop of group.loops.slice(0, 2)) {
      const seed = matchChapter(loop.title);
      if (seed) {
        const ch = ensure(seed.title);
        if (!ch.openLoops.includes(loop.title)) {
          ch.openLoops.push(loop.title);
        }
      }
    }
  }

  for (const r of ctx.sources.relationships.slice(0, 20)) {
    const notes = r.general_notes ?? r.last_interaction_notes ?? "";
    const seed = matchChapter(r.person_name) ?? matchChapter(notes);
    if (seed?.title === "Relationships") {
      const ch = ensure("Relationships");
      if (!ch.relatedPeople.includes(r.person_name)) {
        ch.relatedPeople.push(r.person_name);
      }
      if (r.next_action?.trim()) {
        ch.nextAction = r.next_action;
      }
    }
  }

  const recentJournal = ctx.sources.journalEntries[0];
  if (recentJournal) {
    for (const ch of chapterMap.values()) {
      if (ch.activeProjects.length > 0) {
        ch.emotionalTone = `Recent journal: ${recentJournal.primaryEmotion} (${recentJournal.topic})`;
        break;
      }
    }
  }

  const chapters = [...chapterMap.values()]
    .filter((c) => c.activeProjects.length > 0 || c.relatedPeople.length > 0 || c.openLoops.length > 0)
    .sort((a, b) => b.activeProjects.length - a.activeProjects.length)
    .slice(0, 8);

  if (chapters.length === 0 && activeProjects.length > 0) {
    chapters.push({
      id: randomUUID(),
      title: "Current projects",
      description: "Active projects from your Life OS.",
      activeProjects: activeProjects.slice(0, 6).map((p) => p.name),
      relatedPeople: [],
      openLoops: [],
    });
  }

  return {
    chapters,
    memoryUsed: ctx.memoryUsed,
    warnings: ctx.warnings.length ? ctx.warnings : undefined,
  };
}
