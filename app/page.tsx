'use client'

import dynamic from 'next/dynamic'
import { GlassCard } from '@/components/ui/glass-card'
import { ContactForm } from '@/components/ui/contact-form'

const CyberCore = dynamic(() => import('@/components/CyberCore'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center z-50">
      <div className="text-white text-center glass-panel rounded-xl p-8 max-w-md mx-auto">
        <div className="loading-spinner w-16 h-16 mx-auto mb-6"></div>
        <h1 className="text-4xl font-bold mb-4 font-orbitron">
          co<span className="text-neon-blue neon-glow">RESEARCH</span>
        </h1>
        <p className="text-lg opacity-80 font-rajdhani">Initializing core systems...</p>
      </div>
    </div>
  )
})

export default function Home() {
  return (
    <main className="relative">
      {/* Fixed 3D Background */}
      <CyberCore />
      
      {/* Scrollable Content */}
      <div className="relative z-20">
        {/* Hero Section */}
        <div className="glass-container">
          <GlassCard glow delay={300}>
            <div className="text-center">
              <h1 className="text-6xl md:text-8xl font-black mb-8 font-orbitron">
                co<span className="text-neon-blue neon-glow">RESEARCH</span>
              </h1>
              <p className="text-2xl md:text-3xl text-gray-200 mb-12 leading-relaxed font-rajdhani font-light">
                A collective of AI researchers building systems and frameworks 
                to improve LLM/AI performance and abilities
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Philosophy Section */}
        <div className="glass-container">
          <GlassCard delay={1000}>
            <div className="text-center">
              <h2 className="text-5xl font-bold mb-8 text-neon-purple neon-glow font-orbitron">
                Our Philosophy
              </h2>
              <p className="text-2xl text-gray-200 mb-8 leading-relaxed font-rajdhani font-light">
                Like Earth&apos;s layers, research goes deep. From the inner core 
                of fundamental AI principles to the surface applications that change the world.
              </p>
              <blockquote className="text-xl italic text-gray-300 border-l-4 border-neon-purple pl-8 py-4 font-rajdhani bg-black/20 rounded-r-xl">
                &quot;We started as &apos;core&apos; researchers, diving into the foundational 
                layers of machine learning and AI systems. Now we&apos;re coRESEARCH - 
                a collaborative effort building better AI frameworks and tools at every layer.&quot;
              </blockquote>
            </div>
          </GlassCard>
        </div>

        {/* Contact Section */}
        <div className="glass-container">
          <GlassCard delay={1800}>
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-6 text-white text-glow font-orbitron">Connect with coRESEARCH</h2>
              <ContactForm />
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  )
}