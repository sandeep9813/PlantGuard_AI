import { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, RefreshCw, X, Check, RotateCcw } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void
  onClose: () => void
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const webcamRef = useRef<Webcam>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const capture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) return
    setCaptured(screenshot)
  }, [])

  const retake = () => setCaptured(null)

  const usePhoto = async () => {
    if (!captured) return
    const blob = await (await fetch(captured)).blob()
    const file = new File([blob], `camera_${Date.now()}.png`, { type: 'image/png' })
    onCapture(file, captured)
  }

  const flipCamera = () => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')

  const videoConstraints = {
    facingMode,
    width: { ideal: 1080 },
    height: { ideal: 1920 },
  }

  const handleError = (err: string | DOMException) => {
    if (typeof err === 'string') setError(err)
    else if (err.name === 'NotAllowedError') setError('Camera permission denied. Please allow camera access in your browser settings.')
    else if (err.name === 'NotFoundError') setError('No camera found on this device.')
    else setError('Could not access camera.')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {captured ? (
        <>
          <div className="relative flex-1 flex items-center justify-center p-4">
            <img src={captured} alt="Captured" className="max-h-full max-w-full rounded-2xl object-contain" />
          </div>
          <div className="flex items-center justify-center gap-8 pb-10 pt-4">
            <button onClick={retake} className="flex flex-col items-center gap-1 text-white/80">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <RotateCcw size={24} />
              </div>
              <span className="text-xs">Retake</span>
            </button>
            <button onClick={usePhoto} className="flex flex-col items-center gap-1 text-white">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Check size={28} />
              </div>
              <span className="text-xs font-medium">Use Photo</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="relative flex-1">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center">
                <Camera size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Camera unavailable</p>
                <p className="text-sm text-white/60 mb-6">{error}</p>
                <button onClick={onClose} className="px-6 py-2 bg-white/20 rounded-xl text-sm font-medium">Close</button>
              </div>
            ) : (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/png"
                screenshotQuality={1}
                videoConstraints={videoConstraints}
                onUserMediaError={handleError}
                className="w-full h-full object-cover"
                mirrored={facingMode === 'user'}
                playsInline
              />
            )}
          </div>
          <div className="flex items-center justify-center gap-12 pb-10 pt-4">
            <button onClick={flipCamera} className="flex flex-col items-center gap-1 text-white/80">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <RefreshCw size={20} />
              </div>
              <span className="text-xs">Flip</span>
            </button>
            <button onClick={capture} className="flex flex-col items-center gap-1 text-white">
              <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white" />
              </div>
              <span className="text-xs font-medium">Capture</span>
            </button>
            <button onClick={onClose} className="flex flex-col items-center gap-1 text-white/80">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <X size={20} />
              </div>
              <span className="text-xs">Close</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default CameraCapture
