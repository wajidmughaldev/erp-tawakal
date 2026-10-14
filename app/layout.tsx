import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Employee Management & Smart ID Portal',
  description: 'Tawakkal Enterprises employee management and smart ID portal',
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
