import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

// The app uses a single (light) theme; there is no day/night switch.
const THEME = 'light';

export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
    try {
      localStorage.removeItem('veridex_theme');
    } catch {
      // Ignore local storage error
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: THEME, isDark: false, isLight: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
