"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider1to10 } from "./primitives/Slider1to10";
import { MoodPad } from "./primitives/MoodPad";
import { TriggerChips } from "./primitives/TriggerChips";
import { useUpsertHealthDailyLog, useCreateHealthMetric } from "@/hooks/use-health-v2";
import type { HealthDailyLog, HealthTriggerKey } from "@/types/database";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";
import type { PillarKey } from "@/lib/health/pillarUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logDate: string;
  initialPillar: PillarKey;
  existing: HealthDailyLog | null;
}

const TRIGGER_OPTIONS: HealthTriggerKey[] = [
  "work",
  "coffee",
  "exercise",
  "social",
  "family",
  "poor_sleep",
  "weather",
  "menstrual",
  "music_practice",
  "performance",
  "other",
];

/**
 * Unified log modal for the four pillars. Opens with the tapped pillar
 * focused; users can scroll to log others without re-opening.
 *
 * Saves on explicit "Save" click (autosave UX was considered but the
 * sparse upsert pattern + toast made explicit save clearer on mobile).
 */
export function PillarLogModal({ open, onOpenChange, logDate, initialPillar, existing }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language).logModal, [language]);
  const triggerLabels = useMemo(() => getHealthUiCopy(language).triggers, [language]);
  const moodQuads = useMemo(() => getHealthUiCopy(language).moodQuadrants, [language]);

  const upsert = useUpsertHealthDailyLog();
  const createMetric = useCreateHealthMetric();

  // Local draft state. Reset on open/initialPillar change.
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sleepDuration, setSleepDuration] = useState<string>("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [valence, setValence] = useState<number | null>(null);
  const [arousal, setArousal] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setSleepQuality(existing?.sleep_quality ?? null);
    setEnergy(existing?.energy_level ?? null);
    setValence(existing?.mood_valence ?? null);
    setArousal(existing?.mood_arousal ?? null);
    setStress(existing?.stress_level ?? null);
    setTriggers(existing?.triggers ?? []);
    setNotes(existing?.notes ?? "");
    setSleepDuration("");
  }, [open, existing]);

  async function handleSave() {
    try {
      await upsert.mutateAsync({
        log_date: logDate,
        sleep_quality: sleepQuality,
        energy_level: energy,
        mood_valence: valence,
        mood_arousal: arousal,
        stress_level: stress,
        triggers,
        notes: notes.trim() === "" ? null : notes,
      });
      if (sleepDuration.trim() !== "") {
        const hours = Number(sleepDuration);
        if (Number.isFinite(hours) && hours > 0 && hours < 24) {
          await createMetric.mutateAsync({
            metric_type: "sleep_duration",
            value: hours,
            unit: "hours",
            recorded_at: new Date(`${logDate}T00:00:00`).toISOString(),
            source: "manual",
          });
        }
      }
      onOpenChange(false);
    } catch {
      // Hooks already toast via onError; Supabase errors are plain objects, so an
      // unhandled rejection surfaces in Next dev as "Runtime Error: [object Object]".
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ui.title}</DialogTitle>
          <DialogDescription>{logDate}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          <section className="flex flex-col gap-3" aria-label={ui.sleepSectionTitle}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {ui.sleepSectionTitle}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="sleep-duration" className="text-sm font-medium">
                  {ui.sleepDurationLabel}
                </label>
                <Input
                  id="sleep-duration"
                  inputMode="decimal"
                  placeholder="7.5"
                  value={sleepDuration}
                  onChange={(e) => setSleepDuration(e.target.value)}
                />
              </div>
              <Slider1to10
                label={ui.sleepQualityLabel}
                value={sleepQuality}
                onChange={setSleepQuality}
                colorClassName="bg-indigo-500"
                data-initial-focus={initialPillar === "sleep" || undefined}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3" aria-label={ui.energyLabel}>
            <Slider1to10
              label={ui.energyLabel}
              value={energy}
              onChange={setEnergy}
              colorClassName="bg-amber-500"
              data-initial-focus={initialPillar === "energy" || undefined}
            />
          </section>

          <section className="flex flex-col gap-3" aria-label={ui.moodSectionTitle}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {ui.moodSectionTitle}
            </h3>
            <MoodPad
              valence={valence}
              arousal={arousal}
              onChange={({ valence: v, arousal: a }) => {
                setValence(v);
                setArousal(a);
              }}
              quadrantLabels={moodQuads}
              valenceAxis={ui.moodValenceAxis}
              arousalAxis={ui.moodArousalAxis}
            />
          </section>

          <section className="flex flex-col gap-3" aria-label={ui.stressLabel}>
            <Slider1to10
              label={ui.stressLabel}
              value={stress}
              onChange={setStress}
              colorClassName="bg-rose-500"
              data-initial-focus={initialPillar === "stress" || undefined}
            />
          </section>

          <section className="flex flex-col gap-2" aria-label={ui.triggersLabel}>
            <h3 className="text-sm font-semibold">{ui.triggersLabel}</h3>
            <TriggerChips
              options={TRIGGER_OPTIONS}
              values={triggers}
              onChange={setTriggers}
              labelFor={(key) => triggerLabels[key]}
            />
          </section>

          <section className="flex flex-col gap-2" aria-label={ui.notesLabel}>
            <label htmlFor="health-notes" className="text-sm font-semibold">
              {ui.notesLabel}
            </label>
            <Textarea
              id="health-notes"
              placeholder={ui.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </section>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {ui.saveAll}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
