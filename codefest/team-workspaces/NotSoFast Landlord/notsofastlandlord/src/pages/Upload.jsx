import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ArrowLeft, Upload as UploadIcon, FileText, X, Zap } from 'lucide-react'
import FuturisticBackground from '../components/FuturisticBackground'
import { fileToBase64, fileToText, isImageFile, getMediaType } from '../utils/fileProcessor'
import { DEMO_LETTER } from '../constants/demoLetter'

const fade = (delay) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5 },
})

const CASES = [
  { id: 'just-received', icon: '📬', title: 'I just received this notice', desc: "We'll check if it's legally valid." },
  { id: 'hearing-soon', icon: '⏰', title: 'My hearing is coming up', desc: "We'll build your action timeline." },
  { id: 'something-wrong', icon: '🔍', title: 'Something seems wrong', desc: "We'll fact-check every claim." },
]

export default function UploadPage() {
  const navigate = useNavigate()
  const [caseType, setCaseType] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [demoMode, setDemoMode] = useState(false)

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      const f = accepted[0]
      setFile(f)
      setDemoMode(false)
      setPreview(isImageFile(f) ? URL.createObjectURL(f) : null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [], 'application/pdf': [], 'text/*': [] }, maxFiles: 1,
  })

  const remove = () => { setFile(null); setPreview(null); setDemoMode(false) }
  const loadDemo = () => { setFile(null); setPreview(null); setDemoMode(true) }
  const canGo = caseType && (file || demoMode)

  const go = async () => {
    if (!canGo) return
    let payload = { caseType }
    if (demoMode) payload.text = DEMO_LETTER
    else if (isImageFile(file)) { payload.imageBase64 = await fileToBase64(file); payload.mediaType = getMediaType(file) }
    else payload.text = await fileToText(file)
    navigate('/results', { state: payload })
  }

  return (
    <FuturisticBackground>
      <motion.nav {...fade(0)} className="flex items-center gap-3 px-6 py-5 max-w-lg mx-auto">
        <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white transition cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-b from-[#18CCBA] to-[#0D9488] rounded-lg flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">NotSoFast Landlord</span>
        </div>
      </motion.nav>

      <main className="max-w-lg mx-auto px-6 pb-20">
        <motion.h2 {...fade(0.1)} className="text-2xl font-bold tracking-tight">
          What's your situation?
        </motion.h2>

        <div className="space-y-2 mt-5">
          {CASES.map((c, i) => (
            <motion.button
              key={c.id}
              {...fade(0.15 + i * 0.05)}
              onClick={() => setCaseType(c.id)}
              className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                caseType === c.id
                  ? 'border-[#14B8A6]/40 bg-[#14B8A6]/[0.04]'
                  : 'border-zinc-800/80 hover:border-zinc-700 bg-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{c.icon}</span>
                <div>
                  <div className="text-sm font-medium text-white">{c.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{c.desc}</div>
                </div>
                {caseType === c.id && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto text-[#14B8A6] text-sm"
                  >✓</motion.span>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div {...fade(0.35)} className="mt-8">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Upload your notice</h3>

          <AnimatePresence mode="wait">
            {!file && !demoMode ? (
              <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div
                  {...getRootProps()}
                  className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                    isDragActive ? 'border-[#14B8A6]/40 bg-[#14B8A6]/[0.02]' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-300">Drop your notice here, or click to browse</p>
                  <p className="text-xs text-zinc-600 mt-1">Photos, PDFs, text files</p>
                </div>
                <button
                  onClick={loadDemo}
                  className="w-full mt-2 py-2.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800/60 hover:border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Zap className="w-3 h-3" /> Load demo letter
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="file"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="border border-zinc-800 rounded-xl p-4 flex items-center gap-3"
              >
                {preview ? (
                  <img src={preview} alt="" className="w-12 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="w-12 h-16 bg-zinc-800/50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{demoMode ? 'Demo: Notice to Vacate' : file.name}</p>
                  <p className="text-xs text-zinc-500">{demoMode ? 'Sample with legal issues' : `${(file.size / 1024).toFixed(1)} KB`}</p>
                </div>
                <button onClick={remove} className="text-zinc-600 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p {...fade(0.4)} className="text-[11px] text-zinc-600 mt-3 text-center">
          Your document is never stored. Analysis is deleted immediately.
        </motion.p>

        <motion.div {...fade(0.45)} className="mt-6">
          <button
            onClick={go}
            disabled={!canGo}
            className={`w-full py-3 rounded-full text-sm font-medium transition cursor-pointer ${
              canGo
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
            }`}
          >
            Analyze my notice →
          </button>
        </motion.div>
      </main>
    </FuturisticBackground>
  )
}
