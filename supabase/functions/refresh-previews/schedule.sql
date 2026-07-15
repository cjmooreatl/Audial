-- Schedules refresh-previews to run every 12 hours. Deezer's preview URLs
-- expire after ~24h, so this gives a comfortable safety margin before any
-- Deezer-sourced preview would actually go stale.
--
-- Requires pg_cron and pg_net (enabled via: create extension pg_cron; create
-- extension pg_net;). Uses the publishable/anon key just to pass the edge
-- function's own request-auth gate — the function itself uses the service
-- role key internally for its elevated read/write across all sets.
--
-- timeout_milliseconds is set well above net.http_post's 5000ms default —
-- the function checks every Deezer-sourced/missing track with several
-- iTunes/Deezer calls each, which reliably takes well over 5 seconds. Under
-- the default, pg_net gave up before any response arrived (status_code and
-- content both null in net._http_response) — the job "succeeded" from
-- pg_cron's perspective every time because http_post itself doesn't error
-- on a client-side timeout, but the function never actually got to run.
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
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
