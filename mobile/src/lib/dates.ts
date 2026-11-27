import type { FamilyEvent } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 6x7 grid of days covering the month, starting on Sunday. */
export function monthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Which local days (YYYY-MM-DD) an event covers. */
export function eventDays(e: FamilyEvent): string[] {
  const start = e.allDay ? parseDayKey(e.start) : new Date(e.start);
  // A timed event ending exactly at midnight shouldn't spill into the next day.
  const end = e.allDay ? parseDayKey(e.end) : new Date(new Date(e.end).getTime() - 1);
  const days: string[] = [];
  for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d <= end && days.length < 366; d = addDays(d, 1)) {
    days.push(dayKey(d));
  }
  return days.length ? days : [dayKey(start)];
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatEventWhen(e: FamilyEvent) {
  if (e.allDay) {
    const s = parseDayKey(e.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (e.end === e.start) return 'All day';
    const en = parseDayKey(e.end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${s} – ${en}`;
  }
  return `${formatTime(e.start)} – ${formatTime(e.end)}`;
}

export const MONTH_FMT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
