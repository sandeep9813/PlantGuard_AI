import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Leaf, User, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/detect', label: 'Detect' },
  { path: '/chat', label: 'Chat' },
  { path: '/guides', label: 'Guide' },
  { path: '/history', label: 'History' },
]

const TopNavbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    logout()
    setShowDropdown(false)
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-700 flex items-center justify-center">
            <Leaf size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-green-800">PlantGuard AI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'text-green-700 font-semibold'
                  : 'text-slate-500 hover:text-green-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="relative">
          {user ? (
            <>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-green-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">{user.name}</span>
              </button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors"
            >
              <User size={18} />
              <span className="hidden md:inline">Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopNavbar
