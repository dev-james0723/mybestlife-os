"use client";

import { useMemo, type ReactElement } from "react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  useBucketSettings,
  useClearBucketSeeds,
  useUpdateBucketSettings,
} from "@/hooks/use-bucket-list";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { bucketControlSize, bucketGlassControl } from "./bucket-glass";

/**
 * Popover that surfaces settings affecting the bucket list experience:
 * default origin airport (used by flight watch), preferred currency,
 * and the "Clear seed dreams" destructive toggle.
 */
export function BucketSettingsPopover({ trigger }: { trigger: ReactElement }) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const settingsQuery = useBucketSettings();
  const settings = settingsQuery.data;
  const updateSettings = useUpdateBucketSettings();
  const clearSeeds = useClearBucketSeeds();

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] sm:w-80"
      >
        <PopoverHeader>
          <PopoverTitle>{copy.settingsAction}</PopoverTitle>
          <PopoverDescription>
            Defaults for new dreams and flight watch.
          </PopoverDescription>
        </PopoverHeader>

        <Separator />

        <div className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="bucket-origin-airport"
                className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
              >
                Origin airport
              </Label>
              <Input
                id="bucket-origin-airport"
                placeholder="JFK"
                value={settings?.default_origin_airport ?? ""}
                onChange={(e) => {
                  const next = e.target.value.toUpperCase().slice(0, 3);
                  updateSettings.mutate({ default_origin_airport: next });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="bucket-currency"
                className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
              >
                Currency
              </Label>
              <Input
                id="bucket-currency"
                placeholder="USD"
                value={settings?.default_currency ?? "USD"}
                onChange={(e) => {
                  const next = e.target.value.toUpperCase().slice(0, 3);
                  if (/^[A-Z]{3}$/.test(next)) {
                    updateSettings.mutate({ default_currency: next });
                  }
                }}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Dev & onboarding
            </p>
            <Button
              size="sm"
              variant="outline"
              className={cn(bucketGlassControl, bucketControlSize, "w-full justify-start")}
              disabled={clearSeeds.isPending || Boolean(settings?.seeds_cleared)}
              onClick={() => clearSeeds.mutate()}
            >
              {settings?.seeds_cleared
                ? "Seed dreams already cleared"
                : copy.clearSeedsAction}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
