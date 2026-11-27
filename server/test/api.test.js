import { test } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { createApp } from '../src/app.js';
import { Store } from '../src/store.js';
import { InviteMailer } from '../src/mailer.js';
import { buildCalendar, foldLine } from '../src/ics.js';

const silent = { info() {}, error() {} };

async function setup({ apiKey } = {}) {
  const sent = [];
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
  const mailer = new InviteMailer({ transport, from: 'family@example.com', logger: silent });
  const realSend = mailer.send.bind(mailer);
  mailer.send = async (method, event, recipients, attendees) => {
    const info = await realSend(method, event, recipients, attendees);
    if (info) sent.push({ method, to: recipients.map((r) => r.email), raw: info.message.toString() });
    return info;
  };
  const app = createApp({ store: new Store(null), mailer, apiKey, logger: silent });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-Api-Key': apiKey } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
  };
  return { call, sent, close: () => server.close() };
}

test('invites go to every work and personal email of each invited member', async (t) => {
  const { call, sent, close } = await setup();
  t.after(close);

  const mom = (await call('POST', '/api/members', {
    name: 'Mom',
    emails: [{ address: 'mom@gmail.com', label: 'personal' }, { address: 'Mom@Work.com', label: 'work' }],
  })).body;
  const kid = (await call('POST', '/api/members', {
    name: 'Kid',
    emails: [{ address: 'kid@school.edu', label: 'school' }, { address: 'kid@icloud.com', notify: false }],
  })).body;
  assert.equal(mom.emails[1].address, 'mom@work.com');

  const created = await call('POST', '/api/events', {
    title: 'Dentist, then lunch; bring cards',
    start: '2026-12-01T15:00:00Z',
    end: '2026-12-01T16:00:00Z',
    location: 'Main St',
    memberIds: [mom.id, kid.id],
    reminderMinutes: 30,
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.invitesSentTo, ['mom@gmail.com', 'mom@work.com', 'kid@school.edu']);

  assert.equal(sent.length, 1);
  const raw = sent[0].raw;
  assert.match(raw, /Content-Type: text\/calendar; charset=utf-8; method=REQUEST/i);
  assert.match(raw, /To: Mom <mom@gmail.com>, Mom <mom@work.com>, Kid <kid@school.edu>/);
  assert.doesNotMatch(raw, /kid@icloud\.com/);

  // Update: drop Kid -> Kid gets a CANCEL, Mom gets updated REQUEST with SEQUENCE:1
  const updated = await call('PUT', `/api/events/${created.body.id}`, { memberIds: [mom.id] });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.sequence, 1);
  assert.deepEqual(updated.body.cancelledFor, ['kid@school.edu']);
  assert.equal(sent[1].method, 'REQUEST');
  assert.equal(sent[2].method, 'CANCEL');
  assert.deepEqual(sent[2].to, ['kid@school.edu']);

  // Delete -> CANCEL to remaining attendees
  const del = await call('DELETE', `/api/events/${created.body.id}`);
  assert.deepEqual(del.body.cancelledFor, ['mom@gmail.com', 'mom@work.com']);
  assert.equal(sent[3].method, 'CANCEL');
  assert.equal((await call('GET', '/api/events')).body.length, 0);
});

test('validation and filtering', async (t) => {
  const { call, close } = await setup();
  t.after(close);
  assert.equal((await call('POST', '/api/members', { name: 'X', emails: [{ address: 'nope' }] })).status, 400);
  assert.equal((await call('POST', '/api/members', { name: 'X', emails: [] })).status, 400);
  const dad = (await call('POST', '/api/members', { name: 'Dad', emails: [{ address: 'dad@x.com' }] })).body;
  assert.equal((await call('POST', '/api/events', { title: 'Bad', start: '2026-12-01T10:00:00Z', end: '2026-12-01T09:00:00Z' })).status, 400);
  assert.equal((await call('POST', '/api/events', { title: 'Bad', start: '2026-12-01', allDay: true, memberIds: ['ghost'] })).status, 400);

  await call('POST', '/api/events', { title: 'Trip', allDay: true, start: '2026-12-24', end: '2026-12-26', memberIds: [dad.id] });
  await call('POST', '/api/events', { title: 'Later', start: '2027-02-01T10:00:00Z', end: '2027-02-01T11:00:00Z' });
  const dec = await call('GET', '/api/events?from=2026-12-01T00:00:00Z&to=2027-01-01T00:00:00Z');
  assert.deepEqual(dec.body.map((e) => e.title), ['Trip']);
  const dads = await call('GET', `/api/events?memberId=${dad.id}`);
  assert.equal(dads.body.length, 1);

  const feed = await call('GET', `/calendar/${dad.id}.ics`);
  assert.match(feed.body, /METHOD:PUBLISH/);
  assert.match(feed.body, /DTSTART;VALUE=DATE:20261224/);
  assert.match(feed.body, /DTEND;VALUE=DATE:20261227/); // exclusive end
});

test('API key is enforced when configured', async (t) => {
  const { call, close } = await setup({ apiKey: 'secret' });
  t.after(close);
  assert.equal((await call('GET', '/api/members')).status, 200);
  assert.equal((await call('GET', '/api/members', null, { 'X-Api-Key': 'wrong' })).status, 401);
});

test('ics escaping and folding', () => {
  const long = 'DESCRIPTION:' + 'é'.repeat(80);
  const folded = foldLine(long);
  for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(folded.split('\r\n').map((l, i) => (i ? l.slice(1) : l)).join(''), long);

  const ics = buildCalendar({
    method: 'REQUEST',
    events: [{ id: 'abc', title: 'A, B; C\nD', start: '2026-01-01T00:00:00Z', end: '2026-01-01T01:00:00Z' }],
  });
  assert.match(ics, /SUMMARY:A\\, B\; C\\nD/);
  assert.match(ics, /UID:abc@family-calendar/);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});
