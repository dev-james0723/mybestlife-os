import type { FinanceUiCopy } from "@/lib/i18n/finance-ui";

/** Preset values stored in `finance_accounts.account_type` (localized labels in finance-ui). */
export const FINANCE_ACCOUNT_TYPE_PRESETS = [
  "checking",
  "savings",
  "credit",
  "cash",
  "investment",
  "other",
] as const;

export type FinanceAccountTypePreset = (typeof FINANCE_ACCOUNT_TYPE_PRESETS)[number];

export function isFinanceAccountTypePreset(v: string): v is FinanceAccountTypePreset {
  return (FINANCE_ACCOUNT_TYPE_PRESETS as readonly string[]).includes(v);
}

export function financeAccountTypeLabel(copy: FinanceUiCopy, value: string): string {
  switch (value) {
    case "checking":
      return copy.accountTypeChecking;
    case "savings":
      return copy.accountTypeSavings;
    case "credit":
      return copy.accountTypeCredit;
    case "cash":
      return copy.accountTypeCash;
    case "investment":
      return copy.accountTypeInvestment;
    case "other":
      return copy.accountTypeOther;
    default:
      return value;
  }
}
