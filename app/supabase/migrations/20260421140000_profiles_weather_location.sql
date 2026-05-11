-- Primary coordinates for top-bar weather (OpenWeather). Optional city label for UI.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weather_lat double precision,
  ADD COLUMN IF NOT EXISTS weather_lon double precision,
  ADD COLUMN IF NOT EXISTS weather_city text;

COMMENT ON COLUMN public.profiles.weather_lat IS 'Pinned latitude for weather; set at onboarding or in Settings.';
COMMENT ON COLUMN public.profiles.weather_lon IS 'Pinned longitude for weather; set at onboarding or in Settings.';
COMMENT ON COLUMN public.profiles.weather_city IS 'Optional display label (e.g. neighbourhood); weather API still uses lat/lon.';
