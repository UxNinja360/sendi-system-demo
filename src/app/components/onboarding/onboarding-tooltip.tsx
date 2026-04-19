import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useOnboarding } from '../../context/onboarding.context';

interface Rect { top: number; left: number; width: number; height: number; }

export const OnboardingTooltip: React.FC = () => {
  const { step, stepIndex, totalSteps, skip } = useOnboarding();
  const navigate = useNavigate();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [confirmSkip, setConfirmSkip] = useState(false);

  // Re-trigger enter animation on step change and reset confirm
  useEffect(() => {
    setAnimKey(k => k + 1);
    setConfirmSkip(false);
  }, [stepIndex]);

  // Track target element position
  useEffect(() => {
    if (!step) { setTargetRect(null); return; }

    let frame = 0;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-onboarding="${step.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setTargetRect(null);
      }
      frame = requestAnimationFrame(measure);
    };

    frame = requestAnimationFrame(measure);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [step]);

  const stepAction = useMemo(() => {
    if (!step) return null;

    switch (step.id) {
      case 'nav-couriers':
        return { label: 'פתח את עמוד השליחים', action: () => navigate('/couriers') };
      case 'nav-restaurants':
        return { label: 'פתח את עמוד המסעדות', action: () => navigate('/restaurants') };
      case 'nav-live':
        return { label: 'פתח את מנג׳ר לייב', action: () => navigate('/live') };
      default:
        return null;
    }
  }, [navigate, step]);

  if (!step) return null;

  if (!targetRect) {
    return (
      <>
        <style>{`
          @keyframes onboarding-enter {
            0%   { opacity: 0; transform: translateY(6px) scale(0.97); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .onboarding-fallback {
            animation: onboarding-enter 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}</style>
        <div
          key={`fallback-${animKey}`}
          dir="rtl"
          className="onboarding-fallback fixed bottom-5 left-5 z-[9999] w-[300px] overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.22)] dark:border-[#2a2a2a] dark:bg-[#1c1c1c]"
        >
          <div className="px-5 py-5">
            <p className="mb-2 text-[15px] font-bold leading-snug text-[#0d0d12] dark:text-white">{step.title}</p>
            <p className="mb-4 text-[13px] leading-relaxed text-[#525252] dark:text-[#a3a3a3]">{step.body}</p>
            <p className="mb-4 text-[11px] text-[#a3a3a3]">
              לא מצאתי את הרכיב המתאים על המסך, אז אני משאיר את ההדרכה פתוחה כאן.
            </p>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[#a3a3a3]">שלב {stepIndex + 1} מתוך {totalSteps}</span>
              <div className="flex items-center gap-2">
                {stepAction && (
                  <button
                    onClick={stepAction.action}
                    className="rounded-lg bg-[#9fe870] px-3 py-1.5 text-[11px] font-semibold text-[#0d0d12] transition-colors hover:bg-[#8fd65f]"
                  >
                    {stepAction.label}
                  </button>
                )}
                <button
                  onClick={skip}
                  className="text-[11px] font-medium text-[#a3a3a3] transition-colors hover:text-[#525252] dark:hover:text-white"
                >
                  דלג
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const TOOLTIP_W = 230;
  const OFFSET = 16;

  let tipTop = 0;
  let tipLeft = 0;

  switch (step.placement) {
    case 'right':
      tipTop = targetRect.top + targetRect.height / 2;
      tipLeft = targetRect.left + targetRect.width + OFFSET;
      break;
    case 'left':
      tipTop = targetRect.top + targetRect.height / 2;
      tipLeft = targetRect.left - OFFSET - TOOLTIP_W;
      break;
    case 'top':
      tipTop = targetRect.top - OFFSET;
      tipLeft = targetRect.left + targetRect.width / 2 - TOOLTIP_W / 2;
      break;
    case 'bottom':
      tipTop = targetRect.top + targetRect.height + OFFSET;
      tipLeft = targetRect.left + targetRect.width / 2 - TOOLTIP_W / 2;
      break;
  }

  tipLeft = Math.max(12, Math.min(tipLeft, window.innerWidth - TOOLTIP_W - 12));
  const translateY = step.placement === 'left' || step.placement === 'right' ? '-50%' : (step.placement === 'top' ? '-100%' : '0');

  const ringStyle: React.CSSProperties = {
    position: 'fixed',
    top: targetRect.top - 5,
    left: targetRect.left - 5,
    width: targetRect.width + 10,
    height: targetRect.height + 10,
    border: '2px solid #22c55e',
    borderRadius: 12,
    pointerEvents: 'none',
    zIndex: 9998,
    transition: 'top 0.18s ease-out, left 0.18s ease-out, width 0.18s ease-out, height 0.18s ease-out',
    animation: 'onboarding-pulse 1.8s ease-out infinite',
  };

  const tipStyle: React.CSSProperties = {
    position: 'fixed',
    top: tipTop,
    left: tipLeft,
    width: TOOLTIP_W,
    transform: `translateY(${translateY})`,
    zIndex: 9999,
  };

  return (
    <>
      <style>{`
        @keyframes onboarding-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
          65%  { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes onboarding-enter {
          0%   { opacity: 0; transform: translateY(calc(var(--ty) + 6px)) scale(0.97); }
          100% { opacity: 1; transform: translateY(var(--ty)) scale(1); }
        }
        @keyframes wave-hand {
          0%   { transform: rotate(0deg); }
          15%  { transform: rotate(20deg); }
          30%  { transform: rotate(-10deg); }
          45%  { transform: rotate(18deg); }
          60%  { transform: rotate(-8deg); }
          75%  { transform: rotate(14deg); }
          100% { transform: rotate(0deg); }
        }
        .wave-hand {
          display: inline-block;
          transform-origin: 70% 80%;
          animation: wave-hand 1.4s ease-in-out 0.3s 2;
        }
        .onboarding-tooltip {
          --ty: ${translateY};
          animation: onboarding-enter 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>

      {/* Green ring around target */}
      <div style={ringStyle} />

      {/* Tooltip card */}
      <div
        key={animKey}
        dir="rtl"
        style={tipStyle}
        className="onboarding-tooltip bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.22)] border border-[#e5e5e5] dark:border-[#2a2a2a] overflow-hidden"
      >
        <div className="px-5 py-6">
          {!confirmSkip ? (
            <>
              {/* Header */}
              <p className="font-bold text-[15px] leading-snug text-[#0d0d12] dark:text-white mb-3">
                {step.title.replace('👋', '')}
                {step.title.includes('👋') && <span className="wave-hand">👋</span>}
              </p>

              {/* Body */}
              <p className="text-[13px] text-[#525252] dark:text-[#a3a3a3] leading-relaxed mb-6">{step.body}</p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#a3a3a3] font-medium">שלב {stepIndex + 1} מתוך {totalSteps}</span>
                <button
                  onClick={() => setConfirmSkip(true)}
                  className="text-[11px] font-medium text-[#a3a3a3] hover:text-[#525252] dark:hover:text-white transition-colors"
                >
                  דלג על ההדרכה
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-bold text-[15px] text-[#0d0d12] dark:text-white mb-2">לדלג על ההדרכה?</p>
              <p className="text-[13px] text-[#525252] dark:text-[#a3a3a3] leading-relaxed mb-5">
                לא תוצג שוב. תוכל תמיד לפנות לתמיכה אם תצטרך עזרה.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={skip}
                  className="flex-1 py-2 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white text-[12px] font-semibold transition-colors"
                >
                  כן, דלג
                </button>
                <button
                  onClick={() => setConfirmSkip(false)}
                  className="flex-1 py-2 rounded-lg bg-[#f5f5f5] dark:bg-[#2a2a2a] hover:bg-[#e5e5e5] dark:hover:bg-[#333] text-[#525252] dark:text-[#a3a3a3] text-[12px] font-semibold transition-colors"
                >
                  חזור
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
