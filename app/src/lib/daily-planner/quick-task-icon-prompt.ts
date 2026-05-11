/**
 * Gemini image prompt for quick-add task icons — targets Liquid Glass / glassmorphism
 * (see repo `liquid_glass_ui.md`: frosted glass, dark luxury base, specular edge).
 *
 * Note: Midjourney has no official API in this stack; we match the aesthetic via Gemini.
 */
export function buildLiquidGlassQuickTaskIconPrompt(subjectDescription: string): string {
  const s = subjectDescription.trim();
  return `Design ONE square mobile UI icon (not a photograph). Subject: ${s}.

Style (mandatory): Liquid Glass / glassmorphism — frosted translucent tile on a very dark warm base (#141210–#1A1614), subtle white glass border rgba(255,255,255,0.16–0.22), strong backdrop-blur feeling, soft specular highlight along the top edge, gentle inner glow. Minimal neon accent allowed only as tiny highlight (e.g. lime #C8E53A) — do not flood the icon with bright green.

Iconography: simple centered glyph or minimal symbol suggesting the subject; line weight ~1.5px feel; premium dashboard quality like SF Symbols inside a glass chip.

Constraints: absolutely NO text, letters, numbers, watermarks, logos, or photorealistic faces. Square canvas, symbol readable at 32px. Seamless dark background (no frame caption).
Output: single crisp icon image.`;
}
