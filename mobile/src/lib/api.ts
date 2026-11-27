import { useMemo } from 'react';
import { useSettings, Settings } from './settings';
import type { EventInput, FamilyEvent, Member, SaveEventResult } from './types';

export class ApiError extends Error {}

function client({ serverUrl, apiKey }: Settings) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${serverUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-Api-Key': apiKey } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(`Can't reach the server at ${serverUrl}. Check Settings.`);
    }
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`);
    return data as T;
  }

  return {
    health: () => request<{ ok: boolean }>('GET', '/health'),
    members: () => request<Member[]>('GET', '/api/members'),
    createMember: (m: Omit<Member, 'id' | 'color'> & { color?: string }) => request<Member>('POST', '/api/members', m),
    updateMember: (id: string, m: Partial<Member>) => request<Member>('PUT', `/api/members/${id}`, m),
    deleteMember: (id: string) => request<void>('DELETE', `/api/members/${id}`),
    events: (q: { from?: string; to?: string; memberId?: string } = {}) => {
      const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString();
      return request<FamilyEvent[]>('GET', `/api/events${qs ? `?${qs}` : ''}`);
    },
    event: (id: string) => request<FamilyEvent>('GET', `/api/events/${id}`),
    createEvent: (e: EventInput) => request<SaveEventResult>('POST', '/api/events', e),
    updateEvent: (id: string, e: Partial<EventInput>) => request<SaveEventResult>('PUT', `/api/events/${id}`, e),
    deleteEvent: (id: string) => request<{ cancelledFor: string[]; inviteError?: string }>('DELETE', `/api/events/${id}`),
    resendInvites: (id: string) => request<{ invitesSentTo: string[] }>('POST', `/api/events/${id}/resend`),
    feedUrl: (who: string) => {
      const url = `${serverUrl}/calendar/${who}.ics${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''}`;
      return url.replace(/^https?:/, 'webcal:');
    },
  };
}

export type Api = ReturnType<typeof client>;

export function useApi(): Api {
  const { settings } = useSettings();
  return useMemo(() => client(settings), [settings]);
}
