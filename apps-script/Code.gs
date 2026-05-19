/**
 * TTC Debtor Map — Google Apps Script backend
 *
 * Deploys as a Web App that the crew's map page POSTs to when they tap
 * "Mark paid" or "Send a note to Joseph". The sheet doubles as a log.
 *
 * Two actions supported:
 *   action=collected → flip the debtor's Status to "PAID-IN-PERSON" and email Joseph
 *   action=note      → append a free-form note to the sheet and email Joseph
 *
 * All writes are gated by a shared SECRET token (set below). The token also
 * lives in index.html — rotate both together if it ever leaks.
 */

// ============================================================================
// CONFIG — edit these once after first deploy
// ============================================================================
const SHEET_ID  = '1KZPQkQ6_tFMwmvEkJuDy763y7p5Bwjln1ERZOUYY_tg';  // pre-filled
const DATA_TAB  = 'Debtors';                         // main tab name
const LOG_TAB   = 'Log';                             // append-only log tab
const SECRET    = 'Bvp7rhkDac9BeEsUEhjt3ry54SInqfbO2Rd-h7c_Kho';  // pre-filled, matches index.html
const NOTIFY_EMAIL = 'myersmail9@gmail.com';        // Joseph
// ============================================================================


/** Health-check endpoint. Open the Web App URL in a browser to test. */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: 'TTC Debtor Map backend live' }))
    .setMimeType(ContentService.MimeType.JSON);
}


/** Write endpoint. Crew map → POST → here. */
function doPost(e) {
  try {
    const params = e.parameter || {};
    // Auth gate
    if (params.token !== SECRET) {
      return reply({ ok: false, error: 'bad token' });
    }

    const action = (params.action || '').toLowerCase();
    if (action === 'collected') {
      return handleCollected(params);
    } else if (action === 'note') {
      return handleNote(params);
    } else if (action === 'refresh') {
      return handleRefresh(params);
    }
    return reply({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}


/** Find the row of a debtor by their Jobber URL and update Status. */
function handleCollected(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(DATA_TAB);
  if (!sh) return reply({ ok: false, error: 'Debtors tab not found' });

  const jobberUrl = params.jobberUrl || '';
  const name      = params.name || '(unknown)';
  const balance   = params.balance || '';
  const crewMember = params.crew || '(unspecified)';
  const ts        = new Date();

  // Locate row by JobberURL column
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const urlCol     = headers.indexOf('JobberURL');
  const statusCol  = headers.indexOf('Status');
  const notesCol   = headers.indexOf('Notes');
  const updatedCol = headers.indexOf('LastUpdated');
  if (urlCol === -1) return reply({ ok: false, error: 'Sheet missing JobberURL column' });

  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][urlCol] === jobberUrl) { rowIdx = i + 1; break; }
  }
  if (rowIdx === -1) return reply({ ok: false, error: 'debtor not found' });

  // Update row
  if (statusCol !== -1) sh.getRange(rowIdx, statusCol + 1).setValue('PAID-IN-PERSON');
  if (notesCol  !== -1) {
    const old = sh.getRange(rowIdx, notesCol + 1).getValue();
    const stamp = Utilities.formatDate(ts, 'America/Denver', 'yyyy-MM-dd HH:mm');
    const newNote = `[${stamp}] PAID-IN-PERSON by ${crewMember}`;
    sh.getRange(rowIdx, notesCol + 1).setValue(old ? old + '\n' + newNote : newNote);
  }
  if (updatedCol !== -1) sh.getRange(rowIdx, updatedCol + 1).setValue(ts);

  // Append to log
  appendLog(ss, ts, 'collected', name, balance, jobberUrl, crewMember, '');

  // Email Joseph
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: `[TTC Debtor Map] ${name} — PAID IN PERSON ($${balance})`,
    body:
      `${name} was just marked PAID-IN-PERSON in the field.\n\n` +
      `Amount: $${balance}\n` +
      `Crew:   ${crewMember}\n` +
      `Time:   ${ts}\n` +
      `Jobber: ${jobberUrl}\n\n` +
      `Reminder: confirm payment hit Jobber. If not, follow up with the crew.`,
  });

  return reply({ ok: true, msg: 'collected logged' });
}


