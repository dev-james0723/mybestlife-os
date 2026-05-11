"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import type { CareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import {
  useCreateCareerEvent,
  useUpdateCareerEvent,
} from "@/hooks/use-career-events";
import type { CareerEvent, CareerEventType } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CareerEvent | null;
}

const EVENT_TYPES: CareerEventType[] = [
  "milestone",
  "job_started",
  "job_ended",
  "promotion",
  "education_started",
  "education_completed",
  "certification_earned",
  "project_shipped",
  "award_received",
  "speaking_event",
  "publication",
  "custom",
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EventFormModal({ open, onOpenChange, initial }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).timeline;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<CareerEventType>("milestone");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [ongoing, setOngoing] = useState(false);
  const [organization, setOrganization] = useState("");
  const [location, setLocation] = useState("");

  const create = useCreateCareerEvent();
  const update = useUpdateCareerEvent();
  const pending = create.isPending || update.isPending;

  const seedKey = open ? (initial?.id ?? "new") : null;
  const [lastSeed, setLastSeed] = useState<string | null>(null);
  if (seedKey && seedKey !== lastSeed) {
    setLastSeed(seedKey);
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setEventType(initial.event_type);
      setStartDate(initial.start_date);
      setEndDate(initial.end_date ?? "");
      setOngoing(initial.is_ongoing);
      setOrganization(initial.organization ?? "");
      setLocation(initial.location ?? "");
    } else {
      setTitle("");
      setDescription("");
      setEventType("milestone");
      setStartDate(todayIso());
      setEndDate("");
      setOngoing(false);
      setOrganization("");
      setLocation("");
    }
  } else if (!seedKey && lastSeed !== null) {
    setLastSeed(null);
  }

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (initial) {
      await update.mutateAsync({
        id: initial.id,
        updates: {
          title: trimmed,
          description: description.trim() || null,
          event_type: eventType,
          start_date: startDate,
          end_date: ongoing ? null : endDate || null,
          is_ongoing: ongoing,
          organization: organization.trim() || null,
          location: location.trim() || null,
        },
      });
    } else {
      await create.mutateAsync({
        title: trimmed,
        description: description.trim() || null,
        eventType,
        startDate,
        endDate: ongoing ? null : endDate || null,
        isOngoing: ongoing,
        organization: organization.trim() || null,
        location: location.trim() || null,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? copy.editEvent : copy.newEvent}</DialogTitle>
          <DialogDescription className="sr-only">
            {copy.form.title}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ev-title">{copy.form.title}</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={copy.form.title}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>{copy.form.eventType}</Label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as CareerEventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {resolveEventTypeLabel(copy, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-start">{copy.form.startDate}</Label>
              <Input
                id="ev-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-end">{copy.form.endDate}</Label>
              <Input
                id="ev-end"
                type="date"
                value={endDate}
                disabled={ongoing}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={ongoing}
                  onChange={(e) => setOngoing(e.target.checked)}
                />
                {copy.form.isOngoing}
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-org">{copy.form.organization}</Label>
              <Input
                id="ev-org"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-loc">{copy.form.location}</Label>
              <Input
                id="ev-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-desc">{copy.form.description}</Label>
            <Textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {copy.form.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || pending}>
            {copy.form.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function resolveEventTypeLabel(
  copy: CareerPhase5Copy["timeline"],
  t: CareerEventType,
): string {
  return copy.eventTypes[t] ?? t;
}
