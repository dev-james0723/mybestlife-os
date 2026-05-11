-- ideas v2: new columns for title, tags, destinations, attachments, AI state,
-- and cross-feature back-references. All additions are nullable or defaulted so
-- existing rows are unaffected and no backfill is required.

alter table ideas
  add column if not exists title                   text,
  add column if not exists ai_tags                 text[]  not null default '{}',
  add column if not exists manual_tags             text[]  not null default '{}',
  add column if not exists destinations            text[]  not null default '{}',
  add column if not exists attachments             jsonb   not null default '[]',
  add column if not exists ai_suggestions          jsonb,
  add column if not exists processing_step         text,
  add column if not exists linked_knowledge_item_ids uuid[] not null default '{}',
  add column if not exists linked_node_ids         uuid[]  not null default '{}';

-- GIN indexes for array containment / overlap queries
create index if not exists idx_ideas_ai_tags
  on ideas using gin (ai_tags);

create index if not exists idx_ideas_manual_tags
  on ideas using gin (manual_tags);

create index if not exists idx_ideas_destinations
  on ideas using gin (destinations);

-- Storage bucket for idea image attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'idea-attachments',
  'idea-attachments',
  false,
  10485760,  -- 10 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do nothing;

-- RLS: folder-based isolation — path must be ideas/{user_id}/...
create policy "Users can read own idea attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'idea-attachments'
    and (storage.foldername(name))[1] = 'ideas'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can upload own idea attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'idea-attachments'
    and (storage.foldername(name))[1] = 'ideas'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can update own idea attachments"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'idea-attachments'
    and (storage.foldername(name))[1] = 'ideas'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete own idea attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'idea-attachments'
    and (storage.foldername(name))[1] = 'ideas'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