/** Append a free-form note from the crew and email Joseph. */
function handleNote(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(DATA_TAB);
  if (!sh) return reply({ ok: false, error: 'Debtors tab not found' });

  const jobberUrl = params.jobberUrl || '';
  const name      = params.name || '(unknown)';
  const note      = (params.note || '').trim();
  const crewMember = params.crew || '(unspecified)';
  const ts        = new Date();

  if (!note) return reply({ ok: false, error: 'empty note' });
  if (note.length > 2000) return reply({ ok: false, error: 'note too long' });

  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const urlCol     = headers.indexOf('JobberURL');
  const notesCol   = headers.indexOf('Notes');
  const updatedCol = headers.indexOf('LastUpdated');

  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][urlCol] === jobberUrl) { rowIdx = i + 1; break; }
  }
  if (rowIdx !== -1 && notesCol !== -1) {
    const old = sh.getRange(rowIdx, notesCol + 1).getValue();
    const stamp = Utilities.formatDate(ts, 'America/Denver', 'yyyy-MM-dd HH:mm');
    const newNote = `[${stamp}] ${crewMember}: ${note}`;
    sh.getRange(rowIdx, notesCol + 1).setValue(old ? old + '\n' + newNote : newNote);
    if (updatedCol !== -1) sh.getRange(rowIdx, updatedCol + 1).setValue(ts);
  }

  appendLog(ss, ts, 'note', name, '', jobberUrl, crewMember, note);

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: `[TTC Debtor Map] Note on ${name}`,
    body:
      `${crewMember} left a note from the field:\n\n` +
      `"${note}"\n\n` +
      `Client: ${name}\n` +
      `Jobber: ${jobberUrl}\n` +
      `Time:   ${ts}\n`,
  });

  return reply({ ok: true, msg: 'note logged' });
}


/**
 * Daily refresh from Jobber. Replaces Debtors tab rows but PRESERVES the
 * Status, Notes, and LastUpdated columns for any row whose JobberURL matches
 * an existing row — so manual edits from the field don't get wiped.
 *
 * Expects params:
 *   token
 *   action=refresh
 *   payload: a JSON-encoded array of debtor objects with keys
 *            Name, Address, Balance, JobberURL, Lat, Lng, Approx
 */
function handleRefresh(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(DATA_TAB);
  if (!sh) sh = ss.insertSheet(DATA_TAB);

  let incoming;
  try {
    incoming = JSON.parse(params.payload || '[]');
  } catch (e) {
    return reply({ ok: false, error: 'bad payload JSON: ' + e });
  }
  if (!Array.isArray(incoming)) return reply({ ok: false, error: 'payload must be array' });

  const headers = ['Name','Address','Balance','JobberURL','Lat','Lng','Approx','Notes','Status','LastUpdated'];

  // Build map of existing Status/Notes/LastUpdated by JobberURL
  const existing = {};
  const range = sh.getDataRange().getValues();
  if (range.length > 1) {
    const hdr = range[0];
    const iUrl  = hdr.indexOf('JobberURL');
    const iNote = hdr.indexOf('Notes');
    const iStat = hdr.indexOf('Status');
    const iUpd  = hdr.indexOf('LastUpdated');
    if (iUrl !== -1) {
      for (let i = 1; i < range.length; i++) {
        const url = range[i][iUrl];
        if (url) {
          existing[url] = {
            Notes: iNote !== -1 ? range[i][iNote] : '',
            Status: iStat !== -1 ? range[i][iStat] : '',
            LastUpdated: iUpd !== -1 ? range[i][iUpd] : '',
          };
        }
      }
    }
  }

  // Clear and rewrite
  sh.clear();
  sh.appendRow(headers);
  const rowsToWrite = incoming.map(d => {
    const prior = existing[d.JobberURL] || {};
    return [
      d.Name || '',
      d.Address || '',
      d.Balance || '',
      d.JobberURL || '',
      d.Lat || '',
      d.Lng || '',
      d.Approx ? 1 : 0,
      prior.Notes || '',
      prior.Status || '',
      prior.LastUpdated || '',
    ];
  });
  if (rowsToWrite.length) {
    sh.getRange(2, 1, rowsToWrite.length, headers.length).setValues(rowsToWrite);
  }

  appendLog(ss, new Date(), 'refresh', '', '', '', 'scheduled-task',
            `Wrote ${rowsToWrite.length} rows; preserved ${Object.keys(existing).length} status/notes.`);

  return reply({ ok: true, rowsWritten: rowsToWrite.length, statusPreservedFor: Object.keys(existing).length });
}


function appendLog(ss, ts, action, name, balance, jobberUrl, crew, note) {
  let log = ss.getSheetByName(LOG_TAB);
  if (!log) {
    log = ss.insertSheet(LOG_TAB);
    log.appendRow(['Timestamp', 'Action', 'Name', 'Balance', 'JobberURL', 'Crew', 'Note']);
  }
  log.appendRow([ts, action, name, balance, jobberUrl, crew, note]);
}


function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
