import { describe, expect, it } from "vitest";
import { CAREER_SETUP_QUESTIONS, CAREER_SETUP_SECTIONS } from "./careerSetupQuestionBank";
import { getSetupProgress } from "./setup-progress";
import type { SetupAnswers } from "./careerSetupTypes";

describe("career setup resume", () => {
  it("resumes after reviewed sections without counting skipped answers as complete", () => {
    const answers: SetupAnswers = {};
    for (const question of CAREER_SETUP_QUESTIONS.filter((q) => q.section === CAREER_SETUP_SECTIONS[0])) {
      answers[question.id] = { status: "skipped", value: null };
    }
    expect(getSetupProgress(answers).resumeSection).toBe(1);
    expect(getSetupProgress(answers).percent).toBe(0);
  });

  it("does not count empty answers or unrelated autofill fields", () => {
    const answers: SetupAnswers = { "autofill:role": { status: "answered", value: "Designer" } };
    for (const question of CAREER_SETUP_QUESTIONS) answers[question.id] = { status: "answered", value: [] };
    expect(getSetupProgress(answers).answered).toBe(0);
    expect(getSetupProgress(answers).resumeSection).toBe(0);
  });

  it("shows required-answer progress independently of the visible section", () => {
    const answers: SetupAnswers = Object.fromEntries(CAREER_SETUP_QUESTIONS.map((q) => [q.id, { status: "answered", value: "example" }]));
    const result = getSetupProgress(answers);
    expect(result.percent).toBe(100);
    expect(result.answered).toBe(CAREER_SETUP_QUESTIONS.filter((q) => !q.optional).length);
    expect(result.resumeSection).toBe(CAREER_SETUP_SECTIONS.length - 1);
  });
});
