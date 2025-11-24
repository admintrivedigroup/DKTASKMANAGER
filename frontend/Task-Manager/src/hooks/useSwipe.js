import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for detecting swipe gestures on touch devices
 * @param {Object} options - Configuration options
 * @param {Function} options.onSwipeLeft - Callback for left swipe
 * @param {Function} options.onSwipeRight - Callback for right swipe
 * @param {Function} options.onSwipeUp - Callback for up swipe
 * @param {Function} options.onSwipeDown - Callback for down swipe
 * @param {number} options.minSwipeDistance - Minimum distance for swipe (default: 50px)
 * @param {HTMLElement} options.element - Element to attach listeners to (default: document)
 * 
 * @example
 * useSwipe({
 *   onSwipeRight: () => openSidebar(),
 *   onSwipeLeft: () => closeSidebar(),
 *   minSwipeDistance: 100
 * });
 */
const useSwipe = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minSwipeDistance = 50,
  element = null,
} = {}) => {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const elementRef = useRef(element);

  useEffect(() => {
    elementRef.current = element;
  }, [element]);

  const handleTouchStart = useCallback((event) => {
    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((event) => {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Ignore if touch was too slow (> 500ms)
    if (deltaTime > 500) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine if swipe is horizontal or vertical
    if (absX > absY) {
      // Horizontal swipe
      if (absX > minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe right
          onSwipeRight?.();
        } else {
          // Swipe left
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (absY > minSwipeDistance) {
        if (deltaY > 0) {
          // Swipe down
          onSwipeDown?.();
        } else {
          // Swipe up
          onSwipeUp?.();
        }
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, minSwipeDistance]);

  useEffect(() => {
    const target = elementRef.current || document;

    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return null;
};

export default useSwipe;
