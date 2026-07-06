import { useEffect, useRef } from "react";

interface UseScrollPositionOptions {
  key: string;
  enabled?: boolean;
}

/**
 * Hook to persist and restore scroll position for a container
 * Saves scroll position to localStorage on unmount
 * Restores scroll position on mount
 */
export function useScrollPosition({ key, enabled = true }: UseScrollPositionOptions) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Restore scroll position on mount
    const savedPosition = localStorage.getItem(`scroll-position-${key}`);
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      containerRef.current.scrollTop = position;
    }

    return () => {
      // Save scroll position on unmount
      if (containerRef.current) {
        const position = containerRef.current.scrollTop;
        localStorage.setItem(`scroll-position-${key}`, position.toString());
      }
    };
  }, [key, enabled]);

  return containerRef;
}
