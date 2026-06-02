"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { Package, Plus, Lock } from "lucide-react";
import {
  useSoftwareVault,
  useDeleteSoftwareVaultEntry,
} from "@/hooks/use-software-vault";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import { useVaultSession, useVaultData } from "@/stores/vault-store";
import { VaultChrome } from "@/components/vault/chrome/VaultChrome";
import { VaultFilterBar } from "@/components/vault/VaultFilterBar";
import { VaultGallery } from "@/components/vault/VaultGallery";
import { VaultCostDashboard } from "@/components/vault/VaultCostDashboard";
import { VaultDetailModal } from "@/components/vault/VaultDetailModal";
import { VaultAddDialog } from "@/components/vault/VaultAddDialog";
import { VaultEditDialog } from "@/components/vault/VaultEditDialog";
import { VaultSoftwareModeTabs } from "@/components/vault/VaultSoftwareModeTabs";
import { VaultLibraryModePlaceholder } from "@/components/vault/VaultLibraryModePlaceholder";
import { VaultRecommendedStacksPanel } from "@/components/vault/VaultRecommendedStacksPanel";
import { VaultBuildMyStackPanel } from "@/components/vault/VaultBuildMyStackPanel";
import { VaultComparePanel } from "@/components/vault/VaultComparePanel";
import { VaultOverlapInsightsCard } from "@/components/vault/VaultOverlapInsightsCard";
import { VaultIntelligenceCommandCenter } from "@/components/vault/VaultIntelligenceCommandCenter";

export function VaultInterior() {
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);

  const { data: entries, isLoading } = useSoftwareVault();
  const deleteMutation = useDeleteSoftwareVaultEntry();
  const lock = useVaultSession((s) => s.lock);

  const selectedEntryId = useVaultData((s) => s.selectedEntryId);
  const selectEntry = useVaultData((s) => s.selectEntry);
  const viewMode = useVaultData((s) => s.viewMode);
  const softwareMode = useVaultData((s) => s.softwareMode);
  const setSoftwareMode = useVaultData((s) => s.setSoftwareMode);
  const addDialogOpen = useVaultData((s) => s.addDialogOpen);
  const setAddDialogOpen = useVaultData((s) => s.setAddDialogOpen);
  const compareVaultEntryIds = useVaultData((s) => s.compareVaultEntryIds);
  const setCompareVaultEntryIds = useVaultData((s) => s.setCompareVaultEntryIds);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selectedEntry = useMemo(
    () => entries?.find((e) => e.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );

  const entryList = entries ?? [];

  useEffect(() => {
    const ids = entryList.map((e) => e.id);
    if (ids.length === 0) {
      if (compareVaultEntryIds.length > 0) setCompareVaultEntryIds([]);
      return;
    }
    const valid = new Set(ids);
    const next = compareVaultEntryIds.filter((id) => valid.has(id));
    if (next.length !== compareVaultEntryIds.length) setCompareVaultEntryIds(next);
  }, [entryList, compareVaultEntryIds, setCompareVaultEntryIds]);

  if (isLoading) {
    return (
      <>
        <VaultChrome />
        <LoadingPage />
      </>
    );
  }

  const addLabel = copy.gallery.addBtn[uiTheme];

  return (
    <>
      <VaultChrome />
      <PageShell
        title={copy.gallery.title[uiTheme]}
        description={copy.gallery.description[uiTheme]}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {softwareMode === "my-vault" ? <VaultCostDashboard entries={entryList} /> : null}
            <Button variant="ghost" size="sm" onClick={lock} title={copy.gallery.lockBtn}>
              <Lock className="h-4 w-4" />
            </Button>
            {softwareMode === "my-vault" ? (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {addLabel}
              </Button>
            ) : null}
          </div>
        }
      >
        <div
          aria-live="polite"
          className="sr-only"
          role="status"
        >
          {copy.gate.unlockedAnnouncement}
        </div>

        <VaultSoftwareModeTabs
          copy={copy.modes}
          value={softwareMode}
          onValueChange={setSoftwareMode}
        />

        {softwareMode === "my-vault" ? (
          <>
            <VaultIntelligenceCommandCenter
              entries={entryList}
              onOpenSmartAdd={() => setAddDialogOpen(true)}
              onSelectEntry={selectEntry}
            />

            <VaultFilterBar entries={entryList} />

            {entryList.length > 0 ? (
              <VaultOverlapInsightsCard entries={entryList} copy={copy.insights} compact />
            ) : null}

            <VaultGallery
              entries={entryList}
              viewMode={viewMode}
              onSelect={selectEntry}
              emptyState={
                <EmptyState
                  icon={Package}
                  title={copy.gallery.emptyTitle[uiTheme]}
                  description={copy.gallery.emptyDescription}
                  action={{
                    label: addLabel,
                    onClick: () => setAddDialogOpen(true),
                  }}
                />
              }
            />
          </>
        ) : softwareMode === "recommended-stacks" ? (
          <VaultRecommendedStacksPanel copy={copy.recommended} entries={entryList} />
        ) : softwareMode === "build-stack" ? (
          <VaultBuildMyStackPanel copy={copy} entries={entryList} />
        ) : softwareMode === "compare" ? (
          <VaultComparePanel entries={entryList} compare={copy.compare} insights={copy.insights} />
        ) : (
          <VaultLibraryModePlaceholder copy={copy.modes} />
        )}
      </PageShell>

      <VaultDetailModal
        entry={selectedEntry}
        entries={entryList}
        onClose={() => selectEntry(null)}
        onEdit={() => setEditOpen(true)}
        onDelete={() => selectedEntry && setDeleteId(selectedEntry.id)}
        onSelectRelated={(id) => selectEntry(id)}
      />

      <VaultEditDialog
        entry={selectedEntry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <VaultAddDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirm.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.confirm.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.confirm.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await deleteMutation.mutateAsync(deleteId);
                  setDeleteId(null);
                  selectEntry(null);
                } catch {
                  /* handled in hook */
                }
              }}
            >
              {copy.confirm.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
