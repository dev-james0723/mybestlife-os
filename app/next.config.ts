import type { NextConfig } from "next";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEV_APP_PORTS = [3000, 3001, 3100, 3490] as const;

/** LAN IPv4s for dev only — so `/_next` is not 403 when using Next's "Network" URL. */
function devNonLoopbackIPv4Hostnames(): string[] {
  if (process.env.NODE_ENV === "production") return [];
  const out: string[] = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    if (!ifaces) continue;
    for (const a of ifaces) {
      if (a.family === "IPv4" && !a.internal) {
        out.push(a.address);
      }
    }
  }
  return out;
}

function devLanServerActionOrigins(ips: string[]): string[] {
  const o: string[] = [];
  for (const ip of ips) {
    for (const p of DEV_APP_PORTS) {
      o.push(`${ip}:${p}`);
    }
  }
  return o;
}

/** Monorepo root (parent of `app/`); matches Vercel `outputFileTracingRoot` for this layout. */
const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
function supabaseStorageHostname(url: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
const supabaseHostname = supabaseStorageHostname(supabaseUrl);

/** `/_next` dev cross-site check uses Origin *hostname* only (no port). */
const allowedDevOriginsHostnames = [
  "127.0.0.1",
  "::1",
  "localhost",
  "localhost:3000",
  "127.0.0.1:3000",
  "localhost:3001",
  "127.0.0.1:3001",
  "localhost:3100",
  "127.0.0.1:3100",
  "localhost:3490",
  "127.0.0.1:3490",
] as const;

/** Server Actions compare full `URL.host` (includes port) when Origin ≠ Host. */
const devServerActionOrigins = [
  "localhost:3000",
  "127.0.0.1:3000",
  "localhost:3001",
  "127.0.0.1:3001",
  "localhost:3100",
  "127.0.0.1:3100",
  "localhost:3490",
  "127.0.0.1:3490",
] as const;

const devLanIps = devNonLoopbackIPv4Hostnames();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  /** Smaller uploads and less exposure of source in production. */
  productionBrowserSourceMaps: false,
  // Bare `127.0.0.1` / `::1` are required — `127.0.0.1:3000` alone never matched the hostname
  // and Next returned 403 for `/_next/*` on http://127.0.0.1:3000 (blank page in Cursor).
  // Also allow this machine's LAN IPv4s so the "Network" dev URL (e.g. http://192.168.x.x:3000) does
  // not 403 all `/_next` chunks (blank page when not using localhost / 127.0.0.1).
  allowedDevOrigins: [...allowedDevOriginsHostnames, ...devLanIps],
  /** Avoid webpack filesystem pack cache in dev (large `.next/dev/cache/webpack`). On nearly full disks
   *  ENOSPC can corrupt the cache and break every route (500, missing `routes-manifest` / `vendor-chunks`). */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" } as (typeof config)["cache"];
    } else {
      // Pack file cache can hit ENOENT / missing route outputs on long local & CI builds.
      config.cache = false;
    }
    return config;
  },
  /** Large payloads (e.g. knowledge-base uploads) exceed the default 1 MB and can crash dev with uncaughtException. */
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
      ...(process.env.NODE_ENV === "development"
        ? {
            allowedOrigins: [
              ...devServerActionOrigins,
              ...devLanServerActionOrigins(devLanIps),
            ],
          }
        : {}),
    },
  },
  env: {
    NEXT_PUBLIC_VERCEL: process.env.VERCEL ?? "",
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  async headers() {
    const base: { key: string; value: string }[] = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(self), geolocation=()",
      },
    ];
    if (process.env.VERCEL_ENV === "production") {
      base.unshift({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [{ source: "/:path*", headers: base }];
  },
};

export default nextConfig;
