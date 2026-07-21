import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Loader2, Sparkles, Youtube, ExternalLink, Paperclip, History, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { motion } from 'framer-motion'
import { useToast } from '../components/Toast'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatContext {
  crop: string
  disease: string
  confidence: number
}

const WELCOME = "Hello! I'm your PlantGuard Assistant. I can help you diagnose crop diseases or interpret soil reports using our professional research library. How can I assist you today?"

const ChatPage = () => {
  const { toast } = useToast()
  const location = useLocation()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [context, setContext] = useState<ChatContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessions, setSessions] = useState<Array<{ id: number; crop: string; disease: string; message_count: number; created_at: string }>>([])
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const autoQueryDone = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  const loadSessions = async () => {
    try {
      const data = await api.getChatSessions()
      setSessions(data)
    } catch { /* ignore */ }
  }

  const startNewChat = () => {
    autoQueryDone.current = false
    setMessages([{ role: 'assistant', content: WELCOME, timestamp: new Date() }])
    setSessionId(null)
    setContext(null)
    setShowHistory(false)
  }

  useEffect(() => {
    loadSessions()
    const state = location.state as Record<string, unknown> | null
    if (!state?.query) {
      startNewChat()
      return
    }
    if (autoQueryDone.current) return
    autoQueryDone.current = true

    setMessages([{ role: 'assistant', content: WELCOME, timestamp: new Date() }])

    const query = state.query as string
    const newContext: ChatContext | null =
      state.crop && state.disease
        ? { crop: state.crop as string, disease: state.disease as string, confidence: state.confidence as number }
        : null

    if (newContext) setContext(newContext)
    window.history.replaceState({}, document.title)

    const performAutoQuery = async () => {
      setMessages(prev => [...prev, { role: 'user', content: query, timestamp: new Date() }])
      setLoading(true)
      try {
        const response = await api.chatWithContext({
          crop: newContext?.crop || '', disease: newContext?.disease || '',
          confidence: newContext?.confidence || 0, question: query, chat_history: []
        })
        setMessages(prev => [...prev, { role: 'assistant', content: response.answer, timestamp: new Date() }])
        if (response.session_id) setSessionId(response.session_id)
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to my knowledge base. Please make sure the backend is running.", timestamp: new Date() }])
        toast('error', 'Chat unavailable — backend may be offline')
      } finally {
        setLoading(false)
        loadSessions()
      }
    }
    performAutoQuery()
  }, [location.state])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage, timestamp: new Date() }]
    setMessages(updatedMessages)
    setLoading(true)
    try {
      const history = updatedMessages.map(m => ({ role: m.role, content: m.content }))
      const response = await api.chatWithContext({
        crop: context?.crop || '', disease: context?.disease || '',
        confidence: context?.confidence || 0, question: userMessage, chat_history: history.slice(0, -1)
      }, sessionId ?? undefined)
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer, timestamp: new Date() }])
      if (response.session_id) setSessionId(response.session_id)
      loadSessions()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to my knowledge base. Please make sure the backend is running.", timestamp: new Date() }])
      toast('error', 'Chat response failed')
    } finally { setLoading(false) }
  }

  const restoreSession = async (id: number) => {
    try {
      const data = await api.getChatSession(id)
      setMessages(data.messages.map(m => {
        const d = new Date(m.created_at)
        return { role: m.role as 'user' | 'assistant', content: m.content, timestamp: isNaN(d.getTime()) ? new Date() : d }
      }))
      setSessionId(id)
      if (data.crop) setContext({ crop: data.crop, disease: data.disease || '', confidence: 0 })
      setShowHistory(false)
    } catch {
      toast('error', 'Failed to load session')
    }
  }

  const deleteSession = async (id: number) => {
    try {
      await api.deleteChatSession(id)
      loadSessions()
      if (sessionId === id) startNewChat()
      toast('success', 'Conversation deleted')
    } catch {
      toast('error', 'Failed to delete')
    }
  }

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return <h3 key={i} className="text-xl font-bold text-slate-900 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>
      if (line.startsWith('**')) {
        const parts = line.split('**')
        return <p key={i} className="mb-1"><span className="font-bold text-slate-900">{parts[1]}</span>{parts[2]}</p>
      }
      if (line.startsWith('- '))
        return <li key={i} className="ml-4 list-disc text-slate-600 mb-1">{line.substring(2)}</li>
      if (line.includes('https://www.youtube.com')) {
        const url = line.split(': ')[1]
        return (
          <div key={i} className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-600">
              <Youtube size={24} />
              <span className="font-bold">Watch Treatment Guide</span>
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-colors flex items-center gap-2">
              Open YouTube <ExternalLink size={14} />
            </a>
          </div>
        )
      }
      return <p key={i} className="text-slate-600 mb-1">{line}</p>
    })
  }


  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col px-6 pt-6">
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">PlantGuard AI Chat</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-500">
                  {context
                    ? `${context.crop} - ${context.disease} (${context.confidence.toFixed(1)}%)`
                    : 'Knowledge Base Active'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { loadSessions(); setShowHistory(!showHistory) }}
              className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all relative">
              <History size={20} />
              {sessions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{sessions.length}</span>
              )}
            </button>
          </div>
        </div>

        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="border-b border-slate-200 bg-slate-50 px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Past Conversations</span>
              <button onClick={() => { startNewChat(); setShowHistory(false) }}
                className="text-xs font-medium text-green-600 hover:text-green-700">+ New Chat</button>
            </div>
            {sessions.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No saved conversations yet</p>}
            {sessions.map(s => (
              <div key={s.id} onClick={() => restoreSession(s.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all text-sm ${sessionId === s.id ? 'bg-green-50 border border-green-200' : 'bg-white border border-slate-200 hover:border-green-200'}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{s.crop || 'General'} {s.disease ? `- ${s.disease}` : ''}</p>
                  <p className="text-xs text-slate-400">{s.message_count} messages · {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors shrink-0 ml-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 chat-scrollbar bg-slate-50">
          <div className="flex justify-center">
            <span className="text-xs font-medium text-slate-500 bg-slate-200 rounded-full px-4 py-1">Today</span>
          </div>

          {messages.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                <div className={`p-4 ${
                  msg.role === 'user'
                    ? 'message-gradient text-white rounded-xl rounded-tr-none shadow-md'
                    : 'bg-white border border-slate-200 rounded-xl shadow-sm'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-slate-900">PlantGuard AI</span>
                      <span className="verified-badge">Verified</span>
                    </div>
                  )}
                  <div className={`whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user' ? 'text-white text-base' : 'text-base text-slate-600'
                  }`}>
                    {msg.role === 'user' ? msg.content : formatContent(msg.content)}
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400 mt-1 ml-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex flex-col items-start max-w-[85%]">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                    <span className="text-sm text-slate-500">PlantGuard is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="max-w-3xl mx-auto">
            {/* <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase">Suggested queries:</span>
              {suggestedQueries.map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full transition-colors text-slate-500">
                  {q}
                </button>
              ))}
            </div> */}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white border border-slate-300 rounded-xl focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/5 transition-all shadow-sm overflow-hidden">
                <button type="button" className="p-3 text-slate-400 hover:text-green-600 transition-colors">
                  <Paperclip size={20} />
                </button>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe symptoms or ask a question..."
                  className="flex-1 border-none focus:ring-0 outline-none text-base py-3 px-1 placeholder:text-slate-400" />
                
              </div>
              <button type="submit" disabled={!input.trim() || loading}
                className="bg-green-500 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-green-600 active:scale-[0.98] transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={20} />
              </button>
            </form>
            <p className="text-xs text-center text-slate-400 mt-3">
              PlantGuard AI can make mistakes. Consider professional agronomic review for critical decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage
