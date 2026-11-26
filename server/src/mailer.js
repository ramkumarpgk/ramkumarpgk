import nodemailer from 'nodemailer';
import { buildCalendar } from './ics.js';

export function createTransport(env = process.env) {
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === 'true' || Number(env.SMTP_PORT) === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  // No SMTP configured: don't send, just log what would have been sent.
  return nodemailer.createTransport({ jsonTransport: true });
}

function describeWhen(event) {
  if (event.allDay) {
    return event.end && event.end !== event.start ? `${event.start} to ${event.end} (all day)` : `${event.start} (all day)`;
  }
  return `${new Date(event.start).toUTCString()} – ${new Date(event.end).toUTCString()}`;
}

export class InviteMailer {
  constructor({ transport, from, fromName = 'Family Calendar', logger = console }) {
    this.transport = transport;
    this.from = from;
    this.fromName = fromName;
    this.logger = logger;
  }

  get organizer() {
    return { name: this.fromName, email: this.from };
  }

  /**
   * Send one calendar message to a set of recipients.
   * @param {'REQUEST'|'CANCEL'} method
   * @param {object} event
   * @param {{name:string,email:string}[]} recipients  who receives this email
   * @param {{name:string,email:string}[]} attendees   full attendee list written into the invite
   */
  async send(method, event, recipients, attendees = recipients) {
    if (!recipients.length) return null;
    const ics = buildCalendar({
      method,
      events: [event],
      organizer: this.organizer,
      attendeesFor: () => attendees,
    });
    const verb = method === 'CANCEL' ? 'Cancelled' : event.sequence > 0 ? 'Updated' : 'Invitation';
    const text = [
      `${verb}: ${event.title}`,
      `When: ${describeWhen(event)}`,
      event.location ? `Where: ${event.location}` : null,
      event.description ? `\n${event.description}` : null,
      '\nSent from your Family Calendar.',
    ].filter(Boolean).join('\n');

    const info = await this.transport.sendMail({
      from: { name: this.fromName, address: this.from },
      to: recipients.map((r) => ({ name: r.name, address: r.email })),
      subject: `${verb}: ${event.title}`,
      text,
      icalEvent: { method, filename: 'invite.ics', content: ics },
    });
    this.logger.info?.(`[mail] ${method} "${event.title}" -> ${recipients.map((r) => r.email).join(', ')}`);
    return info;
  }
}
