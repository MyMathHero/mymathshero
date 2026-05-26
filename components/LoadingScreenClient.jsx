'use client'
import dynamic from 'next/dynamic'

// ssr:false is allowed here because this file is a Client Component.
// Importing it from a Server Component (layout.js) safely defers the
// LoadingScreen render until after hydration on the client, which avoids
// the SSR-then-unmount race that triggers
// "null is not an object (evaluating 'document.body.appendChild')" in WebKit
// during window.location.href navigations.
const LoadingScreen = dynamic(() => import('./LoadingScreen'), { ssr: false })

export default function LoadingScreenClient() {
  return <LoadingScreen />
}
