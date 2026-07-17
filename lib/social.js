// Single source of truth for MyMathsHero's social profiles. Used by the footer
// links AND the Organization JSON-LD `sameAs` (which tells Google these accounts
// belong to the same brand). Keep in one place so they never drift apart.
//
// Tracking params are intentionally stripped from the TikTok URL — the canonical
// profile URL is what belongs in sameAs and in a shared link.
export const SOCIAL_LINKS = [
  { name: 'Facebook',  url: 'https://www.facebook.com/profile.php?id=61589833376476' },
  { name: 'Instagram', url: 'https://www.instagram.com/mymathsheroau/' },
  { name: 'TikTok',    url: 'https://www.tiktok.com/@mymathsheroau' },
  { name: 'YouTube',   url: 'https://www.youtube.com/@MyMathsHeroAU' },
]

// Just the URLs — for JSON-LD sameAs.
export const SOCIAL_URLS = SOCIAL_LINKS.map((s) => s.url)
