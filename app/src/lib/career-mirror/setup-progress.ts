import { CAREER_SETUP_QUESTIONS, CAREER_SETUP_SECTIONS } from "./careerSetupQuestionBank";
import type { SetupAnswer, SetupAnswers } from "./careerSetupTypes";

export function hasSetupAnswer(answer: SetupAnswer | undefined): boolean {
  if (answer?.status !== "answered") return false;
  if (answer.freeText?.trim()) return true;
  if (Array.isArray(answer.value)) return answer.value.length > 0;
  return typeof answer.value === "number" || (typeof answer.value === "string" && answer.value.trim().length > 0);
}

export function getSetupProgress(answers: SetupAnswers) {
  const required = CAREER_SETUP_QUESTIONS.filter((question) => !question.optional);
  const answered = required.filter((question) => hasSetupAnswer(answers[question.id])).length;
  const firstUnreviewed = CAREER_SETUP_SECTIONS.findIndex((section) =>
    CAREER_SETUP_QUESTIONS.some((question) => question.section === section &&
      !hasSetupAnswer(answers[question.id]) && !["skipped", "not_sure"].includes(answers[question.id]?.status ?? "")),
  );
  return {
    answered,
    total: required.length,
    percent: required.length === 0 ? 100 : Math.round(answered / required.length * 100),
    resumeSection: firstUnreviewed < 0 ? CAREER_SETUP_SECTIONS.length - 1 : firstUnreviewed,
  };
}
