export type InfographicStyle =
  | "executive_brief"
  | "timeline_story"
  | "concept_map"
  | "data_dashboard"
  | "visual_explainer"
  | "editorial_magazine";

export type InfographicStylePreset = {
  id: InfographicStyle;
  label: string;
  description: string;
  bestFor: string;
  visualPromptInstruction: string;
};

export const INFOGRAPHIC_STYLE_PRESETS: readonly InfographicStylePreset[] = [
  {
    id: "executive_brief",
    label: "Executive Brief",
    description: "Clean corporate layout with charts, callout boxes, and key numbers.",
    bestFor: "Business reports, financial reports, proposals",
    visualPromptInstruction:
      "Layout like a polished executive one-pager: crisp grid, KPI callouts, subtle chart motifs (abstract, not copied figures), strong hierarchy, restrained palette, plenty of whitespace.",
  },
  {
    id: "timeline_story",
    label: "Timeline Story",
    description: "Chronological flow with milestones, arrows, and date cards.",
    bestFor: "Event schedules, historical documents, project plans",
    visualPromptInstruction:
      "Horizontal or vertical timeline with milestone nodes, arrow connectors, date chips, and short milestone titles; emphasize sequence and causality.",
  },
  {
    id: "concept_map",
    label: "Concept Map",
    description: "Mind-map-like clusters with nodes, relationship lines, and concept grouping.",
    bestFor: "Educational PDFs, complex concepts, strategy documents",
    visualPromptInstruction:
      "Concept-map / knowledge-graph style: labeled nodes, curved relationship edges, clustered themes, central anchor concept, readable short labels only.",
  },
  {
    id: "data_dashboard",
    label: "Data Dashboard",
    description: "Analytical dashboard with statistic cards, small charts, and comparison blocks.",
    bestFor: "Finance, reports, metrics, KPIs",
    visualPromptInstruction:
      "Dashboard poster: metric tiles, sparkline-style mini charts (stylized, not copied), comparison columns, trend arrows; numbers must match grounded facts only.",
  },
  {
    id: "visual_explainer",
    label: "Visual Explainer",
    description: "Educational poster with icons, numbered steps, and simple diagrams.",
    bestFor: "Guides, policies, instructions",
    visualPromptInstruction:
      "Friendly explainer poster: numbered steps, simple iconography, flow arrows, checklist strips, large readable headings; avoid dense paragraphs on the canvas.",
  },
  {
    id: "editorial_magazine",
    label: "Editorial Magazine",
    description: "Magazine cover energy with strong typographic hierarchy and editorial rhythm.",
    bestFor: "Arts, culture, festival, biography, marketing PDFs",
    visualPromptInstruction:
      "Editorial magazine spread: bold masthead, pull quotes as design elements, column rhythm, elegant serif/sans pairing, premium print feel, tasteful color blocking.",
  },
] as const;

export function getInfographicStylePreset(id: InfographicStyle): InfographicStylePreset | undefined {
  return INFOGRAPHIC_STYLE_PRESETS.find((p) => p.id === id);
}
