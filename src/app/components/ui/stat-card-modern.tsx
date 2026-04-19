import React from 'react';
import CountUp from 'react-countup';

interface StatCardModernProps {
  value: string | number;
  unit?: string;
  label: string;
  indicator1?: {
    label: string;
    value: string | number;
  };
  indicator2?: {
    label: string;
    value: string | number;
  };
  onClick?: () => void;
  className?: string;
}

export const StatCardModern: React.FC<StatCardModernProps> = ({
  value,
  unit,
  label,
  indicator1,
  indicator2,
  onClick,
  className = '',
}) => {
  // פונקציה לחילוץ מספר מתוך ערך
  const extractNumber = (val: string | number): number | null => {
    if (typeof val === 'number') return val;
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

  // עבור indicators
  const renderValue = (val: string | number) => {
    const num = extractNumber(val);
    if (num !== null) {
      const { prefix: p, suffix: s } = extractPrefixSuffix(val);
      return (
        <>
          {p}
          <CountUp
            end={num}
            duration={1.5}
            separator=","
            decimals={num % 1 !== 0 ? 1 : 0}
            preserveValue={true}
            useEasing={true}
          />
          {s}
        </>
      );
    }
    return val;
  };

  return (
    <div
      className={`bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-4 ${
        onClick ? 'cursor-pointer hover:border-[#d4d4d4] dark:hover:border-[#404040] transition-all' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Top Container */}
      <div className="flex items-end justify-between w-full mb-1">
        {/* Numeric Content */}
        <div className="flex items-end gap-1.5">
          <p className="text-[36px] font-light leading-none text-[#1d2d3e] dark:text-[#fafafa]">
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
          {unit && (
            <div className="flex items-center justify-center pb-1.5">
              <p className="text-[14px] font-bold text-[#1d2d3e] dark:text-[#a3a3a3]">
                {unit}
              </p>
            </div>
          )}
        </div>

        {/* Indicators */}
        {(indicator1 || indicator2) && (
          <div className="flex gap-4 items-start">
            {indicator1 && (
              <div className="flex flex-col gap-0.5 items-end">
                <p className="text-[14px] text-[#556b82] dark:text-[#a3a3a3]">
                  {indicator1.label}
                </p>
                <p className="text-[14px] font-medium text-[#1d2d3e] dark:text-[#fafafa]">
                  {renderValue(indicator1.value)}
                </p>
              </div>
            )}
            {indicator2 && (
              <div className="flex flex-col gap-0.5 items-end">
                <p className="text-[14px] text-[#556b82] dark:text-[#a3a3a3]">
                  {indicator2.label}
                </p>
                <p className="text-[14px] font-medium text-[#1d2d3e] dark:text-[#fafafa]">
                  {renderValue(indicator2.value)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="w-full">
        <p className="text-[14px] text-[#556b82] dark:text-[#a3a3a3] truncate">
          {label}
        </p>
      </div>
    </div>
  );
};
