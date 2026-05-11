"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { useShareAccessLogs } from "@/hooks/use-career-vault-shares";
import { careerVaultSharesRepository } from "@/lib/repositories/career-vault-shares";

interface AccessLogModalProps {
  shareId: string | null;
  onClose: () => void;
  copy: CareerVaultCopy;
}

export function AccessLogModal({ shareId, onClose, copy }: AccessLogModalProps) {
  const logsCopy = copy.shares.accessLog;
  const logsQuery = useShareAccessLogs(shareId);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const logs = logsQuery.data ?? [];

  const handleClear = async () => {
    if (!shareId) return;
    setClearing(true);
    try {
      await careerVaultSharesRepository.deleteAccessLogs(shareId);
      toast.success(copy.shares.toasts.logsCleared);
      logsQuery.refetch();
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case "viewed":
        return logsCopy.actions.viewed;
      case "downloaded":
        return logsCopy.actions.downloaded;
      case "password_failed":
        return logsCopy.actions.password_failed;
      default:
        return action;
    }
  };

  return (
    <Dialog open={!!shareId} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{logsCopy.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{logsCopy.description}</p>

        {logsQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">…</p>
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {logsCopy.empty}
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/70">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">{logsCopy.whenColumn}</th>
                  <th className="px-3 py-2 font-medium">{logsCopy.actionColumn}</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">
                    {logsCopy.ipHashColumn}
                  </th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">
                    {logsCopy.uaColumn}
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(log.accessed_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          log.action === "password_failed"
                            ? "destructive"
                            : log.action === "downloaded"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {actionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="hidden px-3 py-2 font-mono text-[10px] text-muted-foreground sm:table-cell">
                      {log.ip_hash?.slice(0, 16) ?? "—"}
                    </td>
                    <td
                      className="hidden max-w-[220px] truncate px-3 py-2 text-muted-foreground md:table-cell"
                      title={log.user_agent ?? ""}
                    >
                      {log.user_agent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {logs.length > 0 ? (
            <Button
              variant="outline"
              onClick={() => setConfirmClear(true)}
              disabled={clearing}
            >
              {logsCopy.clearAll}
            </Button>
          ) : null}
          <Button onClick={onClose}>{logsCopy.close}</Button>
        </div>

        <AlertDialog
          open={confirmClear}
          onOpenChange={(v) => (v ? null : setConfirmClear(false))}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{logsCopy.clearAll}</AlertDialogTitle>
              <AlertDialogDescription>
                {logsCopy.clearConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.actions.cancel}</AlertDialogCancel>
              <AlertDialogAction disabled={clearing} onClick={handleClear}>
                {logsCopy.clearAll}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
