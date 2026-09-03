"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  BellRing,
  Camera,
  Check,
  ChevronRight,
  FileCheck2,
  FileText,
  Link2,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OSControl,
  OSDialogSurface,
  OSFrostedPanel,
  OSIconControl,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  DocumentIntakeAnalyzeResponse,
  DocumentIntakeAiStatus,
  DocumentIntakeReservationResponse,
  DocumentIntakeResponse,
} from "@/lib/documents/document-intake";
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_SUPPORTED_FORMATS,
  DOCUMENT_UPLOAD_MIME_TYPES,
} from "@/lib/documents/document-intake";
import { cn } from "@/lib/utils";
import {
  ASSET_DOCUMENT_ROLES,
  type AssetDocumentRole,
} from "@/types/asset-intelligence";
import { useAppStore } from "@/stores/app-store";

const ACCEPTED_FILE_INPUT = DOCUMENT_SUPPORTED_FORMATS.flatMap((format) =>
  format.extensions.map((extension) => `.${extension}`),
).join(",");

const ACCEPTED_EXTENSIONS = new Set<string>(
  DOCUMENT_SUPPORTED_FORMATS.flatMap((format) => [...format.extensions]),
);

const DOCUMENT_TYPES = [
  { value: "identity", label: "Identity / ID" },
  { value: "contract", label: "Contract" },
  { value: "insurance", label: "Insurance" },
  { value: "financial", label: "Financial" },
  { value: "tax", label: "Tax" },
  { value: "legal", label: "Legal" },
  { value: "medical", label: "Medical" },
  { value: "property", label: "Property" },
  { value: "education", label: "Education" },
  { value: "license", label: "License / Permit" },
  { value: "receipt", label: "Receipt / Invoice" },
  { value: "warranty", label: "Warranty" },
  { value: "manual", label: "Manual" },
  { value: "other", label: "Other" },
] as const;

const ROLE_LABELS: Record<AssetDocumentRole, string> = {
  receipt: "Receipt",
  invoice: "Invoice",
  warranty: "Warranty",
  insurance: "Insurance",
  manual: "Manual",
  maintenance: "Maintenance",
  appraisal: "Appraisal",
  resale: "Resale",
  other: "Other",
};

const WARNING_MESSAGES: Record<string, string> = {
  preview_url_unavailable:
    "The document uploaded successfully, but its preview is temporarily unavailable.",
  ai_analysis_not_supported_for_format:
    "This format can be stored, but AI analysis is not available for it yet.",
  ai_analysis_file_too_large:
    "This file is safely uploaded, but it is too large for AI analysis. Complete the details manually.",
  ai_analysis_failed_upload_preserved:
    "AI analysis could not finish. Your upload is safe, and you can complete the details manually.",
  mime_type_inferred_from_content:
    "The file type was verified from the document contents rather than its filename.",
};

const PERMANENT_INTAKE_ERROR_CODES = new Set([
  "file_empty",
  "file_too_large",
  "file_name_invalid",
  "unsupported_extension",
  "archive_not_allowed",
  "executable_not_allowed",
  "macro_document_not_allowed",
  "mime_type_mismatch",
  "file_signature_mismatch",
  "encrypted_document_not_allowed",
  "invalid_office_container",
  "unsafe_office_container",
]);

class DocumentIntakeRequestError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = "DocumentIntakeRequestError";
  }
}

type SourceMode = "upload" | "link";
type IntakePhase = "idle" | "processing" | "ready" | "error";

export type DocumentIntakeAsset = {
  id: string;
  name: string;
  category?: string | null;
};

export type DocumentIntakeSaveInput = {
  name: string;
  document_type: string | null;
  expiration_date: string | null;
  file_url: string | null;
  notes: string | null;
  upload: {
    uploadId: string;
    storageBucket: string;
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    previewUrl: string | null;
    sourceKind: "upload" | "camera_scan";
  } | null;
  ai: {
    status: DocumentIntakeAiStatus;
    confidence: number | null;
    metadata: Record<string, unknown> | null;
  } | null;
  assetLinks: Array<{
    assetId: string;
    role: AssetDocumentRole;
  }>;
};

export type DocumentIntakeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: DocumentIntakeAsset[];
  onSave: (
    input: DocumentIntakeSaveInput,
    lifecycle: { markSourceCommitted: () => void },
  ) => Promise<void>;
  isSaving?: boolean;
};

type ReviewFields = {
  name: string;
  documentType: string;
  expirationDate: string;
  notes: string;
};

type ExtractedReview = {
  title: string;
  documentType: string;
  summary: string;
  expirationDate: string;
  confidence: number | null;
};

const EMPTY_REVIEW: ReviewFields = {
  name: "",
  documentType: "",
  expirationDate: "",
  notes: "",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstString(
  record: Record<string, unknown> | null,
  keys: string[],
): string {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstNumber(
  record: Record<string, unknown> | null,
  keys: string[],
): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value > 1 ? Math.min(value / 100, 1) : Math.max(value, 0);
    }
  }
  return null;
}

function extractedReviewFromResponse(
  response: DocumentIntakeResponse,
): ExtractedReview {
  const analysis = asRecord(response.analysis);
  const extracted = asRecord(analysis?.extractedDocument);

  return {
    title: firstString(extracted, ["title", "name"]),
    documentType: firstString(extracted, [
      "type",
      "documentType",
      "document_type",
      "document_type_hint",
    ]),
    summary: firstString(extracted, ["summary", "notes", "description"]),
    expirationDate: firstString(extracted, [
      "expiry",
      "expiryDate",
      "expirationDate",
      "expiration_date",
      "expiry_hint",
    ]),
    confidence: firstNumber(analysis, ["confidence", "overallConfidence"]),
  };
}

