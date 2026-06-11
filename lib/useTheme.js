'use client'
import { useState, useEffect, createContext, useContext } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
})

export const THEMES = [
  {
    id: 'light',
    label: 'Light',
    emoji: '☀️',
    description: 'Default bright theme',
  },
  {
    id: 'dark',
    label: 'Dark',
    emoji: '🌙',
    description: 'Easy on the eyes',
  },
  {
    id: 'colorblind',
    label: 'Colour-Safe',
    emoji: '👁️',
    description: 'Blue & orange — no red/green',
  },
]

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light')

  useEffect(() => {
    // Load saved theme on mount
    const saved = localStorage.getItem('mmh_theme') || 'light'
    applyTheme(saved)
    setThemeState(saved)
  }, [])

  function applyTheme(newTheme) {
    const html = document.documentElement
    // data-theme drives the CSS variables; the dark/colorblind CLASSES drive
    // Tailwind's `dark:` and our custom `colorblind:` utility variants.
    html.setAttribute('data-theme', newTheme)
    html.classList.toggle('dark', newTheme === 'dark')
    html.classList.toggle('colorblind', newTheme === 'colorblind')
    localStorage.setItem('mmh_theme', newTheme)
  }

  function setTheme(newTheme) {
    applyTheme(newTheme)
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

// Script to inject before page load (prevents flash). Sets both the
// data-theme attribute (CSS vars) and the dark/colorblind classes (Tailwind).
export const THEME_SCRIPT = `
  (function() {
    try {
      var t = localStorage.getItem('mmh_theme') || 'light';
      var h = document.documentElement;
      h.setAttribute('data-theme', t);
      h.classList.toggle('dark', t === 'dark');
      h.classList.toggle('colorblind', t === 'colorblind');
    } catch(e) {}
  })();
`
