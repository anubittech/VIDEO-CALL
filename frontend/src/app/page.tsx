'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  MonitorUp,
  ShieldCheck,
  ArrowRight,
  Users,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { extractMeetingCode } from '@/services/meetingService';
import styles from './page.module.css';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = extractMeetingCode(joinCode);
    if (!cleaned) return;
    if (isAuthenticated) {
      router.push(`/meeting/${cleaned}`);
    } else {
      router.push(`/login?redirect=${encodeURIComponent(`/meeting/${cleaned}`)}`);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.pillBadge}>
              <span className={styles.pillDot} />
              <span>Peer-to-Peer WebRTC • Zero-Latency Screen Share</span>
            </div>

            <h1 className={styles.headline}>
              Crystal-clear video meetings built for{' '}
              <span className={styles.gradientText}>modern engineering teams.</span>
            </h1>

            <p className={styles.subtitle}>
              Create secure meeting rooms in one click, collaborate over
              real-time WebRTC audio and HD video, and share your screen
              seamlessly directly from your browser.
            </p>

            <div className={styles.ctaGroup}>
              {isAuthenticated ? (
                <Link href="/dashboard" className={styles.primaryCta}>
                  <Sparkles size={18} />
                  <span>Go to Meeting Dashboard</span>
                  <ArrowRight size={17} />
                </Link>
              ) : (
                <>
                  <Link href="/signup" className={styles.primaryCta}>
                    <span>Get Started Free</span>
                    <ArrowRight size={17} />
                  </Link>
                  <Link href="/login" className={styles.secondaryCta}>
                    <span>Sign In to Account</span>
                  </Link>
                </>
              )}
            </div>

            <form onSubmit={handleQuickJoin} className={styles.quickJoinBar}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter meeting ID (e.g. abcd-efgh-ijkl) or invite link"
                className={styles.quickJoinInput}
                aria-label="Meeting ID or invite link"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className={styles.quickJoinBtn}
              >
                Join Room
              </button>
            </form>
          </div>

          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <div className={styles.windowDots}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
              <span className={styles.previewRoomCode}>
                pulsemeet.live/meeting/k9m4-p7x2-v3n8
              </span>
            </div>

            <div className={styles.previewGrid}>
              <div className={styles.mockTile}>
                <div className={styles.mockAvatar}>AC</div>
                <span className={styles.mockLabel}>Alex Chen (Host)</span>
              </div>
              <div className={styles.mockTile}>
                <div
                  className={styles.mockAvatar}
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
                >
                  SR
                </div>
                <span className={styles.mockLabel}>Sarah Rivera • Screen</span>
              </div>
              <div className={styles.mockTile}>
                <div
                  className={styles.mockAvatar}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  MK
                </div>
                <span className={styles.mockLabel}>Marcus Kim</span>
              </div>
              <div className={styles.mockTile}>
                <div
                  className={styles.mockAvatar}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  EP
                </div>
                <span className={styles.mockLabel}>Elena Patel</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Video size={22} />
            </div>
            <h3 className={styles.featureTitle}>Real-Time WebRTC Mesh</h3>
            <p className={styles.featureDesc}>
              Direct peer-to-peer encrypted audio and video streams negotiated
              with Socket.IO signaling and automatic ICE candidate exchange.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <MonitorUp size={22} />
            </div>
            <h3 className={styles.featureTitle}>Native Screen Sharing</h3>
            <p className={styles.featureDesc}>
              Share an entire monitor, application window, or browser tab with
              instant track replacement and automatic camera restoration.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <ShieldCheck size={22} />
            </div>
            <h3 className={styles.featureTitle}>Authenticated Rooms</h3>
            <p className={styles.featureDesc}>
              Backed by Neon PostgreSQL, Prisma ORM, bcrypt password hashing,
              and HTTP-only JWT authentication with cryptographically random IDs.
            </p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        PulseMeet — Real-Time Video Conferencing & Screen Sharing Platform
      </footer>
    </div>
  );
}

