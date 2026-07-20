import { Link, useLocation } from 'react-router-dom'
import { Home, Scan, MessageSquare, BookOpen, History } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/detect', label: 'Detect', icon: Scan },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/guides', label: 'Guide', icon: BookOpen },
  { path: '/history', label: 'History', icon: History },
]

const BottomNavbar = () => {
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-lg border-t border-slate-200">
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-green-700 text-white'
                  : 'text-slate-500 hover:text-green-700'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavbar
