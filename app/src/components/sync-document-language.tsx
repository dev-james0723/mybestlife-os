"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";

export function SyncDocumentLanguage() {
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
