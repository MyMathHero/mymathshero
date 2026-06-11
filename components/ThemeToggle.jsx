'use client'
import { useTheme, THEMES } from '@/lib/useTheme'

export default function ThemeToggle({
  compact = false,  // compact = icon only, full = label too
  position = 'inline', // 'inline' | 'floating'
}) {
  const { theme, setTheme } = useTheme()

  if (compact) {
    // Cycle through themes on click
    const currentIndex = THEMES.findIndex(t => t.id === theme)
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length]
    const currentTheme = THEMES[currentIndex] || THEMES[0]

    return (
      <button
        onClick={() => setTheme(nextTheme.id)}
        title={`Switch to ${nextTheme.label} mode`}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid var(--accent-gold-border)',
          borderRadius: 20,
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--text-on-dark)',
        }}
      >
        {currentTheme.emoji}
        <span style={{ fontSize: 11, fontWeight: 700 }}>
          {currentTheme.label}
        </span>
      </button>
    )
  }

  // Full three-button selector
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      background: 'var(--bg-secondary)',
      borderRadius: 16,
      padding: 4,
      border: '1px solid var(--border-color)',
    }}>
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.description}
          style={{
            background: theme === t.id
              ? 'var(--bg-header)'
              : 'transparent',
            color: theme === t.id
              ? 'var(--accent-gold)'
              : 'var(--text-secondary)',
            border: theme === t.id
              ? '1px solid var(--accent-gold-border)'
              : '1px solid transparent',
            borderRadius: 12,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: theme === t.id ? 700 : 500,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{t.emoji}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
