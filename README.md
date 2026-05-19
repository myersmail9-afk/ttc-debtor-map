# TTC Debtor Map

Internal-only map of Total Tree Care customers carrying an outstanding balance.
Built for "soft-catch" stop-bys when the crew is already in the neighborhood:
they tap a pin, can mark someone paid in person, or send Joseph a note from the
field — all of which writes back to a Google Sheet AND emails Joseph in real time.

**Live URL** — fill in after first deploy: `https://<username>.github.io/ttc-debtor-map/`

## What's in the box

```
ttc-debtor-map/
├── README.md            ← you are here
├── docs/                ← what GitHub Pages serves
│   ├── index.html       ← the map UI (single file)
│   ├── data.csv         ← initial seed for the Sheet
│   └── BRAND.md         ← how to drop in TTC's logo + brand colors
└── apps-script/
    ├── Code.gs          ← Google Apps Script backend (paste into script editor)
    └── SETUP.md         ← 15-min walkthrough to wire up the backend
```

## Architecture

```
┌──────────────┐  daily  ┌──────────────┐         ┌──────────────┐
│  Jobber      ├────────►│ Google Sheet │◄────────│  index.html  │
│  Balance     │  script │  (Debtors +  │  fetch  │  Leaflet map │
│  report      │         │   Log tabs)  │         │              │
└──────────────┘         │              │   POST  │              │
                         │              │◄────────┤  Mark paid / │
                         │              │         │  Send note   │
                         └──────┬───────┘         └──────────────┘
                                │
                                │ MailApp.sendEmail
                                ▼
                         myersmail9@gmail.com
```

- **Reads** are direct CSV fetches from the published Google Sheet (no auth, fast)
- **Writes** go through an Apps Script Web App gated by a shared secret token
- **Email notifications** ping Joseph on every paid-mark and every note

## Features

- Color-coded pins by amount owed (green <$500, yellow $500–1.5k, orange $1.5k–3k, red >$3k)
- Click pin → name, address, exact amount, "Get directions" (opens Google Maps), "Open in Jobber"
- **Mark paid in person** — writes `Status = PAID-IN-PERSON` to the Sheet and emails Joseph
- **Send note to Joseph** — appends to the row's Notes column and emails Joseph
- Crew identity (asked once, stored on each device) is attached to every action
- Existing notes show in a yellow strip on the pin so crew sees prior context
- Mobile-first; designed for crew phones in the field
- Approximate pins (Cache Valley grid addresses Nominatim couldn't resolve) shown with a dashed border and "approx. location" tag

## Privacy & safety

This page contains client names, addresses, and amounts owed. **Do not share the URL.**
Recommendations:
- Private GitHub repo with an obscure Pages URL.
- `<meta name="robots" content="noindex,nofollow">` is already set in `<head>`.
- The Apps Script endpoint is gated by a shared secret token — rotate it if it ever leaks.

## Deploy (first time, in order)

1. **Stand up the backend.** Follow `apps-script/SETUP.md` end-to-end. ~15 min. You'll come out with three values to paste into `index.html`: `SHEET_CSV_URL`, `SCRIPT_URL`, `SECRET_TOKEN`.
2. **Create a private GitHub repo** named `ttc-debtor-map` (or anything obscure).
3. **Copy this entire folder** into the repo. Commit. Push to `main`.
4. **Settings → Pages**: source = `Deploy from a branch`, branch = `main`, folder = `/docs`. Save.
5. Wait 5–10 min for the first build. The URL appears at the top of the Pages settings page.
6. Open the URL on your phone, enter your crew name, tap a pin, test "Mark paid" and "Send note" — both should email you within 30s.

## Daily refresh

The data refresh script runs each morning (configured as a scheduled task in Cowork). It:

1. Logs into Jobber via your saved session
2. Pulls the Client Balance report's "Outstanding" rows
3. Filters out the same exclusions (LDS, Salli Jeppson, LLCs, etc.)
4. Looks up each new debtor's service address
5. Geocodes new addresses via Nominatim (ZIP fallback for Cache Valley grid)
6. Writes the result to the Google Sheet's **Debtors** tab — **preserving** existing `Status` and `Notes` columns for any row whose JobberURL is unchanged

The "preserving" piece matters: if the crew already added notes or marked someone paid, those don't get wiped by the next refresh.

(Setup of the scheduled task itself happens via `/schedule` in Cowork once the rest is deployed.)

## Updating the brand

See `docs/BRAND.md`. Short version: edit one `:root` block in `index.html`, drop in `logo.svg` next to it, done.

## Manual edits to the data

You can hand-edit the Google Sheet's Debtors tab anytime — add/remove rows, fix addresses, tweak balances. The map picks up changes within 60 seconds. The daily refresh from Jobber won't overwrite manual fixes to Status or Notes; it only refreshes Balance and adds/removes rows based on Jobber state.

## Tech notes

- **Map**: Leaflet 1.9.4 + OpenStreetMap tiles. Free, no API key.
- **Backend**: Google Apps Script Web App. Free, no separate hosting.
- **Geocoder**: Nominatim (OSM) at refresh time. ~85% coverage for Cache Valley addresses; misses fall back to ZIP centroid (`Approx=1` in the CSV).
- **Auto-refresh** (client-side): every 60 seconds. Cache-busted via `?t=` querystring.
- **Auth**: Apps Script Web App accepts any caller but rejects requests missing the shared secret. The secret lives in the page source — treat the URL as the secret, not the token.
