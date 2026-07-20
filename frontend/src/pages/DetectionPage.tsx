import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link } from 'react-router-dom'
import { Upload, Camera, X, Loader2, CheckCircle2, AlertTriangle, Download, Flame, MessageSquare } from 'lucide-react'
import { api, API_BASE_URL, PredictionResult } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import CameraCapture from '../components/CameraCapture'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const DetectionPage = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraMode, setCameraMode] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const heatmapUrl = (path: string | null | undefined) => {
    if (!path || path.startsWith('data:')) return path || ''
    return `${API_BASE_URL}${path}`
  }

  const handleCapture = useCallback((file: File, preview: string) => {
    setFile(file)
    setPreview(preview)
    setResult(null)
    setError(null)
    setCameraMode(false)
  }, [])

  const handleGalleryPick = () => {
    galleryInputRef.current?.click()
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
    setResult(null)
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, multiple: false
  })

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.predict(file)
      setResult(data)
      toast('success', 'Analysis complete')
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to analyze image. Please check if the backend is running.'
      setError(msg)
      toast('error', msg)
    } finally { setLoading(false) }
  }

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null) }

  const reportRef = useRef<HTMLDivElement>(null)

  const downloadReport = async () => {
    if (!result || !preview || !reportRef.current) return

    const el = reportRef.current
    el.style.left = '0'
    el.style.top = '0'

    const images = el.querySelectorAll('img')
    await Promise.all(Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => { img.onload = resolve; img.onerror = resolve })
    }))
    await new Promise((r) => setTimeout(r, 200))

    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`PlantGuard_Report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      el.style.left = '-9999px'
      el.style.top = '0'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-6 pt-6 pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-semibold text-slate-900">Disease Detection</h2>
        <p className="text-base text-slate-500">Upload a high-quality photo of a plant leaf for accurate analysis.</p>
      </div>

      {cameraMode && <CameraCapture onCapture={handleCapture} onClose={() => setCameraMode(false)} />}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md">
        {!preview ? (
          <div>
            <div className="md:hidden flex gap-3 mb-4">
              <button onClick={() => setCameraMode(true)}
                className="flex-1 flex items-center justify-center gap-2 h-14 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-all active:scale-[0.98]">
                <Camera size={20} /> Take Photo
              </button>
              <button onClick={handleGalleryPick}
                className="flex-1 flex items-center justify-center gap-2 h-14 bg-green-50 text-green-700 border border-green-200 rounded-xl font-medium hover:bg-green-100 transition-all active:scale-[0.98]">
                <Upload size={20} /> Upload
              </button>
              <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) { setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setError(null) }
                }} />
            </div>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-green-500 hover:bg-green-50'}`}>
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-green-50 rounded-full">
                  <Upload size={32} className="text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">Click to upload or drag and drop</p>
                  <p className="text-slate-500">PNG, JPG, JPEG (Max 10MB)</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative aspect-video max-h-[400px] bg-slate-100 rounded-xl overflow-hidden group">
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              {!loading && !result && (
                <button onClick={reset} className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-full shadow-lg hover:opacity-90 transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3">
                <AlertTriangle size={20} /><p>{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              {!result ? (
                <button onClick={handleUpload} disabled={loading}
                  className="h-12 px-12 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg flex items-center gap-3 active:scale-[0.98]">
                  {loading ? <><Loader2 size={24} className="animate-spin" /> Analyzing Image...</> : 'Run Analysis'}
                </button>
              ) : (
                <button onClick={reset} className="h-12 px-8 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-all">Scan Another Leaf</button>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border-t-4 border-t-green-500 p-8 shadow-md border border-slate-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-1">Primary Prediction</h3>
                  <p className="text-3xl font-bold text-slate-900">{result.prediction}</p>
                </div>
                <div className={`${result.is_uncertain ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'} px-4 py-2 rounded-xl font-bold text-xl`}>
                  {result.confidence.toFixed(1)}%
                </div>
              </div>
              <div className="space-y-4">
                <div className={`${result.is_uncertain ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'} border rounded-xl p-4 flex items-start gap-3`}>
                  {result.is_uncertain ? <AlertTriangle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5" />}
                  <p>{result.confidence_message}</p>
                </div>
                <p className="text-slate-500">You can ask PlantGuard AI in the chat section for detailed treatment instructions for this result.</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={downloadReport} className="flex items-center gap-2 h-12 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all active:scale-[0.98]">
                    <Download size={18} /> Report
                  </button>
                  {(() => {
                    const parts = result.prediction.split(' - '); const crop = parts[0]; const disease = parts.slice(1).join(' - ');
                    const state = { crop, disease, confidence: result.confidence, query: `How do I treat ${disease} in ${crop}?` };
                    return (
                      <Link to="/chat" state={state} className="flex items-center gap-2 h-12 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all active:scale-[0.98]">
                        <MessageSquare size={18} /> Ask PlantGuard AI
                      </Link>
                    );
                  })()}
                  <div className="flex items-center gap-2 text-green-600 font-medium"><CheckCircle2 size={18} /><span>Analysis Complete</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h4 className="font-semibold text-slate-900 mb-4">Top 3 Predictions</h4>
              <div className="space-y-3">
                {result.top_3.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-600 truncate max-w-[150px]">{item.class_name}</span>
                      <span className="text-slate-500">{item.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${item.confidence}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.heatmap && (
              <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="text-rose-500" size={20} />
                  <h4 className="font-semibold text-slate-900">Model Attention Heatmap</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
                    <img src={preview || ''} alt="Original scan" className="w-full h-full object-contain" />
                  </div>
                  <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
                    <img src={heatmapUrl(result.heatmap)} alt="Heatmap overlay" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {result && preview && (
        <div
          ref={reportRef}
          style={{ position: 'fixed', left: '-9999px', top: 0, width: '800px', background: 'white', padding: '32px', fontFamily: 'Inter, sans-serif', color: '#0f172a', zIndex: -1 }}
        >
          <h1 style={{ color: '#15803d', fontSize: '24px', marginBottom: '4px' }}>PlantGuard AI Disease Report</h1>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Generated for {user?.name || 'User'} on {new Date().toLocaleString()}
          </p>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px', ...(result.is_uncertain ? { background: '#fff7ed', borderColor: '#fed7aa', color: '#9a3412' } : {}) }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{result.prediction}</h2>
            <p style={{ marginBottom: '4px' }}><strong>Confidence:</strong> {result.confidence.toFixed(1)}%</p>
            <p>{result.confidence_message}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ marginBottom: '8px' }}>Uploaded Image</h3>
              <img src={preview} alt="Uploaded" style={{ width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            </div>
            {result.heatmap && (
              <div>
                <h3 style={{ marginBottom: '8px' }}>Model Attention Heatmap</h3>
                <img src={heatmapUrl(result.heatmap)} alt="Heatmap" style={{ width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              </div>
            )}
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ marginBottom: '12px' }}>Top Predictions</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Disease</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result.top_3.map((item) => (
                  <tr key={item.class_name}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>{item.class_name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>{item.confidence.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetectionPage
