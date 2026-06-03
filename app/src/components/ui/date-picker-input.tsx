"use client";

import { useState, useCallback } from "react";
import {
  format,
  addMonths,
  addDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parse,
  isValid,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";

type DatePickerInputProps = {
  /** Date string in YYYY-MM-DD format */
  value: string;
  /** Callback with date string in YYYY-MM-DD format */
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function parseValue(value: string): Date | null {
  if (!value) return null;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: DatePickerInputProps) {
  const language = useAppStore((s) => s.language);
  const ui = getCommonUiCopy(language);
  const dateLocale = getDateFnsLocale(language);
  const [open, setOpen] = useState(false);
  const parsed = parseValue(value);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parsed ?? new Date()),
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        setVisibleMonth(startOfMonth(parsed ?? new Date()));
      }
    },
    [parsed, setOpen, setVisibleMonth],
  );

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekLabels = Array.from({ length: 7 }, (_, index) =>
    format(addDays(gridStart, index), "EEEEE", { locale: dateLocale })
  );

  const handlePick = useCallback(
    (day: Date) => {
      onChange(format(day, "yyyy-MM-dd"));
      setOpen(false);
    },
    [onChange, setOpen],
  );

  const resolvedPlaceholder = placeholder ?? ui.pickDate;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-11 min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-transparent px-3 py-2 text-left text-sm transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
              "dark:bg-input/30",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "min-w-0 truncate",
            parsed ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {parsed ? format(parsed, "MMM d, yyyy", { locale: dateLocale }) : resolvedPlaceholder}
        </span>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(calc(100vw-2rem),288px)] gap-0 p-3 shadow-lg ring-1 ring-foreground/10"
        align="start"
        sideOffset={6}
      >
        <div className="mb-3 flex items-center justify-between gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
            aria-label={ui.previousMonth}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-0 truncate text-center text-sm font-semibold tracking-tight tabular-nums">
            {format(visibleMonth, "MMMM yyyy", { locale: dateLocale })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
            aria-label={ui.nextMonth}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-0.5">
          {weekLabels.map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="flex h-6 items-center justify-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const inMonth = isSameMonth(day, visibleMonth);
            const selected = parsed ? isSameDay(day, parsed) : false;
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handlePick(day)}
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-colors",
                  !inMonth && "text-muted-foreground/40 hover:bg-muted/50",
                  inMonth &&
                    !selected &&
                    "text-foreground hover:bg-muted/70",
                  selected &&
                    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                  today &&
                    !selected &&
                    "ring-1 ring-primary/35 ring-offset-1 ring-offset-popover",
                )}
              >
                {format(day, "d", { locale: dateLocale })}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex justify-between gap-2 border-t border-border/60 pt-2.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            {ui.close}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="font-medium text-primary"
            onClick={() => {
              handlePick(new Date());
            }}
          >
            {ui.today}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
