import { notFound } from "next/navigation";
import { EXPERIMENTAL_TOOLS_ENABLED } from "@/lib/features";
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!EXPERIMENTAL_TOOLS_ENABLED) notFound();
  return children;
}
