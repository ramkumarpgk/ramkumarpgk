export type EmailLabel = 'work' | 'personal' | 'school' | 'other';

export interface MemberEmail {
  address: string;
  label: EmailLabel;
  /** When false this address does not receive calendar invites. */
  notify: boolean;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  emails: MemberEmail[];
}

export interface FamilyEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  /** ISO date-time, or YYYY-MM-DD for all-day events */
  start: string;
  /** ISO date-time, or YYYY-MM-DD (inclusive) for all-day events */
  end: string;
  memberIds: string[];
  reminderMinutes: number | null;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

export type EventInput = Pick<
  FamilyEvent,
  'title' | 'description' | 'location' | 'allDay' | 'start' | 'end' | 'memberIds' | 'reminderMinutes'
>;

export interface SaveEventResult extends FamilyEvent {
  invitesSentTo: string[];
  cancelledFor?: string[];
  inviteError?: string;
}
