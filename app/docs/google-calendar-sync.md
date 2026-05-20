# Google Calendar ↔ Daily Planner sync

This app keeps **Time Block** daily planner rows in sync with **Google Calendar** using **server-side OAuth** (refresh tokens encrypted with `TOKEN_ENCRYPTION_KEY`). The browser never receives Google access or refresh tokens.

## Google Cloud Console

1. Create (or reuse) a Google Cloud project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**  
   - Add scope `https://www.googleapis.com/auth/calendar.events`  
   - Add test users while in Testing mode, or publish the app for production.
4. **APIs & Services → Credentials → Create OAuth client ID (Web)**  
   - **Authorized redirect URIs** (add both):  
     - Local: `http://localhost:3000/api/google/calendar/callback` (or your dev port)  
     - Production: `https://<your-vercel-domain>/api/google/calendar/callback`
5. Copy **Client ID** and **Client secret** into env vars below.

## Environment variables

Set in `.env.local` (development) and in **Vercel → Project → Settings → Environment Variables** (production).

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Must exactly match a redirect URI on the OAuth client (e.g. `https://app.example.com/api/google/calendar/callback`) |
| `GOOGLE_CALENDAR_WEBHOOK_URL` | Public HTTPS URL to `POST` handler: `https://app.example.com/api/google/calendar/webhook` |
| `GOOGLE_CALENDAR_SYNC_ENABLED` | Set to `false` to disable all sync (default on if unset) |
| `GOOGLE_CALENDAR_DEFAULT_ID` | Optional; stored per user as `calendar_id` (default `primary`) |
| `GOOGLE_CALENDAR_WATCH_TTL_HOURS` | Watch channel lifetime hint (max 7 days per Google rules) |
| `GOOGLE_CALENDAR_POLLING_FALLBACK_ENABLED` | When `true`, Vercel Cron may run incremental sync periodically |
| `TOKEN_ENCRYPTION_KEY` | Base64 **32-byte** key for AES-256-GCM (same as social token encryption) |
| `CRON_SECRET` | Random secret; `Authorization: Bearer <CRON_SECRET>` for `/api/google/calendar/cron` |

Supabase URL keys (`NEXT_PUBLIC_SUPABASE_URL`, etc.) and service role for the webhook/cron path are required as already documented for the app.

## User flow

1. User signs in with Supabase (any provider).
2. **Settings → Google Calendar → Connect** hits `/api/google/calendar/connect`, redirects to Google, returns to `/api/google/calendar/callback`, stores encrypted tokens, registers a **push notification channel** when `GOOGLE_CALENDAR_WEBHOOK_URL` is set.
3. On each successful **daily plan save**, the client calls `/api/google/calendar/push-plan` (fire-and-forget). The server upserts one Calendar event per time-block row (stable `plannerTaskId`), with fixed popup reminders (5, 30, 60, 360 minutes before).
4. Google notifies `/api/google/calendar/webhook`; the server runs **incremental sync** with `syncToken`. Conflicts surface as `calendar_task_sync.sync_status = conflict` with payload; remote deletes mark `remote_deleted` without deleting the local row.

## Vercel Cron

`vercel.json` registers a daily cron (`0 6 * * *` UTC). On Vercel Hobby, crons are limited to once per day; use Pro for more frequent schedules. The job calls:

`GET https://<your-domain>/api/google/calendar/cron`  
Header: `Authorization: Bearer <CRON_SECRET>`

The handler renews near-expiring watch channels, retries `local_pending` rows, and (if polling fallback is enabled) runs incremental sync per active connection.

## Supabase

Apply migrations (includes `google_calendar_connections` and `calendar_task_sync`). RLS is enabled: users only see their own rows.

## Manual QA checklist

1. Connect Google Calendar from Settings (real session, not dev bypass).
2. In Time Block mode, create a task → event appears in Google Calendar with four reminders.
3. Drag task to a new time → event times update.
4. Resize blocks → end time updates.
5. Rename task → summary updates.
6. Delete task → event removed (or marked pending if offline).
7. Shorten event in Google → planner blocks shrink.
8. Move event to next calendar day → task moves to that day’s `daily_plans` row when a plan exists.
9. Delete event in Google → planner row stays; sync shows `remote_deleted`.
10. Disconnect → planner still saves locally.
11. Reconnect → sync resumes; retries must not duplicate events.
12. Edit planner and Google within the same window → conflict state appears.
13. Cross-day window (e.g. 23:00–02:00) still maps to correct ISO datetimes.

## Troubleshooting

- **410 on syncToken**: automatic full resync resets the token.  
- **Watch not firing**: confirm `GOOGLE_CALENDAR_WEBHOOK_URL` is HTTPS and publicly reachable; renew via cron.  
- **Encryption errors**: `TOKEN_ENCRYPTION_KEY` must decode to exactly 32 bytes (base64).  
- **Free Planning mode**: per-task timed sync is intentionally limited to **Time Block** rows with concrete blocks; use Settings + “Calendar sync now” on the planner for pull/retry.
