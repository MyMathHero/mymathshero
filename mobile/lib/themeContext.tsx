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

  // ── Redesign tokens (premium look) ──────────────────────────────────────
  // A soft corner gradient painted behind each screen.
  bgGradient: [string, string]
  // Gold gradient used for the glowing Hero Points bar + primary CTAs.
  goldGradient: [string, string]
  // Shadow/glow colour for elevated cards and the glow bar.
  glow: string
  // A slightly raised card surface (for nested/elevated cards).
  cardElevated: string
  // Gold border applied to all cards (spec: rgba(196,154,26,0.2–0.25)).
  cardBorder: string
  // Today's Challenges gold-gradient card fill + the text colour that reads on it.
  challengeGradient: [string, string]
  challengeText: string
  challengeTextSub: string
  // Continue/CTA gold gradient (lighter top-left → deeper bottom-right).
  ctaGradient: [string, string]
  // Login/auth hero gradient (3 stops).
  loginGradient: [string, string, string]
  // Bottom navigation.
  navBg: string
  navBorder: string
  navActive: string
  navInactive: string
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
      bgPrimary: '#F2EDE4',          // warm cream (spec)
      bgSecondary: '#FFFFFF',
      bgCard: '#FFFFFF',
      bgHeader: '#1B2B4B',
      bgHeaderSecondary: '#2D4A7A',
      textPrimary: '#1B1B1B',        // spec primary
      textSecondary: '#6B6B6B',      // spec secondary
      textMuted: '#9CA3AF',
      textOnDark: '#FFFFFF',
      accentGold: '#CFA325',         // richer, brighter gold
      accentGoldLight: '#FBEFC9',
      borderColor: 'rgba(207,163,37,0.35)',  // spec card border (light)
      borderLight: 'rgba(0,0,0,0.08)',
      correct: '#22C55E',
      correctBg: '#DCFCE7',
      wrong: '#F59E0B',
      wrongBg: '#FEF3C7',
      error: '#EF4444',
      errorBg: '#FEE2E2',
      // Subtle diagonal gradient — warm cream with a faint cooler corner.
      bgGradient: ['#F6F1E8', '#EAE3D6'],
      // Shinier gold: bright highlight → rich deep gold.
      goldGradient: ['#F4D879', '#C99A1E'],
      glow: 'rgba(207,163,37,0.22)',
      cardElevated: '#FFFFFF',
      cardBorder: 'rgba(207,163,37,0.35)',
      // Challenge card: white centre with a warmer, shinier gold edge glow.
      challengeGradient: ['#FBEAB0', '#FFFFFF'],
      challengeText: '#1B1B1B',
      challengeTextSub: '#6B6B6B',
      // Shiny CTA: luminous top-left highlight → rich gold.
      ctaGradient: ['#F6DD86', '#C99A1E'],
      loginGradient: ['#0F1F3D', '#16294A', '#1B2B4B'],
      navBg: '#FFFFFF',
      navBorder: 'rgba(0,0,0,0.08)',
      navActive: '#C49A1A',
      navInactive: '#9CA3AF',
    },
  },
  {
    id: 'dark',
    label: 'Dark',
    emoji: '🌙',
    description: 'Easy on the eyes',
    colors: {
      bgPrimary: '#080808',          // near-black (spec)
      bgSecondary: '#141414',
      bgCard: '#1C1C1C',             // spec card
      bgHeader: '#050505',
      bgHeaderSecondary: '#111111',
      textPrimary: '#F0F0F0',        // spec primary
      textSecondary: '#888888',      // spec secondary
      textMuted: '#555555',
      textOnDark: '#F0F0F0',
      accentGold: '#C49A1A',         // spec gold (same in both modes)
      accentGoldLight: 'rgba(196,154,26,0.14)',
      borderColor: 'rgba(196,154,26,0.2)',   // spec card border (dark)
      borderLight: 'rgba(255,255,255,0.06)',
      correct: '#34D399',
      correctBg: 'rgba(52,211,153,0.15)',
      wrong: '#FBBF24',
      wrongBg: 'rgba(251,191,36,0.15)',
      error: '#F87171',
      errorBg: 'rgba(248,113,113,0.15)',
      // Subtle diagonal gradient — near-black with a faint warm gold corner.
      bgGradient: ['#0E0C06', '#080808'],
      goldGradient: ['#D9B23A', '#C49A1A'],
      glow: 'rgba(196,154,26,0.15)',
      cardElevated: '#222222',
      cardBorder: 'rgba(196,154,26,0.2)',
      // Challenge card: subtle dark-grey card, near-flat with a faint warm tint.
      challengeGradient: ['#1E1B12', '#161616'],
      challengeText: '#F0F0F0',
      challengeTextSub: '#888888',
      ctaGradient: ['#E2C15A', '#B7891A'],
      loginGradient: ['#0A0A0A', '#0E0E0E', '#141414'],
      navBg: '#111111',
      navBorder: 'rgba(255,255,255,0.06)',
      navActive: '#C49A1A',
      navInactive: '#9A9A9A',
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
      // Redesign tokens — keep the accessible orange identity.
      bgGradient: ['#F5F5F0', '#F5F5F0'],
      goldGradient: ['#F2A03C', '#E07B00'],
      glow: 'rgba(224,123,0,0.18)',
      cardElevated: '#FFFFFF',
      cardBorder: 'rgba(224,123,0,0.3)',
      challengeGradient: ['#FFF0D8', '#FFFFFF'],
      challengeText: '#1A1A1A',
      challengeTextSub: '#555555',
      ctaGradient: ['#F2A03C', '#D06A00'],
      loginGradient: ['#002244', '#003366', '#004488'],
      navBg: '#FFFFFF',
      navBorder: 'rgba(0,0,0,0.08)',
      navActive: '#E07B00',
      navInactive: '#888888',
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
