import { useEffect, useRef } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="hidden"]), textarea, select, [contenteditable="true"]';
const KEYBOARD_VISUAL_VIEWPORT_THRESHOLD = 80;
const KEYBOARD_SYNC_DELAYS = [50, 140, 280, 420];
const FOCUSED_FIELD_MARGIN = 16;
const SCROLL_VIEWPORT_SELECTOR = '.login-main';

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

export const isEditableTarget = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement && target.matches(EDITABLE_SELECTOR);

export const getActiveEditableInside = (root: HTMLElement | null) => {
  const activeElement = document.activeElement;

  return root?.contains(activeElement) && isEditableTarget(activeElement)
    ? activeElement
    : null;
};

export const blurActiveEditableInside = (root: HTMLElement | null) => {
  getActiveEditableInside(root)?.blur();
};

export const hasActiveEditableInside = (root: HTMLElement | null) =>
  getActiveEditableInside(root) !== null;

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

    let focusedElement: HTMLElement | null = getActiveEditableInside(root);
    let layoutViewportHeight = Math.round(root.getBoundingClientRect().height || window.innerHeight);
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
      root.style.removeProperty('--pwa-keyboard-inset');
      root.style.removeProperty('--pwa-visual-height');
    };

    const keepFocusedElementVisible = () => {
      if (!focusedElement) return;

      const scrollViewport = root.querySelector<HTMLElement>(SCROLL_VIEWPORT_SELECTOR) ?? root;
      const headerBottom = root.querySelector<HTMLElement>('header')?.getBoundingClientRect().bottom ?? 0;
      const rect = focusedElement.getBoundingClientRect();
      const form = focusedElement.closest('form');
      const submitControl = form?.querySelector<HTMLElement>('button[type="submit"], input[type="submit"]');
      const submitRect =
        submitControl && root.contains(submitControl) ? submitControl.getBoundingClientRect() : null;
      const targetTop = submitRect ? Math.min(rect.top, submitRect.top) : rect.top;
      const targetBottom = submitRect ? Math.max(rect.bottom, submitRect.bottom) : rect.bottom;
      const visibleTop = Math.max(visualViewport.offsetTop, headerBottom) + FOCUSED_FIELD_MARGIN;
      const visibleBottom = visualViewport.offsetTop + visualViewport.height - FOCUSED_FIELD_MARGIN;
      const scrollDelta =
        targetBottom > visibleBottom
          ? targetBottom - visibleBottom
          : targetTop < visibleTop
            ? targetTop - visibleTop
            : 0;

      if (Math.abs(scrollDelta) < 1) return;

      scrollViewport.scrollBy({
        top: scrollDelta,
        behavior: 'auto',
      });
    };

    const syncViewport = () => {
      if (!focusedElement || !root.contains(focusedElement)) {
        resetViewport();
        return;
      }

      const visualHeight = Math.round(visualViewport.height);
      const visualOffsetTop = Math.round(visualViewport.offsetTop);
      const currentLayoutHeight = Math.round(root.getBoundingClientRect().height || window.innerHeight);
      const keyboardInset = Math.max(0, layoutViewportHeight - visualHeight - visualOffsetTop);
      const isKeyboardOpen = keyboardInset > KEYBOARD_VISUAL_VIEWPORT_THRESHOLD;

      if (!isKeyboardOpen) {
        layoutViewportHeight = currentLayoutHeight;
      }

      root.style.setProperty('--pwa-visual-height', `${visualHeight}px`);
      root.style.setProperty('--pwa-keyboard-inset', isKeyboardOpen ? `${keyboardInset}px` : '0px');
      root.setAttribute('data-pwa-keyboard', isKeyboardOpen ? 'open' : 'focused');

      if (isKeyboardOpen) {
        keepFocusedElementVisible();
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
      layoutViewportHeight = Math.round(root.getBoundingClientRect().height || window.innerHeight);
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

    root.setAttribute('data-pwa-keyboard', focusedElement ? 'focused' : 'idle');
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
