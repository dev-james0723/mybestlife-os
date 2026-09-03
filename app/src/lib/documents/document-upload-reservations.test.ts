import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteDocumentFileServer: vi.fn(),
}));

vi.mock("@/lib/documents/document-storage", () => ({
  deleteDocumentFileServer: mocks.deleteDocumentFileServer,
}));

import {
  cancelDocumentUploadReservation,
  cleanupStaleDocumentUploadsGlobally,
  type DocumentUploadReservation,
} from "@/lib/documents/document-upload-reservations";

const USER_ID = "20000000-0000-4000-8000-000000000002";
const UPLOAD_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const STORAGE_PATH = `${USER_ID}/${UPLOAD_ID}/Apartment lease.pdf`;
const STALE_AT = "2026-09-01T00:00:00.000Z";
const CUTOFF = "2026-09-02T00:00:00.000Z";
const FRESH_AT = "2026-09-03T00:00:00.000Z";

type Filter = {
  operator: "eq" | "neq" | "lt";
  column: keyof DocumentUploadReservation;
  value: string;
};

function createReservationClient(input: {
  row: DocumentUploadReservation;
  afterScan?: (row: DocumentUploadReservation) => DocumentUploadReservation;
}) {
  let current: DocumentUploadReservation | null = { ...input.row };

  function matches(filters: Filter[]) {
    if (!current) return false;
    return filters.every(({ operator, column, value }) => {
      const actual = current?.[column];
      if (operator === "eq") return actual === value;
      if (operator === "neq") return actual !== value;
      return typeof actual === "string" && actual < value;
    });
  }

  const from = vi.fn(() => ({
    select: vi.fn(() => {
      const filters: Filter[] = [];
      const query = {
        eq(column: keyof DocumentUploadReservation, value: string) {
          filters.push({ operator: "eq", column, value });
          return query;
        },
        lt(column: keyof DocumentUploadReservation, value: string) {
          filters.push({ operator: "lt", column, value });
          return query;
        },
        order() {
          return query;
        },
        async limit() {
          const scanned = matches(filters) && current ? [{ ...current }] : [];
          if (current && input.afterScan) current = input.afterScan(current);
          return { data: scanned, error: null };
        },
      };
      return query;
    }),
    update: vi.fn((values: Partial<DocumentUploadReservation>) => {
      const filters: Filter[] = [];
      const query = {
        eq(column: keyof DocumentUploadReservation, value: string) {
          filters.push({ operator: "eq", column, value });
          return query;
        },
        neq(column: keyof DocumentUploadReservation, value: string) {
          filters.push({ operator: "neq", column, value });
          return query;
        },
        lt(column: keyof DocumentUploadReservation, value: string) {
          filters.push({ operator: "lt", column, value });
          return query;
        },
        select() {
          return {
            maybeSingle: async () => {
              if (!matches(filters) || !current) {
                return { data: null, error: null };
              }
              current = { ...current, ...values };
              return { data: { ...current }, error: null };
            },
          };
        },
      };
      return query;
    }),
    delete: vi.fn(() => ({
      eq: (column: keyof DocumentUploadReservation, value: string) => ({
        eq: async (
          secondColumn: keyof DocumentUploadReservation,
          secondValue: string,
        ) => {
          if (
            matches([
              { operator: "eq", column, value },
              { operator: "eq", column: secondColumn, value: secondValue },
            ])
          ) {
            current = null;
          }
          return { error: null };
        },
      }),
    })),
  }));

  return {
    supabase: { from } as unknown as SupabaseClient,
    current: () => current,
  };
}

function reservation(
  status: DocumentUploadReservation["status"],
  updatedAt = STALE_AT,
): DocumentUploadReservation {
  return {
    id: UPLOAD_ID,
    user_id: USER_ID,
    storage_path: STORAGE_PATH,
    status,
    created_at: STALE_AT,
    updated_at: updatedAt,
  };
}

describe("document upload reservation cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteDocumentFileServer.mockResolvedValue({});
  });

  it("skips a reservation that became active after the stale scan", async () => {
    const client = createReservationClient({
      row: reservation("pending"),
      afterScan: (row) => ({
        ...row,
        status: "uploading",
        updated_at: FRESH_AT,
      }),
    });

    const result = await cleanupStaleDocumentUploadsGlobally({
      supabase: client.supabase,
      olderThanIso: CUTOFF,
    });

    expect(result).toEqual({
      scanned: 1,
      deleted: 0,
      skipped: 1,
      failed: 0,
    });
    expect(client.current()).toMatchObject({
      status: "uploading",
      updated_at: FRESH_AT,
    });
    expect(mocks.deleteDocumentFileServer).not.toHaveBeenCalled();
  });

  it("does not return an already-cancelled reservation to duplicate cleanup", async () => {
    const client = createReservationClient({
      row: reservation("cancelled", FRESH_AT),
    });

    const result = await cancelDocumentUploadReservation({
      supabase: client.supabase,
      userId: USER_ID,
      uploadId: UPLOAD_ID,
    });

    expect(result).toEqual({});
    expect(client.current()).toMatchObject({
      status: "cancelled",
      updated_at: FRESH_AT,
    });
  });

  it("deletes a reservation that is still stale at the cancellation point", async () => {
    const client = createReservationClient({ row: reservation("pending") });

    const result = await cleanupStaleDocumentUploadsGlobally({
      supabase: client.supabase,
      olderThanIso: CUTOFF,
    });

    expect(result).toEqual({
      scanned: 1,
      deleted: 1,
      skipped: 0,
      failed: 0,
    });
    expect(mocks.deleteDocumentFileServer).toHaveBeenCalledWith({
      supabase: client.supabase,
      storagePath: STORAGE_PATH,
    });
    expect(client.current()).toBeNull();
  });
});
