import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Leaf, Lock, Mail, User, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const LoginPage = () => {
  const { user, login, signup } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    const result = await (mode === 'login' ? login(email, password) : signup(name, email, password))
    if (result.ok) {
      toast('success', mode === 'login' ? 'Welcome back!' : 'Account created successfully')
      navigate('/')
    } else {
      const msg = result.message || 'Something went wrong.'
      setError(msg)
      toast('error', msg)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="bg-green-700 text-white p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-xl"><Leaf size={24} /></div>
            <div>
              <h1 className="text-2xl font-bold">PlantGuard AI</h1>
              <p className="text-sm text-green-100">Sign in to save scans and reports.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 bg-slate-100 rounded-xl p-1">
            <button type="button" onClick={() => { setMode('login'); setError('') }}
              className={`h-12 rounded-xl font-medium text-sm transition-all ${mode === 'login' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}>Login</button>
            <button type="button" onClick={() => { setMode('signup'); setError('') }}
              className={`h-12 rounded-xl font-medium text-sm transition-all ${mode === 'signup' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}>Sign Up</button>
          </div>

          {mode === 'signup' && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 h-12 bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-green-500 outline-hidden text-sm" placeholder="Your name" />
              </div>
            </label>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 h-12 bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-green-500 outline-hidden text-sm" placeholder="you@example.com" />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 h-12 bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-green-500 outline-hidden text-sm" placeholder="Minimum 8 characters" />
            </div>
          </label>

          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

          <button type="submit"
            className="w-full h-12 bg-green-700 text-white rounded-xl font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
            <LogIn size={20} /> {mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
