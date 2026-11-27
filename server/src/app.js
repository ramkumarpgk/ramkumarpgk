import express from 'express';
import { randomUUID } from 'node:crypto';
import { buildCalendar } from './ics.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLORS = ['#4F46E5', '#DB2777', '#059669', '#D97706', '#0891B2', '#7C3AED', '#DC2626', '#65A30D'];

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function cleanEmails(list) {
  if (!Array.isArray(list) || list.length === 0) throw new HttpError(400, 'Each member needs at least one email');
  const seen = new Set();
  return list.map((e) => {
    const address = String(e.address || '').trim().toLowerCase();
    if (!EMAIL_RE.test(address)) throw new HttpError(400, `Invalid email: ${e.address}`);
    if (seen.has(address)) throw new HttpError(400, `Duplicate email: ${address}`);
    seen.add(address);
    return {
      address,
      label: ['work', 'personal', 'school', 'other'].includes(e.label) ? e.label : 'personal',
      notify: e.notify !== false,
    };
  });
}

function cleanMember(body, existing = {}) {
  const name = String(body.name ?? existing.name ?? '').trim();
  if (!name) throw new HttpError(400, 'Name is required');
  return {
    ...existing,
    name,
    color: body.color || existing.color,
    emails: body.emails !== undefined ? cleanEmails(body.emails) : existing.emails,
  };
}

function cleanEvent(body, members, existing = {}) {
  const merged = { ...existing, ...body };
  const title = String(merged.title || '').trim();
  if (!title) throw new HttpError(400, 'Title is required');
  const allDay = Boolean(merged.allDay);
  let { start, end } = merged;
  if (allDay) {
    if (!DATE_RE.test(start || '')) throw new HttpError(400, 'All-day events need start as YYYY-MM-DD');
    end = end && DATE_RE.test(end) ? end : start;
    if (end < start) throw new HttpError(400, 'End date is before start date');
  } else {
    const s = Date.parse(start), e = Date.parse(end);
    if (Number.isNaN(s) || Number.isNaN(e)) throw new HttpError(400, 'start and end must be ISO date-times');
    if (e <= s) throw new HttpError(400, 'End must be after start');
    start = new Date(s).toISOString();
    end = new Date(e).toISOString();
  }
  const memberIds = Array.isArray(merged.memberIds) ? [...new Set(merged.memberIds)] : [];
  for (const id of memberIds) {
    if (!members.some((m) => m.id === id)) throw new HttpError(400, `Unknown member: ${id}`);
  }
  const reminder = merged.reminderMinutes;
  return {
    title,
    description: String(merged.description || ''),
    location: String(merged.location || ''),
    allDay,
    start,
    end,
    memberIds,
    reminderMinutes: reminder === null || reminder === undefined || reminder === '' ? null : Math.max(0, Number(reminder) || 0),
  };
}

/** Every email address that should receive invites for an event. */
function recipientsFor(event, members) {
  const out = [];
  for (const id of event.memberIds) {
    const m = members.find((x) => x.id === id);
    if (!m) continue;
    for (const e of m.emails) if (e.notify) out.push({ name: m.name, email: e.address, memberId: m.id });
  }
  return out;
}

function overlaps(event, from, to) {
  const s = event.allDay ? `${event.start}T00:00:00.000Z` : event.start;
  const e = event.allDay ? `${event.end}T23:59:59.999Z` : event.end;
  return (!to || s < to) && (!from || e >= from);
}

