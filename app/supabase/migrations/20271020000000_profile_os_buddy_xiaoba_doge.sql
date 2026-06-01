alter table public.profiles
add column if not exists os_buddy_pet_id text default 'xiaoba',
add column if not exists os_buddy_name text default 'Xiaoba',
add column if not exists os_buddy_enabled boolean default true,
add column if not exists os_buddy_position jsonb default '{"x": null, "y": null, "anchor": "bottom-right"}'::jsonb,
add column if not exists os_buddy_onboarding_completed boolean default false,
add column if not exists os_buddy_interaction_stats jsonb default '{}'::jsonb,
add column if not exists os_buddy_unlocked_pets jsonb default '["xiaoba", "doge"]'::jsonb;
