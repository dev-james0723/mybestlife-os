-- Fix: add DEFAULT auth.uid() to all garden tables so inserts
-- from the client auto-fill user_id from the JWT session.

ALTER TABLE user_garden ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE plant_collection ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE garden_inventory ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE garden_daily_log ALTER COLUMN user_id SET DEFAULT auth.uid();
