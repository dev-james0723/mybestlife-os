"use client";

import * as React from "react";

import {
  ChipMultiSelect,
  CardSelect,
  RankingSelect,
  SliderInput,
  BinaryChoice,
  ScaleSelect,
  OptionalText,
  type OptionalTextStatus,
} from "@/components/career-mirror/inputs";
import { Textarea } from "@/components/ui/textarea";
import type {
  QuestionDef,
  SetupAnswer,
  SetupAnswerStatus,
} from "@/lib/career-mirror/careerSetupTypes";
import type { CareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { CareerSetupQuestionCopy } from "@/lib/i18n/career-mirror-questions-ui";

export type QuestionRendererProps = {
  question: QuestionDef;
  answer: SetupAnswer | undefined;
  onChange: (answer: SetupAnswer) => void;
  ui: CareerMirrorUiCopy;
  questionCopy: CareerSetupQuestionCopy;
};

const EMPTY_ANSWER: SetupAnswer = { value: null, status: "answered" };

/**
 * Converts a `QuestionDef` to the matching input primitive and back into a
 * normalized `SetupAnswer` ({ value, freeText, status }). Every question is
 * wrapped in `OptionalText` so the universal Other / Not sure / Skip /
 * Type-my-own controls are always present (gated by `question.controls`). All
 * user-facing strings come from i18n.
 */
export function QuestionRenderer({
  question,
  answer,
  onChange,
  ui,
  questionCopy,
}: QuestionRendererProps) {
  const current = answer ?? EMPTY_ANSWER;
  const optionLabel = React.useCallback(
    (id: string) => questionCopy.options[id] ?? id,
    [questionCopy],
  );

  const options = React.useMemo(
    () =>
      (question.optionIds ?? []).map((id) => ({
        id,
        label: optionLabel(id),
      })),
    [question.optionIds, optionLabel],
  );

  const setValue = React.useCallback(
    (value: SetupAnswer["value"]) => {
      onChange({ ...current, value, status: "answered" });
    },
    [current, onChange],
  );

  const setStatus = React.useCallback(
    (status: OptionalTextStatus) => {
      onChange({ ...current, status: status as SetupAnswerStatus });
    },
    [current, onChange],
  );

  const setFreeText = React.useCallback(
    (freeText: string) => {
      onChange({ ...current, freeText, status: "answered" });
    },
    [current, onChange],
  );

  const labels = {
    other: ui.controls.other,
    notSure: ui.controls.notSure,
    skipForNow: ui.controls.skipForNow,
    typeMyOwn: ui.controls.typeMyOwn,
  };

  return (
    <OptionalText
      controls={question.controls}
      labels={labels}
      status={current.status as OptionalTextStatus}
      onStatusChange={setStatus}
      freeText={current.freeText ?? ""}
      onFreeTextChange={setFreeText}
    >
      <QuestionInput
        question={question}
        current={current}
        options={options}
        optionLabel={optionLabel}
        onValue={setValue}
        ui={ui}
      />
    </OptionalText>
  );
}

type QuestionInputProps = {
  question: QuestionDef;
  current: SetupAnswer;
  options: { id: string; label: string }[];
  optionLabel: (id: string) => string;
  onValue: (value: SetupAnswer["value"]) => void;
  ui: CareerMirrorUiCopy;
};

function QuestionInput({
  question,
  current,
  options,
  onValue,
  ui,
}: QuestionInputProps) {
  const value = current.value;

  switch (question.kind) {
    case "single":
    case "card":
      return (
        <CardSelect
          options={options}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => onValue(typeof next === "string" ? next : null)}
        />
      );

    case "multi":
      return (
        <ChipMultiSelect
          options={options}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(ids) => onValue(ids)}
          max={question.maxSelections}
        />
      );

    case "chips":
      return (
        <ChipMultiSelect
          options={options}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(ids) => onValue(ids)}
          max={question.maxSelections}
        />
      );

    case "ranking":
      return (
        <RankingSelect
          options={options}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(ordered) => onValue(ordered)}
          max={question.maxSelections ?? 3}
        />
      );

    case "binary":
      return (
        <BinaryChoice
          value={
            value === options[0]?.id
              ? true
              : value === options[1]?.id
                ? false
                : null
          }
          onChange={(b) =>
            onValue(b ? (options[0]?.id ?? "yes") : (options[1]?.id ?? "no"))
          }
          yesLabel={options[0]?.label ?? ""}
          noLabel={options[1]?.label ?? ""}
        />
      );

    case "scale":
      return (
        <ScaleSelect
          min={question.slider?.min ?? 1}
          max={question.slider?.max ?? 5}
          value={typeof value === "number" ? value : null}
          onChange={(n) => onValue(n)}
        />
      );

    case "slider":
      return (
        <SliderInput
          min={question.slider?.min ?? 0}
          max={question.slider?.max ?? 100}
          step={question.slider?.step ?? 1}
          value={
            typeof value === "number" ? value : (question.slider?.min ?? 0)
          }
          onChange={(n) => onValue(n)}
        />
      );

    case "text":
      return (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onValue(e.target.value)}
          placeholder={ui.controls.typeMyOwnPlaceholder}
        />
      );

    default:
      return null;
  }
}

export default QuestionRenderer;
