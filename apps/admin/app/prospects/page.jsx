"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProspectsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/prospects/sourcing');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-gray-500 text-sm animate-pulse">Loading Sourcing Dashboard...</div>
    </div>
  );
}
