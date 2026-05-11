"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { BundleTemplateKey } from "@/types/career-vault";
import { BUNDLE_TEMPLATES } from "@/lib/career-vault/bundle-templates";

interface BundleTemplateSelectorProps {
  copy: CareerVaultCopy;
  value: BundleTemplateKey;
  onChange: (value: BundleTemplateKey) => void;
}

export function BundleTemplateSelector({
  copy,
  value,
  onChange,
}: BundleTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {BUNDLE_TEMPLATES.map((tpl) => {
        const active = tpl.type === value;
        return (
          <button
            key={tpl.type}
            type="button"
            onClick={() => onChange(tpl.type)}
            className={cn(
              "relative rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40",
              active && "border-primary ring-1 ring-primary/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none" aria-hidden>
                {tpl.icon}
              </span>
              <span className="text-sm font-medium">
                {copy.bundles.templates[tpl.type]}
              </span>
              {active ? (
                <Check className="ml-auto h-4 w-4 text-primary" />
              ) : null}
            </div>
            {tpl.suggestedCategories.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                {tpl.suggestedCategories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border px-1.5 py-0.5"
                  >
                    {copy.categories[c]}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
