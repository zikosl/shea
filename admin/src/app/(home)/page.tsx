import AppDownload from '@/components/home/AppDownload'
import Features from '@/components/home/Features'
import Hero from '@/components/home/Hero'
import ProductShowcase from '@/components/home/ProductShowcase'
import Testimonials from '@/components/home/Testimonials'
import React from 'react'

export default function Page() {
  return (
    <div className="marketing-shell">
      <Hero />
      <Features />
      <ProductShowcase />
      <Testimonials />
      <AppDownload />
    </div>
  )
}
