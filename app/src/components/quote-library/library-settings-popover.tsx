"use client";

import { useMemo, useState } from "react";
import { Download, FileDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import { useQuotes } from "@/hooks/use-quotes";

export function LibrarySettingsPopover() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const queryClient = useQueryClient();
  const showAiBadge = useQuoteLibraryStore((s) => s.showAiBadge);
  const setShowAiBadge = useQuoteLibraryStore((s) => s.setShowAiBadge);
  const { data: quotes } = useQuotes();

  const [confirmClear, setConfirmClear] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  return (
    <>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={copy.settingsAction}
              className="h-11 min-h-11 w-11 rounded-xl"
            >
              <Settings2 className="size-4" aria-hidden />
            </Button>
          }
        />
        <PopoverContent align="end" className="w-72 space-y-4 p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{copy.settingsTitle}</h3>
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl text-sm">
            <span>{copy.settingsShowAiBadge}</span>
            <Checkbox
              checked={showAiBadge}
              onCheckedChange={(v) => setShowAiBadge(v === true)}
            />
          </label>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-[44px] min-h-[44px] w-full justify-start rounded-xl"
              disabled={!quotes || quotes.length === 0}
              onClick={async () => {
                if (!quotes || quotes.length === 0) return;
                const { exportQuotesToCsv } = await import(
                  "@/lib/quote-library/export-csv"
                );
                exportQuotesToCsv(quotes);
              }}
            >
              <Download className="mr-2 size-4" aria-hidden />
              {copy.exportCsv}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-[44px] min-h-[44px] w-full justify-start rounded-xl"
              disabled={!quotes || quotes.length === 0 || isExportingPdf}
              onClick={async () => {
                if (!quotes || quotes.length === 0) return;
                setIsExportingPdf(true);
                try {
                  const { exportQuotesToPdf } = await import(
                    "@/lib/quote-library/export-pdf"
                  );
                  await exportQuotesToPdf(quotes, { title: copy.pageTitle });
                } catch {
                  toast.error(copy.errorGeneric);
                } finally {
                  setIsExportingPdf(false);
                }
              }}
            >
              <FileDown className="mr-2 size-4" aria-hidden />
              {copy.exportPdf}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-[44px] min-h-[44px] w-full rounded-xl"
            onClick={() => setConfirmClear(true)}
          >
            {copy.settingsClearSeeds}
          </Button>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.settingsClearSeeds}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.settingsClearSeedsConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-[44px] min-h-[44px] rounded-xl px-4">
              {copy.buttonCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-[44px] min-h-[44px] rounded-xl px-4"
              onClick={async () => {
                try {
                  const res = await fetch("/api/quote-library/seed", {
                    method: "DELETE",
                  });
                  if (!res.ok) throw new Error();
                  await queryClient.invalidateQueries({ queryKey: ["quotes"] });
                  toast.success(copy.toastDeleted);
                } catch {
                  toast.error(copy.errorGeneric);
                }
                setConfirmClear(false);
              }}
            >
              {copy.buttonDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
