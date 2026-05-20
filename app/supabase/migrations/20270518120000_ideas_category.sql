-- Structured idea classification (Knowledge Base–style capture).
-- Default keeps legacy rows readable as "random" / uncategorized.

alter table ideas
  add column if not exists category text not null default 'random';

create index if not exists idx_ideas_user_category
  on ideas (user_id, category);
