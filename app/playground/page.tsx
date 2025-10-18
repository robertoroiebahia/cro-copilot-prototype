'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlaygroundPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to the first tool (scraper)
    router.push('/playground/tools/scraper');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading playground...</p>
      </div>
    </div>
  );
}
