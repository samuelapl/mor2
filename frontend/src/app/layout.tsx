import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Poppins, Inter } from 'next/font/google';
import AppProviders from '@/components/providers/AppProviders';
import { themeInitScript } from '@/lib/theme';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

// viewport-fit=cover lets fixed bars use env(safe-area-inset-*) around the iPhone home indicator.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'MoR E-Learning',
    template: '%s | MoR Learning Management System',
  },
  description: 'MoR Learning Management System',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

const desktopInitScript = `
  (function() {
    try {
      var isDesk = Boolean(
        (typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)) ||
        (typeof window !== 'undefined' && (window.electronAPI?.isDesktop || window.isElectron))
      );
      if (isDesk) {
        document.documentElement.setAttribute('data-is-desktop', 'true');
        document.documentElement.classList.add('is-electron');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `${themeInitScript}\n${desktopInitScript}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Ethiopic:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 transition-colors duration-200">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
