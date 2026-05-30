import type { AudioProviderInput, AudioProviderOutput } from "@/lib/ai/audio-summary";

export type VoxCpmHealth = {
  ok: boolean;
  modelLoaded?: boolean;
  error?: string;
};

function getVoxCpmBaseUrl(): string {
  const baseUrl = process.env.VOXCPM_BASE_URL?.trim();
  if (!baseUrl) throw new Error("voxcpm_base_url_missing");
  return baseUrl.replace(/\/+$/, "");
}

function getTimeoutMs(): number {
  const raw = Number.parseInt(process.env.VOXCPM_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 180_000;
}

function getHealthTimeoutMs(): number {
  const raw = Number.parseInt(process.env.VOXCPM_HEALTH_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 5_000;
}

function voxCpmAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const apiKey = process.env.VOXCPM_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

export function formatVoxCpmFetchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("network")
  ) {
    return "VoxCPM TTS sidecar is not reachable. Start it with: npm run dev:tts";
  }
  if (lower.includes("abort") || lower.includes("timeout")) {
    return "VoxCPM TTS timed out. The first run loads the model and can take several minutes.";
  }
  return message;
}

/** Quick connectivity check before spending time on transcript generation. */
export async function pingVoxCpm(): Promise<VoxCpmHealth> {
  try {
    const response = await fetch(`${getVoxCpmBaseUrl()}/health`, {
      method: "GET",
      headers: voxCpmAuthHeaders(),
      signal: AbortSignal.timeout(getHealthTimeoutMs()),
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `voxcpm_health_${response.status}`,
      };
    }
    const payload = (await response.json()) as { model_loaded?: boolean };
    return {
      ok: true,
      modelLoaded: payload.model_loaded === true,
    };
  } catch (error) {
    return {
      ok: false,
      error: formatVoxCpmFetchError(error),
    };
  }
}

export async function synthesizeWithVoxCpm(
  input: AudioProviderInput,
): Promise<AudioProviderOutput> {
  const text = input.text.trim().slice(0, 14_000);
  if (!text) throw new Error("empty_script");

  const form = new FormData();
  form.set("text", text);
  form.set("language", input.language);
  form.set("mode", input.voiceMode ?? (input.referenceAudio ? "reference_clone" : "preset"));
  form.set("voice_control", input.voiceControl ?? "");
  form.set("prompt_text", input.promptText ?? "");
  form.set("cfg_value", process.env.VOXCPM_CFG_VALUE?.trim() || "2.0");
  form.set("inference_timesteps", process.env.VOXCPM_INFERENCE_TIMESTEPS?.trim() || "10");

  if (input.referenceAudio) {
    const arrayBuffer = new ArrayBuffer(input.referenceAudio.bytes.byteLength);
    new Uint8Array(arrayBuffer).set(input.referenceAudio.bytes);
    const blob = new Blob([arrayBuffer], {
      type: input.referenceAudio.mimeType || "audio/wav",
    });
    form.set("reference_audio", blob, input.referenceAudio.filename || "reference.wav");
  }

  let response: Response;
  try {
    response = await fetch(`${getVoxCpmBaseUrl()}/synthesize`, {
      method: "POST",
      headers: voxCpmAuthHeaders(),
      body: form,
      signal: AbortSignal.timeout(getTimeoutMs()),
    });
  } catch (error) {
    throw new Error(formatVoxCpmFetchError(error));
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`voxcpm_http_${response.status}:${detail.slice(0, 220)}`);
  }

  const audioBytes = Buffer.from(await response.arrayBuffer());
  if (audioBytes.length < 64) throw new Error("voxcpm_empty_audio");

  return {
    audioBytes,
    mimeType: response.headers.get("content-type") || "audio/wav",
    provider: "voxcpm",
    voiceName: input.referenceAudio ? "user_reference_voice" : input.voiceControl ?? "voxcpm_preset",
  };
}
