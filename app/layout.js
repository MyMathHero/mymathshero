import './globals.css'
import './globals-themes.css'
import LoadingScreen from '@/components/LoadingScreenClient'
import ConditionalNavbar from '@/components/ConditionalNavbar'
import { ThemeProvider, THEME_SCRIPT } from '@/lib/useTheme'
import { GoogleAnalytics } from '@next/third-parties/google'

export const metadata = {
  title: 'MyMathsHero — Personalised AI Maths Learning',
  description: 'Personalised AI Maths Learning from Prep to Year 6',
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/logos/logo-icon.png',
    shortcut: '/assets/logos/logo-icon.png',
    apple: '/assets/logos/logo-icon.png',
  },
}

export const viewport = {
  themeColor: '#C49A1A',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before render to prevent a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <LoadingScreen />
          <ConditionalNavbar />
          {children}
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId="G-0G8YVNL7E4" />
    </html>
  )
}
