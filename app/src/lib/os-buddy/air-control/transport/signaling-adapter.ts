/**
 * Signaling abstraction for phone <-> desktop WebRTC pairing.
 *
 * Signaling (SDP offer/answer + ICE candidates + session control) is intentionally
 * pluggable. The default uses Supabase Realtime broadcast (already available in the
 * app); a minimal in-memory adapter exists for tests/local. Swapping transports
 * never touches the WebRTC or provider code.
 */

export type SignalingMessage =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "ice"; candidate: RTCIceCandidateInit }
  | { kind: "bye" }
  | { kind: "ping"; t: number }
  | { kind: "pong"; t: number; serverT: number };

export type SignalingAdapter = {
  readonly sessionId: string;
  /** Join the channel for this session. */
  connect(): Promise<void>;
  /** Send a message to the peer. */
  send(message: SignalingMessage): Promise<void>;
  /** Subscribe to peer messages; returns an unsubscribe function. */
  onMessage(listener: (message: SignalingMessage) => void): () => void;
  disconnect(): void;
};

/** In-memory adapter (tests / same-tab). Pairs two adapters on one bus. */
export function createMemorySignaling(sessionId: string, bus = new EventTarget()): SignalingAdapter {
  const channel = `air-remote:${sessionId}`;
  const listeners = new Set<(m: SignalingMessage) => void>();
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<SignalingMessage>).detail;
    listeners.forEach((l) => l(detail));
  };
  return {
    sessionId,
    async connect() {
      bus.addEventListener(channel, handler);
    },
    async send(message) {
      bus.dispatchEvent(new CustomEvent<SignalingMessage>(channel, { detail: message }));
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    disconnect() {
      bus.removeEventListener(channel, handler);
      listeners.clear();
    },
  };
}

/**
 * Supabase Realtime adapter. Uses a per-session broadcast channel. `role` keeps a
 * device from receiving its own messages.
 *
 * Note: this is the production seam for phone pairing. Live end-to-end pairing is
 * best-effort and cannot be verified in a headless environment.
 */
export function createSupabaseRealtimeSignaling(params: {
  sessionId: string;
  role: "desktop" | "phone";
}): SignalingAdapter {
  const { sessionId, role } = params;
  const topic = `air-remote-${sessionId}`;
  // Lazy import keeps Supabase out of the runtime hot path / SSR.
  let channel: import("@supabase/supabase-js").RealtimeChannel | null = null;
  const listeners = new Set<(m: SignalingMessage) => void>();

  return {
    sessionId,
    async connect() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      channel = supabase.channel(topic, { config: { broadcast: { self: false } } });
      channel.on("broadcast", { event: "signal" }, (payload) => {
        const data = payload.payload as { from: string; message: SignalingMessage };
        if (data.from === role) return; // ignore our own
        listeners.forEach((l) => l(data.message));
      });
      await new Promise<void>((resolve) => {
        channel?.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
      });
    },
    async send(message) {
      await channel?.send({
        type: "broadcast",
        event: "signal",
        payload: { from: role, message },
      });
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    disconnect() {
      void channel?.unsubscribe();
      channel = null;
      listeners.clear();
    },
  };
}
