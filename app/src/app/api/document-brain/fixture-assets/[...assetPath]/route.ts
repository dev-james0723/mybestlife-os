import { NextResponse } from "next/server";
import {
  getDocOracleFixtureAsset,
  isDocOracleFixtureEnabled,
} from "@/lib/document-oracle/docOracleFixture";

export const runtime = "nodejs";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function GET(_req: Request, ctx: { params: Promise<{ assetPath: string[] }> }) {
  if (!isDocOracleFixtureEnabled()) {
    return NextResponse.json({ error: "fixture_disabled" }, { status: 404 });
  }

  const { assetPath } = await ctx.params;
  const asset = getDocOracleFixtureAsset(assetPath.join("/"));
  if (!asset) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body =
    typeof asset.body === "string"
      ? asset.body
      : toArrayBuffer(asset.body);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": asset.contentType,
      "cache-control": "no-store",
    },
  });
}
