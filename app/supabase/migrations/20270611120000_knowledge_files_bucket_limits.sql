-- Knowledge Base file uploads: allow all MIME types used by PDF/images/audio/video uploads and cap objects at 1 GB.
-- Objects are uploaded directly from the browser into `knowledge-files`; if allowed_mime_types is overly narrow,
-- Supabase Storage rejects PNG/PDF/etc. while small Word docs may still pass.

UPDATE storage.buckets
SET
  file_size_limit = 1073741824,
  allowed_mime_types = NULL
WHERE id = 'knowledge-files';
