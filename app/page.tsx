'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white pt-16">{/* pt-16 accounts for fixed nav */}

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Precision in Motion tagline */}
            <div className="mb-4">
              <div className="text-brand-text-secondary text-xs tracking-[0.2em] uppercase font-light">Precision in Motion</div>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-brand-black mb-5 leading-tight">
              Turn Any Landing Page Into a{' '}
              <span className="text-brand-gold">Conversion Machine</span>
            </h1>
            <p className="text-xl text-brand-text-secondary mb-8 max-w-2xl mx-auto">
              CRO intelligence, powered by AI, built for pros. Find exactly where you're losing customers—and how to fix it with testable experiments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/signup"
                className="px-10 py-4 bg-black text-white text-lg font-black rounded shadow-lg shadow-black/20 transition-all duration-300"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.backgroundColor = '#1A1A1A';
                  e.currentTarget.style.boxShadow = '0 20px 50px -10px rgba(212, 165, 116, 0.6), 0 0 0 2px rgba(212, 165, 116, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.backgroundColor = '#0E0E0E';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                }}
              >
                Analyze My Page Free
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-3.5 bg-transparent text-black border-2 text-base font-semibold rounded transition-all duration-200"
                style={{ borderColor: '#0E0E0E', color: '#0E0E0E' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D4A574';
                  e.currentTarget.style.color = '#D4A574';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#0E0E0E';
                  e.currentTarget.style.color = '#0E0E0E';
                }}
              >
                See How It Works
              </a>
            </div>
            <p className="text-sm text-brand-text-secondary/60 mt-4">No credit card required • 2-minute setup • Real insights</p>
          </div>

          {/* Hero Visual - Analysis Dashboard */}
          <div className="mt-12 max-w-6xl mx-auto">
            <div className="relative">
              {/* Subtle fade effect */}
              <div className="absolute inset-0 z-10 pointer-events-none" style={{background: 'linear-gradient(to top, white 0%, transparent 15%, transparent 85%, white 100%)'}}></div>

              {/* Main Dashboard Container */}
              <div className="rounded-lg border border-brand-gray-border overflow-hidden" style={{
                boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.2), 0 8px 24px -8px rgba(0, 0, 0, 0.15)'
              }}>
                {/* Browser Chrome */}
                <div className="bg-gray-100 px-4 py-3 flex items-center gap-3 border-b border-brand-gray-border">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded border border-brand-gray-border max-w-md w-full">
                      <svg className="w-3.5 h-3.5 text-brand-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-xs text-brand-text-tertiary font-medium">galo.ai/analysis/ecommerce-homepage</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="bg-white p-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-gray-border">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-black text-brand-black">shopify-store.com</h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded text-xs font-bold text-green-700">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Complete
                        </span>
                      </div>
                      <p className="text-sm text-brand-text-tertiary">Analyzed 2 minutes ago</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-black text-brand-gold">8</div>
                        <div className="text-xs text-brand-text-tertiary font-medium">Opportunities</div>
                      </div>
                    </div>
                  </div>

                  {/* Priority Recommendations */}
                  <div className="space-y-3">
                    {/* High Priority */}
                    <div className="group bg-gradient-to-r from-green-50/50 to-transparent border-l-4 border-green-500 p-4 rounded-r transition-all hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 rounded text-xs font-black text-green-700">
                              HIGH PRIORITY
                            </span>
                            <span className="text-xs font-bold text-brand-text-tertiary">Hero CTA • Above Fold</span>
                          </div>
                          <h4 className="font-black text-brand-black mb-1.5">Hero CTA lacks urgency and clarity on value proposition</h4>
                          <p className="text-sm text-brand-text-secondary leading-relaxed mb-3">
                            Primary button reads "Get Started" with no context. Users don't know what they're starting or why. Test "Start Free 14-Day Trial" with micro-copy "No credit card required" to reduce friction and set clear expectations.
                          </p>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-brand-text-secondary">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <span>Est. +12-18% CTR</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-brand-text-tertiary">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span>Copy + Design</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Medium Priority */}
                    <div className="group bg-gradient-to-r from-yellow-50/50 to-transparent border-l-4 border-yellow-500 p-4 rounded-r transition-all hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-yellow-100 rounded text-xs font-black text-yellow-700">
                              MEDIUM PRIORITY
                            </span>
                            <span className="text-xs font-bold text-brand-text-tertiary">Trust Signals • Social Proof</span>
                          </div>
                          <h4 className="font-black text-brand-black mb-1.5">Zero credibility indicators visible before first scroll</h4>
                          <p className="text-sm text-brand-text-secondary leading-relaxed mb-3">
                            No logos, testimonials, or user counts above fold. For B2B SaaS, trust is critical pre-signup. Add customer logo bar (5-7 recognizable brands) or social proof metric ("Join 10,000+ marketing teams") immediately below hero.
                          </p>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-brand-text-secondary">
                              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <span>Est. +7-11% Trust</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-brand-text-tertiary">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Design + Assets</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                            <svg className="w-5 h-5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Win */}
                    <div className="group bg-gradient-to-r from-blue-50/50 to-transparent border-l-4 border-blue-500 p-4 rounded-r transition-all hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 rounded text-xs font-black text-blue-700">
                              QUICK WIN
                            </span>
                            <span className="text-xs font-bold text-brand-text-tertiary">Form Friction • Checkout Flow</span>
                          </div>
                          <h4 className="font-black text-brand-black mb-1.5">Signup form requests phone number without explanation</h4>
                          <p className="text-sm text-brand-text-secondary leading-relaxed mb-3">
                            Phone field is required but users don't understand why. This creates unnecessary friction and form abandonment. Either make it optional or add context: "For order updates only (never spam)". Consider A/B testing removal entirely.
                          </p>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-brand-text-secondary">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <span>Est. +15-22% Completion</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-brand-text-tertiary">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                              <span>Code Change</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View All CTA */}
                  <div className="mt-6 pt-4 border-t border-brand-gray-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-brand-text-tertiary">+5 more opportunities</span>
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-black text-sm font-black rounded hover:shadow-lg transition-all">
                        View Full Report
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-gray-50 border-y border-brand-gray-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-brand-text-secondary/60 mb-8 tracking-wider uppercase">Trusted by growth teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-40">
            <div className="text-2xl font-bold text-brand-text-secondary">BRAND A</div>
            <div className="text-2xl font-bold text-brand-text-secondary">BRAND B</div>
            <div className="text-2xl font-bold text-brand-text-secondary">BRAND C</div>
            <div className="text-2xl font-bold text-brand-text-secondary">BRAND D</div>
            <div className="text-2xl font-bold text-brand-text-secondary">BRAND E</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-brand-black mb-4">
              From Landing Page to Action Plan in 30 Seconds
            </h2>
            <p className="text-xl text-brand-text-secondary">No spreadsheets. No guesswork. Just clear CRO experiments.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-gold/10 rounded border border-brand-gold/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-brand-black mb-3">1. Paste Your Link</h3>
              <p className="text-brand-text-secondary">
                Drop in your landing page URL and your funnel metrics. That's it.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-brand-gold/10 rounded border border-brand-gold/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-brand-black mb-3">2. AI Finds the Leaks</h3>
              <p className="text-brand-text-secondary">
                Our vision AI scans your page and pinpoints exactly where visitors drop off.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-brand-gold/10 rounded border border-brand-gold/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-brand-black mb-3">3. Get Testable CRO Ideas</h3>
              <p className="text-brand-text-secondary">
                Receive a prioritized roadmap of experiments with expected lift estimates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-brand-black mb-4">
              Built for DTC Growth Teams
            </h2>
            <p className="text-xl text-brand-text-secondary">Stop guessing. Start testing what actually moves the needle.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded border border-brand-gray-border transition-all duration-200 hover:border-brand-gold/30">
              <div className="w-12 h-12 bg-brand-gold/10 rounded flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-brand-black mb-2">Instant Analysis</h3>
              <p className="text-brand-text-secondary">No setup, no pixel installation. Get insights in seconds, not days.</p>
            </div>

            <div className="bg-white p-8 rounded border border-brand-gray-border transition-all duration-200 hover:border-brand-gold/30">
              <div className="w-12 h-12 bg-brand-gold/10 rounded flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-brand-black mb-2">Measurable Experiments</h3>
              <p className="text-brand-text-secondary">Every recommendation includes expected lift and implementation difficulty.</p>
            </div>

            <div className="bg-white p-8 rounded border border-brand-gray-border transition-all duration-200 hover:border-brand-gold/30">
              <div className="w-12 h-12 bg-brand-gold/10 rounded flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-brand-black mb-2">Vision AI Analysis</h3>
              <p className="text-brand-text-secondary">GPT-5 vision scans your page like a real customer would see it.</p>
            </div>

            <div className="bg-white p-8 rounded border border-brand-gray-border transition-all duration-200 hover:border-brand-gold/30">
              <div className="w-12 h-12 bg-brand-gold/10 rounded flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-brand-black mb-2">Full Funnel Context</h3>
              <p className="text-brand-text-secondary">Analyzes LP → ATC → Checkout flow with your actual metrics.</p>
            </div>

            <div className="bg-white p-8 rounded border border-brand-gray-border transition-all duration-200 hover:border-brand-gold/30">
              <div className="w-12 h-12 bg-brand-gold/10 rounded flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-brand-black mb-2">Privacy First</h3>
              <p className="text-brand-text-secondary">Your data stays yours. We never share or sell customer information.</p>
            </div>

            <div className="bg-white p-8 rounded border border-brand-gray-border transition-all duration-200 hover:border-brand-gold/30">
              <div className="w-12 h-12 bg-brand-gold/10 rounded flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-brand-black mb-2">ROI Calculator</h3>
              <p className="text-brand-text-secondary">See the revenue impact of each recommended test before you run it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-brand-gold rounded p-12 border border-brand-gold">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black mb-4 text-brand-black">Real Results, Real Revenue</h2>
              <p className="text-xl text-brand-black/70">Our customers see measurable lift in 2-4 weeks</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-5xl font-black mb-2 text-brand-black">+18%</div>
                <div className="text-brand-black/70 font-bold">Average ATC Rate Lift</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black mb-2 text-brand-black">2.4x</div>
                <div className="text-brand-black/70 font-bold">ROI on First Test</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black mb-2 text-brand-black">30s</div>
                <div className="text-brand-black/70 font-bold">Time to First Insight</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-brand-black mb-6">
            Ready to Stop Guessing and Start Converting?
          </h2>
          <p className="text-xl text-brand-text-secondary mb-8">
            Join growth teams using AI to find and fix conversion leaks—fast.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-black text-white text-lg font-black rounded shadow-lg shadow-black/20 transition-all duration-300"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.backgroundColor = '#1A1A1A';
              e.currentTarget.style.boxShadow = '0 20px 50px -10px rgba(212, 165, 116, 0.6), 0 0 0 2px rgba(212, 165, 116, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.backgroundColor = '#0E0E0E';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            }}
          >
            Analyze My Page Free
          </Link>
          <p className="text-sm text-brand-text-secondary/60 mt-4">Free analysis • No credit card • 2-minute setup</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-brand-gray-border text-brand-text-secondary py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl font-black text-brand-gold">GALO</div>
              </div>
              <p className="text-sm text-brand-text-secondary/70">CRO intelligence, powered by AI, built for pros.</p>
              <p className="text-xs text-brand-text-secondary/50 mt-2 tracking-wider">PRECISION IN MOTION</p>
            </div>

            <div>
              <h3 className="font-bold text-brand-black mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup" className="hover:text-brand-gold transition-all duration-200">Start Free</Link></li>
                <li><Link href="/dashboard" className="hover:text-brand-gold transition-all duration-200">Dashboard</Link></li>
                <li><a href="#how-it-works" className="hover:text-brand-gold transition-all duration-200">How It Works</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-brand-black mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-brand-gold transition-all duration-200">About</a></li>
                <li><a href="#" className="hover:text-brand-gold transition-all duration-200">Privacy</a></li>
                <li><a href="#" className="hover:text-brand-gold transition-all duration-200">Terms</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-brand-black mb-4">Connect</h3>
              <div className="flex gap-4">
                <a href="#" className="hover:text-brand-gold transition-all duration-200">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                  </svg>
                </a>
                <a href="#" className="hover:text-brand-gold transition-all duration-200">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-brand-gray-border pt-8 text-sm text-center">
            <p className="text-brand-text-secondary/60">&copy; 2025 Galo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
