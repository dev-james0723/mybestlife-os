import type { ReactNode } from "react";
import { AiKnowledgeProviders } from "@/components/ai-knowledge/ai-knowledge-providers";

/**
 * Layout wrapper for the AI Knowledge section. Mounts section-scoped client
 * providers (run-with-Gemini dialog, ⌘K command palette listener).
 */
export default function AiKnowledgeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ai-knowledge-section">
      <AiKnowledgeProviders>{children}</AiKnowledgeProviders>
    </div>
  );
}
