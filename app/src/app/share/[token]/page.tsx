import type { Metadata } from "next";
import { SharePageView } from "./components/SharePageView";

export const metadata: Metadata = {
  title: "Shared with you",
  description: "A document shared via My Best Live OS.",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicSharePage({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      <SharePageView token={token} />
    </main>
  );
}
