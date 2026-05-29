import { useEffect, useRef } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="hidden"]), textarea, select, [contenteditable="true"]';
const KEYBOARD_OPEN_THRESHOLD = 80;
const SYNC_DELAYS = [40, 120, 260, 420];
const VISIBLE_MARGIN = 20;

const isEditableElement = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement && target.matches(EDITABLE_SELECTOR);

const getActiveEditableInside = (root: HTMLElement) => {
  const activeElement = document.activeElement;

  return root.contains(activeElement) && isEditableElement(activeElement)
    ? activeElement
    : null;
};

export const useAuthKeyboardSafeArea = <TElement extends HTMLElement>() => {
  const rootRef = useRef<TElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const visualViewport = window.visualViewport;

    if (!root || !visualViewport) return undefined;

    let animationFrameId: number | null = null;
    let keyboardIsOpen = false;
    const timeoutIds = new Set<number>();

    const setStableLayoutHeight = () => {
      const height = Math.round(window.innerHeight || document.documentElement.clientHeight);
      root.style.setProperty('--auth-layout-height', `${height}px`);
    };

    const clearQueuedSyncs = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.clear();
    };

    const reset = () => {
      clearQueuedSyncs();
      keyboardIsOpen = false;
      root.removeAttribute('data-auth-keyboard');
      root.style.setProperty('--auth-panel-shift', '0px');
    };

    const getKeyboardInset = () => {
      const layoutHeight = Math.round(window.innerHeight || document.documentElement.clientHeight);
      const rootHeight = Math.round(root.getBoundingClientRect().height || layoutHeight);
      const visibleHeight = Math.round(visualViewport.height);
      const visibleOffsetTop = Math.round(visualViewport.offsetTop);

      return Math.max(0, Math.max(layoutHeight, rootHeight) - visibleHeight - visibleOffsetTop);
    };

    const getActionOverflow = () => {
      const activeElement = getActiveEditableInside(root);
      if (!activeElement) return 0;

      const form = activeElement.closest('form');
      const primaryAction =
        form?.querySelector<HTMLElement>('[data-auth-primary-action]') ??
        root.querySelector<HTMLElement>('[data-auth-primary-action]');
      const target = primaryAction ?? activeElement;
      const targetRect = target.getBoundingClientRect();
      const visibleBottom = visualViewport.offsetTop + visualViewport.height - VISIBLE_MARGIN;

      return Math.max(0, Math.ceil(targetRect.bottom - visibleBottom));
    };

    const sync = () => {
      const keyboardInset = getKeyboardInset();
      keyboardIsOpen = keyboardInset > KEYBOARD_OPEN_THRESHOLD;

      root.setAttribute('data-auth-keyboard', keyboardIsOpen ? 'open' : 'closed');

      if (keyboardIsOpen) {
        root.style.setProperty('--auth-panel-shift', `-${getActionOverflow()}px`);
        return;
      }

      root.style.setProperty('--auth-panel-shift', '0px');
    };

    const queueSyncs = () => {
      clearQueuedSyncs();
      sync();

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        sync();
      });

      SYNC_DELAYS.forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          timeoutIds.delete(timeoutId);
          sync();
        }, delay);

        timeoutIds.add(timeoutId);
      });
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableElement(event.target)) {
        queueSyncs();
      }
    };

    const handleFocusOut = () => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);

        if (getActiveEditableInside(root)) {
          queueSyncs();
          return;
        }

        reset();
      }, 80);

      timeoutIds.add(timeoutId);
    };

    const handleWindowResize = () => {
      if (!keyboardIsOpen && !getActiveEditableInside(root)) {
        setStableLayoutHeight();
      }

      sync();
    };

    setStableLayoutHeight();
    root.addEventListener('focusin', handleFocusIn);
    root.addEventListener('focusout', handleFocusOut);
    visualViewport.addEventListener('resize', sync);
    visualViewport.addEventListener('scroll', sync);
    window.addEventListener('resize', handleWindowResize);

    if (getActiveEditableInside(root)) {
      queueSyncs();
    }

    return () => {
      root.removeEventListener('focusin', handleFocusIn);
      root.removeEventListener('focusout', handleFocusOut);
      visualViewport.removeEventListener('resize', sync);
      visualViewport.removeEventListener('scroll', sync);
      window.removeEventListener('resize', handleWindowResize);
      root.style.removeProperty('--auth-layout-height');
      reset();
    };
  }, []);

  return rootRef;
};
