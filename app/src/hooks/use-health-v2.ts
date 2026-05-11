"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  healthDailyLogsRepository,
  healthGoalsRepository,
  healthMetricsRepository,
  type HealthDailyLogPatch,
  type HealthGoalUpsert,
  type HealthMetricInsert,
} from "@/lib/repositories/health-v2";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import { ensureError } from "@/lib/utils/ensure-error";
import type { HealthMetricType } from "@/types/database";

// Query key taxonomy: ["health", ...] scopes everything so a single
// invalidation can wipe the whole domain after a bulk HealthKit sync.
const dailyLogsKey = (date?: string) =>
  date ? ["health", "daily_logs", date] : ["health", "daily_logs"];
const dailyLogsRangeKey = (from: string, to: string) => [
  "health",
  "daily_logs",
  "range",
  from,
  to,
];
const metricRangeKey = (
  type: HealthMetricType | string,
  from: string,
  to: string,
) => ["health", "metrics", type, "range", from, to];
const metricLatestKey = (type: HealthMetricType | string) => [
  "health",
  "metrics",
  type,
  "latest",
];
const goalsKey = () => ["health", "goals"];

function healthToasts() {
  return getMiscUiCopy(useAppStore.getState().language).toasts.healthV2;
}

// ============================================================
// Daily logs (four pillars)
// ============================================================

export function useHealthDailyLog(date: string) {
  return useQuery({
    queryKey: dailyLogsKey(date),
    queryFn: () => healthDailyLogsRepository.getByDate(date),
  });
}

export function useHealthDailyLogsRange(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: dailyLogsRangeKey(fromDate, toDate),
    queryFn: () => healthDailyLogsRepository.getRange(fromDate, toDate),
  });
}

export function useUpsertHealthDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: HealthDailyLogPatch) =>
      healthDailyLogsRepository.upsert(patch),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dailyLogsKey(variables.log_date) });
      qc.invalidateQueries({ queryKey: ["health", "daily_logs"] });
      toast.success(healthToasts().dailyLogSaved);
    },
    onError: (err) => {
      toast.error(healthToasts().dailyLogSaveFailed, {
        description: ensureError(err).message,
      });
    },
  });
}

// ============================================================
// Metrics (objective)
// ============================================================

export function useHealthMetricsRange(
  metricType: HealthMetricType | string,
  fromISO: string,
  toISO: string,
) {
  return useQuery({
    queryKey: metricRangeKey(metricType, fromISO, toISO),
    queryFn: () =>
      healthMetricsRepository.getByTypeRange(metricType, fromISO, toISO),
  });
}

export function useLatestHealthMetric(metricType: HealthMetricType | string) {
  return useQuery({
    queryKey: metricLatestKey(metricType),
    queryFn: () => healthMetricsRepository.getLatest(metricType),
  });
}

export function useCreateHealthMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HealthMetricInsert) =>
      healthMetricsRepository.create(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["health", "metrics", variables.metric_type] });
      toast.success(healthToasts().metricLogged);
    },
    onError: (err) => {
      toast.error(healthToasts().metricLogFailed, {
        description: ensureError(err).message,
      });
    },
  });
}

export function useCreateHealthMetricsBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inputs: HealthMetricInsert[]) =>
      healthMetricsRepository.createMany(inputs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health"] });
      toast.success(healthToasts().syncSuccess);
    },
    onError: (err) => {
      toast.error(healthToasts().syncFailed, {
        description: ensureError(err).message,
      });
    },
  });
}

export function useDeleteHealthMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => healthMetricsRepository.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health", "metrics"] });
    },
  });
}

// ============================================================
// Goals
// ============================================================

export function useHealthGoals() {
  return useQuery({
    queryKey: goalsKey(),
    queryFn: healthGoalsRepository.getAll,
  });
}

export function useUpsertHealthGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HealthGoalUpsert) => healthGoalsRepository.upsert(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalsKey() });
      toast.success(healthToasts().goalUpdated);
    },
    onError: (err) => {
      toast.error(healthToasts().goalUpdateFailed, {
        description: ensureError(err).message,
      });
    },
  });
}

export function useDeleteHealthGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => healthGoalsRepository.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalsKey() });
    },
  });
}
