import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to callback functions
 * @param {boolean} enabled - Whether shortcuts are enabled
 * 
 * @example
 * useKeyboardShortcuts({
 *   'cmd+k': () => openCommandPalette(),
 *   'cmd+b': () => toggleSidebar(),
 *   '?': () => showShortcutsPanel(),
 * });
 */
const useKeyboardShortcuts = (shortcuts = {}, enabled = true) => {
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Exception: allow '?' shortcut even in inputs if it's the first character
      if (event.key !== '?') {
        return;
      }
    }

    // Build key combination string
    const keys = [];
    if (event.ctrlKey || event.metaKey) keys.push('cmd');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    
    // Normalize key
    let key = event.key.toLowerCase();
    if (key === 'control' || key === 'meta' || key === 'alt' || key === 'shift') {
      return; // Ignore modifier keys alone
    }
    
    keys.push(key);
    const combination = keys.join('+');

    // Check if this combination has a handler
    const handler = shortcutsRef.current[combination];
    if (handler && typeof handler === 'function') {
      event.preventDefault();
      event.stopPropagation();
      handler(event);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return null;
};

export default useKeyboardShortcuts;
