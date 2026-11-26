import { createApp } from './app.js';
import { Store } from './store.js';
import { InviteMailer, createTransport } from './mailer.js';

const env = process.env;
const port = Number(env.PORT || 4000);

if (!env.SMTP_HOST) {
  console.warn('[mail] SMTP_HOST not set: invites will be logged, not emailed. See server/README.md.');
}
if (!env.API_KEY) {
  console.warn('[auth] API_KEY not set: the API is open to anyone who can reach it. Set it before deploying.');
}

const store = new Store(env.DATA_FILE || new URL('../data/db.json', import.meta.url).pathname);
const mailer = new InviteMailer({
  transport: createTransport(env),
  from: env.MAIL_FROM || env.SMTP_USER || 'calendar@example.com',
  fromName: env.MAIL_FROM_NAME || 'Family Calendar',
});

createApp({ store, mailer, apiKey: env.API_KEY }).listen(port, () => {
  console.log(`Family Calendar API listening on http://localhost:${port}`);
});
