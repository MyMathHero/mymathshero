'use client'

import Link from 'next/link'
import { Facebook, Twitter, Instagram, Linkedin, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#1B2B4B] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/assets/logos/logo-icon.png"
                alt="MyMathsHero"
                className="h-10 w-auto"
              />
              <span className="font-bold text-lg">MyMathsHero</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Personalised AI Maths Learning<br />Prep to Year 6
            </p>
            <div className="flex gap-3 mt-5">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#C49A1A] flex items-center justify-center transition-all duration-200">
                  <Icon size={16} className="text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">Platform</h4>
            <ul className="space-y-3">
              {['Home', 'How It Works', 'For Schools', 'Student Demo', 'Teacher Demo'].map(label => (
                <li key={label}>
                  <Link href={label === 'Home' ? '/' : `/${label.toLowerCase().replace(/ /g, '-')}`} className="text-white/50 hover:text-[#C49A1A] text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">Learning</h4>
            <ul className="space-y-3">
              {['Mathematics', 'Prep to Year 6', 'Australian Curriculum', 'Personalised', 'AI Tutor — Ask Hero'].map(label => (
                <li key={label}>
                  <span className="text-white/50 text-sm">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-white/50 text-sm hover:text-[#C49A1A] transition-colors">
                <Mail size={14} />
                hello@mymathshero.com.au
              </li>
              <li className="text-white/50 text-sm">Melbourne, Australia</li>
              <li className="text-white/50 text-sm">ABN: XX XXX XXX XXX</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">&copy; 2026 MyMathsHero. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-white/40 hover:text-[#C49A1A] text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/40 hover:text-[#C49A1A] text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
