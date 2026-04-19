import React from 'react';
import CountUp from 'react-countup';

interface StatCardMonefyProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: number;
  isPositive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const StatCardMonefy: React.FC<StatCardMonefyProps> = ({
  title,
  value,
  subtitle,
  percentage,
  isPositive = true,
  onClick,
  className = '',
}) => {
  // פונקציה לחילוץ מספר מתוך ערך
  const extractNumber = (val: string | number): number | null => {
    if (typeof val === 'number') return val;
    // מנסים למצוא מספר בתוך מחרוזת (כולל עם ₪, פסיקים וכו')
    const match = val.replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  };

  // פונקציה לחילוץ prefix/suffix מהערך
  const extractPrefixSuffix = (val: string | number): { prefix: string; suffix: string } => {
    if (typeof val === 'number') return { prefix: '', suffix: '' };
    const numMatch = val.match(/(.*?)([\d.,]+)(.*)/);
    if (!numMatch) return { prefix: '', suffix: '' };
    return { prefix: numMatch[1], suffix: numMatch[3] };
  };

  const numericValue = extractNumber(value);
  const { prefix, suffix } = extractPrefixSuffix(value);
  const hasAnimation = numericValue !== null;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-[#1a1a1a] 
        rounded-[12px] 
        shadow-[0px_0px_0px_1px_#e5e5e5] dark:shadow-[0px_0px_0px_1px_#262626]
        p-4
        ${onClick ? 'cursor-pointer hover:shadow-[0px_4px_12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0px_4px_12px_rgba(255,255,255,0.05)]' : ''}
        transition-all duration-200
        ${className}
      `}
    >
      <div className="flex flex-col gap-2">
        {/* כותרת */}
        <div className="flex items-center justify-between">
          <p className="font-['Inter_Tight',sans-serif] font-semibold text-[14px] text-[#0a0a0a] dark:text-[#fafafa] tracking-[0.28px]">
            {title}
          </p>
        </div>

        {/* ערך + אחוז */}
        <div className="flex items-center gap-2">
          <p className="font-['Inter_Tight',sans-serif] font-semibold text-[24px] text-[#0a0a0a] dark:text-[#fafafa] leading-[1.3] tracking-[-0.48px]">
            {hasAnimation ? (
              <>
                {prefix}
                <CountUp
                  end={numericValue}
                  duration={1.5}
                  separator=","
                  decimals={numericValue % 1 !== 0 ? 1 : 0}
                  preserveValue={true}
                  useEasing={true}
                />
                {suffix}
              </>
            ) : (
              value
            )}
          </p>
          
          {percentage !== undefined && (
            <div
              className={`
                px-1 py-0.5 rounded-[6px] h-[24px] flex items-center justify-center
                ${isPositive
                  ? 'bg-[#effefa] dark:bg-[#1a3d35] border border-[rgba(64,196,170,0.2)] dark:border-[rgba(64,196,170,0.3)]'
                  : 'bg-[#feeff2] dark:bg-[#3d1a22] border border-[rgba(223,28,65,0.1)] dark:border-[rgba(223,28,65,0.3)]'
                }
              `}
            >
              <p
                className={`
                  font-['Inter_Tight',sans-serif] font-semibold text-[12px] leading-[1.5] tracking-[0.24px]
                  ${isPositive
                    ? 'text-[#287f6e] dark:text-[#40c4aa]'
                    : 'text-[#95122b] dark:text-[#df1c41]'
                  }
                `}
              >
                {isPositive ? '+' : ''}{percentage}%
              </p>
            </div>
          )}
        </div>

        {/* כיתוב משני */}
        {subtitle && (
          <p className="font-['Inter_Tight',sans-serif] font-medium text-[12px] text-[#737373] dark:text-[#a3a3a3] tracking-[0.24px]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
