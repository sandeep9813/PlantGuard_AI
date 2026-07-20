import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export { API_BASE_URL }

const TOKEN_KEY = 'plantguard_token'

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface TreatmentGuide {
  crop: string
  disease: string
  symptoms: string[]
  immediateAction: string
  treatment: string
  prevention: string
  youtubeLink: string
}

export interface PredictionResult {
  prediction: string
  confidence: number
  is_uncertain: boolean
  confidence_message: string
  heatmap: string | null
  top_3: Array<{
    class_name: string
    confidence: number
  }>
}

export interface ChatContextRequest {
  crop: string
  disease: string
  confidence: number
  question: string
  chat_history: { role: string; content: string }[]
}

export interface ChatContextResponse {
  answer: string
  sources: string[]
}

export interface ExpertTip {
  id: number
  title: string
  category: string
  content: string
  icon: string
}

export interface DashboardStats {
  total_scans: number
  monthly_scans: number
  monthly_change_percent: number
  health_score: number
  health_score_trend: string
  active_alerts: number
  alerts_priority: string
  reports_pending: number
  accuracy_rate: number
  species_count: number
}

export interface UserInfo {
  id: number
  name: string
  email: string
}

export interface AuthResult {
  token: string
  user: UserInfo
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface HistoryItem {
  id: number
  date: string
  prediction: string
  confidence: number
  preview?: string
  image_path?: string | null
  is_uncertain?: boolean
  confidence_message?: string
  heatmap?: string | null
  top_3?: Array<{ class_name: string; confidence: number }>
}

class PlantGuardApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  signup(name: string, email: string, password: string): Promise<AuthResult> {
    return axios.post(`${this.baseUrl}/auth/signup`, { name, email, password }).then(r => r.data)
  }

  login(email: string, password: string): Promise<AuthResult> {
    return axios.post(`${this.baseUrl}/auth/login`, { email, password }).then(r => r.data)
  }

  getMe(): Promise<UserInfo> {
    return axios.get(`${this.baseUrl}/auth/me`).then(r => r.data)
  }

  async predict(file: File): Promise<PredictionResult> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await axios.post(`${this.baseUrl}/predict`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  async chatWithContext(request: ChatContextRequest, sessionId?: number): Promise<ChatContextResponse> {
    const params = sessionId ? { session_id: sessionId } : undefined
    const response = await axios.post(`${this.baseUrl}/chat`, request, { params })
    return response.data
  }

  async getChatSessions(): Promise<Array<{ id: number; crop: string; disease: string; message_count: number; created_at: string }>> {
    const response = await axios.get(`${this.baseUrl}/chat/sessions`)
    return response.data
  }

  async getChatSession(sessionId: number): Promise<{ id: number; crop: string; disease: string; messages: Array<{ role: string; content: string; created_at: string }> }> {
    const response = await axios.get(`${this.baseUrl}/chat/sessions/${sessionId}`)
    return response.data
  }

  async deleteChatSession(sessionId: number): Promise<void> {
    await axios.delete(`${this.baseUrl}/chat/sessions/${sessionId}`)
  }

  async getGuides(): Promise<TreatmentGuide[]> {
    const response = await axios.get(`${this.baseUrl}/guides`)
    return response.data
  }

  async getTips(): Promise<ExpertTip[]> {
    const response = await axios.get(`${this.baseUrl}/tips`)
    return response.data
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await axios.get(`${this.baseUrl}/dashboard/stats`)
    return response.data
  }

  async getHistory(page = 1, perPage = 20): Promise<PaginatedResponse<HistoryItem>> {
    const response = await axios.get(`${this.baseUrl}/history`, { params: { page, per_page: perPage } })
    return response.data
  }

  async clearHistory(): Promise<void> {
    await axios.delete(`${this.baseUrl}/history`)
  }

  async deleteHistoryItem(id: number): Promise<void> {
    await axios.delete(`${this.baseUrl}/history/${id}`)
  }
}

export const api = new PlantGuardApiClient(API_BASE_URL)
