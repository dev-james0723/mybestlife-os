"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";

interface PasswordPromptProps {
  copy: CareerVaultCopy;
  onSubmit: (password: string) => Promise<void> | void;
  invalid?: boolean;
  loading?: boolean;
}

export function PasswordPrompt({
  copy,
  onSubmit,
  invalid,
  loading,
}: PasswordPromptProps) {
  const pw = copy.shares.public.password;
  const [value, setValue] = useState("");

  return (
    <form
      className="mx-auto mt-12 w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(value);
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="mt-3 text-base font-semibold">{pw.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{pw.description}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="share-password-input">{pw.label}</Label>
        <Input
          id="share-password-input"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={pw.placeholder}
          autoComplete="current-password"
          autoFocus
        />
        {invalid ? (
          <p className="text-xs text-destructive">{pw.invalid}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={loading || !value}>
        {loading ? pw.submitting : pw.submit}
      </Button>
    </form>
  );
}
