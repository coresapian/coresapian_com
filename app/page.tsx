'use client'

import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { SectionContainer } from '@/components/ui/section-container'

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
        <SectionContainer maxWidth="xl">
          <GlassCard maxWidth="max-w-5xl" glow delay={300}>
            <div className="text-center">
              <h1 className="text-6xl md:text-8xl font-black mb-8 font-orbitron">
                co<span className="text-neon-blue neon-glow">RESEARCH</span>
              </h1>
              <p className="text-2xl md:text-3xl text-gray-200 mb-12 leading-relaxed font-rajdhani font-light">
                A collective of AI researchers building systems and frameworks 
                to improve LLM/AI performance and abilities
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button variant="futuristic" size="xl" className="font-rajdhani font-semibold">
                  Explore Research
                </Button>
                <Button variant="neon" size="xl" className="font-rajdhani font-semibold">
                  Join the Collective
                </Button>
              </div>
            </div>
          </GlassCard>
        </SectionContainer>

        {/* Core Research Section */}
        <SectionContainer maxWidth="2xl">
          <div className="grid lg:grid-cols-2 gap-8">
            <GlassCard delay={600}>
              <h2 className="text-4xl font-bold mb-6 text-neon-orange neon-glow font-orbitron">
                Core Research
              </h2>
              <p className="text-xl text-gray-200 mb-8 font-rajdhani leading-relaxed">
                Fundamental AI and machine learning research exploring the deep layers 
                of artificial intelligence systems.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-neon-orange rounded-full animate-pulse-glow"></div>
                  <span className="font-rajdhani text-lg">Neural Architecture Optimization</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-neon-orange rounded-full animate-pulse-glow"></div>
                  <span className="font-rajdhani text-lg">LLM Performance Enhancement</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-neon-orange rounded-full animate-pulse-glow"></div>
                  <span className="font-rajdhani text-lg">Emergent AI Behaviors</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard delay={800}>
              <h2 className="text-4xl font-bold mb-6 text-neon-blue neon-glow font-orbitron">
                System Building
              </h2>
              <p className="text-xl text-gray-200 mb-8 font-rajdhani leading-relaxed">
                Creating robust frameworks and tools that push the boundaries 
                of AI capability and reliability.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-neon-blue rounded-full animate-pulse-glow"></div>
                  <span className="font-rajdhani text-lg">AI Framework Development</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-neon-blue rounded-full animate-pulse-glow"></div>
                  <span className="font-rajdhani text-lg">Performance Optimization</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-neon-blue rounded-full animate-pulse-glow"></div>
                  <span className="font-rajdhani text-lg">Scalable Architecture</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </SectionContainer>

        {/* Philosophy Section */}
        <SectionContainer maxWidth="xl">
          <GlassCard maxWidth="max-w-5xl" delay={1000}>
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
        </SectionContainer>

        {/* Projects & Innovation Section */}
        <SectionContainer maxWidth="2xl">
          <div className="grid lg:grid-cols-3 gap-8">
            <GlassCard delay={1200}>
              <h3 className="text-2xl font-bold mb-4 text-neon-green neon-glow font-orbitron">
                Innovation Labs
              </h3>
              <p className="text-gray-200 mb-6 font-rajdhani text-lg leading-relaxed">
                Experimental research pushing the boundaries of what&apos;s possible 
                in artificial intelligence.
              </p>
              <Button variant="green" className="w-full font-rajdhani">
                Explore Labs
              </Button>
            </GlassCard>

            <GlassCard delay={1400}>
              <h3 className="text-2xl font-bold mb-4 text-neon-pink neon-glow font-orbitron">
                Open Research
              </h3>
              <p className="text-gray-200 mb-6 font-rajdhani text-lg leading-relaxed">
                Collaborative research initiatives open to the global 
                AI research community.
              </p>
              <Button variant="neon" className="w-full font-rajdhani">
                View Projects
              </Button>
            </GlassCard>

            <GlassCard delay={1600}>
              <h3 className="text-2xl font-bold mb-4 text-neon-blue neon-glow font-orbitron">
                Get Involved
              </h3>
              <p className="text-gray-200 mb-6 font-rajdhani text-lg leading-relaxed">
                Join our collective of researchers pushing the boundaries 
                of AI capabilities.
              </p>
              <Button variant="futuristic" className="w-full font-rajdhani">
                Join Us
              </Button>
            </GlassCard>
          </div>
        </SectionContainer>

        {/* Contact Section */}
        <SectionContainer maxWidth="lg">
          <GlassCard maxWidth="max-w-4xl" delay={1800}>
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-6 text-white text-glow font-orbitron">
                Connect with coRESEARCH
              </h2>
              <p className="text-xl text-gray-200 mb-10 font-rajdhani">
                Ready to collaborate on the future of AI research?
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button variant="futuristic" size="xl" className="font-rajdhani">
                  Research Collaboration
                </Button>
                <Button variant="outline" size="xl" className="font-rajdhani">
                  Contact Team
                </Button>
              </div>
            </div>
          </GlassCard>
        </SectionContainer>
      </div>
    </main>
  )
}