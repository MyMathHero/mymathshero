import { Suspense } from 'react'
import JoinContent from './JoinContent'

export const metadata = {
  title: 'Your Founding-Family Invite — MyMathsHero',
  description: 'Claim your founding-family spot: one month free, then founding pricing.',
  robots: { index: false, follow: false }, // private invite page — not for search
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  )
}
