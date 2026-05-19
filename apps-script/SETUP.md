# Backend Setup (one-time, ~15 min)

This wires up the **write-back** layer: when the crew taps "Mark paid" or sends a note from the field, it lands in your Google Sheet AND emails you. Read on for the steps in order.

## What you'll end up with

- One Google Sheet (the source of truth + log)
- One Apps Script Web App URL (the endpoint the map writes to)
- A shared secret token (gates the endpoint so randos can't email you)

Both the Web App URL and the secret token get pasted into `docs/index.html` at the end.

## Step 1 — Create the Google Sheet

1. Go to https://sheets.google.com → blank sheet.
2. Rename it: **TTC Debtor Map (Live)**.
3. Rename the first tab from "Sheet1" to **Debtors**.
4. Paste the contents of `docs/data.csv` into A1. (File → Import → Upload → `data.csv` → Replace current sheet → comma separator.)
5. Add two columns after the existing ones: **Status** and **LastUpdated**. The header row should read:
   ```
   Name | Address | Balance | JobberURL | Lat | Lng | Approx | Notes | Status | LastUpdated
   ```
   (`Notes` may already exist from your debtor CSV — keep it where it is, just make sure `Status` and `LastUpdated` are also there.)
6. Copy the **Sheet ID** out of the URL — it's the long string between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit#gid=0`

## Step 2 — Publish a CSV view of the Debtors tab (used for READS)

1. File → Share → Publish to web.
2. Pick "Debtors" sheet, format = **Comma-separated values (.csv)**.
3. Click Publish, then Yes when warned.
4. Copy the published URL — it'll look like:
   `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv`
5. Save this URL — you'll paste it into `index.html` as `SHEET_CSV_URL` at the end.

## Step 3 — Add the Apps Script

1. In your sheet, click **Extensions → Apps Script**.
2. Delete the placeholder code in the editor.
3. Paste the entire contents of `Code.gs` (the file in this folder).
4. Edit the **CONFIG block at the top**:
   - `SHEET_ID` → paste the ID from Step 1.6
   - `SECRET` → replace with a long random string (use a password generator — 32+ chars, mixed). Save this string; you'll need it again in Step 5.
   - `NOTIFY_EMAIL` → already set to `myersmail9@gmail.com` (change only if you want notifications going elsewhere)
5. Save the project (Cmd+S or the floppy-disk icon). Give it a name: **TTC Debtor Map Backend**.

## Step 4 — Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in:
   - Description: `TTC Debtor Map v1`
   - Execute as: **Me** (your Google account)
   - Who has access: **Anyone**  ← this is fine because of the secret token gate
4. Click **Deploy**. Google will pop up an auth prompt — review and authorize.
5. Copy the **Web app URL** Google gives you. It looks like:
   `https://script.google.com/macros/s/AKfycby.../exec`
6. Save this URL — you'll paste it into `index.html` as `SCRIPT_URL` next.

> Note: if you ever edit `Code.gs` and want changes to go live, you need to **Manage deployments → pencil icon → New version → Deploy**. The Web App URL stays the same.

## Step 5 — Wire it into the map

Open `docs/index.html` and find the CONFIG block near the top of the `<script>` tag (around line 290). Update three values:

```js
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv';
const SCRIPT_URL    = 'https://script.google.com/macros/s/AKfycby.../exec';
const SECRET_TOKEN  = 'PASTE_THE_SAME_LONG_RANDOM_STRING_FROM_STEP_3.4';
```

Commit and push. Within a few minutes GitHub Pages rebuilds and the map is wired up two-way.

## Step 6 — Test it end-to-end

1. Open the deployed map URL on your phone.
2. Click any pin → tap **Mark paid in person**.
3. Within 30s: that row's `Status` column flips to PAID-IN-PERSON in the sheet, and you get an email.
4. Tap **Send note to Joseph** on the same pin → type a test note → send.
5. Within 30s: the note appends to that row's `Notes` column, and you get another email.

If anything fails, the map shows a toast at the bottom with the error.

## Maintenance

- **Daily refresh**: the scheduled task overwrites the Debtors tab with the latest Jobber numbers but **preserves** the `Status` and `Notes` columns for any row whose JobberURL it already knows. So manual notes don't get blown away.
- **Rotating the secret**: edit `SECRET` in `Code.gs`, redeploy (Step 4), update `SECRET_TOKEN` in `index.html`, push.
- **Pausing notifications**: comment out the `MailApp.sendEmail(...)` calls in `Code.gs` and redeploy.
- **Reviewing the log**: open the sheet → "Log" tab. Every collected/note action is timestamped there.

## Limits to know about

- Apps Script email quota: 100 emails/day. You're nowhere near that.
- Web App execution: 6 min max per call (we don't get close).
- Concurrent writes are serialized, so if two crew members tap at the same instant one waits ~1s. Fine for your scale.
