import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeColor = 'green' | 'blue' | 'purple' | 'orange' | 'pink' | 'red';

type ThemeClasses = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  gradient: string;
  border: string;
  bg: string;
  text: string;
};

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  isDark: boolean;
  toggleDark: () => void;
  getThemeClasses: () => ThemeClasses;
}

const themeColors: Record<ThemeColor, ThemeClasses> = {
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

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME_COLOR: ThemeColor = 'green';

const safeLocalStorageGet = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures and keep the in-memory state working.
  }
};

const safeLocalStorageRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures and keep the in-memory state working.
  }
};

const readStoredThemeColor = (): ThemeColor => {
  const stored = safeLocalStorageGet('themeColor');
  return stored && stored in themeColors ? (stored as ThemeColor) : DEFAULT_THEME_COLOR;
};

const readStoredDarkMode = (): boolean => {
  const stored = safeLocalStorageGet('theme');
  if (stored === 'dark') return true;
  if (stored === 'light') return false;

  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  } catch {
    return false;
  }
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColor] = useState<ThemeColor>(readStoredThemeColor);
  const [isDark, setIsDark] = useState<boolean>(readStoredDarkMode);

  const themeClasses = useMemo(() => themeColors[themeColor], [themeColor]);

  useEffect(() => {
    safeLocalStorageSet('themeColor', themeColor);
    document.documentElement.style.setProperty('--theme-primary', themeClasses.primary);
    document.documentElement.style.setProperty('--theme-primary-light', themeClasses.primaryLight);
    document.documentElement.style.setProperty('--theme-primary-dark', themeClasses.primaryDark);
  }, [themeColor, themeClasses]);

  useEffect(() => {
    safeLocalStorageSet('theme', isDark ? 'dark' : 'light');
    safeLocalStorageRemove('themeManual');
    safeLocalStorageRemove('seasonalMode');
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const toggleDark = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeColor,
        setThemeColor,
        isDark,
        toggleDark,
        getThemeClasses: () => themeClasses,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export { themeColors };
