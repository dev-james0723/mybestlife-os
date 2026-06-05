import type { MindMapDbNode } from "@/lib/document-brain/mind-map/mindMapTypes";

export function mindMapNodeAccent(nodeType: string): { border: string; glow: string; minimap: string } {
  switch (nodeType) {
    case "document_root":
      return { border: "border-primary/80", glow: "shadow-[0_0_20px_hsl(var(--primary)_/_0.25)]", minimap: "hsl(var(--primary))" };
    case "concept":
      return { border: "border-violet-400/55", glow: "shadow-[0_0_16px_rgba(167,139,250,0.2)]", minimap: "#a78bfa" };
    case "section":
      return { border: "border-orange-400/55", glow: "shadow-[0_0_14px_rgba(251,146,60,0.18)]", minimap: "#fb923c" };
    case "subsection":
      return { border: "border-amber-400/45", glow: "shadow-[0_0_12px_rgba(251,191,36,0.15)]", minimap: "#fbbf24" };
    case "glossary":
      return { border: "border-emerald-400/55", glow: "shadow-[0_0_14px_rgba(52,211,153,0.18)]", minimap: "#34d399" };
    case "visual":
      return { border: "border-pink-400/55", glow: "shadow-[0_0_16px_rgba(244,114,182,0.2)]", minimap: "#f472b6" };
    case "page":
      return { border: "border-zinc-400/45", glow: "shadow-[0_0_10px_rgba(161,161,170,0.15)]", minimap: "#a1a1aa" };
    case "person":
    case "organization":
      return { border: "border-teal-400/55", glow: "shadow-[0_0_14px_rgba(45,212,191,0.18)]", minimap: "#2dd4bf" };
    case "date":
      return { border: "border-amber-300/55", glow: "shadow-[0_0_12px_rgba(252,211,77,0.15)]", minimap: "#fcd34d" };
    case "fee":
    case "requirement":
      return { border: "border-red-400/50", glow: "shadow-[0_0_14px_rgba(248,113,113,0.18)]", minimap: "#f87171" };
    case "question":
      return { border: "border-sky-400/50", glow: "shadow-[0_0_12px_rgba(56,189,248,0.15)]", minimap: "#38bdf8" };
    default:
      return { border: "border-white/15", glow: "", minimap: "#71717a" };
  }
}

export function mindMapNodeLabel(node: MindMapDbNode): string {
  return (node.label || "").slice(0, 200);
}
