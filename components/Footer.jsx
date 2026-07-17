'use client'

import Link from 'next/link'
import { Facebook, Instagram, Youtube, Mail, ArrowRight } from 'lucide-react'
import { SOCIAL_LINKS } from '@/lib/social'

// TikTok isn't in lucide — inline the brand glyph. Others map to lucide icons.
function TikTok({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 3c.3 2.1 1.6 3.8 3.7 4.1v2.6c-1.2 0-2.4-.4-3.5-1v6.6a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v2.7a3.2 3.2 0 1 0 2.3 3V3h2.5z" />
    </svg>
  )
}
const SOCIAL_ICONS = { Facebook, Instagram, TikTok, YouTube: Youtube }

// Footer is intentionally always dark (navy) in every theme — a deliberate
// anchor at the foot of the page. Links point to the real public pages so the
// whole site is internally linked (good for SEO + navigation).
const exploreLinks = [
  { label: 'Home', href: '/' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Curriculum', href: '/curriculum' },
  { label: 'For Parents', href: '/for-parents' },
  { label: 'Meet Hero', href: '/meet-hero' },
  { label: 'For Schools', href: '/for-schools' },
  { label: 'About Us', href: '/about' },
  { label: 'FAQ', href: '/faq' },
]

const learningTopics = [
  'Number & Place Value', 'Addition & Subtraction', 'Multiplication & Division',
  'Fractions & Decimals', 'Measurement & Geometry', 'Patterns & Algebra',
]

export default function Footer() {
  return (
    <footer className="bg-[#1B2B4B] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Waitlist CTA banner */}
        <div className="rounded-2xl p-8 mb-14 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: 'linear-gradient(135deg, rgba(196,154,26,0.18), rgba(196,154,26,0.06))', border: '1px solid rgba(196,154,26,0.35)' }}>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold mb-1">Help your child build maths confidence</h3>
            <p className="text-white/70 text-sm">Australian Curriculum aligned maths learning from Prep to Year 6.</p>
          </div>
          <a href="/#waitlist" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold whitespace-nowrap shadow-lg transition-all duration-200" style={{ background: '#C49A1A', color: '#1B2B4B' }}>
            Join the Early Access Waitlist
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/assets/logos/logo-icon.png" alt="MyMathsHero" className="h-10 w-auto" />
              <span className="font-bold text-lg">MyMathsHero</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Personalised, Australian Curriculum aligned maths learning.<br />Prep to Year 6.
            </p>
            <div className="flex gap-3 mt-5">
              {SOCIAL_LINKS.map(({ name, url }) => {
                const Icon = SOCIAL_ICONS[name]
                return (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`MyMathsHero on ${name}`}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#C49A1A] flex items-center justify-center transition-all duration-200"
                  >
                    {Icon && <Icon size={16} className="text-white" />}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">Explore</h4>
            <ul className="space-y-3">
              {exploreLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-white/50 hover:text-[#C49A1A] text-sm transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Learning */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">Maths Topics</h4>
            <ul className="space-y-3">
              {learningTopics.map(label => (
                <li key={label}>
                  <Link href="/curriculum" className="text-white/50 hover:text-[#C49A1A] text-sm transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@mymathshero.com.au" className="flex items-center gap-2 text-white/50 text-sm hover:text-[#C49A1A] transition-colors">
                  <Mail size={14} />
                  hello@mymathshero.com.au
                </a>
              </li>
              <li className="text-white/50 text-sm">Australia</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">&copy; {new Date().getFullYear()} MyMathsHero. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-white/40 hover:text-[#C49A1A] text-sm transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-white/40 hover:text-[#C49A1A] text-sm transition-colors">Terms &amp; Conditions</Link>
            <Link href="/faq" className="text-white/40 hover:text-[#C49A1A] text-sm transition-colors">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
