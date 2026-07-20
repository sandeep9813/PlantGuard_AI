import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Scan, BookOpen, MessageSquare, History, ChevronRight, ChevronLeft, Bug, FlaskConical, Sprout, Lightbulb, CheckCircle, Share2, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api, type HistoryItem, type ExpertTip, type DashboardStats } from '../services/api'
import heroImage from '../assets/image.png'
import statsImage from '../assets/image2.png'
import bgImage from '../assets/image.avif'

const seasonalInsights = [
  {
    title: 'Rust alert in Northern sector. Increase monitoring.',
    category: 'Wheat Forecast',
    color: '#22c55e',
  },
  {
    title: 'Nitrogen levels optimal in Plot B following treatment.',
    category: 'Soil Health',
    color: '#15803d',
  },
]

const HomePage = () => {
  const { user } = useAuth()
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([])

  const [allHistory, setAllHistory] = useState<HistoryItem[]>([])

  const [tips, setTips] = useState<ExpertTip[]>([])
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>()
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    api.getDashboardStats().then(setDashboardStats).catch(() => {})
  }, [])

  useEffect(() => {
    api.getTips()
      .then((data: ExpertTip[]) => {
        setTips(data)
        setCurrentTipIndex(0)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (tips.length === 0) return
    autoPlayRef.current = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length)
    }, 5000)
    return () => clearInterval(autoPlayRef.current)
  }, [tips.length])

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % (tips.length || 1))
    clearInterval(autoPlayRef.current)
  }

  const prevTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + (tips.length || 1)) % (tips.length || 1))
    clearInterval(autoPlayRef.current)
  }

  useEffect(() => {
    api.getHistory(1, 2)
      .then(data => {
        setAllHistory(data.items)
        setRecentHistory(data.items)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      {/* Desktop Hero */}
      <section className="relative min-h-179 hidden lg:flex items-center overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-5 pointer-events-none bg-linear-to-l from-green-800 to-transparent" />
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10 px-6">
          <div className="space-y-6">
            
            <h1 className="text-5xl leading-tight font-bold tracking-tight text-slate-900 max-w-xl">
              Identify crop health <span className="italic font-normal">instantly.</span>
            </h1>
            <p className="text-lg leading-relaxed text-slate-600 max-w-lg">
              Leverage high-fidelity AI diagnostics to detect diseases, pests, and nutrient deficiencies. Professional agronomy, simplified for the field.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/detect"
                className="h-12 px-8 inline-flex items-center justify-center gap-2 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 active:scale-[0.98]"
              >
                <Scan size={20} />
                Start Plant Detection
              </Link>
              <Link
                to="/guides"
                className="h-12 px-8 inline-flex items-center justify-center gap-2 border border-slate-300 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50 transition-all active:scale-[0.98]"
              >
                Explore Treatment Guides
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
              <img src={heroImage} alt="Crop field" className="w-full h-125 object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-green-900/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Crop Status: Healthy</p>
                    <p className="text-xs font-medium text-slate-500">Confidence Score: 99.2%</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">Species</p>
                  <p className="text-xs font-medium text-slate-500">Zea mays (Corn)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Hero */}
      <div className="lg:hidden px-6 pt-6 pb-4">
        <section className="mb-8">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-500 uppercase">Welcome back,</span>
            <h2 className="text-3xl font-semibold text-slate-900">{user?.name || 'Chief Agronomist'}</h2>
            <p className="text-sm text-slate-500 max-w-[80%] mt-1">The morning dew is perfect for high-fidelity scanning.</p>
          </div>
        </section>

        <section className="mb-8">
          <Link to="/detect" className="relative group cursor-pointer overflow-hidden rounded-2xl bg-green-700 h-56 flex flex-col justify-end p-6 shadow-md active:scale-[0.98] transition-all duration-200 ">
            <img src={heroImage} alt="Leaf close-up" className="absolute inset-0 w-full h-full object-cover z-0" />
            <div className="absolute inset-0 bg-linear-to-t from-green-900 via-green-900/40 to-transparent opacity-90 z-10" />
            <div className="relative z-20 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center scan-glow">
                  <Scan size={28} className="text-white" />
                </div>
                <span className="text-sm font-medium text-green-100 uppercase tracking-wider">Field Ready</span>
              </div>
              <h3 className="text-3xl font-bold text-white leading-tight">Detect Disease</h3>
              <p className="text-sm text-slate-200 opacity-90">Instant AI diagnosis from a single photo.</p>
            </div>
          </Link>
        </section>
      </div>

      {/* Features / Bento Grid */}
      <section className="px-6 pb-12 lg:pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Desktop section header */}
          <div className="hidden lg:flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-slate-900">Precision Agronomy Suite</h2>
              <p className="text-base text-slate-500">Everything you need to nurture a flourishing harvest.</p>
            </div>
          </div>

          {/* Mobile 2-col grid */}
          <div className="lg:hidden grid grid-cols-2 gap-4 mb-12">
            <Link to="/guides" className="glass-card rounded-2xl p-5 flex flex-col gap-4 transition-all active:bg-white active:scale-[0.98]">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <BookOpen size={24} className="text-green-700" />
              </div>
              <div>
                <h4 className="text-xl font-semibold text-slate-900">Guide</h4>
                <p className="text-sm text-slate-500 mt-1">Protocols for 38+ crops.</p>
              </div>
            </Link>
            <Link to="/chat" className="glass-card rounded-2xl p-5 flex flex-col gap-4 transition-all active:bg-white active:scale-[0.98]">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <MessageSquare size={24} className="text-green-700" />
              </div>
              <div>
                <h4 className="text-xl font-semibold text-slate-900">Chat</h4>
                <p className="text-sm text-slate-500 mt-1">24/7 Expert AI Advisor.</p>
              </div>
            </Link>
            <Link to="/history" className="col-span-2 glass-card rounded-2xl p-5 flex items-center justify-between transition-all active:bg-white active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <History size={24} className="text-green-700" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-900">Recent Scans</h4>
                  <p className="text-sm text-slate-500 mt-0.5">{allHistory.length > 0 ? `Review last ${allHistory.length} field ${allHistory.length === 1 ? 'diagnosis' : 'diagnoses'}.` : 'No scans yet'}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </Link>
          </div>

          {/* Desktop bento grid */}
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-6 h-auto lg:h-150">
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between overflow-hidden relative transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-slate-300 duration-200">
              <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-green-700 text-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <Scan size={32} />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-2">Plant Disease Detection</h3>
                <p className="text-base text-slate-800 max-w-md">
                  Snap a photo to identify over 300+ crop species and diseases instantly. Our neural engine analyzes patterns invisible to the naked eye.
                </p>
                <Link to="/detect" className="mt-4 inline-flex h-12 px-6 items-center gap-2 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-all active:scale-[0.98]">
                  Launch Scanner
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-green-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-4">
                  <Bug size={32} className="text-green-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Pest ID</p>
                    <p className="text-xs font-medium text-slate-500">Identify threats</p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-4">
                  <FlaskConical size={32} className="text-green-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Nutrients</p>
                    <p className="text-xs font-medium text-slate-500">Deficiency analysis</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-green-500/5 blur-3xl" />
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-slate-300 duration-200">
                <div>
                  <div className="w-12 h-12 bg-green-100 text-green-700 rounded-xl flex items-center justify-center mb-4">
                    <History size={24} />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 mb-1">Field History</h3>
                  <p className="text-sm text-slate-500">Track observations and historical health trends across your acreage.</p>
                </div>
                <div className="mt-4 space-y-3">
                  {recentHistory.length > 0 ? recentHistory.map((item) => {
                    const parts = item.prediction.split(' - ')
                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-xs font-medium">{item.date.split(',')[0]} - {parts[0]}</span>
                        <span className={`text-xs font-medium ${item.confidence >= 70 ? 'text-green-600' : item.is_uncertain ? 'text-amber-600' : 'text-red-600'}`}>
                          {parts[1] || item.prediction}
                        </span>
                      </div>
                    )
                  }) : (
                    <>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-xs font-medium text-slate-400">No scans yet</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-green-700 text-white rounded-2xl p-8 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] duration-200">
                <div>
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                    <Lightbulb size={24} />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-200">
                      {tips.length > 0 ? tips[currentTipIndex].category : 'Tips'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={prevTip} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                        <ChevronLeft size={14} />
                      </button>
                      <button onClick={nextTip} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                  {tips.length > 0 ? (
                    <div key={currentTipIndex}>
                      <h3 className="text-xl font-semibold text-white mb-2">{tips[currentTipIndex].title}</h3>
                      <p className="text-sm text-white/80 leading-relaxed">{tips[currentTipIndex].content}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">Loading expert tips...</p>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {tips.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setCurrentTipIndex(i); clearInterval(autoPlayRef.current) }}
                        className={`h-2 rounded-full transition-all cursor-pointer ${i === currentTipIndex ? 'w-5 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                      />
                    ))}
                  </div>
                  <Link
                    to="/chat"
                    className="inline-flex items-center gap-1 text-xs font-medium text-green-200 hover:text-white transition-colors"
                  >
                    Ask AI for Details <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Treatment Guide Row */}
          <div className="hidden lg:block mt-30 bg-slate-50  rounded-2xl p-8 md:flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-slate-300 duration-200">
            <div className="md:flex items-center gap-8">
              <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 flex items-center justify-center mb-4 md:mb-0 shadow-sm">
                <Sprout size={36} className="text-green-600" />
              </div>
              <div className="max-w-xl">
                <h3 className="text-2xl font-semibold text-slate-900">Treatment Guide</h3>
                <p className="text-base text-slate-500">
                  Comprehensive library of organic and professional treatments for detected diseases. Step-by-step guidance on application, safety, and monitoring.
                </p>
              </div>
            </div>
            <Link to="/guides" className="mt-4 md:mt-6 h-12 px-8 inline-flex items-center justify-center border border-slate-300 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50 transition-all active:scale-[0.98]">
              Browse Encyclopedia
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section (Desktop) */}
      <section className="hidden lg:block pb-12 px-6">
        <div className="max-w-7xl mx-auto rounded-2xl overflow-hidden bg-green-700 relative py-12">
          <img src={statsImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="relative z-10 text-center px-8 max-w-3xl mx-auto space-y-6">
            <h2 className="text-5xl leading-tight font-bold tracking-tight text-white">Rooted in Data. Grown with Care.</h2>
            <p className="text-lg leading-relaxed text-green-100">
              Our platform combines decades of botanical research with state-of-the-art computer vision to ensure every diagnostic is precise, actionable, and sustainable.
            </p>
            <div className="pt-6 flex flex-wrap justify-center gap-4">
              <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white">
                <p className="text-[40px] leading-none font-bold mb-2">{dashboardStats ? `${dashboardStats.accuracy_rate.toFixed(1)}%` : '...'}</p>
                <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Accuracy Rate</p>
              </div>
              <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white">
                <p className="text-[40px] leading-none font-bold mb-2">{dashboardStats ? dashboardStats.total_scans : '...'}</p>
                <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Total Scans</p>
              </div>
              <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white">
                <p className="text-[40px] leading-none font-bold mb-2">{dashboardStats ? `${dashboardStats.species_count}+` : '...'}</p>
                <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Species Indexed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seasonal Insights (Mobile) */}
      <section className="lg:hidden mb-8 px-6">
        <h5 className="text-sm font-medium text-slate-500 mb-4">Seasonal Insights</h5>
        <div className="flex overflow-x-auto gap-4 pb-6 no-scrollbar -mx-6 px-6">
          {seasonalInsights.map((item, idx) => (
            <div key={idx} className="min-w-70 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <img src={heroImage} alt={item.category} className="h-32 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-slate-500">{item.category}</span>
                </div>
                <p className="text-base font-semibold text-slate-900">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <footer className="hidden lg:block bg-white border-t border-slate-200 py-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Sprout className="text-green-600 text-2xl" />
            <span className="text-xl font-bold text-green-700">PlantGuard AI</span>
          </div>
          <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
            Empowering farmers and agronomists with world-class AI diagnostics
            and professional remediation guidance.
          </p>
          <div className="flex gap-3">
            <a className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-green-700 hover:bg-green-500 hover:text-white transition-all duration-200" href="#">
              <Share2 size={18} />
            </a>
            <a className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-green-700 hover:bg-green-500 hover:text-white transition-all duration-200" href="#">
              <Mail size={18} />
            </a>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/detect" className="hover:text-green-700 transition-colors">Disease Detection</Link></li>
            <li><Link to="/guides" className="hover:text-green-700 transition-colors">Treatment Library</Link></li>
            <li><Link to="/chat" className="hover:text-green-700 transition-colors">Consultation Hub</Link></li>
            <li><Link to="/history" className="hover:text-green-700 transition-colors">History Tracking</Link></li>
          </ul>
        </div>

      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
        <p>&copy; 2025 PlantGuard AI. All rights reserved.</p>
        <p>Made for sustainable growth.</p>
      </div>
    </footer>
    </>
  )
}

export default HomePage