function assetHintFromResponse(response: DocumentIntakeResponse): string {
  const analysis = asRecord(response.analysis);
  const extractedAsset = asRecord(analysis?.extractedAsset);
  const extractedDocument = asRecord(analysis?.extractedDocument);

  return [
    firstString(extractedAsset, ["name"]),
    firstString(extractedAsset, ["category_hint", "category", "notes"]),
    firstString(extractedDocument, ["title", "summary"]),
    firstString(analysis, ["summary"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3);
}

function assetMatchScore(asset: DocumentIntakeAsset, hint: string): number {
  const assetName = asset.name.trim().toLowerCase();
  if (!assetName || !hint) return 0;
  if (hint.includes(assetName)) return 10;

  const hintTokens = new Set(matchTokens(hint));
  const nameMatches = matchTokens(assetName).filter((token) =>
    hintTokens.has(token),
  ).length;
  const categoryMatches = matchTokens(asset.category ?? "").filter((token) =>
    hintTokens.has(token),
  ).length;
  return nameMatches * 3 + categoryMatches;
}

function normalizeDate(value: string): string {
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

function normalizeDocumentType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  if (/passport|identity|national id|government id|id card/.test(normalized)) {
    return "identity";
  }
  if (/receipt|invoice|purchase/.test(normalized)) return "receipt";
  if (/warranty|guarantee/.test(normalized)) return "warranty";
  if (/insurance|policy/.test(normalized)) return "insurance";
  if (/manual|instruction|guide/.test(normalized)) return "manual";
  if (/contract|agreement|lease/.test(normalized)) return "contract";
  if (/tax|return|w-2|1099/.test(normalized)) return "tax";
  if (/medical|health|prescription/.test(normalized)) return "medical";
  if (/property|deed|mortgage|title/.test(normalized)) return "property";
  if (/education|degree|diploma|transcript/.test(normalized)) {
    return "education";
  }
  if (/license|licence|permit/.test(normalized)) return "license";
  if (/financial|statement|bank/.test(normalized)) return "financial";
  if (/legal|court|affidavit/.test(normalized)) return "legal";
  if (DOCUMENT_TYPES.some((option) => option.value === normalized)) {
    return normalized;
  }
  return "other";
}

function suggestedAssetRole(documentType: string): AssetDocumentRole {
  if (documentType === "receipt") return "receipt";
  if (documentType === "warranty") return "warranty";
  if (documentType === "insurance") return "insurance";
  if (documentType === "manual") return "manual";
  return "other";
}

function fileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function fileNameWithoutExtension(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateFile(file: File): string | null {
  if (file.size > DOCUMENT_MAX_BYTES) {
    return "This file is larger than 25 MB. Choose a smaller file.";
  }
  if (file.size === 0) return "This file is empty.";
  if (!ACCEPTED_EXTENSIONS.has(fileExtension(file.name))) {
    return "Unsupported format. Choose a supported document, image, Office, or OpenDocument file.";
  }
  return null;
}

function fileForDirectStorageUpload(file: File): File {
  const canonicalMimeType = DOCUMENT_UPLOAD_MIME_TYPES[fileExtension(file.name)];
  return new File([file], file.name, {
    type: canonicalMimeType ?? (file.type || "application/octet-stream"),
    lastModified: file.lastModified,
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function titleFromUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    const finalPathPart = decodeURIComponent(
      url.pathname.split("/").filter(Boolean).at(-1) ?? "",
    );
    const fromPath = fileNameWithoutExtension(finalPathPart);
    return fromPath || url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function confidencePresentation(confidence: number | null): {
  label: string;
  className: string;
} {
  if (confidence === null) {
    return {
      label: "Review suggested fields",
      className:
        "border-sky-300/45 bg-sky-100/70 text-sky-800 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-200",
    };
  }
  const percent = Math.round(confidence * 100);
  if (confidence >= 0.8) {
    return {
      label: `${percent}% high confidence`,
      className:
        "border-emerald-300/50 bg-emerald-100/75 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200",
    };
  }
  if (confidence >= 0.55) {
    return {
      label: `${percent}% medium confidence`,
      className:
        "border-amber-300/55 bg-amber-100/75 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200",
    };
  }
  return {
    label: `${percent}% low confidence`,
    className:
      "border-rose-300/55 bg-rose-100/75 text-rose-800 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200",
  };
}

function errorMessageFromPayload(payload: unknown): string | null {
  const record = asRecord(payload);
  return firstString(record, ["detail", "message", "error"]) || null;
}

function requestErrorFromPayload(
  payload: unknown,
  fallbackMessage: string,
): DocumentIntakeRequestError {
  const record = asRecord(payload);
  const code = typeof record?.error === "string" ? record.error : null;
  return new DocumentIntakeRequestError(
    errorMessageFromPayload(payload) ?? fallbackMessage,
    code,
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function uploadDocumentToSignedUrl(input: {
  uploadUrl: string;
  file: File;
  signal: AbortSignal;
}): Promise<void> {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", input.file);

  const response = await fetch(input.uploadUrl, {
    method: "PUT",
    headers: { "x-upsert": "false" },
    body,
    signal: input.signal,
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw requestErrorFromPayload(
      payload,
      "The document could not be uploaded. Try again.",
    );
  }
}

function friendlyWarning(warning: string): string {
  const known = WARNING_MESSAGES[warning];
  if (known) return known;
  if (/^[a-z0-9_]+$/.test(warning)) {
    const readable = warning.replaceAll("_", " ");
    return `${readable.charAt(0).toUpperCase()}${readable.slice(1)}.`;
  }
  return warning;
}

async function deleteUnsavedUpload(uploadId: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch("/api/documents/intake", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId }),
      keepalive: true,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Could not remove the temporary upload.");
  } finally {
    clearTimeout(timeout);
  }
}

export function DocumentIntakeDialog(props: DocumentIntakeDialogProps) {
  if (!props.open) return null;
  return <DocumentIntakeDialogSession {...props} />;
}

function DocumentIntakeDialogSession({
  onOpenChange,
  assets,
  onSave,
  isSaving: externalIsSaving = false,
}: DocumentIntakeDialogProps) {
  const locale = useAppStore((state) => state.language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const responseRef = useRef<DocumentIntakeResponse | null>(null);
  const activeUploadIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);
  const mountedRef = useRef(true);
  const operationGenerationRef = useRef(0);
  const intakeOperationRef = useRef(false);

  const [sourceMode, setSourceMode] = useState<SourceMode>("upload");
  const [phase, setPhase] = useState<IntakePhase>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSourceKind, setUploadSourceKind] = useState<
    "upload" | "camera_scan"
  >("upload");
  const [intakeResponse, setIntakeResponse] =
    useState<DocumentIntakeResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [allowAiAnalysis, setAllowAiAnalysis] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [review, setReview] = useState<ReviewFields>(EMPTY_REVIEW);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetLinks, setAssetLinks] = useState<
    Array<{ assetId: string; role: AssetDocumentRole }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [canRetryUpload, setCanRetryUpload] = useState(true);
  const [internalIsSaving, setInternalIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const busy =
    phase === "processing" ||
    externalIsSaving ||
    internalIsSaving ||
    isCleaning;
  const isSaving = externalIsSaving || internalIsSaving;
  const validLink = isValidHttpUrl(linkUrl);
  const sourceIsValid =
    sourceMode === "upload" ? phase === "ready" && !!intakeResponse : validLink;
  const canSave = sourceIsValid && review.name.trim().length > 0 && !busy;

  const extracted = useMemo(
    () =>
      intakeResponse
        ? extractedReviewFromResponse(intakeResponse)
        : (null as ExtractedReview | null),
    [intakeResponse],
  );
  const confidence = confidencePresentation(extracted?.confidence ?? null);

  const linkedAssetIds = useMemo(
    () => new Set(assetLinks.map((link) => link.assetId)),
    [assetLinks],
  );

  const suggestedAssetIds = useMemo(() => {
    if (!intakeResponse || intakeResponse.aiStatus !== "complete") {
      return new Set<string>();
    }
    const hint = assetHintFromResponse(intakeResponse);
    return new Set(
      assets
        .map((asset) => ({ asset, score: assetMatchScore(asset, hint) }))
        .filter(({ score }) => score >= 3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ asset }) => asset.id),
    );
  }, [assets, intakeResponse]);

  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    if (!query) {
      return [...assets]
        .sort(
          (a, b) =>
            Number(suggestedAssetIds.has(b.id)) -
            Number(suggestedAssetIds.has(a.id)),
        )
        .slice(0, 8);
    }
    return assets
      .filter((asset) =>
        `${asset.name} ${asset.category ?? ""}`.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [assetSearch, assets, suggestedAssetIds]);

  const linkedAssets = useMemo(
    () =>
      assetLinks
        .map((link) => ({
          ...link,
          asset: assets.find((asset) => asset.id === link.assetId),
        }))
        .filter(
          (
            link,
          ): link is typeof link & { asset: DocumentIntakeAsset } =>
            Boolean(link.asset),
        ),
    [assetLinks, assets],
  );

  const revokePreview = useCallback(() => {
    if (!previewUrlRef.current) return;
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
  }, []);

  const detachResponse = useCallback(() => {
    const current = responseRef.current;
    responseRef.current = null;
    setIntakeResponse(null);
    return current;
  }, []);

  const cleanPendingUpload = useCallback(async (uploadId: string) => {
    try {
      await deleteUnsavedUpload(uploadId);
    } catch {
      // Best-effort cleanup. The server can separately clear stale intake files.
    }
  }, []);

  const isOperationCurrent = useCallback(
    (generation: number) =>
      mountedRef.current && operationGenerationRef.current === generation,
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationGenerationRef.current += 1;
      abortRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const pending = responseRef.current;
      const uploadId = activeUploadIdRef.current;
      const cleanupId = uploadId ?? pending?.uploadId;
      if (!savedRef.current && cleanupId) {
        void deleteUnsavedUpload(cleanupId).catch(() => undefined);
      }
    };
  }, []);

  const clearSelectedFile = useCallback(
    async (options: { resetReview?: boolean } = {}) => {
      const generation = ++operationGenerationRef.current;
      abortRef.current?.abort();
      const pending = detachResponse();
      const uploadId = activeUploadIdRef.current ?? pending?.uploadId ?? null;
      activeUploadIdRef.current = null;
      if (uploadId) {
        setIsCleaning(true);
        await cleanPendingUpload(uploadId);
        if (!isOperationCurrent(generation)) return;
        setIsCleaning(false);
      }
      revokePreview();
      setSelectedFile(null);
      setUploadSourceKind("upload");
      setPhase("idle");
      setError(null);
      setCanRetryUpload(true);
      if (options.resetReview !== false) setReview(EMPTY_REVIEW);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    },
    [cleanPendingUpload, detachResponse, isOperationCurrent, revokePreview],
  );

  const startIntake = useCallback(
    async (file: File, sourceKind: "upload" | "camera_scan" = "upload") => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      if (intakeOperationRef.current) return;
      intakeOperationRef.current = true;

      const generation = ++operationGenerationRef.current;
      abortRef.current?.abort();

      const existing = detachResponse();
      const previousUploadId =
        activeUploadIdRef.current ?? existing?.uploadId ?? null;
      activeUploadIdRef.current = null;
      if (previousUploadId) {
        setIsCleaning(true);
        await cleanPendingUpload(previousUploadId);
        if (!isOperationCurrent(generation)) {
          intakeOperationRef.current = false;
          return;
        }
        setIsCleaning(false);
      }

      revokePreview();
      setSelectedFile(file);
      setUploadSourceKind(sourceKind);
      setReview({
        ...EMPTY_REVIEW,
        name: fileNameWithoutExtension(file.name),
      });
      setAssetLinks([]);
      setAssetSearch("");
      setError(null);
      setCanRetryUpload(true);
      setPhase("processing");

      if (file.type.startsWith("image/")) {
        const nextPreviewUrl = URL.createObjectURL(file);
        previewUrlRef.current = nextPreviewUrl;
        setPreviewUrl(nextPreviewUrl);
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const uploadId = crypto.randomUUID();
      activeUploadIdRef.current = uploadId;

      try {
        const reservationResponse = await fetch("/api/documents/intake", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId,
            fileName: file.name,
            fileSize: file.size,
          }),
          signal: controller.signal,
        });
        if (!isOperationCurrent(generation)) return;

        const reservationPayload: unknown = await reservationResponse
          .json()
          .catch(() => null);
        if (!isOperationCurrent(generation)) return;

        if (!reservationResponse.ok) {
          throw requestErrorFromPayload(
            reservationPayload,
            "The document could not be prepared. Try again.",
          );
        }

        const reservation = reservationPayload as DocumentIntakeReservationResponse;
        if (
          reservation.uploadId !== uploadId ||
          !reservation.storagePath ||
          !reservation.uploadUrl
        ) {
          throw new Error("The secure upload response was incomplete. Try again.");
        }

        const uploadFile = fileForDirectStorageUpload(file);
        await uploadDocumentToSignedUrl({
          uploadUrl: reservation.uploadUrl,
          file: uploadFile,
          signal: controller.signal,
        });
        if (!isOperationCurrent(generation)) {
          await cleanPendingUpload(uploadId);
          return;
        }

        const response = await fetch("/api/documents/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId }),
          signal: controller.signal,
        });
        if (!isOperationCurrent(generation)) return;

        const payload: unknown = await response.json().catch(() => null);
        if (!isOperationCurrent(generation)) return;

        if (!response.ok) {
          throw requestErrorFromPayload(
            payload,
            "The document could not be prepared. Try again.",
          );
        }

        const result = payload as DocumentIntakeResponse;
        if (!result.storagePath || !result.uploadId) {
          throw new Error("The upload response was incomplete. Try again.");
        }
        if (!isOperationCurrent(generation)) return;

        responseRef.current = result;
        setIntakeResponse(result);

        let completedResult = result;
        if (allowAiAnalysis) {
          try {
            const analysisResponse = await fetch("/api/documents/intake", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                storagePath: result.storagePath,
                locale,
              }),
              signal: controller.signal,
            });
            if (!isOperationCurrent(generation)) return;

            const analysisPayload: unknown = await analysisResponse
              .json()
              .catch(() => null);
            if (!isOperationCurrent(generation)) return;

            if (!analysisResponse.ok) {
              throw requestErrorFromPayload(
                analysisPayload,
                "AI analysis could not finish.",
              );
            }

            const analysisResult = analysisPayload as DocumentIntakeAnalyzeResponse;
            completedResult = {
              ...result,
              analysis: analysisResult.analysis,
              aiStatus: analysisResult.aiStatus,
              warnings: [
                ...new Set([...result.warnings, ...analysisResult.warnings]),
              ],
            };
          } catch (analysisError) {
            if (isAbortError(analysisError) || !isOperationCurrent(generation)) return;
            completedResult = {
              ...result,
              aiStatus: "failed",
              warnings: [
                ...new Set([
                  ...result.warnings,
                  "ai_analysis_failed_upload_preserved",
                ]),
              ],
            };
          }
          if (!isOperationCurrent(generation)) return;
          responseRef.current = completedResult;
          setIntakeResponse(completedResult);
        }

        if (!isOperationCurrent(generation)) return;
        setPhase("ready");

        const suggestion = extractedReviewFromResponse(completedResult);
        setReview((current) => ({
          name: suggestion.title || current.name,
          documentType:
            normalizeDocumentType(suggestion.documentType) ||
            current.documentType,
          expirationDate:
            normalizeDate(suggestion.expirationDate) || current.expirationDate,
          notes: suggestion.summary || current.notes,
        }));
      } catch (caught) {
        if (isAbortError(caught) || !isOperationCurrent(generation)) {
          await cleanPendingUpload(uploadId);
          return;
        }
        setPhase("error");
        setCanRetryUpload(
          !(
            caught instanceof DocumentIntakeRequestError &&
            caught.code !== null &&
            PERMANENT_INTAKE_ERROR_CODES.has(caught.code)
          ),
        );
        setError(
          caught instanceof Error
            ? caught.message
            : "The document could not be prepared. Try again.",
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        intakeOperationRef.current = false;
      }
    },
    [
      allowAiAnalysis,
      cleanPendingUpload,
      detachResponse,
      isOperationCurrent,
      locale,
      revokePreview,
    ],
  );

  const handleFileInput = (
    event: ChangeEvent<HTMLInputElement>,
    sourceKind: "upload" | "camera_scan" = "upload",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void startIntake(file, sourceKind);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void startIntake(file);
  };

  const switchSource = async (nextMode: SourceMode) => {
    if (nextMode === sourceMode || busy) return;
    if (sourceMode === "upload") await clearSelectedFile();
    if (!mountedRef.current) return;
    setSourceMode(nextMode);
    setError(null);
    setReview(EMPTY_REVIEW);
    setAssetLinks([]);
    setAssetSearch("");
  };

  const toggleAsset = (assetId: string) => {
    setAssetLinks((current) => {
      if (current.some((link) => link.assetId === assetId)) {
        return current.filter((link) => link.assetId !== assetId);
      }
      return [
        ...current,
        { assetId, role: suggestedAssetRole(review.documentType) },
      ];
    });
  };

  const changeAssetRole = (assetId: string, role: AssetDocumentRole) => {
    setAssetLinks((current) =>
      current.map((link) =>
        link.assetId === assetId ? { ...link, role } : link,
      ),
    );
  };

  const requestClose = async () => {
    if (isSaving) return;
    operationGenerationRef.current += 1;
    abortRef.current?.abort();
    const pending = detachResponse();
    const uploadId = activeUploadIdRef.current ?? pending?.uploadId ?? null;
    activeUploadIdRef.current = null;
    responseRef.current = null;
    revokePreview();
    setIsCleaning(false);
    onOpenChange(false);
    if (uploadId) await cleanPendingUpload(uploadId);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setError(null);
    setInternalIsSaving(true);

    try {
      const response = intakeResponse;
      const extractedResult = response
        ? extractedReviewFromResponse(response)
        : null;
      const analysisRecord = response ? asRecord(response.analysis) : null;
      const aiMetadata = response
        ? ({
            ...(analysisRecord ? { analysis: analysisRecord } : {}),
            ...(response.warnings.length > 0
              ? { warnings: response.warnings }
              : {}),
          } satisfies Record<string, unknown>)
        : null;

      const markSourceCommitted = () => {
        savedRef.current = true;
        responseRef.current = null;
        activeUploadIdRef.current = null;
      };

      await onSave(
        {
          name: review.name.trim(),
          document_type: review.documentType || null,
          expiration_date: review.expirationDate || null,
          file_url: sourceMode === "link" ? linkUrl.trim() : null,
          notes: review.notes.trim() || null,
          upload: response
            ? {
                uploadId: response.uploadId,
                storageBucket: response.storageBucket,
                storagePath: response.storagePath,
                fileName: response.fileName,
                mimeType: response.mimeType,
                fileSize: response.fileSize,
                previewUrl: response.previewUrl ?? null,
                sourceKind: uploadSourceKind,
              }
            : null,
          ai: response
            ? {
                status: response.aiStatus,
                confidence: extractedResult?.confidence ?? null,
                metadata:
                  aiMetadata && Object.keys(aiMetadata).length > 0
                    ? aiMetadata
                    : null,
              }
            : null,
          assetLinks,
        },
        { markSourceCommitted },
      );

      markSourceCommitted();
      revokePreview();
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The document could not be saved. Try again.",
      );
    } finally {
      setInternalIsSaving(false);
    }
  };

  const linkHasError = linkUrl.trim().length > 0 && !validLink;

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) void requestClose();
      }}
    >
      <OSDialogSurface
        size="4xl"
        showCloseButton={false}
        className="h-[min(94dvh,920px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden gap-0 p-0"
        aria-busy={busy}
      >
        <header className="relative border-b border-slate-200/70 px-4 py-4 pr-16 dark:border-white/10 sm:px-6 sm:py-5 sm:pr-20">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_18%_0%,rgba(190,242,100,0.14),transparent_58%)]"
            aria-hidden
          />
          <DialogHeader className="relative gap-1.5">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl border border-lime-300/50 bg-lime-200/45 text-lime-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-lime-300/15 dark:bg-lime-300/10 dark:text-lime-200">
                <FileCheck2 className="size-4.5" aria-hidden />
              </span>
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Add document
              </DialogTitle>
            </div>
            <DialogDescription className="max-w-2xl leading-5">
              Upload the actual file, then review its details and connect it to
              the things it protects.
            </DialogDescription>
          </DialogHeader>
          <OSIconControl
            type="button"
            aria-label="Close add document dialog"
            className="absolute right-3 top-3 sm:right-5 sm:top-5"
            onClick={() => void requestClose()}
            disabled={isSaving}
          >
            <X className="size-4" aria-hidden />
          </OSIconControl>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-5xl space-y-5">
            <div
              className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200/75 bg-slate-100/70 p-1 dark:border-white/10 dark:bg-white/[0.05]"
              role="group"
              aria-label="Document source"
            >
              <button
                type="button"
                aria-pressed={sourceMode === "upload"}
                disabled={busy}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-lime-400/60 disabled:opacity-50",
                  sourceMode === "upload"
                    ? "bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-white/55 dark:hover:text-white",
                )}
                onClick={() => void switchSource("upload")}
              >
                <UploadCloud className="size-4" aria-hidden />
                Upload file
              </button>
              <button
                type="button"
                aria-pressed={sourceMode === "link"}
                disabled={busy}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-lime-400/60 disabled:opacity-50",
                  sourceMode === "link"
                    ? "bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-white/55 dark:hover:text-white",
                )}
                onClick={() => void switchSource("link")}
              >
                <Link2 className="size-4" aria-hidden />
                External link
              </button>
            </div>

            {sourceMode === "upload" ? (
              <section className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/75 bg-white/55 p-3.5 dark:border-white/10 dark:bg-white/[0.035] sm:p-4">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.07] dark:text-white/65">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          AI document analysis
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-white/52">
                          Off by default. If enabled, the file content is sent
                          to your configured AI provider to suggest its title,
                          type, summary, and expiry date.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={allowAiAnalysis}
                        aria-label="Allow AI to analyze this document"
                        disabled={busy || selectedFile !== null}
                        onClick={() => setAllowAiAnalysis((current) => !current)}
                        className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span
                          className={cn(
                            "relative h-7 w-12 rounded-full border transition-colors",
                            allowAiAnalysis
                              ? "border-lime-500/40 bg-lime-400 dark:bg-lime-300"
                              : "border-slate-300 bg-slate-200 dark:border-white/12 dark:bg-white/10",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 grid size-5.5 place-items-center rounded-full bg-white text-slate-700 shadow-sm transition-transform",
                              allowAiAnalysis
                                ? "translate-x-[1.35rem]"
                                : "translate-x-0.5",
                            )}
                          >
                            {allowAiAnalysis ? (
                              <Check className="size-3" aria-hidden />
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-white/65">
                      <LockKeyhole className="size-3" aria-hidden />
                      You stay in control and can edit every suggestion.
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept={ACCEPTED_FILE_INPUT}
                  aria-label="Choose a document file"
                  tabIndex={-1}
                  disabled={busy}
                  onChange={handleFileInput}
                />
                <input
                  ref={cameraInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-label="Scan a document with the camera"
                  tabIndex={-1}
                  disabled={busy}
                  onChange={(event) => handleFileInput(event, "camera_scan")}
                />

                {!selectedFile ? (
                  <div
                    className={cn(
                      "group relative isolate flex min-h-60 flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed px-5 py-8 text-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-lime-400/60 sm:min-h-64",
                      dragActive
                        ? "border-lime-500 bg-lime-100/65 shadow-[0_18px_48px_rgba(132,204,22,0.12)] dark:border-lime-300/60 dark:bg-lime-300/10"
                        : "border-slate-300/90 bg-gradient-to-b from-white/75 to-slate-50/65 hover:border-lime-500/60 hover:from-lime-50/70 hover:to-white/65 dark:border-white/15 dark:from-white/[0.055] dark:to-white/[0.025] dark:hover:border-lime-300/35 dark:hover:from-lime-300/[0.08] dark:hover:to-white/[0.035]",
                    )}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      if (!busy) setDragActive(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        setDragActive(false);
                      }
                    }}
                    onDrop={handleDrop}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_28%,rgba(190,242,100,0.14),transparent_42%)] opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="grid size-14 place-items-center rounded-2xl border border-slate-200/85 bg-white/85 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-white/12 dark:bg-white/[0.07] dark:text-white/75 dark:shadow-none">
                      <UploadCloud className="size-6" aria-hidden />
                    </div>
                    <p className="mt-4 text-base font-semibold text-slate-950 dark:text-white sm:text-lg">
                      {dragActive ? "Drop your document here" : "Bring the document in"}
                    </p>
                    <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-white/52">
                      Drag and drop one file, browse your device, or scan a page
                      with your phone camera.
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <OSPrimaryAction
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadCloud className="size-4" aria-hidden />
                        Browse files
                      </OSPrimaryAction>
                      <OSControl
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="size-4" aria-hidden />
                        Scan with camera
                      </OSControl>
                    </div>
                    <p className="mt-5 max-w-2xl text-xs leading-5 text-slate-600 dark:text-white/65">
                      <span className="block">
                        AI-ready: PDF, DOCX, TXT, MD, CSV, JPG/JPEG, PNG,
                        WebP, HEIC/HEIF
                      </span>
                      <span className="block">
                        Binary AI analysis: PDF, DOCX, and images up to 18 MB
                      </span>
                      <span className="block">
                        Upload-only for now: XLSX, PPTX, RTF, ODT, ODS, ODP,
                        GIF, TIF/TIFF, BMP
                        <span aria-hidden> · </span>
                        <span className="whitespace-nowrap">
                          All uploads 25 MB max
                        </span>
                      </span>
                    </p>
                  </div>
                ) : (
                  <FileStateCard
                    file={selectedFile}
                    previewUrl={previewUrl}
                    phase={phase}
                    aiStatus={intakeResponse?.aiStatus ?? null}
                    allowAiAnalysis={allowAiAnalysis}
                    canRetry={canRetryUpload}
                    disabled={busy}
                    onReplace={() => fileInputRef.current?.click()}
                    onRemove={() => void clearSelectedFile()}
                    onRetry={() => void startIntake(selectedFile, uploadSourceKind)}
                  />
                )}
              </section>
            ) : (
              <section>
                <OSFrostedPanel className="p-4 sm:p-5">
                  <div className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200/80 bg-white/65 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65">
                      <Link2 className="size-4.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Label htmlFor="document-external-url">External URL</Label>
                      <Input
                        id="document-external-url"
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        className="mt-2 h-11"
                        placeholder="https://drive.google.com/…"
                        value={linkUrl}
                        aria-invalid={linkHasError}
                        aria-describedby="document-link-help"
                        disabled={busy}
                        onChange={(event) => setLinkUrl(event.target.value)}
                        onBlur={() => {
                          if (validLink && !review.name.trim()) {
                            setReview((current) => ({
                              ...current,
                              name: titleFromUrl(linkUrl),
                            }));
                          }
                        }}
                      />
                      <p
                        id="document-link-help"
                        className={cn(
                          "mt-2 text-xs leading-5",
                          linkHasError
                            ? "text-rose-600 dark:text-rose-300"
                            : "text-slate-600 dark:text-white/65",
                        )}
                      >
                        {linkHasError
                          ? "Enter a complete http:// or https:// address."
                          : "We save the link only. The external file is not copied or sent to AI."}
                      </p>
                    </div>
                  </div>
                </OSFrostedPanel>
              </section>
            )}

            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {phase === "processing"
                ? allowAiAnalysis
                  ? "Uploading and analyzing document"
                  : "Uploading document"
                : phase === "ready"
                  ? "Document ready to review"
                  : phase === "error"
                    ? error
                    : ""}
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-rose-300/55 bg-rose-50/80 px-4 py-3 text-sm leading-5 text-rose-800 dark:border-rose-300/20 dark:bg-rose-300/[0.08] dark:text-rose-200"
              >
                {error}
              </div>
            ) : null}

            {sourceMode === "link" || phase === "ready" ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
                <ReviewDocumentFields
                  review={review}
                  setReview={setReview}
                  disabled={busy}
                  aiStatus={intakeResponse?.aiStatus ?? null}
                  confidence={confidence}
                  showAiConfidence={
                    sourceMode === "upload" &&
                    intakeResponse?.aiStatus === "complete"
                  }
                />
                <AssetLinker
                  assets={assets}
                  filteredAssets={filteredAssets}
                  linkedAssets={linkedAssets}
                  linkedAssetIds={linkedAssetIds}
                  suggestedAssetIds={suggestedAssetIds}
                  search={assetSearch}
                  setSearch={setAssetSearch}
                  onToggle={toggleAsset}
                  onRoleChange={changeAssetRole}
                  disabled={busy}
                />
              </div>
            ) : null}

            {intakeResponse?.warnings.length ? (
              <div className="rounded-2xl border border-amber-300/45 bg-amber-50/70 px-4 py-3 dark:border-amber-300/15 dark:bg-amber-300/[0.07]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-900/75 dark:text-amber-200/80">
                  Check before saving
                </p>
                <ul className="mt-1.5 space-y-1 text-sm leading-5 text-amber-900/85 dark:text-amber-100/75">
                  {intakeResponse.warnings.map((warning) => (
                    <li key={warning}>• {friendlyWarning(warning)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="border-t border-slate-200/75 bg-white/68 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/66 sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-5xl flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden items-center gap-1.5 text-xs text-slate-600 dark:text-white/65 sm:flex">
              <ShieldCheck className="size-3.5" aria-hidden />
              Review AI suggestions before you save.
            </p>
            <div className="flex w-full gap-2 sm:w-auto">
              <OSControl
                type="button"
                className="flex-1 sm:flex-none"
                onClick={() => void requestClose()}
                disabled={isSaving}
              >
                Cancel
              </OSControl>
              <OSPrimaryAction
                type="button"
                className="flex-1 sm:flex-none"
                disabled={!canSave}
                onClick={() => void handleSave()}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <FileCheck2 className="size-4" aria-hidden />
                )}
                {isSaving ? "Saving…" : "Save document"}
              </OSPrimaryAction>
            </div>
          </div>
        </footer>
      </OSDialogSurface>
    </Dialog>
  );
}

function FileStateCard({
  file,
  previewUrl,
  phase,
  aiStatus,
  allowAiAnalysis,
  canRetry,
  disabled,
  onReplace,
  onRemove,
  onRetry,
}: {
  file: File;
  previewUrl: string | null;
  phase: IntakePhase;
  aiStatus: DocumentIntakeAiStatus | null;
  allowAiAnalysis: boolean;
  canRetry: boolean;
  disabled: boolean;
  onReplace: () => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const processing = phase === "processing";
  const ready = phase === "ready";

  return (
    <OSFrostedPanel className="p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65 sm:size-16">
          {previewUrl ? (
            // Blob URLs are local, ephemeral previews and cannot use next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected document preview"
              className="size-full object-cover"
            />
          ) : (
            <FileText className="size-6" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {file.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-white/65">
                {formatBytes(file.size)} · {fileExtension(file.name).toUpperCase()}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "h-6 gap-1.5",
                processing &&
                  "border-sky-300/45 bg-sky-100/70 text-sky-800 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-200",
                ready &&
                  "border-emerald-300/50 bg-emerald-100/70 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200",
                phase === "error" &&
                  "border-rose-300/50 bg-rose-100/70 text-rose-800 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200",
              )}
            >
              {processing ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : ready ? (
                <Check aria-hidden />
              ) : null}
              {processing
                ? allowAiAnalysis
                  ? "Analyzing"
                  : "Uploading"
                : ready
                  ? aiStatus === "complete"
                    ? "AI ready"
                    : "Uploaded"
                  : canRetry
                    ? "Needs retry"
                    : "Choose another file"}
            </Badge>
          </div>

          {processing ? (
            <div className="mt-4" aria-hidden>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-lime-400 dark:bg-lime-300" />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-white/65">
                {allowAiAnalysis
                  ? "Uploading securely, then reading the document for suggestions…"
                  : "Uploading securely without AI analysis…"}
              </p>
            </div>
          ) : null}

          {!processing ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {phase === "error" && canRetry ? (
                <OSPrimaryAction
                  type="button"
                  osSize="compact"
                  onClick={onRetry}
                  disabled={disabled}
                >
                  Retry upload
                </OSPrimaryAction>
              ) : null}
              <OSControl
                type="button"
                osSize="compact"
                onClick={onReplace}
                disabled={disabled}
              >
                Replace
              </OSControl>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-11 min-h-11 text-slate-500 hover:text-rose-600 sm:h-8 sm:min-h-8 dark:text-white/48 dark:hover:text-rose-300"
                onClick={onRemove}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </OSFrostedPanel>
  );
}

function ReviewDocumentFields({
  review,
  setReview,
  disabled,
  aiStatus,
  confidence,
  showAiConfidence,
}: {
  review: ReviewFields;
  setReview: (updater: (current: ReviewFields) => ReviewFields) => void;
  disabled: boolean;
  aiStatus: DocumentIntakeAiStatus | null;
  confidence: { label: string; className: string };
  showAiConfidence: boolean;
}) {
  return (
    <OSFrostedPanel as="section" className="overflow-visible p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-white/65">
            Review details
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
            Make the record unmistakable
          </h3>
        </div>
        {showAiConfidence ? (
          <Badge variant="outline" className={cn("h-6", confidence.className)}>
            <Sparkles aria-hidden />
            {confidence.label}
          </Badge>
        ) : aiStatus === "failed" ? (
          <Badge
            variant="outline"
            className="h-6 border-amber-300/50 bg-amber-100/70 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200"
          >
            AI unavailable · enter manually
          </Badge>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="document-intake-name">
            Name <span className="text-rose-600 dark:text-rose-300">*</span>
          </Label>
          <Input
            id="document-intake-name"
            value={review.name}
            maxLength={160}
            required
            aria-required="true"
            autoComplete="off"
            disabled={disabled}
            placeholder="e.g. Home insurance policy"
            onChange={(event) =>
              setReview((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-intake-type">Document type</Label>
          <Select
            value={review.documentType || null}
            disabled={disabled}
            onValueChange={(value) =>
              value &&
              setReview((current) => ({
                ...current,
                documentType: value,
              }))
            }
          >
            <SelectTrigger id="document-intake-type" className="w-full">
              <SelectValue placeholder="Choose a type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-intake-expiry">Expiration date</Label>
          <Input
            id="document-intake-expiry"
            type="date"
            value={review.expirationDate}
            disabled={disabled}
            onChange={(event) =>
              setReview((current) => ({
                ...current,
                expirationDate: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="document-intake-notes">Summary or notes</Label>
            <span className="text-[11px] tabular-nums text-slate-600 dark:text-white/65">
              {review.notes.length}/2000
            </span>
          </div>
          <Textarea
            id="document-intake-notes"
            rows={4}
            maxLength={2000}
            value={review.notes}
            disabled={disabled}
            placeholder="Key coverage, obligations, renewal details…"
            className="min-h-24 resize-y"
            onChange={(event) =>
              setReview((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
          />
        </div>
      </div>

      {review.expirationDate ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-lime-100/55 px-3 py-2.5 text-xs leading-5 text-lime-950 dark:bg-lime-300/[0.08] dark:text-lime-100/75">
          <BellRing className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          This date can power expiry reminders after the document is saved.
        </div>
      ) : null}
    </OSFrostedPanel>
  );
}

function AssetLinker({
  assets,
  filteredAssets,
  linkedAssets,
  linkedAssetIds,
  suggestedAssetIds,
  search,
  setSearch,
  onToggle,
  onRoleChange,
  disabled,
}: {
  assets: DocumentIntakeAsset[];
  filteredAssets: DocumentIntakeAsset[];
  linkedAssets: Array<{
    assetId: string;
    role: AssetDocumentRole;
    asset: DocumentIntakeAsset;
  }>;
  linkedAssetIds: Set<string>;
  suggestedAssetIds: Set<string>;
  search: string;
  setSearch: (value: string) => void;
  onToggle: (assetId: string) => void;
  onRoleChange: (assetId: string, role: AssetDocumentRole) => void;
  disabled: boolean;
}) {
  return (
    <OSFrostedPanel as="section" className="overflow-visible p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-white/65">
            Related assets
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
            Connect the evidence
          </h3>
        </div>
        {linkedAssets.length > 0 ? (
          <Badge
            variant="outline"
            className="h-6 border-lime-400/40 bg-lime-100/65 text-lime-900 dark:border-lime-300/15 dark:bg-lime-300/[0.08] dark:text-lime-200"
          >
            {linkedAssets.length} linked
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-white/65">
        A receipt, warranty, or policy can belong to more than one asset.
      </p>

      {assets.length > 0 ? (
        <>
          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500 dark:text-white/60"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              disabled={disabled}
              className="h-11 pl-9"
              placeholder="Search your assets"
              aria-label="Search assets to link"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div
            className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200/70 bg-white/45 p-1 dark:border-white/8 dark:bg-white/[0.025]"
            aria-label="Available assets"
          >
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => {
                const selected = linkedAssetIds.has(asset.id);
                const suggested = suggestedAssetIds.has(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-lime-400/60 disabled:opacity-50",
                      selected
                        ? "bg-lime-100/70 text-lime-950 dark:bg-lime-300/10 dark:text-lime-100"
                        : "hover:bg-white/75 dark:hover:bg-white/[0.06]",
                    )}
                    onClick={() => onToggle(asset.id)}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-lg border",
                        selected
                          ? "border-lime-500/40 bg-lime-400 text-slate-950 dark:border-lime-300/20 dark:bg-lime-300"
                          : "border-slate-300 bg-white/55 text-transparent dark:border-white/12 dark:bg-white/[0.04]",
                      )}
                    >
                      <Check className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                        <span className="truncate">{asset.name}</span>
                        {suggested ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lime-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-lime-900 dark:bg-lime-300/12 dark:text-lime-200">
                            <Sparkles className="size-2.5" aria-hidden />
                            Suggested
                          </span>
                        ) : null}
                      </span>
                      {asset.category ? (
                        <span className="block truncate text-[11px] text-slate-600 dark:text-white/65">
                          {asset.category}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      className={cn(
                        "size-3.5 shrink-0",
                        selected
                          ? "text-lime-700 dark:text-lime-200"
                          : "text-slate-300 dark:text-white/20",
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-5 text-center text-xs text-slate-600 dark:text-white/65">
                No assets match “{search}”.
              </p>
            )}
          </div>

          {linkedAssets.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-white/65">
                Document role
              </p>
              {linkedAssets.map(({ asset, assetId, role }) => (
                <div
                  key={assetId}
                  className="grid gap-2 rounded-xl border border-slate-200/70 bg-white/55 p-2.5 dark:border-white/8 dark:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center"
                >
                  <p className="min-w-0 truncate text-sm font-medium">
                    {asset.name}
                  </p>
                  <Select
                    value={role}
                    disabled={disabled}
                    onValueChange={(value) =>
                      value &&
                      onRoleChange(assetId, value as AssetDocumentRole)
                    }
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label={`Relationship of document to ${asset.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_DOCUMENT_ROLES.map((roleOption) => (
                        <SelectItem key={roleOption} value={roleOption}>
                          {ROLE_LABELS[roleOption]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="justify-self-end text-slate-500 hover:text-rose-600 dark:text-white/60 dark:hover:text-rose-300"
                    aria-label={`Remove ${asset.name} link`}
                    disabled={disabled}
                    onClick={() => onToggle(assetId)}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300/75 px-4 py-6 text-center dark:border-white/12">
          <p className="text-sm font-medium text-slate-700 dark:text-white/70">
            No assets yet
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/65">
            Save the document now. You can connect it after adding an asset.
          </p>
        </div>
      )}
    </OSFrostedPanel>
  );
}
