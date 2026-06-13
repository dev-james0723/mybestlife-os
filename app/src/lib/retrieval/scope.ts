import {
  LIFE_AGENT_PERMISSION_DOMAINS,
  type LifeAgentPermission,
  type LifeAgentPermissionDomain,
} from "@/types/life-agent";
import {
  canReadDomain,
  resolveLifeAgentPermissions,
} from "@/lib/life-agent/permission-policy";
import type {
  RetrievalScope,
  RetrievalSourceChip,
  RetrievalSourceDomain,
} from "@/lib/retrieval/types";

const KNOWLEDGE_EXTENSION_DOMAINS: RetrievalSourceDomain[] = [
  "doc_oracle",
  "ai_knowledge",
];

export const RETRIEVAL_SOURCE_LABELS: Record<RetrievalSourceDomain, string> = {
  about_me: "About Me",
  projects: "Projects",
  tasks: "Tasks",
  goals: "Goals",
  habits: "Habits",
  relationships: "Relationships",
  role_models: "Role Models",
  assets: "Assets",
  documents: "Documents",
  notes: "Notes",
  journal: "Journal",
  bucket_list: "Bucket List",
  knowledge: "Knowledge Base",
  finance: "Finance",
  health: "Health",
  brain_graph: "Brain Graph",
  doc_oracle: "Doc Oracle",
  ai_knowledge: "AI Knowledge",
  quote_library: "Quote Library",
  software_vault: "Software Vault",
};

export function isRetrievalSourceDomain(value: string): value is RetrievalSourceDomain {
  return (
    (LIFE_AGENT_PERMISSION_DOMAINS as readonly string[]).includes(value) ||
    value === "doc_oracle" ||
    value === "ai_knowledge" ||
    value === "quote_library" ||
    value === "software_vault"
  );
}

function isLifeAgentDomain(value: RetrievalSourceDomain): value is LifeAgentPermissionDomain {
  return (LIFE_AGENT_PERMISSION_DOMAINS as readonly string[]).includes(value);
}

export function resolveAskKbRetrievalScope(params: {
  userId: string;
  permissionRows: LifeAgentPermission[];
  requestedSourceDomains?: RetrievalSourceDomain[];
  sessionGrantedDomains?: LifeAgentPermissionDomain[];
}): RetrievalScope {
  const sessionGrantedDomains = params.sessionGrantedDomains ?? [];
  const permissions = resolveLifeAgentPermissions(
    params.userId,
    params.permissionRows,
    sessionGrantedDomains,
  );
  const readableLifeAgentDomains = LIFE_AGENT_PERMISSION_DOMAINS.filter((domain) =>
    canReadDomain(permissions, domain),
  );

  const allowed = new Set<RetrievalSourceDomain>(readableLifeAgentDomains);

  // Ask My Knowledge Base is mounted inside Knowledge Base, so preserve the existing
  // first-party KB search even before users configure Life Agent permissions.
  allowed.add("knowledge");
  for (const domain of KNOWLEDGE_EXTENSION_DOMAINS) allowed.add(domain);

  if (allowed.has("brain_graph")) {
    allowed.add("quote_library");
  }

  if (allowed.has("assets") || allowed.has("documents")) {
    allowed.add("software_vault");
  }

  const requested = params.requestedSourceDomains ?? [];
  const sourceDomains =
    requested.length > 0
      ? requested.filter((domain) => allowed.has(domain))
      : [...allowed];

  const excludedSourceDomains =
    requested.length > 0
      ? requested.filter((domain) => !allowed.has(domain))
      : [];

  sourceDomains.sort((a, b) => {
    if (a === "knowledge") return -1;
    if (b === "knowledge") return 1;
    return RETRIEVAL_SOURCE_LABELS[a].localeCompare(RETRIEVAL_SOURCE_LABELS[b]);
  });

  return {
    sourceDomains,
    requestedSourceDomains: requested,
    readableLifeAgentDomains,
    excludedSourceDomains,
    sessionGrantedDomains,
  };
}

export function sourceChipsForScope(scope: RetrievalScope): RetrievalSourceChip[] {
  const active = new Set(scope.sourceDomains);
  return scope.sourceDomains.map((domain) => ({
    domain,
    label: RETRIEVAL_SOURCE_LABELS[domain],
    active: active.has(domain),
    removable: domain !== "knowledge",
  }));
}

export function parseRetrievalSourceDomains(value: unknown): RetrievalSourceDomain[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is RetrievalSourceDomain =>
    typeof entry === "string" && isRetrievalSourceDomain(entry),
  );
}

export function parseSessionGrantedDomains(value: unknown): LifeAgentPermissionDomain[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is LifeAgentPermissionDomain =>
    typeof entry === "string" &&
    isLifeAgentDomain(entry as RetrievalSourceDomain),
  );
}
