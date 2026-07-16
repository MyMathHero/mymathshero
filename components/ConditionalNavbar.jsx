'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

// Routes that render their own header (or shouldn't show the marketing navbar).
const HIDDEN_ON = new Set([
  '/coming-soon',
  '/thankyou',
])

export default function ConditionalNavbar() {
  const pathname = usePathname()
  if (HIDDEN_ON.has(pathname)) return null
  return <Navbar />
}
