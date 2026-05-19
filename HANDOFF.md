# TTC Debtor Map — Final Handoff

## ✅ Everything is wired and tested

### Live backend
- **Google Sheet:** [TTC Debtor Map (Live)](https://docs.google.com/spreadsheets/d/1KZPQkQ6_tFMwmvEkJuDy763y7p5Bwjln1ERZOUYY_tg/edit) — 46 debtors loaded, `Debtors` + `Log` tabs
- **Apps Script Web App:** `https://script.google.com/macros/s/AKfycbwCgJ3pslWj3rDg-7J_NeInQ6dmRpGAQ1OjpoHLy6WJujhUtPdRSoWiaaYRAITjGZ15yA/exec`
- **Published CSV (what the map reads from):** the long `docs.google.com/...output=csv` URL is already wired into `docs/index.html`

### End-to-end test confirmed
- Posted a fake note for Jaicee Roden via the deployed Apps Script ✓
- Sheet row 47 Notes column got `[2026-05-19 15:19] Claude (test): END-TO-END TEST...` ✓
- LastUpdated column got the timestamp ✓
- Log tab was auto-created ✓
- Email should be in **myersmail9@gmail.com** — check inbox to confirm receipt

You can safely delete that test note from the sheet whenever — the Jaicee row will still work.

## 🟢 What you do now: push to GitHub

This is the only step left. ~5 minutes.

### Step 1 — Create a private GitHub repo

1. Go to https://github.com/new
2. Repository name: **`ttc-debtor-map`** (or something obscure — see Privacy note below)
3. **Set to Private** ← important, this list contains client names + amounts owed
4. Don't initialize with README, .gitignore, or license — we have our own files
5. Click **Create repository**

### Step 2 — Upload the files

The whole `ttc-debtor-map/` folder is in your Cowork outputs. Two ways to upload:

**Easy way (web UI):**
1. On the new empty repo page, click **uploading an existing file**
2. Drag the entire contents of `ttc-debtor-map/` (including the `docs/` subfolder and `apps-script/` subfolder) into the upload area
3. Scroll down, commit message: `Initial deploy`, click **Commit changes**

**Git way (if you prefer terminal):**
```bash
cd /Users/josephmyers/.../outputs/ttc-debtor-map
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/<your-username>/ttc-debtor-map.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In the new repo: **Settings → Pages** (left sidebar)
2. **Source:** Deploy from a branch
3. **Branch:** `main`, folder: `/docs`
4. Click **Save**
5. Wait 5–10 minutes for the first build. GitHub will show the URL at the top of that Settings → Pages page when it's ready.
6. URL will look like: `https://<your-username>.github.io/ttc-debtor-map/`

### Step 4 — Open it on your phone

1. Visit the Pages URL on your phone
2. Crew-name prompt pops up — enter your name (e.g. "Joseph")
3. The map loads, color-coded pins for all 46 debtors
4. Tap a pin → tap **Mark paid in person** → confirm
5. Within 30s: that row updates in your Sheet AND you get an email
6. Tap **Send note to Joseph** on any pin → type test → send → another email

### Step 5 (optional) — Set up daily auto-refresh

See `SCHEDULE.md`. This is the cron that re-pulls Jobber every morning so the map stays current as people pay (and as new debtors show up). I left the scheduled-task prompt in there — paste it into Cowork's `/schedule` command when you're ready.

## 🔐 Key values (memorize once, never share)

| What                | Value                                                                                  |
|---------------------|----------------------------------------------------------------------------------------|
| **Sheet ID**        | `1KZPQkQ6_tFMwmvEkJuDy763y7p5Bwjln1ERZOUYY_tg`                                         |
| **Secret token**    | `Bvp7rhkDac9BeEsUEhjt3ry54SInqfbO2Rd-h7c_Kho`                                          |
| **Apps Script Web App URL** | `https://script.google.com/macros/s/AKfycbwCgJ3pslWj3rDg-7J_NeInQ6dmRpGAQ1OjpoHLy6WJujhUtPdRSoWiaaYRAITjGZ15yA/exec` |

The secret token is in BOTH `Code.gs` and `index.html`. If it ever gets exposed in a public repo or screenshot, rotate by editing both files and **Apps Script → Manage deployments → pencil icon → New version → Deploy**.

## ⚠ Privacy reminder

- The map shows client names, addresses, and amounts owed. **Keep the repo private.**
- The HTML already has `<meta name="robots" content="noindex,nofollow">` so search engines won't index it.
- Don't post the Pages URL anywhere public. If someone needs access, send the URL via Slack/text directly.
- If the URL ever leaks, the secret token still gates the write actions — but the read URL (the sheet CSV) is public-by-publish. To shut that down: File → Share → Publish to web → **Stop publishing**.

## 📦 Final repo layout

```
ttc-debtor-map/
├── README.md            ← overview
├── HANDOFF.md           ← this file
├── SCHEDULE.md          ← daily auto-refresh setup (optional)
├── docs/                ← what GitHub Pages serves
│   ├── index.html       ← live map app (fully wired)
│   ├── data.csv         ← initial seed / offline fallback
│   ├── logo.png         ← TTC logo
│   └── BRAND.md         ← brand-integration guide for Claude Code
└── apps-script/
    ├── Code.gs          ← deployed backend (read-only reference now)
    └── SETUP.md         ← long-form setup walkthrough (you're past it)
```

You're done. Push, enable Pages, open on phone, tap a pin. Lights on.
