import type {Metadata} from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import {SessionProvider} from '@/components/portal/session-provider';

export const metadata: Metadata = {
  title: 'Employee Management & Smart ID Portal',
  description: 'Tawakal Enterprises employee management and smart ID portal',
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body><SessionProvider>{children}</SessionProvider></body>
    </html>
  );
}
