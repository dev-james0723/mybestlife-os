export type ConflictPayload = {
  detectedAt: string;
  localSnapshot: Record<string, unknown>;
  googleSnapshot: Record<string, unknown>;
  recommended: "prefer_local" | "prefer_google" | "manual";
};

export function detectBidirectionalConflict(args: {
  planRowUpdatedAt: string;
  lastSyncedAt: string | null;
  googleEventUpdated: string | null;
  googleEtagChanged: boolean;
}): boolean {
  if (!args.lastSyncedAt) return false;
  const planT = Date.parse(args.planRowUpdatedAt);
  const syncT = Date.parse(args.lastSyncedAt);
  const googleT = args.googleEventUpdated ? Date.parse(args.googleEventUpdated) : 0;
  if (!args.googleEtagChanged) return false;
  const localDirty = Number.isFinite(planT) && planT > syncT;
  const remoteDirty = Number.isFinite(googleT) && googleT > syncT;
  return localDirty && remoteDirty;
}

export function buildConflictPayload(
  local: Record<string, unknown>,
  google: Record<string, unknown>,
): ConflictPayload {
  return {
    detectedAt: new Date().toISOString(),
    localSnapshot: local,
    googleSnapshot: google,
    recommended: "manual",
  };
}
