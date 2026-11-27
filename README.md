# Family Calendar

A shared family calendar for **iPhone and Android**. Add each family member with all of
their email addresses (work, personal, school…). When you create an event and pick who's
going, every one of those inboxes receives a real calendar invite — so the event appears
in Gmail/Google Calendar, Outlook, iCloud, Yahoo, Exchange at work, etc., and updates or
cancellations follow automatically.

```
┌──────────────┐  HTTPS   ┌──────────────────┐  SMTP   ┌────────────────────────────┐
│ Mobile app   │ ───────▶ │ server/ (Node)   │ ──────▶ │ mom@gmail.com              │
│ iOS+Android  │          │ members, events, │  .ics   │ mom@work.com               │
│ (Expo / RN)  │ ◀─────── │ invite emails    │ invites │ kid@school.edu …           │
└──────────────┘          └──────────────────┘         └────────────────────────────┘
```

| Folder | What |
| --- | --- |
| [`mobile/`](mobile) | Expo (React Native + TypeScript) app: month calendar, per-member filters & colours, event editor, family/email management, settings |
| [`server/`](server) | Node + Express API; sends iCalendar invites/updates/cancellations via any SMTP provider; also serves subscribable `.ics` feeds. See [server/README.md](server/README.md) |

## Why invites go through a server

Phones can't silently send email with calendar attachments, and the app shouldn't hold
everyone's email passwords. Instead the server sends standards-based invites from one
family organizer address. This works with **any** email provider with no per-account sign-in.

## Quick start

1. **Server**
   ```bash
   cd server && npm install && cp .env.example .env && npm start
   ```
   Fill in `.env` with SMTP details (see server/README) — without them invites are only logged.

2. **App**
   ```bash
   cd mobile && npm install && npx expo start
   ```
   Scan the QR code with **Expo Go** (iOS/Android). In the app's **Settings** tab, set the
   server URL to your computer's LAN address (e.g. `http://192.168.1.20:4000`, not
   `localhost`) and the family key (`API_KEY`).

3. Add family members and their emails in **Family**, then tap **+** on the **Calendar**.

## Installing without the app stores

See **[INSTALL.md](INSTALL.md)**. Android gets a free downloadable APK built by GitHub
Actions; iPhone options are TestFlight, an ad hoc install link, or Xcode.

## Publishing to the App Store / Google Play

Use EAS (cloud builds — no Mac required for iOS builds):

```bash
cd mobile
npx eas-cli@latest build --platform all
npx eas-cli@latest submit --platform ios      # needs an Apple Developer account ($99/yr)
npx eas-cli@latest submit --platform android  # needs a Google Play developer account ($25)
```

Change `ios.bundleIdentifier` / `android.package` in `mobile/app.json` (currently
`com.example.familycalendar`) to your own before the first build.

## Roadmap ideas

- Per-person sign-in (each member logs in, multiple families) — currently one shared family key
- Recurring events (weekly practice, birthdays)
- Push notifications in the app
- Two-way sync: read members' existing Google/Outlook events via OAuth
- Track RSVPs (parse replies sent to the organizer mailbox)
