import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'green' | 'blue' | 'purple' | 'orange' | 'pink' | 'red';
export type SeasonalMode = 'none' | 'hanukkah' | 'purim' | 'passover' | 'independence' | 'summer' | 'winter';

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  seasonalMode: SeasonalMode;
  setSeasonalMode: (mode: SeasonalMode) => void;
  isDark: boolean;
  toggleDark: () => void;
  autoThemeEnabled: boolean;
  setAutoThemeEnabled: (enabled: boolean) => void;
  getThemeClasses: () => {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    gradient: string;
    border: string;
    bg: string;
    text: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const themeColors: Record<ThemeColor, {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  gradient: string;
  border: string;
  bg: string;
  text: string;
}> = {
  green: {
    primary: '#16a34a',
    primaryLight: '#22c55e',
    primaryDark: '#15803d',
    gradient: 'from-green-500 to-emerald-500',
    border: 'border-green-500/20',
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
  },
  blue: {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    primaryDark: '#1d4ed8',
    gradient: 'from-blue-500 to-cyan-500',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    primary: '#9333ea',
    primaryLight: '#a855f7',
    primaryDark: '#7e22ce',
    gradient: 'from-purple-500 to-pink-500',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    primary: '#ea580c',
    primaryLight: '#f97316',
    primaryDark: '#c2410c',
    gradient: 'from-orange-500 to-amber-500',
    border: 'border-orange-500/20',
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
  },
  pink: {
    primary: '#db2777',
    primaryLight: '#ec4899',
    primaryDark: '#be185d',
    gradient: 'from-pink-500 to-rose-500',
    border: 'border-pink-500/20',
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
  },
  red: {
    primary: '#dc2626',
    primaryLight: '#ef4444',
    primaryDark: '#b91c1c',
    gradient: 'from-red-500 to-orange-500',
    border: 'border-red-500/20',
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
  },
};

const seasonalThemes: Record<SeasonalMode, {
  name: string;
  emoji: string;
  colors: string[];
  effects?: string;
}> = {
  none: {
    name: 'רגיל',
    emoji: '🎨',
    colors: [],
  },
  hanukkah: {
    name: 'חנוכה',
    emoji: '🕎',
    colors: ['#2563eb', '#ffffff', '#fbbf24'],
    effects: 'sparkle',
  },
  purim: {
    name: 'פורים',
    emoji: '🎭',
    colors: ['#a855f7', '#ec4899', '#f59e0b'],
    effects: 'confetti',
  },
  passover: {
    name: 'פסח',
    emoji: '🍷',
    colors: ['#dc2626', '#fbbf24', '#16a34a'],
    effects: 'subtle',
  },
  independence: {
    name: 'יום העצמאות',
    emoji: '🇮🇱',
    colors: ['#2563eb', '#ffffff'],
    effects: 'fireworks',
  },
  summer: {
    name: 'קיץ',
    emoji: '☀️',
    colors: ['#f59e0b', '#f97316', '#fbbf24'],
    effects: 'sunny',
  },
  winter: {
    name: 'חורף',
    emoji: '❄️',
    colors: ['#06b6d4', '#3b82f6', '#8b5cf6'],
    effects: 'snow',
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('themeColor');
    return (saved as ThemeColor) || 'green';
  });

  const [seasonalMode, setSeasonalModeState] = useState<SeasonalMode>(() => {
    const saved = localStorage.getItem('seasonalMode');
    return (saved as SeasonalMode) || 'none';
  });

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    // ברירת מחדל לפי שעה: כהה בין 17:00 ל-06:00
    const hour = new Date().getHours();
    return hour >= 17 || hour < 6;
  });

  const [autoThemeEnabled, setAutoThemeEnabledState] = useState(() => {
    return localStorage.getItem('themeManual') !== 'true';
  });

  useEffect(() => {
    localStorage.setItem('themeColor', themeColor);
    
    // Apply CSS variables for dynamic theming
    const colors = themeColors[themeColor];
    document.documentElement.style.setProperty('--theme-primary', colors.primary);
    document.documentElement.style.setProperty('--theme-primary-light', colors.primaryLight);
    document.documentElement.style.setProperty('--theme-primary-dark', colors.primaryDark);
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('seasonalMode', seasonalMode);
  }, [seasonalMode]);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // בדיקת שעה אוטומטית כל דקה (רק אם autoTheme פעיל)
  useEffect(() => {
    if (!autoThemeEnabled) return;
    const check = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour >= 17 || hour < 6;
      setIsDark(shouldBeDark);
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [autoThemeEnabled]);

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
  };

  const setSeasonalMode = (mode: SeasonalMode) => {
    setSeasonalModeState(mode);
  };

  const toggleDark = () => {
    setIsDark(prev => !prev);
    // סימון שהמשתמש בחר ידנית
    localStorage.setItem('themeManual', 'true');
    setAutoThemeEnabledState(false);
  };

  const setAutoThemeEnabled = (enabled: boolean) => {
    setAutoThemeEnabledState(enabled);
    if (enabled) {
      localStorage.removeItem('themeManual');
    } else {
      localStorage.setItem('themeManual', 'true');
    }
  };

  const getThemeClasses = () => {
    return themeColors[themeColor];
  };

  return (
    <ThemeContext.Provider
      value={{
        themeColor,
        setThemeColor,
        seasonalMode,
        setSeasonalMode,
        isDark,
        toggleDark,
        autoThemeEnabled,
        setAutoThemeEnabled,
        getThemeClasses,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export { themeColors, seasonalThemes };
export type { ThemeContextType };