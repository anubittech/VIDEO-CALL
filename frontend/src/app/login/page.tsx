'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle, Video } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/styles/auth.module.css';

function LoginFormContent() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [authLoading, isAuthenticated, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to log in. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authCard}>
      <div className={styles.header}>
        <div className={styles.iconBadge}>
          <Video size={22} />
        </div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>
          Sign in to your PulseMeet account to host or join meetings
        </p>
      </div>

      {error && (
        <div className={styles.errorAlert} role="alert">
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.fieldGroup}>
          <label htmlFor="login-email" className={styles.label}>
            Email Address
          </label>
          <div className={styles.inputWrapper}>
            <Mail size={17} className={styles.inputIcon} />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={styles.input}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="login-password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputWrapper}>
            <Lock size={17} className={styles.inputIcon} />
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={styles.input}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={styles.submitBtn}
        >
          <LogIn size={18} />
          <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
        </button>
      </form>

      <p className={styles.footerText}>
        Don&apos;t have an account?
        <Link
          href={
            redirectPath !== '/dashboard'
              ? `/signup?redirect=${encodeURIComponent(redirectPath)}`
              : '/signup'
          }
          className={styles.footerLink}
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.authPage}>
      <Navbar />
      <main className={styles.authContainer}>
        <Suspense fallback={<div className={styles.authCard}>Loading...</div>}>
          <LoginFormContent />
        </Suspense>
      </main>
    </div>
  );
}

