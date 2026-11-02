import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'PulseMeet — Real-Time Video Conferencing & Screen Sharing',
  description:
    'Enterprise-grade real-time video calling, peer-to-peer WebRTC audio/video, and high-definition screen sharing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

