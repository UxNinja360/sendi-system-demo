import { useEffect, useRef } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="hidden"]), textarea, select, [contenteditable="true"]';
const KEYBOARD_VISUAL_VIEWPORT_THRESHOLD = 80;
const KEYBOARD_SYNC_DELAYS = [50, 140, 280, 420];

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

const isEditableTarget = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement && target.matches(EDITABLE_SELECTOR);

const isStandaloneTouchApp = () => {
  if (typeof window === 'undefined') return false;

  const standaloneNavigator = window.navigator as StandaloneNavigator;
  const isStandalone =
    standaloneNavigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  const isTouch =
    window.navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;

  return isStandalone && isTouch;
};

export const usePwaKeyboardViewport = <TElement extends HTMLElement>() => {
  const rootRef = useRef<TElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const visualViewport = window.visualViewport;

    if (!root || !visualViewport || !isStandaloneTouchApp()) return undefined;

    let focusedElement: HTMLElement | null = root.contains(document.activeElement)
      && isEditableTarget(document.activeElement)
      ? document.activeElement
      : null;
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

    const resetViewport = () => {
      clearQueuedSyncs();
      focusedElement = null;
      root.removeAttribute('data-pwa-keyboard');
      root.style.removeProperty('--login-visual-height');
    };

    const syncViewport = () => {
      if (!focusedElement || !root.contains(focusedElement)) {
        resetViewport();
        return;
      }

      const visualHeight = Math.round(visualViewport.height);
      const visualOffsetTop = Math.round(visualViewport.offsetTop);
      const keyboardInset = Math.max(0, window.innerHeight - visualHeight - visualOffsetTop);
      const isKeyboardOpen = keyboardInset > KEYBOARD_VISUAL_VIEWPORT_THRESHOLD;

      root.style.setProperty('--login-visual-height', `${visualHeight}px`);
      root.setAttribute('data-pwa-keyboard', isKeyboardOpen ? 'open' : 'pending');

      if (isKeyboardOpen) {
        focusedElement.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'auto',
        });
      }
    };

    const queueViewportSyncs = () => {
      clearQueuedSyncs();
      syncViewport();

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        syncViewport();
      });

      KEYBOARD_SYNC_DELAYS.forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          timeoutIds.delete(timeoutId);
          syncViewport();
        }, delay);

        timeoutIds.add(timeoutId);
      });
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableTarget(event.target)) return;

      focusedElement = event.target;
      queueViewportSyncs();
    };

    const handleFocusOut = () => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);

        if (root.contains(document.activeElement) && isEditableTarget(document.activeElement)) {
          focusedElement = document.activeElement;
          queueViewportSyncs();
          return;
        }

        resetViewport();
      }, 120);

      timeoutIds.add(timeoutId);
    };

    root.setAttribute('data-pwa-keyboard', focusedElement ? 'pending' : 'idle');
    if (focusedElement) queueViewportSyncs();

    root.addEventListener('focusin', handleFocusIn);
    root.addEventListener('focusout', handleFocusOut);
    window.addEventListener('resize', syncViewport);
    visualViewport.addEventListener('resize', syncViewport);
    visualViewport.addEventListener('scroll', syncViewport);

    return () => {
      root.removeEventListener('focusin', handleFocusIn);
      root.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', syncViewport);
      visualViewport.removeEventListener('resize', syncViewport);
      visualViewport.removeEventListener('scroll', syncViewport);
      resetViewport();
    };
  }, []);

  return rootRef;
};
