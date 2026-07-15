-- Schedules refresh-previews to run every 12 hours. Deezer's preview URLs
-- expire after ~24h, so this gives a comfortable safety margin before any
-- Deezer-sourced preview would actually go stale.
--
-- Requires pg_cron and pg_net (enabled via: create extension pg_cron; create
-- extension pg_net;). Uses the publishable/anon key just to pass the edge
-- function's own request-auth gate — the function itself uses the service
-- role key internally for its elevated read/write across all sets.
select cron.schedule(
  'refresh-previews-every-12h',
  '0 */12 * * *',
  $$
  select net.http_post(
    url := 'https://aainueqjeoqmvaiicuwp.supabase.co/functions/v1/refresh-previews',
    headers := jsonb_build_object(
      'Authorization', 'Bearer sb_publishable_2MA6nwM363vqBruyMSGuIg_Uzr-iH1A',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
