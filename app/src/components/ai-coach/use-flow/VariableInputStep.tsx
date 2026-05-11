"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AICoachCopy } from "@/lib/i18n/ai-coach-ui";

interface Props {
  copy: AICoachCopy;
  required: string[];
  optional: string[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  errors: Record<string, boolean>;
}

function humanize(name: string): string {
  return name
    .split("_")
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(" ");
}

export function VariableInputStep({
  copy,
  required,
  optional,
  values,
  onChange,
  errors,
}: Props) {
  const hasAny = required.length + optional.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{copy.flow.variables.title}</h2>
        <p className="text-sm text-muted-foreground">
          {copy.flow.variables.description}
        </p>
      </div>

      {!hasAny ? (
        <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
          {/* fallback if a template has no variables */}
          —
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...required.map((v) => ({ v, isReq: true })), ...optional.map((v) => ({ v, isReq: false }))].map(
            ({ v, isReq }) => (
              <div key={v} className="grid gap-1.5">
                <Label htmlFor={`var-${v}`} className="flex items-center gap-2">
                  <span className="font-mono text-xs">[{v}]</span>
                  <Badge
                    variant={isReq ? "default" : "outline"}
                    className="font-normal"
                  >
                    {isReq
                      ? copy.flow.variables.requiredBadge
                      : copy.flow.variables.optionalBadge}
                  </Badge>
                </Label>
                <Input
                  id={`var-${v}`}
                  value={values[v] ?? ""}
                  onChange={(e) => onChange(v, e.target.value)}
                  placeholder={copy.flow.variables.fillPlaceholder(humanize(v))}
                  aria-invalid={errors[v] ? true : undefined}
                  className={errors[v] ? "border-destructive" : undefined}
                />
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
