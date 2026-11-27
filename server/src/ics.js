// Minimal RFC 5545 (iCalendar) builder for family events.
// Every major email provider (Gmail, Outlook/Exchange, iCloud, Yahoo, Fastmail...)
// recognises a METHOD:REQUEST/CANCEL invite and shows it in that account's calendar.

const PRODID = '-//Family Calendar//EN';

export function escapeText(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\;');
}

function escapeParam(value = '') {
  // Parameter values can't contain quotes; wrap in quotes to allow , ; :
  return `"${String(value).replace(/"/g, "'")}"`;
}

// Fold lines longer than 75 octets (RFC 5545 §3.1).
export function foldLine(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = '';
  let currentLen = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, 'utf8');
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (currentLen + len > limit) {
      parts.push(current);
      current = '';
      currentLen = 0;
    }
    current += ch;
    currentLen += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function formatUtc(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// 'YYYY-MM-DD' -> 'YYYYMMDD'
function formatDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

// All-day end dates are stored inclusive in the app; iCalendar wants them exclusive.
function nextDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {object} opts
 * @param {'REQUEST'|'CANCEL'|'PUBLISH'} opts.method
 * @param {object[]} opts.events  family events
 * @param {{name:string,email:string}} [opts.organizer]
 * @param {(event)=>{name:string,email:string}[]} [opts.attendeesFor]
 * @param {string} [opts.calendarName]
 */
export function buildCalendar({ method, events, organizer, attendeesFor, calendarName }) {
  const lines = ['BEGIN:VCALENDAR', `PRODID:${PRODID}`, 'VERSION:2.0', 'CALSCALE:GREGORIAN', `METHOD:${method}`];
  if (calendarName) lines.push(`X-WR-CALNAME:${escapeText(calendarName)}`);

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@family-calendar`);
    lines.push(`DTSTAMP:${formatUtc(event.updatedAt || Date.now())}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(event.start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDate(nextDay(event.end || event.start))}`);
    } else {
      lines.push(`DTSTART:${formatUtc(event.start)}`);
      lines.push(`DTEND:${formatUtc(event.end)}`);
    }
    lines.push(`SEQUENCE:${event.sequence || 0}`);
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    lines.push(`STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`);
    lines.push('TRANSP:OPAQUE');
    if (organizer?.email) {
      lines.push(`ORGANIZER;CN=${escapeParam(organizer.name || organizer.email)}:mailto:${organizer.email}`);
    }
    for (const a of attendeesFor ? attendeesFor(event) : []) {
      lines.push(
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeParam(a.name)}:mailto:${a.email}`
      );
    }
    if (method !== 'CANCEL' && event.reminderMinutes != null && event.reminderMinutes >= 0) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(event.title)}`, `TRIGGER:-PT${event.reminderMinutes}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
