"use client";

import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { OSControl, OSSolidPanel } from "@/components/ui/os-primitives";
import { getAppDisplayName } from "@/lib/i18n/app-brand";
import { useAppStore } from "@/stores/app-store";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export default function PrivacyPolicyPage() {
  const language = useAppStore((s) => s.language);
  const settingsHref = useLocalizedPath("/settings");
  const brand = getAppDisplayName(language);
  const ui = getMiscUiCopy(language).privacy;
  return (
    <PageShell
      title={ui.title}
      description={ui.description(brand)}
    >
      <OSSolidPanel className="max-w-3xl space-y-8 p-5 text-sm leading-relaxed sm:p-6">
        <p className="text-muted-foreground">
          {ui.intro}
        </p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{ui.whoWeAreTitle}</h2>
          <p className="text-muted-foreground">
            {ui.whoWeAreBody(brand)}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{ui.whatWeCollectTitle}</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">{ui.accountDataLabel}</span> — {ui.accountDataBody}
            </li>
            <li>
              <span className="font-medium text-foreground">{ui.contentDataLabel}</span> — {ui.contentDataBody}
            </li>
            <li>
              <span className="font-medium text-foreground">{ui.technicalDataLabel}</span> — {ui.technicalDataBody}
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{ui.howWeUseTitle}</h2>
          <p className="text-muted-foreground">{ui.howWeUseBody}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{ui.storageSecurityTitle}</h2>
          <p className="text-muted-foreground">{ui.storageSecurityBody}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{ui.yourChoicesTitle}</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>{ui.yourChoiceSettings}</li>
            <li>{ui.yourChoiceDelete}</li>
            <li>{ui.yourChoiceExport}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{ui.contactTitle}</h2>
          <p className="text-muted-foreground">{ui.contactBody}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{ui.changesTitle}</h2>
          <p className="text-muted-foreground">{ui.changesBody}</p>
          <p className="text-xs text-muted-foreground">{ui.lastUpdated}</p>
        </section>

        <OSControl render={<Link href={settingsHref} />} className="w-fit no-underline">
          {ui.backToSettings}
        </OSControl>
      </OSSolidPanel>
    </PageShell>
  );
}
