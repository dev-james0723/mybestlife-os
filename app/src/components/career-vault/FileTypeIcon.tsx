"use client";

import {
  FileText,
  FileType2,
  ImageIcon,
  FileCode,
  FileIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function FileTypeIcon({
  mime,
  className,
}: {
  mime: string;
  className?: string;
}) {
  const shared = cn("h-8 w-8", className);

  if (mime.startsWith("image/")) return <ImageIcon className={shared} />;
  if (mime === "application/pdf")
    return <FileType2 className={cn(shared, "text-rose-500")} />;
  if (
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return <FileText className={cn(shared, "text-blue-500")} />;
  if (mime === "text/markdown")
    return <FileCode className={cn(shared, "text-violet-500")} />;
  if (mime === "text/plain")
    return <FileText className={cn(shared, "text-slate-500")} />;
  return <FileIcon className={shared} />;
}
