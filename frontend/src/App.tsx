import { Navigate, Routes, Route } from 'react-router-dom'
import TopNavbar from './components/TopNavbar'
import BottomNavbar from './components/BottomNavbar'
import HomePage from './pages/HomePage'
import DetectionPage from './pages/DetectionPage'
import ChatPage from './pages/ChatPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import TreatmentGuidesPage from './pages/TreatmentGuidesPage'
import { useAuth } from './context/AuthContext'

function App() {
  const { user,loading } = useAuth()

  if(loading){
    return (
      <div className="min-h-screen flext items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"/>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNavbar />
      <main className="pb-24 md:pb-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/detect" element={<DetectionPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/guides" element={<TreatmentGuidesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNavbar />
    </div>
  )
}

export default App
