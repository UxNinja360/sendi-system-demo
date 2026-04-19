import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage, type Language } from '../../context/language.context';

interface LanguageSwitcherProps {
  variant?: 'button' | 'dropdown' | 'minimal';
  showLabel?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  showLabel = true,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'he', label: 'עברית', flag: '🇮🇱' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentLanguage = languages.find(lang => lang.code === language);

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              language === lang.code
                ? 'bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
            }`}
          >
            <span className="mr-1">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs font-medium text-[#0d0d12] dark:text-[#fafafa] hover:border-[#9fe870] hover:shadow-md transition-all"
      >
        <Globe className="w-4 h-4 text-[#9fe870]" />
        {showLabel && <span>{currentLanguage?.flag} {currentLanguage?.label}</span>}
      </button>
    );
  }

  // Default dropdown variant
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs font-medium text-[#0d0d12] dark:text-[#fafafa] hover:border-[#9fe870] hover:shadow-md transition-all"
      >
        <Globe className="w-4 h-4 text-[#9fe870]" />
        {showLabel && (
          <>
            <span>{currentLanguage?.flag}</span>
            <span>{currentLanguage?.label}</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-50 w-[180px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 space-y-1">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-3 ${
                  language === lang.code
                    ? 'bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                    : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="flex-1">{lang.label}</span>
                {language === lang.code && (
                  <Check className="w-4 h-4 text-[#9fe870]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
