import AppDownload from '@/components/home/AppDownload'
import Features from '@/components/home/Features'
import Hero from '@/components/home/Hero'
import React from 'react'

export default function Page() {
  return (
    <div className="marketing-shell">
      <Hero />
      <Features />
      <AppDownload />
    </div>
  )
}
