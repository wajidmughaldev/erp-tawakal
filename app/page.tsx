'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

// The site is a static export, so the home page redirects in the browser (the server also redirects "/" to "/login").
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {router.replace('/login');}, [router]);
  return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading…</main>;
}
