import type { Metadata } from 'next';
import './globals.css';
import { FilmGrain } from '@/components/ui/FilmGrain';

export const metadata: Metadata = {
  title: 'Polter',
  description:
    'A small pixel ghost that floats on your desktop. It watches how you work — never what you type — and occasionally tells you something true about yourself.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title:       'Polter',
    description: 'A pixel ghost that watches how you work and tells you what it sees.',
    url:         'https://github.com/hyowonbernabe/Polter',
    siteName:    'Polter',
    type:        'website',
  },
  twitter: {
    card:  'summary',
    title: 'Polter',
    description: 'A pixel ghost that watches how you work and tells you what it sees.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <FilmGrain />
      </body>
    </html>
  );
}
