'use client';

import { useEffect, useState } from 'react';

/**
 * Renders children only after mount on the client.
 * Prevents `document`/`window` access during server-side rendering.
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}
