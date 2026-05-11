"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsRepository } from "@/lib/repositories/settings";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getFinanceUiCopy } from "@/lib/i18n/finance-ui";
import { getSettingsUiCopy } from "@/lib/i18n/settings-ui";
import { logSupabaseClientError } from "@/lib/utils/onboarding-save-error-hint";

export function useUpdateDisplayCurrency() {
  const queryClient = useQueryClient();
  const language = useAppStore((s) => s.language);
  const financeUi = getFinanceUiCopy(language);
  const settingsUi = getSettingsUiCopy(language);

  return useMutation({
    mutationFn: (display_currency: string) =>
      settingsRepository.updateProfile({ display_currency }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["fx-rates"] });
      toast.success(financeUi.toastDisplayCurrencySaved);
    },
    onError: (err) => {
      logSupabaseClientError("useUpdateDisplayCurrency", err);
      toast.error(settingsUi.toastPreferencesFailed);
    },
  });
}
