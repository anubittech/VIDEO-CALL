'use client';

import React from 'react';
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Users,
} from 'lucide-react';
import { RoomParticipant } from '@/lib/types';
import styles from './ParticipantsPanel.module.css';

interface ParticipantsPanelProps {
  localName: string;
  isLocalHost: boolean;
  isLocalAudioMuted: boolean;
  isLocalVideoOff: boolean;
  isLocalScreenSharing: boolean;
  remoteParticipants: RoomParticipant[];
  onClose: () => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  localName,
  isLocalHost,
  isLocalAudioMuted,
  isLocalVideoOff,
  isLocalScreenSharing,
  remoteParticipants,
  onClose,
}) => {
  const getInitials = (name: string) =>
    (name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Users size={17} />
          <span>In Meeting ({1 + remoteParticipants.length})</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Close participants panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles.list}>
        {/* Local Participant */}
        <div className={styles.item}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{getInitials(localName)}</div>
            <div className={styles.nameBlock}>
              <span className={styles.name}>{localName} (You)</span>
              <span className={styles.role}>
                {isLocalHost ? 'Meeting Host' : 'Participant'}
              </span>
            </div>
          </div>

          <div className={styles.indicators}>
            {isLocalScreenSharing && (
              <span className={styles.iconScreen} title="Sharing screen">
                <MonitorUp size={16} />
              </span>
            )}
            <span
              className={
                isLocalVideoOff ? styles.iconMuted : styles.iconActive
              }
              title={isLocalVideoOff ? 'Camera off' : 'Camera on'}
            >
              {isLocalVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
            </span>
            <span
              className={
                isLocalAudioMuted ? styles.iconMuted : styles.iconActive
              }
              title={isLocalAudioMuted ? 'Muted' : 'Unmuted'}
            >
              {isLocalAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </span>
          </div>
        </div>

        {/* Remote Participants */}
        {remoteParticipants.map((p) => (
          <div key={p.socketId} className={styles.item}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{getInitials(p.name)}</div>
              <div className={styles.nameBlock}>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.role}>
                  {p.isHost ? 'Meeting Host' : 'Participant'}
                </span>
              </div>
            </div>

            <div className={styles.indicators}>
              {p.mediaState.isScreenSharing && (
                <span className={styles.iconScreen} title="Sharing screen">
                  <MonitorUp size={16} />
                </span>
              )}
              <span
                className={
                  p.mediaState.isVideoOff
                    ? styles.iconMuted
                    : styles.iconActive
                }
                title={p.mediaState.isVideoOff ? 'Camera off' : 'Camera on'}
              >
                {p.mediaState.isVideoOff ? (
                  <VideoOff size={16} />
                ) : (
                  <Video size={16} />
                )}
              </span>
              <span
                className={
                  p.mediaState.isAudioMuted
                    ? styles.iconMuted
                    : styles.iconActive
                }
                title={p.mediaState.isAudioMuted ? 'Muted' : 'Unmuted'}
              >
                {p.mediaState.isAudioMuted ? (
                  <MicOff size={16} />
                ) : (
                  <Mic size={16} />
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

