import { OSBuddyAirRemoteClient } from "@/components/os-buddy/air-control/OSBuddyAirRemoteClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export default async function OSBuddyAirRemoteRoute({ params }: PageProps) {
  const { locale } = await params;
  return <OSBuddyAirRemoteClient locale={locale} />;
}
