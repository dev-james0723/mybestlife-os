"use client";

import { useMemo } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import {
  LIFE_AGENT_ACCESS_LEVELS,
  LIFE_AGENT_PERMISSION_DOMAINS,
  type LifeAgentAccessLevel,
  type LifeAgentPermission,
  type LifeAgentPermissionDomain,
} from "@/types/life-agent";

type AgentPermissionPanelProps = {
  ui: LifeAgentUiCopy;
  permissions: LifeAgentPermission[] | undefined;
  isLoading: boolean;
  isSaving: boolean;
  onAccessLevelChange: (
    domain: LifeAgentPermissionDomain,
    access_level: LifeAgentAccessLevel,
  ) => void;
  className?: string;
};

export function AgentPermissionPanel({
  ui,
  permissions,
  isLoading,
  isSaving,
  onAccessLevelChange,
  className,
}: AgentPermissionPanelProps) {
  const byDomain = useMemo(() => {
    const map = new Map<LifeAgentPermissionDomain, LifeAgentPermission>();
    for (const row of permissions ?? []) {
      map.set(row.domain, row);
    }
    return map;
  }, [permissions]);

  return (
    <aside className={className} aria-labelledby="life-agent-permissions-heading">
      <div className="space-y-4 rounded-3xl border border-border/60 bg-card/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 id="life-agent-permissions-heading" className="text-base font-semibold">
              {ui.permissionPanelTitle}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">{ui.permissionPanelSubtitle}</p>
        </div>

        <p className="rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          {ui.permissionPanelPhaseNote}
        </p>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{ui.permissionDomainLabel}</p>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">{ui.permissionsLoading}</p>
          ) : (
            <ul className="space-y-1.5">
              {LIFE_AGENT_PERMISSION_DOMAINS.map((domain) => {
                const row = byDomain.get(domain);
                const level = row?.access_level ?? "ask_every_time";
                return (
                  <li
                    key={domain}
                    className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-xs font-medium capitalize text-foreground/90">
                      {domain.replace(/_/g, " ")}
                    </span>
                    <Select
                      value={level}
                      onValueChange={(v) => {
                        if (v !== null) {
                          onAccessLevelChange(domain, v as LifeAgentAccessLevel);
                        }
                      }}
                      disabled={isSaving}
                      itemToStringLabel={(v) =>
                        ui.accessLevelLabels[v as LifeAgentAccessLevel] ?? String(v)
                      }
                    >
                      <SelectTrigger size="sm" className="h-8 w-full sm:w-[11.5rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIFE_AGENT_ACCESS_LEVELS.map((accessLevel) => (
                          <SelectItem key={accessLevel} value={accessLevel}>
                            {ui.accessLevelLabels[accessLevel]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Button type="button" variant="outline" className="w-full rounded-xl" disabled>
          {ui.permissionOpenSettingsSoon}
        </Button>
      </div>
    </aside>
  );
}
