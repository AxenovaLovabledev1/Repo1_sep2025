import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChatGPT-like Frontend',
  description: 'Interfaz de chat con streaming y efecto typewriter construida con Next.js 14 y Tailwind CSS.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-surface-dark text-slate-100`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
