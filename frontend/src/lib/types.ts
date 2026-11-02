export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type MeetingStatus = 'ACTIVE' | 'ENDED';

export interface Meeting {
  id: string;
  meetingId: string;
  title: string;
  hostId: string;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  inviteLink?: string;
  host?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MediaState {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

export interface RoomParticipant {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  isHost: boolean;
  joinedAt: string;
  mediaState: MediaState;
}

export interface RemotePeer {
  participant: RoomParticipant;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

