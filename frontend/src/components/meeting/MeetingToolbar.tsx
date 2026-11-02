'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import styles from './MeetingToolbar.module.css';

interface MeetingToolbarProps {
  meetingId: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  isParticipantsOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
  onLeaveMeeting: () => void;
}

export const MeetingToolbar: React.FC<MeetingToolbarProps> = ({
  meetingId,
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  participantCount,
  isParticipantsOpen,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleParticipants,
  onLeaveMeeting,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = async () => {
    const inviteUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/meeting/${meetingId}`
        : meetingId;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy method
      const input = document.createElement('input');
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <footer className={styles.toolbarWrapper}>
      <div className={styles.leftSection}>
        <div className={styles.meetingCodeBox}>
          <span className={styles.codeLabel}>{meetingId}</span>
          <button
            type="button"
            onClick={handleCopyInvite}
            className={`${styles.copyBtn} ${
              copied ? styles.copyBtnSuccess : ''
            }`}
            title="Copy meeting invitation link"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied Link' : 'Copy Invite'}</span>
          </button>
        </div>
      </div>

      <div className={styles.centerControls}>
        <button
          type="button"
          onClick={onToggleAudio}
          className={`${styles.controlBtn} ${
            isAudioMuted ? styles.controlBtnDanger : ''
          }`}
          aria-label={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
          <span className={styles.btnLabel}>
            {isAudioMuted ? 'Unmute' : 'Mute'}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleVideo}
          className={`${styles.controlBtn} ${
            isVideoOff ? styles.controlBtnDanger : ''
          }`}
          aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          <span className={styles.btnLabel}>
            {isVideoOff ? 'Start Video' : 'Stop Video'}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`${styles.controlBtn} ${
            isScreenSharing ? styles.controlBtnActive : ''
          }`}
          aria-label={
            isScreenSharing ? 'Stop screen sharing' : 'Share your screen'
          }
        >
          {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
          <span className={styles.btnLabel}>
            {isScreenSharing ? 'Stop Share' : 'Share Screen'}
          </span>
        </button>
      </div>

      <div className={styles.rightSection}>
        <button
          type="button"
          onClick={onToggleParticipants}
          className={`${styles.participantsBtn} ${
            isParticipantsOpen ? styles.participantsBtnOpen : ''
          }`}
          aria-label="Toggle participants list"
        >
          <Users size={18} />
          <span>Participants</span>
          <span className={styles.countBadge}>{participantCount}</span>
        </button>

        <button
          type="button"
          onClick={onLeaveMeeting}
          className={styles.leaveBtn}
          aria-label="Leave meeting"
        >
          <PhoneOff size={17} />
          <span>Leave</span>
        </button>
      </div>
    </footer>
  );
};

