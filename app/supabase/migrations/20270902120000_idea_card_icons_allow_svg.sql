-- Allow SVG placeholders for idea card thumbnails when Gemini image models are unavailable.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
WHERE id = 'idea-card-icons';
