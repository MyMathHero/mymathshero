// Centralised design tokens + reusable style snippets for the mobile app.
// Use `theme.colors.gold` etc. instead of inlining hex values across screens.

export const theme = {
  colors: {
    navy: '#1B2B4B',
    navyDark: '#162240',
    gold: '#C49A1A',
    goldLight: '#FFFBEB',
    white: '#FFFFFF',
    background: '#F0F4F8',
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    textPrimary: '#1B2B4B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 999,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
} as const

export const globalStyles = {
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.navy,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.navy,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: theme.colors.gold,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: '800' as const,
    fontSize: 16,
  },
  goldButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center' as const,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
}
