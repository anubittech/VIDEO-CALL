'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User as UserIcon,
  Mail,
  Lock,
  UserPlus,
  AlertCircle,
  Video,
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/styles/auth.module.css';

function SignupFormContent() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (name.trim().length < 2) {
      setError('Full name must be at least 2 characters long.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.'
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
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>
          Start hosting HD video meetings and screen-sharing sessions
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
          <label htmlFor="signup-name" className={styles.label}>
            Full Name
          </label>
          <div className={styles.inputWrapper}>
            <UserIcon size={17} className={styles.inputIcon} />
            <input
              id="signup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Chen"
              className={styles.input}
              autoComplete="name"
              required
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="signup-email" className={styles.label}>
            Email Address
          </label>
          <div className={styles.inputWrapper}>
            <Mail size={17} className={styles.inputIcon} />
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className={styles.input}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="signup-password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputWrapper}>
            <Lock size={17} className={styles.inputIcon} />
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className={styles.input}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="signup-confirm-password" className={styles.label}>
            Confirm Password
          </label>
          <div className={styles.inputWrapper}>
            <Lock size={17} className={styles.inputIcon} />
            <input
              id="signup-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={styles.input}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={styles.submitBtn}
        >
          <UserPlus size={18} />
          <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
        </button>
      </form>

      <p className={styles.footerText}>
        Already have an account?
        <Link
          href={
            redirectPath !== '/dashboard'
              ? `/login?redirect=${encodeURIComponent(redirectPath)}`
              : '/login'
          }
          className={styles.footerLink}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className={styles.authPage}>
      <Navbar />
      <main className={styles.authContainer}>
        <Suspense fallback={<div className={styles.authCard}>Loading...</div>}>
          <SignupFormContent />
        </Suspense>
      </main>
    </div>
  );
}

