"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";

interface AIActionButtonProps<T> {
  label: string;
  onExecute: () => Promise<T>;
  resultRenderer?: (result: T) => ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export function AIActionButton<T>({
  label,
  onExecute,
  resultRenderer,
  variant = "outline",
  size = "sm",
  className,
  disabled,
}: AIActionButtonProps<T>) {
  const language = useAppStore((s) => s.language);
  const ui = getCommonUiCopy(language);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const data = await onExecute();
      setResult(data);
    } catch {
      toast.error(ui.aiActionFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn("gap-2", className)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isLoading ? ui.generating : label}
      </Button>
      {result && resultRenderer && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
          {resultRenderer(result)}
        </div>
      )}
    </div>
  );
}
