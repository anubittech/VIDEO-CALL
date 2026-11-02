import { apiRequest } from '../lib/api';
import { Meeting } from '../lib/types';

export const extractMeetingCode = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.includes('/meeting/')) {
    const segments = trimmed.split('/meeting/');
    return segments[segments.length - 1].split('?')[0].split('#')[0].trim().toLowerCase();
  }
  return trimmed.toLowerCase();
};

export const meetingService = {
  async createMeeting(title?: string): Promise<Meeting> {
    const data = await apiRequest<{ meeting: Meeting }>('/api/meetings', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return data.meeting;
  },

  async getMeeting(meetingIdOrUrl: string): Promise<Meeting> {
    const code = extractMeetingCode(meetingIdOrUrl);
    const data = await apiRequest<{ meeting: Meeting }>(
      `/api/meetings/${encodeURIComponent(code)}`,
      {
        method: 'GET',
      }
    );
    return data.meeting;
  },

  async joinMeeting(meetingIdOrUrl: string): Promise<Meeting> {
    const code = extractMeetingCode(meetingIdOrUrl);
    const data = await apiRequest<{ meeting: Meeting }>(
      `/api/meetings/${encodeURIComponent(code)}/join`,
      {
        method: 'POST',
      }
    );
    return data.meeting;
  },

  async getMyMeetings(): Promise<Meeting[]> {
    const data = await apiRequest<{ meetings: Meeting[] }>(
      '/api/meetings/my-meetings',
      {
        method: 'GET',
      }
    );
    return data.meetings;
  },

  async endMeeting(meetingId: string): Promise<Meeting> {
    const code = extractMeetingCode(meetingId);
    const data = await apiRequest<{ meeting: Meeting }>(
      `/api/meetings/${encodeURIComponent(code)}/end`,
      {
        method: 'PATCH',
      }
    );
    return data.meeting;
  },
};

