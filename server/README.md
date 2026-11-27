# Family Calendar – server

Stores the family's members and events, and emails a standard calendar invite
(iCalendar `METHOD:REQUEST`) to **every** address of each invited member. Updates
re-send the invite with a higher `SEQUENCE` so calendars update in place; deleting
an event, or removing someone from it, sends a `METHOD:CANCEL`.

## Run locally

```bash
cd server
npm install
cp .env.example .env    # then fill in SMTP + API_KEY
npm start               # http://localhost:4000
npm test
```

Without `SMTP_HOST` the server runs in dry-run mode: invites are logged, not sent.

## Sending email

Any SMTP provider works. Easiest options:

| Provider | Settings |
| --- | --- |
| Gmail | `smtp.gmail.com`, port 587, your address + an [App Password](https://myaccount.google.com/apppasswords) (needs 2-Step Verification) |
| Outlook / Microsoft 365 | `smtp.office365.com`, port 587 (SMTP AUTH must be enabled for the mailbox) |
| SendGrid, Mailgun, Amazon SES, Postmark | Their SMTP host + API credentials; best deliverability for production |

Tip: create a dedicated address (e.g. `ourfamily.calendar@gmail.com`) to act as the
organizer. Invites from it show up as "Our Family Calendar" in everyone's inbox, and
RSVPs come back to that mailbox.

## API

All `/api` routes require header `X-Api-Key: <API_KEY>` when `API_KEY` is set.

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST | `/api/members` | `{ name, color?, emails: [{ address, label: work\|personal\|school\|other, notify }] }` |
| PUT/DELETE | `/api/members/:id` | |
| GET | `/api/events?from=&to=&memberId=` | ISO date filters |
| POST | `/api/events` | `{ title, start, end, allDay, memberIds, location?, description?, reminderMinutes? }` → sends invites |
| PUT | `/api/events/:id` | sends updates / cancellations |
| DELETE | `/api/events/:id` | sends cancellations |
| POST | `/api/events/:id/resend` | re-send invites (e.g. after adding a new email) |
| GET | `/calendar/all.ics?key=` or `/calendar/<memberId>.ics?key=` | subscribable read-only feed |

All-day events use `YYYY-MM-DD` for `start`/`end` (end inclusive). Timed events use ISO date-times.

## Deploying

It's a plain Node 20+ app: Render, Railway, Fly.io, a VPS, or a Raspberry Pi at home all
work. Use HTTPS, set `API_KEY`, and mount a persistent disk for `data/` (or set `DATA_FILE`).
