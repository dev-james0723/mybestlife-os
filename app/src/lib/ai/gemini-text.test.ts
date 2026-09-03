import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGeminiStructured } from "./gemini-text";

function geminiJsonResponse(value: unknown): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("fetchGeminiStructured model fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("tries the explicit fallback when Pro has model-specific 429 quota", async () => {
    vi.stubEnv("GEMINI_TEXT_FALLBACK_MODELS", "gemini-unused");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: "Quota exceeded, limit: 0, model: gemini-pro",
              status: "RESOURCE_EXHAUSTED",
            },
          }),
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(geminiJsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGeminiStructured<{ ok: boolean }>({
      apiKey: "test-key",
      model: "gemini-pro",
      fallbackModel: "gemini-flash",
      systemInstruction: "Return JSON.",
      userText: "test",
      responseSchema: {
        type: "object",
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
      },
    });

    expect(result).toEqual({ data: { ok: true }, modelUsed: "gemini-flash" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/gemini-pro:generateContent");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/gemini-flash:generateContent");
  });

  it("does not retry invalid credentials on another model", async () => {
    vi.stubEnv("GEMINI_TEXT_FALLBACK_MODELS", "gemini-unused");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 403, message: "invalid key" } }), {
        status: 403,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchGeminiStructured({
        apiKey: "test-key",
        model: "gemini-pro",
        fallbackModel: "gemini-flash",
        systemInstruction: "Return JSON.",
        userText: "test",
        responseSchema: { type: "object" },
      }),
    ).rejects.toThrow("gemini_http_403");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not waste fallback calls when prepaid credits are depleted", async () => {
    vi.stubEnv("GEMINI_TEXT_FALLBACK_MODELS", "gemini-unused");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 429,
            status: "RESOURCE_EXHAUSTED",
            message: "Your API key's prepayment credits are depleted. See billing#prepay.",
          },
        }),
        { status: 429 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchGeminiStructured({
        apiKey: "test-key",
        model: "gemini-pro",
        fallbackModel: "gemini-flash",
        systemInstruction: "Return JSON.",
        userText: "test",
        responseSchema: { type: "object" },
      }),
    ).rejects.toThrow("gemini_http_429");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
