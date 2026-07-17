import './globals.css'
import './globals-themes.css'
import LoadingScreen from '@/components/LoadingScreenClient'
import ConditionalNavbar from '@/components/ConditionalNavbar'
import { ThemeProvider, THEME_SCRIPT } from '@/lib/useTheme'
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import { SOCIAL_URLS } from '@/lib/social'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mymathshero.com.au'

export const metadata = {
  // Resolves relative canonical/OG URLs (e.g. '/curriculum') to absolute ones.
  metadataBase: new URL(SITE_URL),
  // `%s` is filled by each page's own title; the homepage/untitled pages use the
  // default. Keeps every tab title consistently branded.
  title: {
    default: 'MyMathsHero — Personalised AI Maths Learning for Prep to Year 6',
    template: '%s',
  },
  description:
    'MyMathsHero is a personalised AI maths tutor for Australian primary school children from Prep to Year 6. Meet Hero — curriculum-aligned practice, step-by-step help and progress reports for parents.',
  keywords: [
    'AI maths tutor', 'maths app for kids', 'Australian Curriculum maths',
    'primary school maths', 'Prep to Year 6 maths', 'personalised maths learning',
    'maths practice online', 'MyMathsHero', 'Hero maths tutor',
  ],
  applicationName: 'MyMathsHero',
  authors: [{ name: 'MyMathsHero' }],
  creator: 'MyMathsHero',
  publisher: 'MyMathsHero',
  alternates: { canonical: '/' },
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/logos/logo-icon.png?v=2',
    shortcut: '/assets/logos/logo-icon.png?v=2',
    apple: '/assets/logos/logo-icon.png?v=2',
  },
  openGraph: {
    type: 'website',
    siteName: 'MyMathsHero',
    locale: 'en_AU',
    url: SITE_URL,
    title: 'MyMathsHero — Personalised AI Maths Learning for Prep to Year 6',
    description:
      'Meet Hero, the friendly AI maths tutor helping Australian primary school children build confidence through personalised, curriculum-aligned maths learning.',
    images: [{ url: '/assets/og/home.png', width: 1200, height: 630, alt: 'MyMathsHero — Meet Hero, your child’s AI maths tutor' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@mymathsheroau',
    title: 'MyMathsHero — Personalised AI Maths Learning',
    description: 'Meet Hero, the AI maths tutor for Australian primary school children, Prep to Year 6.',
    images: ['/assets/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
}

// Organization + WebSite structured data (JSON-LD) — helps Google understand the
// brand and can enable richer search results. Injected once, site-wide.
const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'MyMathsHero',
      legalName: 'My Maths Hero',
      url: SITE_URL,
      logo: `${SITE_URL}/assets/logos/logo-full.png?v=2`,
      email: 'hello@mymathshero.com.au',
      description:
        'Personalised AI maths learning for Australian primary school children from Prep to Year 6.',
      areaServed: 'AU',
      // Links the brand to its verified social profiles (Google Knowledge Graph).
      sameAs: SOCIAL_URLS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'MyMathsHero',
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-AU',
    },
  ],
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
        {/* Organization + WebSite structured data (site-wide). */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <LoadingScreen />
          <ConditionalNavbar />
          {children}
        </ThemeProvider>
      </body>
      {/* Google Tag Manager (GTM-NPKK37FN). @next/third-parties injects both the
          head loader script and the <noscript> iframe, so no raw HTML is needed.
          NOTE: GA4 (G-0G8YVNL7E4) is also tagged directly below — do NOT add a
          GA4 tag inside the GTM container too, or pageviews double-count. */}
      <GoogleTagManager gtmId="GTM-NPKK37FN" />
      <GoogleAnalytics gaId="G-0G8YVNL7E4" />
    </html>
  )
}
