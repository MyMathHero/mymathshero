import React, {
  useEffect, useState, createContext, useContext,
} from 'react'
import * as SecureStore from 'expo-secure-store'

// Runtime theme system (light / dark / colour-safe) with SecureStore
// persistence. This is separate from lib/theme.ts, which holds the static
// design tokens + globalStyles used across existing screens. New theme-aware
// UI should read colours from useTheme().colors here.

export type ThemeId = 'light' | 'dark' | 'colorblind'

export interface ThemeColors {
  bgPrimary: string
  bgSecondary: string
  bgCard: string
  bgHeader: string
  bgHeaderSecondary: string

  textPrimary: string
  textSecondary: string
  textMuted: string
  textOnDark: string

  accentGold: string
  accentGoldLight: string

  borderColor: string
  borderLight: string

  correct: string
  correctBg: string
  wrong: string
  wrongBg: string
  error: string
  errorBg: string
}

export interface Theme {
  id: ThemeId
  label: string
  emoji: string
  description: string
  colors: ThemeColors
}

export const THEMES: Theme[] = [
  {
    id: 'light',
    label: 'Light',
    emoji: '☀️',
    description: 'Default bright theme',
    colors: {
      bgPrimary: '#F0F4F8',
      bgSecondary: '#FFFFFF',
      bgCard: '#FFFFFF',
      bgHeader: '#1B2B4B',
      bgHeaderSecondary: '#2D4A7A',
      textPrimary: '#1B2B4B',
      textSecondary: '#64748B',
      textMuted: '#94A3B8',
      textOnDark: '#FFFFFF',
      accentGold: '#C49A1A',
      accentGoldLight: '#FFFBEB',
      borderColor: '#E2E8F0',
      borderLight: '#F0F4F8',
      correct: '#22C55E',
      correctBg: '#DCFCE7',
      wrong: '#F59E0B',
      wrongBg: '#FEF3C7',
      error: '#EF4444',
      errorBg: '#FEE2E2',
    },
  },
  {
    id: 'dark',
    label: 'Dark',
    emoji: '🌙',
    description: 'Easy on the eyes',
    colors: {
      bgPrimary: '#0F1620',
      bgSecondary: '#1A2332',
      bgCard: '#1E2D42',
      bgHeader: '#0A0F18',
      bgHeaderSecondary: '#131D2E',
      textPrimary: '#F1F5F9',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      textOnDark: '#F1F5F9',
      accentGold: '#D4AA30',
      accentGoldLight: 'rgba(212,170,48,0.12)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderLight: 'rgba(255,255,255,0.05)',
      correct: '#34D399',
      correctBg: 'rgba(52,211,153,0.15)',
      wrong: '#FBBF24',
      wrongBg: 'rgba(251,191,36,0.15)',
      error: '#F87171',
      errorBg: 'rgba(248,113,113,0.15)',
    },
  },
  {
    id: 'colorblind',
    label: 'Colour-Safe',
    emoji: '👁️',
    description: 'Blue & orange instead of red/green',
    colors: {
      bgPrimary: '#F5F5F0',
      bgSecondary: '#FFFFFF',
      bgCard: '#FFFFFF',
      bgHeader: '#003366',
      bgHeaderSecondary: '#004488',
      textPrimary: '#1A1A1A',
      textSecondary: '#555555',
      textMuted: '#888888',
      textOnDark: '#FFFFFF',
      accentGold: '#E07B00',
      accentGoldLight: '#FFF3E0',
      borderColor: '#CCCCCC',
      borderLight: '#EEEEEE',
      correct: '#0066CC',
      correctBg: '#E0F0FF',
      wrong: '#E07B00',
      wrongBg: '#FFF3E0',
      error: '#CC0044',
      errorBg: '#FFE0EA',
    },
  },
]

const THEME_KEY = 'mmh_theme'

interface ThemeContextType {
  theme: Theme
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
  colors: ThemeColors
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES[0],
  themeId: 'light',
  setTheme: () => {},
  colors: THEMES[0].colors,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('light')

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark' || saved === 'colorblind') {
          setThemeId(saved)
        }
      })
      .catch(() => {})
  }, [])

  function setTheme(id: ThemeId) {
    setThemeId(id)
    SecureStore.setItemAsync(THEME_KEY, id).catch(() => {})
  }

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]

  return (
    <ThemeContext.Provider
      value={{ theme, themeId, setTheme, colors: theme.colors }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
