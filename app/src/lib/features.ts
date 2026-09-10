type FeatureEnvironment = {
  nodeEnv?: string;
  override?: string;
};

function resolveProductionHiddenFeatureEnabled({
  nodeEnv,
  override,
}: FeatureEnvironment): boolean {
  const normalizedOverride = override?.trim().toLowerCase();

  if (normalizedOverride === "true") return true;
  if (normalizedOverride === "false") return false;

  return nodeEnv === "development" || nodeEnv === "test";
}

/**
 * Keep Life Companion available during local development, but fail closed in
 * deployed builds until it is explicitly enabled.
 */
export function resolveLifeCompanionEnabled(environment: FeatureEnvironment): boolean {
  return resolveProductionHiddenFeatureEnabled(environment);
}

/**
 * Keep Learning available for local work while its navigation stays hidden in
 * deployed builds until it is explicitly enabled.
 */
export function resolveLearningEnabled(environment: FeatureEnvironment): boolean {
  return resolveProductionHiddenFeatureEnabled(environment);
}

/**
 * Keep Notes available during local development while hiding both its
 * navigation entry and page in deployed builds until explicitly enabled.
 */
export function resolveNotesEnabled(environment: FeatureEnvironment): boolean {
  return resolveProductionHiddenFeatureEnabled(environment);
}

/**
 * Keep Finance available during local development while hiding both its
 * navigation entry and route in deployed builds until explicitly enabled.
 */
export function resolveFinanceEnabled(environment: FeatureEnvironment): boolean {
  return resolveProductionHiddenFeatureEnabled(environment);
}

/**
 * Keep Health available during local development while hiding both its
 * navigation entry and route in deployed builds until explicitly enabled.
 */
export function resolveHealthEnabled(environment: FeatureEnvironment): boolean {
  return resolveProductionHiddenFeatureEnabled(environment);
}

/**
 * Keep Weekly Review available during local development while hiding both its
 * navigation entry and route in deployed builds until explicitly enabled.
 */
export function resolveWeeklyReviewEnabled(environment: FeatureEnvironment): boolean {
  return resolveProductionHiddenFeatureEnabled(environment);
}

export const LIFE_COMPANION_ENABLED = resolveLifeCompanionEnabled({
  nodeEnv: process.env.NODE_ENV,
  override: process.env.NEXT_PUBLIC_ENABLE_LIFE_COMPANION,
});

export const LEARNING_ENABLED = resolveLearningEnabled({
  nodeEnv: process.env.NODE_ENV,
  override: process.env.NEXT_PUBLIC_ENABLE_LEARNING,
});

export const NOTES_ENABLED = resolveNotesEnabled({
  nodeEnv: process.env.NODE_ENV,
  override: process.env.NEXT_PUBLIC_ENABLE_NOTES,
});

export const FINANCE_ENABLED = resolveFinanceEnabled({
  nodeEnv: process.env.NODE_ENV,
  override: process.env.NEXT_PUBLIC_ENABLE_FINANCE,
});

export const HEALTH_ENABLED = resolveHealthEnabled({
  nodeEnv: process.env.NODE_ENV,
  override: process.env.NEXT_PUBLIC_ENABLE_HEALTH,
});

export const WEEKLY_REVIEW_ENABLED = resolveWeeklyReviewEnabled({
  nodeEnv: process.env.NODE_ENV,
  override: process.env.NEXT_PUBLIC_ENABLE_WEEKLY_REVIEW,
});

/** Incomplete tools remain available locally, but are excluded from public builds. */
export const EXPERIMENTAL_TOOLS_ENABLED = resolveProductionHiddenFeatureEnabled({
  nodeEnv: process.env.NODE_ENV,
  override: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_TOOLS,
});

/** These exact routes also enforce notFound() in their page or segment layout. */
export function isDisabledFeatureRoute(pathname: string): boolean {
  const routes: Array<[boolean, string]> = [
    [LIFE_COMPANION_ENABLED, "/life-agent"],
    [LEARNING_ENABLED, "/japanese-study"],
    [NOTES_ENABLED, "/notes"],
    [FINANCE_ENABLED, "/finance"],
    [HEALTH_ENABLED, "/health"],
    [WEEKLY_REVIEW_ENABLED, "/weekly-review"],
    [EXPERIMENTAL_TOOLS_ENABLED, "/ai-assistant"],
    [EXPERIMENTAL_TOOLS_ENABLED, "/business-analyst"],
    [EXPERIMENTAL_TOOLS_ENABLED, "/youtube-radar"],
  ];
  return routes.some(([enabled, route]) => !enabled && (pathname === route || pathname.startsWith(`${route}/`)));
}
