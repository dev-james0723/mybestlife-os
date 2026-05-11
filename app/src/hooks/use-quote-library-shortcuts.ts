"use client";

import { useEffect } from "react";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import { useQueryClient } from "@tanstack/react-query";
import type { Quote } from "@/types/quote";
import { useToggleFavoriteQuote } from "./use-quotes";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Keyboard shortcuts for the Quote Library page:
 *   • /  — focus the search input
 *   • n  — open the Add Quote sheet
 *   • j  — next quote in the list (opens its detail)
 *   • k  — previous quote
 *   • f  — toggle favorite on the currently open quote
 *   • Esc — close any open sheet/dialog (Base UI handles this by default,
 *          we only intercept `/` etc. to avoid stealing it)
 */
export function useQuoteLibraryShortcuts() {
  const openAddSheet = useQuoteLibraryStore((s) => s.openAddSheet);
  const openQuoteId = useQuoteLibraryStore((s) => s.openQuoteId);
  const setOpenQuoteId = useQuoteLibraryStore((s) => s.setOpenQuoteId);
  const toggleFavorite = useToggleFavoriteQuote();
  const queryClient = useQueryClient();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      const quotes =
        queryClient.getQueryData<Quote[]>(["quotes"]) ?? [];
      const currentIndex = openQuoteId
        ? quotes.findIndex((q) => q.id === openQuoteId)
        : -1;

      if (e.key === "/") {
        const search = document.querySelector<HTMLInputElement>(
          'input[type="text"][aria-label], input[placeholder*="Search"], input[placeholder*="搜尋"], input[placeholder*="搜索"]',
        );
        if (search) {
          e.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        openAddSheet();
        return;
      }

      if (e.key === "j" || e.key === "J") {
        if (quotes.length === 0) return;
        const next =
          currentIndex >= 0 && currentIndex < quotes.length - 1
            ? quotes[currentIndex + 1]
            : quotes[0];
        if (next) setOpenQuoteId(next.id);
        return;
      }

      if (e.key === "k" || e.key === "K") {
        if (quotes.length === 0) return;
        const prev =
          currentIndex > 0
            ? quotes[currentIndex - 1]
            : quotes[quotes.length - 1];
        if (prev) setOpenQuoteId(prev.id);
        return;
      }

      if (e.key === "f" || e.key === "F") {
        if (!openQuoteId) return;
        const current = quotes.find((q) => q.id === openQuoteId);
        if (!current) return;
        toggleFavorite.mutate({
          id: current.id,
          favorite: !current.is_favorite,
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openAddSheet, openQuoteId, setOpenQuoteId, queryClient, toggleFavorite]);
}
