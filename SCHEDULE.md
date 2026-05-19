# Daily Auto-Refresh — Schedule Setup

This is the final piece, set up **after** the backend (`apps-script/SETUP.md`) is wired up and the page is deployed. It re-pulls Jobber every morning and pushes a fresh list to the Sheet, while preserving any Status/Notes the crew added.

## Quick setup (in Cowork)

In Cowork chat:

> /schedule daily at 6am, run the TTC debtor map refresh

When the schedule skill prompts you, paste this as the task prompt (it's self-contained — the scheduled run starts fresh with no memory of this conversation, so everything it needs has to be in the prompt):

```
Refresh the TTC Debtor Map. Steps:

1. Open https://secure.getjobber.com/reporting/client_balance in Chrome.
2. Click the "Outstanding" badge to confirm count. Extract all rows where Balance > 0 by paginating through the table (sort by Balance descending, 10 per page; the Outstanding badge tells you the total count).
3. EXCLUDE these clients:
   - Anyone with email containing "churchofjesuschrist.org" (LDS properties)
   - Salli Jeppson (Jobber client 37812118 — office contact, not residential)
   - Smithfield City
   - LeGrand Johnson Construction
   - Any client whose name contains "LLC", "Inc", "Corp", "Co.", "Construction", "Church", "Temple", "City", "Schools"
4. For each remaining debtor, open their Jobber profile and extract the Primary or Properties address.
5. Geocode each address via Nominatim:
   - https://nominatim.openstreetmap.org/search?q=ADDRESS&format=jsonv2&limit=1&countrycodes=us
   - Wait 1.1s between requests.
   - If geocoding fails, fall back to "City, State ZIP" centroid and mark Approx=1.
6. POST the result to the Apps Script Web App:

POST https://script.google.com/macros/s/PASTE_SCRIPT_ID/exec
Content-Type: application/x-www-form-urlencoded

Body fields:
  token=PASTE_SECRET_TOKEN
  action=refresh
  payload=<JSON-encoded array of objects with keys Name, Address, Balance, JobberURL, Lat, Lng, Approx>

7. Verify the response is {"ok": true, "rowsWritten": N, "statusPreservedFor": M}.
8. Email myersmail9@gmail.com a one-paragraph summary: N debtors total, total $ outstanding, any new debtors since yesterday, any debtors that came off the list (presumably paid).

If anything fails midway, email Joseph with what failed and at what step so he can finish manually.
```

Before saving the task, **swap in the real values** in step 6:
- `PASTE_SCRIPT_ID` → the path from your Apps Script Web App URL
- `PASTE_SECRET_TOKEN` → the same secret you put in `Code.gs` and `index.html`

## What the task does each morning

1. Logs into Jobber via the saved Chrome session.
2. Pulls every Outstanding-status client off the Client Balance report.
3. Applies the same exclusion rules used at v1 build time (LDS, Salli Jeppson, large orgs).
4. Re-fetches each debtor's service address (handles people who moved).
5. Geocodes only new/changed addresses to keep the run fast.
6. POSTs the result to Apps Script, which:
   - Rewrites the Debtors tab in your Sheet.
   - **Preserves** Status (PAID-IN-PERSON, etc.) and Notes for any row whose Jobber URL matches a prior row.
   - Logs the run to the "Log" tab.
7. Emails you a brief summary (count + total + diff).

## Why preservation matters

The first morning after a crew member writes "Knocked, said they'll pay Friday" on Cindy Stettler's pin, you want that note to **survive** tomorrow's refresh, even though the daily pull from Jobber doesn't include any notion of Notes. The refresh endpoint handles this server-side: it reads the existing Status/Notes column off the Sheet, writes the fresh Jobber data, then re-attaches the preserved columns for matching JobberURLs.

## Testing the task

After saving, run it once manually from the Cowork scheduled tasks panel ("Run now"). Watch:
1. Did the Sheet's Debtors tab repopulate? (Should match Jobber count of outstanding.)
2. Did any test Status/Notes you added survive? (Add a fake note to a row in the Sheet, run the task, confirm it's still there.)
3. Did you get the summary email?

If yes, you're done. The 6am daily run is reliable as long as Cowork is running. If Cowork was closed at 6am, the task fires on the next launch.

## Adjusting cadence

- Daily 6am is the default — works for crews that leave the yard between 7–9am.
- For faster turnaround, you can change to twice daily (6am + 1pm) by editing the cron expression to `0 6,13 * * *` in the Cowork scheduled tasks panel.
- More than that is probably wasteful — Jobber doesn't get materially new debtors hourly.

## If the daily task fails

Failure modes and what to do:
- **Jobber blocked the login** → log in once manually in Chrome to refresh the session, then re-run.
- **Apps Script returned an error** → check the Apps Script execution log (Apps Script editor → Executions). Likely a syntax issue in Code.gs or the secret token doesn't match.
- **Nominatim rate-limited** → unlikely at this volume, but if it happens, the task retries with longer sleep automatically.
- **Sheet doesn't update** → confirm the Apps Script deployment is the latest version (Manage deployments → New version → Deploy).

Email Joseph if a failure persists more than one day.
