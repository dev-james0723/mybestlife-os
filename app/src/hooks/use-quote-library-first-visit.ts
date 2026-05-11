"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuotes } from "./use-quotes";

const FIRST_VISIT_FLAG = "mylifeos-quote-library-seeded-v1";

/**
 * On first visit to the Quote Library, load the 30-quote starter pack so the
 * library is never empty. Runs once per browser per user. User can clear the
 * seed quotes from Library Settings later.
 */
export function useQuoteLibraryFirstVisit() {
  const queryClient = useQueryClient();
  const { data: quotes, isLoading } = useQuotes();
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    if (isLoading) return;
    if (!quotes) return;
    if (quotes.length > 0) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(FIRST_VISIT_FLAG) === "done") return;

    seededRef.current = true;
    window.localStorage.setItem(FIRST_VISIT_FLAG, "done");
    void fetch("/api/quote-library/seed", { method: "POST" })
      .then((res) => {
        if (res.ok) {
          void queryClient.invalidateQueries({ queryKey: ["quotes"] });
        }
      })
      .catch(() => {
        /* non-fatal — empty state still has an inviting CTA */
      });
  }, [isLoading, quotes, queryClient]);
}
