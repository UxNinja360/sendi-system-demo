import { useEffect } from 'react';

export const useLiveManagerEffects = () => {
  useEffect(() => {
    document.title = 'LIVE | Sendi Cockpit';
    return () => {
      document.title = 'Sendi Cockpit';
    };
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalHeight = document.body.style.height;
    const originalTouchAction = document.body.style.touchAction;
    const htmlOriginalOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.height = '100%';
    document.body.style.width = '100%';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.height = originalHeight;
      document.body.style.touchAction = originalTouchAction;
      document.documentElement.style.overflow = htmlOriginalOverflow;
    };
  }, []);
};
