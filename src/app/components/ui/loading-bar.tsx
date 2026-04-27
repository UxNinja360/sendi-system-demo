import React, { useEffect, useState } from 'react';

interface LoadingBarProps {
  isLoading: boolean;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setProgress(0);
      setOpacity(1);
      
      // אנימציה חלקה מ-0 ל-100 ב-500ms
      const startTime = Date.now();
      const duration = 500;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        
        setProgress(newProgress);
        
        if (newProgress < 100) {
          requestAnimationFrame(animate);
        } else {
          // כשהגענו ל-100%, fade out ב-300ms
          setOpacity(0);
          setTimeout(() => {
            setVisible(false);
            setProgress(0);
          }, 300);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 flex h-1 justify-end bg-transparent pointer-events-none" style={{ zIndex: 99999 }}>
      <div
        className="h-full bg-gradient-to-l from-[#9fe870] via-[#7ec95a] to-[#9fe870] shadow-lg shadow-[#9fe870]/50 transition-opacity duration-300"
        style={{
          width: `${progress}%`,
          opacity: opacity,
        }}
      />
    </div>
  );
};
