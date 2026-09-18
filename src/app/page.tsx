'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return <div className="flex h-screen items-center justify-center bg-background"><p className="uppercase tracking-widest animate-pulse text-primary">Loading...</p></div>;
}
