import { useEffect, useRef } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="hidden"]), textarea, select, [contenteditable="true"]';
const KEYBOARD_OPEN_THRESHOLD = 80;
const SYNC_DELAYS = [40, 120, 260, 420];
const VISIBLE_MARGIN = 14;

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
    const timeoutIds = new Set<number>();

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
      root.removeAttribute('data-auth-keyboard');
      root.style.removeProperty('--auth-keyboard-inset');
      root.style.removeProperty('--auth-visual-height');
    };

    const getKeyboardInset = () => {
      const layoutHeight = Math.round(window.innerHeight || document.documentElement.clientHeight);
      const rootHeight = Math.round(root.getBoundingClientRect().height || layoutHeight);
      const visibleHeight = Math.round(visualViewport.height);
      const visibleOffsetTop = Math.round(visualViewport.offsetTop);

      return Math.max(0, Math.max(layoutHeight, rootHeight) - visibleHeight - visibleOffsetTop);
    };

    const keepActionVisible = () => {
      const activeElement = getActiveEditableInside(root);
      if (!activeElement) return;

      const form = activeElement.closest('form');
      const primaryAction =
        form?.querySelector<HTMLElement>('[data-auth-primary-action]') ??
        root.querySelector<HTMLElement>('[data-auth-primary-action]');
      const target = primaryAction ?? activeElement;
      const targetRect = target.getBoundingClientRect();
      const visibleTop = visualViewport.offsetTop + VISIBLE_MARGIN;
      const visibleBottom = visualViewport.offsetTop + visualViewport.height - VISIBLE_MARGIN;
      const scrollViewport = root.querySelector<HTMLElement>('.login-main') ?? root;

      if (targetRect.bottom > visibleBottom) {
        scrollViewport.scrollBy({
          top: targetRect.bottom - visibleBottom,
          behavior: 'auto',
        });
        return;
      }

      if (targetRect.top < visibleTop) {
        scrollViewport.scrollBy({
          top: targetRect.top - visibleTop,
          behavior: 'auto',
        });
      }
    };

    const sync = () => {
      const keyboardInset = getKeyboardInset();
      const keyboardIsOpen = keyboardInset > KEYBOARD_OPEN_THRESHOLD;

      root.style.setProperty('--auth-visual-height', `${Math.round(visualViewport.height)}px`);
      root.style.setProperty('--auth-keyboard-inset', keyboardIsOpen ? `${keyboardInset}px` : '0px');
      root.setAttribute('data-auth-keyboard', keyboardIsOpen ? 'open' : 'closed');

      if (keyboardIsOpen) {
        keepActionVisible();
      }
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

    root.addEventListener('focusin', handleFocusIn);
    root.addEventListener('focusout', handleFocusOut);
    visualViewport.addEventListener('resize', sync);
    visualViewport.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);

    if (getActiveEditableInside(root)) {
      queueSyncs();
    }

    return () => {
      root.removeEventListener('focusin', handleFocusIn);
      root.removeEventListener('focusout', handleFocusOut);
      visualViewport.removeEventListener('resize', sync);
      visualViewport.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      reset();
    };
  }, []);

  return rootRef;
};
