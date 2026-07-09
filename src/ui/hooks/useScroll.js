// ── useScroll Hook ────────────────────────────────────────────────────────
// Manages scrollable content state for the chat pane.
// Tracks scroll position, auto-scroll behavior, and exposes navigation
// functions for keyboard-driven scrolling.

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for managing scrollable content in a viewport.
 *
 * @param {number} totalItems     - Total number of items/lines in the content.
 * @param {number} viewportHeight - Number of visible lines in the viewport.
 * @returns {object} Scroll state and navigation functions.
 */
export function useScroll(totalItems, viewportHeight) {
  // scrollOffset = number of lines scrolled UP from the bottom.
  // 0 means we're at the very bottom (newest content visible).
  const [scrollOffset, setScrollOffset] = useState(0);

  // isAutoScroll = true when the viewport should follow new content.
  // Set to false when the user manually scrolls up; re-enabled on scrollToBottom.
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // Track previous totalItems to detect new content arriving
  const prevTotalItems = useRef(totalItems);

  // ── Auto-scroll on new content ────────────────────────────────────────
  // When new items arrive and auto-scroll is active, snap to bottom.
  useEffect(() => {
    if (totalItems > prevTotalItems.current && isAutoScroll) {
      setScrollOffset(0);
    }
    prevTotalItems.current = totalItems;
  }, [totalItems, isAutoScroll]);

  // ── Maximum scrollable offset ─────────────────────────────────────────
  // Prevents scrolling past the start of content.
  const maxOffset = Math.max(0, totalItems - viewportHeight);

  // ── Scroll Up ─────────────────────────────────────────────────────────
  // Moves viewport upward (toward older content).
  const scrollUp = useCallback(
    (amount = 1) => {
      setScrollOffset((prev) => {
        const next = Math.min(prev + amount, maxOffset);
        return next;
      });
      setIsAutoScroll(false);
    },
    [maxOffset]
  );

  // ── Scroll Down ───────────────────────────────────────────────────────
  // Moves viewport downward (toward newer content).
  const scrollDown = useCallback(
    (amount = 1) => {
      setScrollOffset((prev) => {
        const next = Math.max(0, prev - amount);
        // Re-enable auto-scroll if we've reached the bottom
        if (next === 0) {
          setIsAutoScroll(true);
        }
        return next;
      });
    },
    []
  );

  // ── Scroll to Top ─────────────────────────────────────────────────────
  // Jump to the very beginning of content.
  const scrollToTop = useCallback(() => {
    setScrollOffset(maxOffset);
    setIsAutoScroll(false);
  }, [maxOffset]);

  // ── Scroll to Bottom ──────────────────────────────────────────────────
  // Jump to the very end (newest content) and re-enable auto-scroll.
  const scrollToBottom = useCallback(() => {
    setScrollOffset(0);
    setIsAutoScroll(true);
  }, []);

  // ── Page Up ───────────────────────────────────────────────────────────
  // Scroll up by one full viewport height.
  const pageUp = useCallback(() => {
    scrollUp(Math.max(1, viewportHeight - 1));
  }, [scrollUp, viewportHeight]);

  // ── Page Down ─────────────────────────────────────────────────────────
  // Scroll down by one full viewport height.
  const pageDown = useCallback(() => {
    scrollDown(Math.max(1, viewportHeight - 1));
  }, [scrollDown, viewportHeight]);

  // ── Get Visible Range ─────────────────────────────────────────────────
  // Returns { start, end } indices (inclusive) of items visible in the
  // current viewport. Accounts for scrollOffset from bottom.
  const getVisibleRange = useCallback(() => {
    if (totalItems === 0) {
      return { start: 0, end: 0 };
    }

    const end = Math.max(0, totalItems - 1 - scrollOffset);
    const start = Math.max(0, end - viewportHeight + 1);

    return { start, end };
  }, [totalItems, viewportHeight, scrollOffset]);

  return {
    scrollOffset,
    isAutoScroll,
    scrollUp,
    scrollDown,
    scrollToTop,
    scrollToBottom,
    pageUp,
    pageDown,
    getVisibleRange,
  };
}
