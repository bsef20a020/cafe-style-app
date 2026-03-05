const SHEET_RESERVATIONS = 'Reservations';
const SHEET_EVENTS = 'Analytics';
const ADMIN_KEY = 'change-this-admin-key';

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function ensureHeaders() {
  const r = getSheet(SHEET_RESERVATIONS);
  if (r.getLastRow() === 0) {
    r.appendRow(['ts','bookingRef','name','phone','venue','guests','date','time','occasion']);
  }
  const a = getSheet(SHEET_EVENTS);
  if (a.getLastRow() === 0) {
    a.appendRow(['ts','event','page','payload']);
  }
}

function doPost(e) {
  ensureHeaders();
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const type = payload.type;
    const data = payload.data || {};

    if (type === 'reservation_request') {
      getSheet(SHEET_RESERVATIONS).appendRow([
        data.ts || new Date().toISOString(),
        data.bookingRef || '',
        data.name || '',
        data.phone || '',
        data.venue || '',
        data.guests || '',
        data.date || '',
        data.time || '',
        data.occasion || ''
      ]);
    } else if (type === 'analytics_event') {
      getSheet(SHEET_EVENTS).appendRow([
        data.ts || new Date().toISOString(),
        data.event || '',
        data.page || '',
        JSON.stringify(data)
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  ensureHeaders();
  const mode = (e.parameter.mode || '').trim();
  const key = (e.parameter.key || '').trim();

  if (mode === 'list' && key === ADMIN_KEY) {
    const eventsSh = getSheet(SHEET_EVENTS);
    const reservationsSh = getSheet(SHEET_RESERVATIONS);

    const events = eventsSh.getLastRow() > 1
      ? rowsToObjects(eventsSh.getRange(1,1,eventsSh.getLastRow(),eventsSh.getLastColumn()).getValues())
      : [];
    const reservations = reservationsSh.getLastRow() > 1
      ? rowsToObjects(reservationsSh.getRange(1,1,reservationsSh.getLastRow(),reservationsSh.getLastColumn()).getValues())
      : [];

    return ContentService.createTextOutput(JSON.stringify({ ok: true, events, reservations }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'NOFFELO Apps Script backend' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function rowsToObjects(rows) {
  const [headers, ...rest] = rows;
  return rest.map((row) => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}
