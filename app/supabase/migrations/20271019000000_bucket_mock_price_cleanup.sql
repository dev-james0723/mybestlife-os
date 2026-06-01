-- Phase 9 hardening: clear stale mock/exploratory values that older flight-watch
-- code may have copied into the live-price summary columns.
UPDATE public.bucket_items AS bi
SET
  latest_live_price = NULL,
  latest_live_price_currency = NULL,
  last_price_check_time = NULL
WHERE bi.latest_live_price IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.bucket_flight_quotes AS q
    WHERE q.bucket_item_id = bi.id
      AND q.user_id = bi.user_id
      AND q.provider = 'mock'
      AND q.mode = 'exploratory'
      AND q.cheapest_price = bi.latest_live_price
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.bucket_flight_quotes AS q
    WHERE q.bucket_item_id = bi.id
      AND q.user_id = bi.user_id
      AND q.mode = 'live'
      AND q.provider <> 'mock'
      AND q.cheapest_price = bi.latest_live_price
  );
