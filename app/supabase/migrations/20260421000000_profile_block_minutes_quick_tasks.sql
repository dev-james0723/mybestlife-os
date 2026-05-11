-- Add time-block duration preference (minutes per block) and custom quick tasks
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS block_minutes INT DEFAULT 10
    CHECK (block_minutes IN (5, 10, 15, 20, 30)),
  ADD COLUMN IF NOT EXISTS quick_tasks JSONB DEFAULT NULL;
