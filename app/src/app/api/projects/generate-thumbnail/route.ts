import { NextResponse } from "next/server";
import { generateThumbnail } from "@/lib/knowledge/ai/generateThumbnail";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ThumbnailStyle } from "@/types/knowledge";
import { GENERATABLE_THUMBNAIL_STYLES } from "@/lib/knowledge/thumbnail-style-config";

const VALID_STYLES = new Set<ThumbnailStyle>(GENERATABLE_THUMBNAIL_STYLES);

export async function POST(request: Request) {
  try {
    const { projectId, projectName, description, style } =
      await request.json();

    if (!projectName) {
      return NextResponse.json(
        { error: "projectName is required" },
        { status: 400 },
      );
    }

    const thumbnailStyle: ThumbnailStyle =
      typeof style === "string" && VALID_STYLES.has(style as ThumbnailStyle)
        ? (style as ThumbnailStyle)
        : "minimal";

    const result = await generateThumbnail({
      title: projectName,
      summary: (description || "").slice(0, 300),
      style: thumbnailStyle,
    });

    if (projectId) {
      const supabase = await createServerSupabaseClient();
      await supabase
        .from("projects")
        .update({
          thumbnail_url: result.url,
          thumbnail_style: thumbnailStyle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("[generate-project-thumbnail]", error);
    return NextResponse.json(
      { error: "Failed to generate thumbnail" },
      { status: 500 },
    );
  }
}
