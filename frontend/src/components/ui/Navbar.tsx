'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.container}>
        <Link href={isAuthenticated ? '/dashboard' : '/'} className={styles.brand}>
          <div className={styles.logoIcon}>
            <Video size={20} />
          </div>
          <span>PulseMeet</span>
          <span className={styles.brandBadge}>WebRTC HD</span>
        </Link>

        <nav className={styles.navActions}>
          {isAuthenticated && user ? (
            <>
              <Link href="/dashboard" className={styles.ghostBtn}>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
              <div className={styles.userChip} title={user.email}>
                <div className={styles.avatar}>{getInitials(user.name)}</div>
                <span className={styles.userName}>{user.name}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutBtn}
                aria-label="Log out"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.ghostBtn}>
                Log In
              </Link>
              <Link href="/signup" className={styles.primaryBtn}>
                Sign Up Free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

