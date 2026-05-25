/**
 * AI Career Mirror — setup question bank (WS2).
 *
 * Pure data. Every question/option carries a stable kebab id; the matching
 * human copy lives in career-mirror-questions-ui.ts keyed by the same ids.
 *
 * Default controls are all-on (other / notSure / skip / typeOwn) unless a
 * question explicitly narrows them.
 */

import type {
  QuestionControls,
  QuestionDef,
  SectionId,
} from "./careerSetupTypes";

/** Ordered list of the setup flow sections. */
export const CAREER_SETUP_SECTIONS: SectionId[] = [
  "current-state",
  "direction",
  "motivation",
  "energy",
  "skills",
  "blockers",
  "visibility",
  "decision-style",
  "org-psychology",
  "feedback",
  "ambition",
  "personality",
  "transition",
  "portrait",
  "visual",
];

const ALL_CONTROLS: QuestionControls = {
  other: true,
  notSure: true,
  skip: true,
  typeOwn: true,
};

function controls(overrides: Partial<QuestionControls> = {}): QuestionControls {
  return { ...ALL_CONTROLS, ...overrides };
}

export const CAREER_SETUP_QUESTIONS: QuestionDef[] = [
  // 1) current-state ---------------------------------------------------------
  {
    id: "current-state-summary",
    section: "current-state",
    kind: "single",
    optionIds: [
      "capable-but-unseen",
      "unclear-direction",
      "transitioning",
      "want-fame",
      "want-monetize",
      "build-brand",
      "building-but-not-ready",
      "stuck",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "career_stage", mode: "set-enum" },
      { column: "current_status_summary", mode: "set-text" },
      { column: "visibility_goal", mode: "set-enum" },
      { column: "transition_type", mode: "set-enum" },
    ],
  },
  {
    id: "current-identity",
    section: "current-state",
    kind: "single",
    optionIds: [
      "performer",
      "educator",
      "founder",
      "student",
      "researcher",
      "product-builder",
      "content-creator",
      "freelancer",
      "manager",
    ],
    optional: false,
    controls: controls({ typeOwn: true }),
    mapsTo: [
      { column: "current_role", mode: "set-text" },
      { column: "industry", mode: "set-text" },
    ],
  },

  // 2) direction -------------------------------------------------------------
  {
    id: "what-success-buys",
    section: "direction",
    kind: "multi",
    optionIds: [
      "more-income",
      "visibility",
      "personal-brand",
      "quality-collabs",
      "more-gigs",
      "insider-recognition",
      "freedom",
      "own-company",
      "higher-platform",
      "prove-talent",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "career_goals", mode: "set-text" },
      { column: "visibility_goal", mode: "set-enum" },
      { column: "desired_reputation", mode: "set-text" },
      { column: "dream_scenario", mode: "set-text" },
    ],
  },

  // 3) motivation ------------------------------------------------------------
  {
    id: "motivation-drivers",
    section: "motivation",
    kind: "ranking",
    maxSelections: 3,
    optionIds: [
      "recognition",
      "freedom",
      "money-security",
      "influence",
      "mastery",
      "status",
      "create-work",
      "help-others",
      "beat-rivals",
      "build-own",
      "approval-by-important",
      "dont-waste-talent",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "motivation_drivers", mode: "append-array" },
      { column: "ambition_style", mode: "set-enum" },
    ],
  },

  // 4) energy ----------------------------------------------------------------
  {
    id: "energy-pattern",
    section: "energy",
    kind: "single",
    optionIds: [
      "deep-solo",
      "spark-with-experts",
      "on-stage",
      "deadline-sprint",
      "strategy-systems",
      "teaching",
      "content-creation",
      "problem-solving",
      "team-momentum",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "work_energy_pattern", mode: "set-enum" },
      { column: "ideal_work_environment", mode: "set-text" },
    ],
  },

  // 5) skills ----------------------------------------------------------------
  {
    id: "remembered-for",
    section: "skills",
    kind: "multi",
    optionIds: [
      "performance",
      "teaching",
      "aesthetics",
      "strategy",
      "creativity",
      "execution",
      "organization",
      "technical",
      "communication",
      "leadership",
      "writing",
      "content",
      "business-sense",
      "network",
    ],
    optional: false,
    controls: controls({ typeOwn: true }),
    mapsTo: [{ column: "top_skills", mode: "append-array" }],
  },

  // 6) blockers --------------------------------------------------------------
  {
    id: "where-stuck",
    section: "blockers",
    kind: "single",
    optionIds: [
      "slow-start",
      "overthink-no-publish",
      "distraction",
      "no-system",
      "fear-judgment",
      "bored-by-ordinary",
      "lose-interest",
      "no-accountability",
      "too-many-directions",
      "cant-productize",
      "no-visibility",
      "no-portfolio",
      "no-network",
    ],
    optional: false,
    controls: controls({ other: true }),
    mapsTo: [
      { column: "blocker_category", mode: "set-enum" },
      { column: "risk_factors", mode: "append-array" },
    ],
  },

  // 7) visibility ------------------------------------------------------------
  {
    id: "visibility-feeling",
    section: "visibility",
    kind: "single",
    optionIds: [
      "want-seen-not-thirsty",
      "enjoy-attention",
      "fear-but-need",
      "work-seen-not-me",
      "authority-not-influencer",
      "respected-in-circle",
      "grow-audience-unsure",
      "dont-know-fit",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "visibility_goal", mode: "set-enum" },
      { column: "desired_reputation", mode: "set-text" },
      { column: "personal_brand_strategy", mode: "set-text" },
    ],
  },

  // 8) decision-style --------------------------------------------------------
  {
    id: "decision-basis",
    section: "decision-style",
    kind: "single",
    optionIds: [
      "intuition",
      "data-roi",
      "mentor-advice",
      "peer-reaction",
      "long-term-identity",
      "short-term-opportunity",
      "market-demand",
      "procrastinate",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [{ column: "decision_style", mode: "set-enum" }],
  },

  // 9) org-psychology --------------------------------------------------------
  {
    id: "org-pet-peeve",
    section: "org-psychology",
    kind: "multi",
    optionIds: [
      "unclear-responsibility",
      "no-standards",
      "too-many-meetings",
      "clueless-boss",
      "no-autonomy",
      "no-feedback",
      "weak-colleagues",
      "politics",
      "meaningless-work",
      "no-growth",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "ideal_work_environment", mode: "set-text" },
      { column: "culture_fit", mode: "set-text" },
      { column: "organizational_triggers", mode: "append-array" },
    ],
  },

  // 10) feedback -------------------------------------------------------------
  {
    id: "feedback-style",
    section: "feedback",
    kind: "single",
    optionIds: [
      "direct",
      "affirm-then-critique",
      "concrete-examples",
      "private",
      "high-standards",
      "time-to-process",
      "logic-not-feelings",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "feedback_preference", mode: "set-enum" },
      { column: "preferred_mentor_style", mode: "set-text" },
    ],
  },

  // 11) ambition -------------------------------------------------------------
  {
    id: "ambition-style",
    section: "ambition",
    kind: "single",
    optionIds: [
      "top-of-field",
      "famous",
      "freedom-choice",
      "own-business",
      "respected-by-elite",
      "rich-not-tied",
      "leave-legacy",
      "prove-talent",
      "higher-circle",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "ambition_style", mode: "set-enum" },
      { column: "desired_reputation", mode: "set-text" },
      { column: "dream_scenario", mode: "set-text" },
    ],
  },

  // 12) personality (optional MBTI) ------------------------------------------
  {
    id: "mbti",
    section: "personality",
    kind: "single",
    optionIds: [
      "intj",
      "intp",
      "entj",
      "entp",
      "infj",
      "infp",
      "enfj",
      "enfp",
      "istj",
      "isfj",
      "estj",
      "esfj",
      "istp",
      "isfp",
      "estp",
      "esfp",
      "not-sure",
      "no-mbti",
    ],
    optional: true,
    controls: controls({ skip: true }),
    mapsTo: [{ column: "self_reported_personality_type", mode: "set-enum" }],
  },

  // 13) transition -----------------------------------------------------------
  {
    id: "transition-status",
    section: "transition",
    kind: "single",
    optionIds: [
      "no-transition-just-stronger",
      "exploring",
      "actively-transitioning",
      "parallel-path",
      "art-to-product",
      "performer-to-educator",
      "applying-degree",
      "not-sure",
    ],
    optional: false,
    controls: controls(),
    mapsTo: [
      { column: "transition_type", mode: "set-enum" },
      { column: "transition_goal", mode: "set-text" },
      { column: "transition_timeline", mode: "set-text" },
    ],
  },

  // 14) portrait -------------------------------------------------------------
  {
    id: "portrait-upload",
    section: "portrait",
    kind: "text",
    optional: true,
    controls: controls({ skip: true }),
    mapsTo: [],
  },

  // 15) visual ---------------------------------------------------------------
  {
    id: "generate-visual",
    section: "visual",
    kind: "binary",
    optionIds: ["yes", "no"],
    optional: true,
    controls: controls({ other: false, notSure: false }),
    mapsTo: [],
  },
  {
    id: "visual-style",
    section: "visual",
    kind: "card",
    optionIds: [
      "editorial-portrait",
      "illustrative-photo",
      "cinematic-founder",
      "minimal-knowledge",
      "abstract-landscape",
      "brand-poster",
    ],
    optional: true,
    controls: controls({ other: false, notSure: false, skip: true }),
    mapsTo: [{ column: "career_banner_style", mode: "set-enum" }],
  },
];
