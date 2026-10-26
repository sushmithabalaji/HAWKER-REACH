import { useCallback, useState } from 'react';

// Retry for a section whose queries failed (#121). AppKit's request store keeps a request while anything uses
// it and drops it a tick after the last user unmounts, so remounting at once would reuse the failed request.
// Retry unmounts the section briefly, then mounts it again under a new key, which re-runs its queries.
export function useRetry(): { attempt: number; mounted: boolean; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [mounted, setMounted] = useState(true);
  const retry = useCallback(() => {
    setMounted(false);
    // Comfortably after the store's own setTimeout(0) teardown, and too short for anyone to notice.
    setTimeout(() => {
      setAttempt((n) => n + 1);
      setMounted(true);
    }, 50);
  }, []);
  return { attempt, mounted, retry };
}