export function createApp({ store, mailer, apiKey, logger = console }) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // Allow the Expo web preview / dev tools to call the API.
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const requireKey = (req, res, next) => {
    if (!apiKey) return next();
    const given = req.get('x-api-key') || req.get('authorization')?.replace(/^Bearer\s+/i, '') || req.query.key;
    if (given !== apiKey) return res.status(401).json({ error: 'Invalid or missing API key' });
    next();
  };

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.get('/health', (req, res) => res.json({ ok: true }));

  // ---------- Members ----------
  app.get('/api/members', requireKey, (req, res) => res.json(store.members));

  app.post('/api/members', requireKey, (req, res) => {
    const member = { id: randomUUID(), ...cleanMember(req.body) };
    member.color ||= COLORS[store.members.length % COLORS.length];
    store.members.push(member);
    store.save();
    res.status(201).json(member);
  });

  app.put('/api/members/:id', requireKey, (req, res) => {
    const idx = store.members.findIndex((m) => m.id === req.params.id);
    if (idx < 0) throw new HttpError(404, 'Member not found');
    store.members[idx] = cleanMember(req.body, store.members[idx]);
    store.save();
    res.json(store.members[idx]);
  });

  app.delete('/api/members/:id', requireKey, (req, res) => {
    const idx = store.members.findIndex((m) => m.id === req.params.id);
    if (idx < 0) throw new HttpError(404, 'Member not found');
    store.members.splice(idx, 1);
    for (const ev of store.events) ev.memberIds = ev.memberIds.filter((id) => id !== req.params.id);
    store.save();
    res.sendStatus(204);
  });

  // ---------- Events ----------
  app.get('/api/events', requireKey, (req, res) => {
    const { from, to, memberId } = req.query;
    let events = store.events.filter((e) => overlaps(e, from, to));
    if (memberId) events = events.filter((e) => e.memberIds.includes(memberId));
    events.sort((a, b) => (a.start < b.start ? -1 : 1));
    res.json(events);
  });

  app.get('/api/events/:id', requireKey, (req, res) => {
    const event = store.events.find((e) => e.id === req.params.id);
    if (!event) throw new HttpError(404, 'Event not found');
    res.json(event);
  });

  app.post('/api/events', requireKey, wrap(async (req, res) => {
    const now = new Date().toISOString();
    const event = { id: randomUUID(), ...cleanEvent(req.body, store.members), sequence: 0, createdAt: now, updatedAt: now };
    store.events.push(event);
    store.save();
    const recipients = recipientsFor(event, store.members);
    const invite = await sendSafely(() => mailer.send('REQUEST', event, recipients));
    res.status(201).json({ ...event, invitesSentTo: invite.ok ? recipients.map((r) => r.email) : [], inviteError: invite.error });
  }));

  app.put('/api/events/:id', requireKey, wrap(async (req, res) => {
    const idx = store.events.findIndex((e) => e.id === req.params.id);
    if (idx < 0) throw new HttpError(404, 'Event not found');
    const before = store.events[idx];
    const oldRecipients = recipientsFor(before, store.members);
    const event = {
      ...before,
      ...cleanEvent(req.body, store.members, before),
      sequence: (before.sequence || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    store.events[idx] = event;
    store.save();

    const newRecipients = recipientsFor(event, store.members);
    const removed = oldRecipients.filter((o) => !newRecipients.some((n) => n.email === o.email));
    const invite = await sendSafely(async () => {
      await mailer.send('REQUEST', event, newRecipients);
      await mailer.send('CANCEL', event, removed);
    });
    res.json({ ...event, invitesSentTo: invite.ok ? newRecipients.map((r) => r.email) : [], cancelledFor: invite.ok ? removed.map((r) => r.email) : [], inviteError: invite.error });
  }));

  app.delete('/api/events/:id', requireKey, wrap(async (req, res) => {
    const idx = store.events.findIndex((e) => e.id === req.params.id);
    if (idx < 0) throw new HttpError(404, 'Event not found');
    const [event] = store.events.splice(idx, 1);
    store.save();
    const cancelled = { ...event, sequence: (event.sequence || 0) + 1, updatedAt: new Date().toISOString() };
    const recipients = recipientsFor(event, store.members);
    const result = await sendSafely(() => mailer.send('CANCEL', cancelled, recipients));
    res.json({ deleted: true, cancelledFor: result.ok ? recipients.map((r) => r.email) : [], inviteError: result.error });
  }));

  // Resend the invite (e.g. a member just added a new email address).
  app.post('/api/events/:id/resend', requireKey, wrap(async (req, res) => {
    const event = store.events.find((e) => e.id === req.params.id);
    if (!event) throw new HttpError(404, 'Event not found');
    const recipients = recipientsFor(event, store.members);
    const result = await sendSafely(() => mailer.send('REQUEST', event, recipients));
    if (!result.ok) throw new HttpError(502, `Could not send invites: ${result.error}`);
    res.json({ invitesSentTo: recipients.map((r) => r.email) });
  }));

  // ---------- Subscribable calendar feeds (webcal) ----------
  // e.g. webcal://host/calendar/all.ics?key=...  or  /calendar/<memberId>.ics?key=...
  app.get('/calendar/:who.ics', requireKey, (req, res) => {
    const who = req.params.who;
    const member = store.members.find((m) => m.id === who);
    if (who !== 'all' && !member) throw new HttpError(404, 'Unknown calendar');
    const events = who === 'all' ? store.events : store.events.filter((e) => e.memberIds.includes(who));
    res.type('text/calendar; charset=utf-8').send(
      buildCalendar({ method: 'PUBLISH', events, calendarName: member ? `Family – ${member.name}` : 'Family Calendar' })
    );
  });

  async function sendSafely(fn) {
    try {
      await fn();
      return { ok: true };
    } catch (err) {
      logger.error?.('[mail] failed:', err.message);
      return { ok: false, error: err.message };
    }
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) logger.error?.(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
  });

  return app;
}
