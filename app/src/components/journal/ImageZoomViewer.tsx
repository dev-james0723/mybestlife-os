"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageZoomViewerProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageZoomViewer({ src, alt, onClose }: ImageZoomViewerProps) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt ?? "Image"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-background/80 p-2 text-foreground shadow hover:bg-background"
      >
        <X className="size-5" aria-hidden />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
      />
    </div>
  );
}
