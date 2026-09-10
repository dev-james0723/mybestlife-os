import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe("travel WebGL capability", () => {
  it("releases its probe and reuses one result across React snapshots", async () => {
    const loseContext = vi.fn();
    const getContext = vi.fn(() => ({ getExtension: () => ({ loseContext }) }));
    const createElement = vi.fn(() => ({ getContext }));
    vi.stubGlobal("window", {}); vi.stubGlobal("document", { createElement });
    const { detectWebGL } = await import("./capability");
    for (let i = 0; i < 100; i++) expect(detectWebGL()).toBe(true);
    expect(createElement).toHaveBeenCalledTimes(1);
    expect(getContext).toHaveBeenCalledWith("webgl2");
    expect(loseContext).toHaveBeenCalledTimes(1);
  });
  it("does not accept WebGL1 for a WebGL2 renderer", async () => {
    vi.stubGlobal("window", {}); vi.stubGlobal("document", { createElement: () => ({ getContext: (kind: string) => kind === "webgl" ? {} : null }) });
    const { detectWebGL } = await import("./capability");
    expect(detectWebGL()).toBe(false);
  });
});
