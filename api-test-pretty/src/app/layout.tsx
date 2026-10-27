import type { Metadata } from 'next';
import { Sarabun, IBM_Plex_Mono } from 'next/font/google';
import { SessionProvider } from '../lib/session-store';
import './globals.css';

const sarabun = Sarabun({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sarabun',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'KU Marketplace — Console',
  description: 'ทดสอบ backend API ทั้งระบบเป็นขั้นเป็นตอน',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} ${plexMono.variable}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
