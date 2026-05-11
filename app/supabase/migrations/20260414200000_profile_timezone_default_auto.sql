-- New profiles: follow device / system timezone until user picks a fixed IANA zone.
ALTER TABLE profiles
  ALTER COLUMN timezone SET DEFAULT 'auto';
