import { useState, useEffect } from 'react'
import { History as HistoryIcon, Trash2, Calendar, Activity, ChevronRight, ChevronLeft, Search, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { api, API_BASE_URL, type HistoryItem } from '../services/api'

const PER_PAGE = 20

const HistoryPage = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchHistory = (p: number) => {
    setLoading(true)
    api.getHistory(p, PER_PAGE)
      .then(data => {
        setHistory(data.items)
        setTotalPages(data.total_pages)
        setPage(data.page)
      })
      .catch(() => {
        setHistory([])
        toast('error', 'Failed to load history')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHistory(1)
  }, [])

  const clearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all history?')) return
    try {
      await api.clearHistory()
      toast('success', 'History cleared')
      fetchHistory(1)
    } catch {
      toast('error', 'Failed to clear history')
    }
  }

  const deleteItem = async (id: number) => {
    try {
      await api.deleteHistoryItem(id)
      toast('success', 'Scan removed')
      fetchHistory(page)
    } catch {
      toast('error', 'Failed to delete scan')
    }
  }

  const imageUrl = (item: HistoryItem) => {
    if (item.preview) return item.preview
    if (item.image_path) return `${API_BASE_URL}${item.image_path}`
    return ''
  }

  const filteredHistory = history.filter(item =>
    item.prediction.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-6 pt-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-semibold text-slate-900 flex items-center gap-3">
            <HistoryIcon className="text-green-600" /> Detection History
          </h2>
          <p className="text-slate-500">Review scans saved for {user?.name}.</p>
        </div>
        {history.length > 0 && (
          <button onClick={clearHistory} className="flex items-center gap-2 h-12 px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all text-sm font-medium">
            <Trash2 size={16} /> Clear All
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex h-32 animate-pulse">
              <div className="w-32 h-full bg-slate-200" />
              <div className="flex-1 p-4 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Search history by disease name..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-hidden transition-all shadow-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHistory.map((item) => (
              <div key={item.id} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-all flex h-32">
                <div className="w-32 h-full bg-slate-100 shrink-0 relative overflow-hidden">
                  <img src={imageUrl(item)} alt={item.prediction} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{item.prediction}</h3>
                      <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <div className="flex items-center gap-1"><Calendar size={12} />{item.date?.split(',')[0]}</div>
                      <div className="flex items-center gap-1"><Activity size={12} />{item.confidence.toFixed(1)}% Match</div>
                    </div>
                    {item.is_uncertain && <div className="flex items-center gap-1 text-xs text-amber-600 mt-2"><AlertTriangle size={12} />Low confidence</div>}
                  </div>
                  <Link to="/chat" state={{ query: item.prediction, crop: item.prediction.split(' - ')[0], disease: item.prediction.split(' - ').slice(1).join(' - '), confidence: item.confidence }}
                    className="text-xs font-bold text-green-600 flex items-center gap-1 hover:gap-2 transition-all mt-auto">
                    Get Treatment Advice <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {filteredHistory.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-500">No matching scans found for "{searchTerm}".</p>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button onClick={() => fetchHistory(page - 1)} disabled={page <= 1}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <button onClick={() => fetchHistory(page + 1)} disabled={page >= totalPages}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 space-y-4">
          <div className="p-4 bg-slate-100 rounded-full w-fit mx-auto text-slate-400"><HistoryIcon size={48} /></div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">No scans yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto">Upload images in the Detection page to start building your history.</p>
          </div>
          <Link to="/detect" className="h-12 inline-flex items-center px-8 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all active:scale-[0.98]">Start Scanning</Link>
        </div>
      )}
    </div>
  )
}

export default HistoryPage
