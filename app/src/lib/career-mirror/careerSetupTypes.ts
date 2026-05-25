/**
 * AI Career Mirror — setup wizard type model (WS2).
 *
 * Pure logic/types: no JSX, no user-facing strings. All copy lives in the
 * i18n files (career-mirror-ui.ts / career-mirror-questions-ui.ts), keyed by
 * the same stable ids used here and in the question bank.
 */

import type { FieldMapping } from "./careerSetupMapping";

export type { FieldMapping } from "./careerSetupMapping";

/** How a question is rendered / answered. */
export type QuestionInputKind =
  | "single"
  | "multi"
  | "chips"
  | "ranking"
  | "slider"
  | "binary"
  | "card"
  | "text"
  | "scale";

/** The ~15 ordered sections of the setup flow. */
export type SectionId =
  | "current-state"
  | "direction"
  | "motivation"
  | "energy"
  | "skills"
  | "blockers"
  | "visibility"
  | "decision-style"
  | "org-psychology"
  | "feedback"
  | "ambition"
  | "personality"
  | "transition"
  | "portrait"
  | "visual";

/** Stable id of every question in the bank. */
export type QuestionId =
  | "current-state-summary"
  | "current-identity"
  | "what-success-buys"
  | "motivation-drivers"
  | "energy-pattern"
  | "remembered-for"
  | "where-stuck"
  | "visibility-feeling"
  | "decision-basis"
  | "org-pet-peeve"
  | "feedback-style"
  | "ambition-style"
  | "mbti"
  | "transition-status"
  | "portrait-upload"
  | "generate-visual"
  | "visual-style";

export type OptionId = string;

export type QuestionOption = {
  id: OptionId;
  /** When true the option, once chosen, reveals a free-text companion input. */
  allowsFreeText?: boolean;
};

/** The four universal answer controls offered on (almost) every question. */
export type QuestionControls = {
  other: boolean;
  notSure: boolean;
  skip: boolean;
  typeOwn: boolean;
};

export type QuestionDef = {
  id: QuestionId;
  section: SectionId;
  kind: QuestionInputKind;
  /** Stable option ids in display order (omitted for free-form/upload steps). */
  optionIds?: OptionId[];
  maxSelections?: number;
  minSelections?: number;
  slider?: { min: number; max: number; step: number };
  /** True when the question can be left unanswered without blocking completion. */
  optional: boolean;
  controls: QuestionControls;
  /** Deterministic projection targets onto the career profile. */
  mapsTo: FieldMapping[];
};

export type SetupAnswerStatus = "answered" | "skipped" | "not_sure";

export type SetupAnswer = {
  value: OptionId | OptionId[] | number | string | null;
  freeText?: string;
  status: SetupAnswerStatus;
};

export type SetupAnswers = Record<string, SetupAnswer>;
