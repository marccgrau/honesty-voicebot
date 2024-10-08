import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AI } from './action';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Health Insurance Experiment',
  description: 'Health Insurance Experiment, University of St. Gallen',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <AI>
        <body className={inter.className}>{children}</body>
      </AI>
    </html>
  );
}
