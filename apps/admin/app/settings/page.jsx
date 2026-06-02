"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/users');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-gray-500 text-sm animate-pulse">Loading System Settings...</div>
    </div>
  );
}
