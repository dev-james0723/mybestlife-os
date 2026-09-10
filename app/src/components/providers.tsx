"use client";

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-context";
import { SyncDocumentLanguage } from "@/components/sync-document-language";
import { useDeferredClientMount } from "@/hooks/use-deferred-client-mount";

const LazyLiquidIconPreloader = dynamic(
  () =>
    import("@/components/liquid-icons/LiquidIconPreloader").then(
      (mod) => mod.LiquidIconPreloader,
    ),
  { ssr: false },
);

function DeferredLiquidIconPreloader() {
  const ready = useDeferredClientMount({ timeoutMs: 3_000, fallbackDelayMs: 1_800 });
  return ready ? <LazyLiquidIconPreloader /> : null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    let owner: string | null | undefined;
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      const nextOwner = session?.user.id ?? null;
      if (owner !== undefined && owner !== nextOwner) {
        // Query keys and some in-memory stores are feature scoped. Start a
        // fresh document on account changes, including changes in another tab.
        queryClient.clear();
        window.location.reload();
      }
      owner = nextOwner;
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SyncDocumentLanguage />
          <DeferredLiquidIconPreloader />
          {children}
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
