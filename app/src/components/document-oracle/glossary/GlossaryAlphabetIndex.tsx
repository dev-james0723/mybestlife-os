"use client";

import { cn } from "@/lib/utils";

type LatinLetter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

export type GlossaryLetterFilter = "all" | LatinLetter | "nonLatin";

const LETTERS: LatinLetter[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

type Props = {
  value: GlossaryLetterFilter;
  onChange: (v: GlossaryLetterFilter) => void;
  /** Letters that have at least one term (after search + category, before letter filter). */
  availableLatin: Set<string>;
  hasNonLatin: boolean;
  nonLatinLabel: string;
  allLabel: string;
};

export function GlossaryAlphabetIndex(props: Props) {
  const { value, onChange, availableLatin, hasNonLatin, nonLatinLabel, allLabel } = props;

  const pill = (id: string, label: string, active: boolean, disabled: boolean, onClick: () => void) => (
    <button
      key={id}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
        active
          ? "border-primary/45 bg-primary/10 text-primary"
          : "border-border/80 bg-background/45 text-muted-foreground hover:border-primary/25 hover:bg-primary/8 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-35 hover:border-border/80 hover:bg-background/45 hover:text-muted-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      className="flex w-full min-w-0 gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Alphabetical filter"
    >
      {pill("all", allLabel, value === "all", false, () => onChange("all"))}
      {LETTERS.map((L) => {
        const has = availableLatin.has(L);
        return pill(L, L, value === L, !has, () => {
          if (has) onChange(L);
        });
      })}
      {pill(
        "nonLatin",
        nonLatinLabel,
        value === "nonLatin",
        !hasNonLatin,
        () => {
          if (hasNonLatin) onChange("nonLatin");
        },
      )}
    </div>
  );
}

export function termAlphabetBucket(term: string): GlossaryLetterFilter {
  const t = term.trim();
  if (!t) return "nonLatin";
  const ch = t[0];
  if (ch >= "A" && ch <= "Z") return ch as LatinLetter;
  if (ch >= "a" && ch <= "z") return ch.toUpperCase() as LatinLetter;
  return "nonLatin";
}
