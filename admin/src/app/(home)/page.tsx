import AppDownload from '@/components/home/AppDownload'
import Features from '@/components/home/Features'
import Hero from '@/components/home/Hero'
import React from 'react'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function Page() {
  return (
    <div className="marketing-shell">
      <Hero />
      <Features />
      <AppDownload />
    </div>
  )
}
