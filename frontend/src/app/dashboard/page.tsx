'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Plus,
  LogIn,
  Copy,
  Check,
  ArrowRight,
  Clock,
  AlertCircle,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { meetingService, extractMeetingCode } from '@/services/meetingService';
import { Meeting } from '@/lib/types';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [meetingTitle, setMeetingTitle] = useState('');
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinInput, setJoinInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadRecentMeetings = useCallback(async () => {
    try {
      const list = await meetingService.getMyMeetings();
      setRecentMeetings(list);
    } catch {
      // Ignore background list errors
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated) {
      loadRecentMeetings();
    }
  }, [authLoading, isAuthenticated, router, loadRecentMeetings]);

  const handleCreateMeeting = async (enterImmediately: boolean) => {
    setCreateError(null);
    setIsCreating(true);
    try {
      const meeting = await meetingService.createMeeting(
        meetingTitle.trim() || undefined
      );
      setCreatedMeeting(meeting);
      setMeetingTitle('');
      await loadRecentMeetings();

      if (enterImmediately) {
        router.push(`/meeting/${meeting.meetingId}`);
      }
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create meeting room.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const code = extractMeetingCode(joinInput);
    if (!code) {
      setJoinError('Please enter a valid meeting ID or invitation link.');
      return;
    }

    setIsJoining(true);
    try {
      const verified = await meetingService.joinMeeting(code);
      router.push(`/meeting/${verified.meetingId}`);
    } catch (err: unknown) {
      setJoinError(
        err instanceof Error
          ? err.message
          : 'Unable to join meeting. Please check the meeting ID.'
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyInvite = async (meetingId: string) => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/meeting/${meetingId}`
        : meetingId;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(meetingId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedId(meetingId);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    try {
      await meetingService.endMeeting(meetingId);
      if (createdMeeting?.meetingId === meetingId) {
        setCreatedMeeting(null);
      }
      await loadRecentMeetings();
    } catch {
      // Ignore error
    }
  };

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className={styles.loadingScreen}>
        Verifying your authentication session...
      </div>
    );
  }

  const getInviteUrl = (meetingId: string) =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/meeting/${meetingId}`
      : `/meeting/${meetingId}`;

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* Welcome Banner */}
        <section className={styles.welcomeBanner}>
          <div className={styles.welcomeInfo}>
            <h1 className={styles.greeting}>Welcome back, {user.name}</h1>
            <div className={styles.userMeta}>
              <span>Ready for your next high-definition session</span>
              <span className={styles.emailBadge}>{user.email}</span>
            </div>
          </div>
        </section>

        {/* Main Actions: Create Meeting & Join Meeting */}
        <section className={styles.actionGrid}>
          {/* Create Meeting Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconPrimary}>
                <Video size={22} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Create a New Meeting</h2>
                <p className={styles.cardSubtitle}>
                  Generate a secure meeting room with a unique invitation link
                  and start collaborating immediately.
                </p>
              </div>
            </div>

            {createError && (
              <div className={styles.errorBox} role="alert">
                <AlertCircle size={16} />
                <span>{createError}</span>
              </div>
            )}

            <div className={styles.formGroup}>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Optional meeting title (e.g., Sprint Planning)"
                className={styles.input}
                maxLength={80}
              />

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => handleCreateMeeting(true)}
                  className={styles.primaryBtn}
                >
                  <Video size={18} />
                  <span>
                    {isCreating ? 'Creating...' : 'Start Instant Meeting'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => handleCreateMeeting(false)}
                  className={styles.secondaryBtn}
                >
                  <Plus size={18} />
                  <span>Generate Link First</span>
                </button>
              </div>
            </div>

            {createdMeeting && (
              <div className={styles.createdMeetingBox}>
                <div className={styles.createdHeader}>
                  <span className={styles.createdTitle}>
                    {createdMeeting.title}
                  </span>
                  <span className={styles.meetingIdPill}>
                    ID: {createdMeeting.meetingId}
                  </span>
                </div>

                <div className={styles.inviteRow}>
                  <span className={styles.inviteUrl}>
                    {getInviteUrl(createdMeeting.meetingId)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(createdMeeting.meetingId)}
                    className={styles.copySmallBtn}
                  >
                    {copiedId === createdMeeting.meetingId ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(`/meeting/${createdMeeting.meetingId}`)
                  }
                  className={styles.primaryBtn}
                >
                  <span>Enter Meeting Room Now</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </div>

          {/* Join Meeting Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconSecondary}>
                <LogIn size={22} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Join a Meeting</h2>
                <p className={styles.cardSubtitle}>
                  Enter a meeting ID (such as xxxx-xxxx-xxxx) or paste a full
                  invitation link shared by the host.
                </p>
              </div>
            </div>

            {joinError && (
              <div className={styles.errorBox} role="alert">
                <AlertCircle size={16} />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinMeeting} className={styles.formGroup}>
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Enter meeting ID (e.g. k9m4-p7x2-v3n8) or link"
                className={styles.input}
                aria-label="Meeting ID or invitation link"
              />

              <button
                type="submit"
                disabled={isJoining || !joinInput.trim()}
                className={styles.primaryBtn}
              >
                <span>{isJoining ? 'Validating Room...' : 'Join Meeting'}</span>
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </section>

        {/* Recent Meetings Section */}
        <section className={styles.recentSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Recent Meetings</h2>
          </div>

          {recentMeetings.length === 0 ? (
            <div className={styles.emptyState}>
              No meetings created yet. Click &ldquo;Start Instant Meeting&rdquo;
              above to launch your first room.
            </div>
          ) : (
            <div className={styles.meetingsList}>
              {recentMeetings.map((meeting) => (
                <div key={meeting.id} className={styles.meetingItem}>
                  <div className={styles.meetingItemLeft}>
                    <div className={styles.meetingItemTitleRow}>
                      <span className={styles.meetingItemTitle}>
                        {meeting.title}
                      </span>
                      <span
                        className={
                          meeting.status === 'ACTIVE'
                            ? styles.statusActive
                            : styles.statusEnded
                        }
                      >
                        {meeting.status}
                      </span>
                    </div>

                    <div className={styles.meetingItemMeta}>
                      <span className={styles.monoCode}>
                        ID: {meeting.meetingId}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} />
                        {new Date(meeting.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className={styles.meetingItemActions}>
                    {meeting.status === 'ACTIVE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyInvite(meeting.meetingId)}
                          className={styles.copySmallBtn}
                        >
                          {copiedId === meeting.meetingId ? (
                            <>
                              <Check size={14} />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/meeting/${meeting.meetingId}`)
                          }
                          className={styles.copySmallBtn}
                          style={{
                            background: 'var(--accent-primary)',
                            borderColor: 'var(--accent-primary)',
                            color: '#fff',
                          }}
                        >
                          <ExternalLink size={14} />
                          <span>Join</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEndMeeting(meeting.meetingId)}
                          className={styles.copySmallBtn}
                          style={{ color: '#fca5a5' }}
                          title="End meeting room"
                        >
                          <XCircle size={14} />
                          <span>End</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

