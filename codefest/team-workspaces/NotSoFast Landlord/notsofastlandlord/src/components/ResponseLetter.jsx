import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'

export default function ResponseLetter({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 bg-[#1E293B] px-4 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white transition cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Letter'}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white text-gray-900 rounded-xl p-6 shadow-lg"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{text}</pre>
      </motion.div>

      <p className="text-xs text-[#94A3B8] mt-4 text-center italic">
        This is legal information, not legal advice. Have this reviewed by a licensed
        attorney before sending.
      </p>
    </div>
  )
}
