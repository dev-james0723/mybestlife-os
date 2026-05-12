"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BookOpen, Calendar, FileText, HelpCircle, ImageIcon, Layers, Sparkles, User } from "lucide-react";
import type { MindMapDbNode } from "@/lib/document-brain/mind-map/mindMapTypes";
import { mindMapNodeAccent, mindMapNodeLabel } from "@/components/document-oracle/mind-map/mindMapNodeStyles";
import { cn } from "@/lib/utils";

export type MindMapRfData = {
  db: MindMapDbNode;
  selected: boolean;
  dimmed: boolean;
};

export type MindMapFlowNode = Node<MindMapRfData, "mindMap">;

function TypeIcon({ t }: { t: string }) {
  const cls = "size-3.5 shrink-0 opacity-90";
  switch (t) {
    case "document_root":
      return <Sparkles className={cls} aria-hidden />;
    case "concept":
      return <Sparkles className={cls} aria-hidden />;
    case "section":
    case "subsection":
      return <Layers className={cls} aria-hidden />;
    case "glossary":
      return <BookOpen className={cls} aria-hidden />;
    case "visual":
      return <ImageIcon className={cls} aria-hidden />;
    case "page":
      return <FileText className={cls} aria-hidden />;
    case "person":
    case "organization":
      return <User className={cls} aria-hidden />;
    case "date":
      return <Calendar className={cls} aria-hidden />;
    case "question":
      return <HelpCircle className={cls} aria-hidden />;
    default:
      return <FileText className={cls} aria-hidden />;
  }
}

export function MindMapNode({ data }: NodeProps<MindMapFlowNode>) {
  const { db, selected, dimmed } = data;
  const accent = mindMapNodeAccent(db.node_type);
  return (
    <div
      className={cn(
        "relative w-[200px] max-w-[200px] rounded-xl border bg-[#0a0a0c]/95 px-2.5 py-2 text-left backdrop-blur-md transition-[opacity,transform,box-shadow]",
        accent.border,
        selected ? cn("ring-2 ring-[#C8E53A]/70", accent.glow) : accent.glow,
        dimmed ? "opacity-35" : "opacity-100",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-zinc-500" />
      <div className="flex items-start gap-2">
        <TypeIcon t={db.node_type} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-snug text-white/95">{mindMapNodeLabel(db)}</p>
          <p className="mt-0.5 text-[9px] uppercase tracking-wide text-white/40">{db.node_type.replace(/_/g, " ")}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-zinc-500" />
    </div>
  );
}
