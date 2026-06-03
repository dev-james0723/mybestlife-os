/**
 * Low-latency WebRTC data channel for Air Touch phone packets.
 *
 * Uses an unordered / no-retransmit channel ({ ordered:false, maxRetransmits:0 })
 * so the newest sensor packet always wins over guaranteed delivery. Clock sync is
 * done with ping/pong over the signaling channel. Everything is feature-detected
 * and SSR-safe (guarded against missing RTCPeerConnection).
 *
 * This is a scaffold seam: it compiles and encapsulates the connection lifecycle,
 * but live pairing requires two real devices and cannot be verified headlessly.
 */

import type { SignalingAdapter } from "./signaling-adapter";

export type AirRtcRole = "desktop" | "phone";

export type AirRtcConnection = {
  send(data: string): void;
  onData(listener: (data: string) => void): () => void;
  /** Estimated (desktopClock - phoneClock) offset in ms once sync completes. */
  getClockOffsetMs(): number;
  close(): void;
};

const STUN_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function isWebRtcSupported(): boolean {
  return typeof window !== "undefined" && typeof window.RTCPeerConnection !== "undefined";
}

/**
 * Establish a peer connection. The desktop is the offerer; the phone answers.
 * Returns once the data channel is open.
 */
export async function createAirRtcConnection(params: {
  role: AirRtcRole;
  signaling: SignalingAdapter;
}): Promise<AirRtcConnection> {
  if (!isWebRtcSupported()) {
    throw new Error("WebRTC is not supported in this browser.");
  }

  const { role, signaling } = params;
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  const dataListeners = new Set<(data: string) => void>();
  let clockOffsetMs = 0;
  let channel: RTCDataChannel | null = null;

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      void signaling.send({ kind: "ice", candidate: event.candidate.toJSON() });
    }
  };

  const wireChannel = (dc: RTCDataChannel) => {
    channel = dc;
    dc.onmessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      // Intercept clock-sync control frames; forward the rest.
      if (raw.startsWith("__pong__")) {
        const [, t0, serverT] = raw.split(":");
        const rtt = performance.now() - Number(t0);
        clockOffsetMs = Number(serverT) - (Number(t0) + rtt / 2);
        return;
      }
      dataListeners.forEach((l) => l(raw));
    };
  };

  if (role === "desktop") {
    const dc = pc.createDataChannel("air-touch", { ordered: false, maxRetransmits: 0 });
    wireChannel(dc);
  } else {
    pc.ondatachannel = (event) => wireChannel(event.channel);
  }

  const unsubscribe = signaling.onMessage(async (message) => {
    switch (message.kind) {
      case "offer":
        await pc.setRemoteDescription({ type: "offer", sdp: message.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        await signaling.send({ kind: "answer", sdp: pc.localDescription?.sdp ?? "" });
        break;
      case "answer":
        await pc.setRemoteDescription({ type: "answer", sdp: message.sdp });
        break;
      case "ice":
        try {
          await pc.addIceCandidate(message.candidate);
        } catch {
          // best-effort; stale candidates are ignored
        }
        break;
      default:
        break;
    }
  });

  await signaling.connect();

  if (role === "desktop") {
    await pc.setLocalDescription(await pc.createOffer());
    await signaling.send({ kind: "offer", sdp: pc.localDescription?.sdp ?? "" });
  }

  // Wait for the channel to open.
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Data channel timed out.")), 20_000);
    const check = () => {
      if (channel && channel.readyState === "open") {
        clearTimeout(timeout);
        resolve();
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });

  return {
    send(data) {
      if (channel?.readyState === "open") channel.send(data);
    },
    onData(listener) {
      dataListeners.add(listener);
      return () => dataListeners.delete(listener);
    },
    getClockOffsetMs() {
      return clockOffsetMs;
    },
    close() {
      unsubscribe();
      channel?.close();
      pc.close();
      signaling.disconnect();
      dataListeners.clear();
    },
  };
}
