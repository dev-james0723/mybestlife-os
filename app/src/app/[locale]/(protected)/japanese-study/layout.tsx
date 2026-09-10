import { notFound } from "next/navigation";
import { LEARNING_ENABLED } from "@/lib/features";
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!LEARNING_ENABLED) notFound();
  return children;
}
