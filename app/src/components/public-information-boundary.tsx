"use client";
import { usePathname } from "next/navigation";
export function PublicInformationBoundary({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const pathname = usePathname();
  if (/\/(privacy|help)$/.test(pathname)) return <main className="mx-auto min-h-dvh max-w-4xl px-5 py-10">{content}</main>;
  return children;
}
