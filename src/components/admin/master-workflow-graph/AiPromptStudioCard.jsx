import React, { useState } from 'react'
import { AI_IMAGE_PROMPT_TEMPLATES } from './workflowData'
import { SparkleIcon, CopyIcon, CheckIcon } from '../../ui/icons'

/**
 * AiPromptStudioCard
 * Interactive prompt engineering tool for staff to generate photorealistic luxury product
 * images using ChatGPT, Midjourney, FLUX, and DALL-E 3.
 */
export default function AiPromptStudioCard() {
  const [selectedCategory, setSelectedCategory] = useState(AI_IMAGE_PROMPT_TEMPLATES[0].key)
  const [customProduct, setCustomProduct] = useState('')
  const [copiedKey, setCopiedKey] = useState('')

  const activeTemplate =
    AI_IMAGE_PROMPT_TEMPLATES.find((t) => t.key === selectedCategory) ||
    AI_IMAGE_PROMPT_TEMPLATES[0]

  const productName = customProduct.trim() || activeTemplate.exampleItem
  const finalPrompt = activeTemplate.promptFormula.replace(/\[PRODUCT NAME\]/g, productName)

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-b from-[#160d14] to-[#0d111a] p-5 text-white shadow-xl sm:p-7">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <SparkleIcon size={20} />
          </span>
          <div>
            <h3 className="font-serif text-lg font-bold text-white sm:text-xl">
              AI Image Studio & Prompt Engineering
            </h3>
            <p className="text-xs text-white/60">
              Tested prompt formulas for ChatGPT, DALL-E 3, Midjourney v6 & FLUX.1.
            </p>
          </div>
        </div>
        <span className="self-start rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-300">
          K2 Tuscan Editorial Style
        </span>
      </div>

      {/* Category Tabs */}
      <div className="mt-5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
          Select Product Category Template
        </label>
        <div className="flex flex-wrap gap-2">
          {AI_IMAGE_PROMPT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => {
                setSelectedCategory(tpl.key)
                setCustomProduct('')
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                tpl.key === selectedCategory
                  ? 'border-rose-400 bg-rose-500/20 text-white shadow-sm'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{tpl.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Name Input */}
      <div className="mt-5">
        <label className="block text-xs font-semibold text-white/70 mb-1.5">
          Italian Product Name / Variant
        </label>
        <input
          type="text"
          value={customProduct}
          onChange={(e) => setCustomProduct(e.target.value)}
          placeholder={`e.g. ${activeTemplate.exampleItem}`}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
        />
        <p className="mt-1 text-[11px] text-white/40">
          Tip: Include specific Italian descriptors (e.g. &quot;con nocciole e cacao&quot;, &quot;al tartufo estivo&quot;, &quot;spremitura a freddo&quot;).
        </p>
      </div>

      {/* Structured Prompt Box */}
      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              Primary Photorealistic Prompt
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(finalPrompt, 'prompt')}
              className="flex items-center gap-1.5 rounded-md border border-rose-400/30 bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-200 transition-all hover:bg-rose-500/30 active:scale-95 cursor-pointer"
            >
              {copiedKey === 'prompt' ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              <span>{copiedKey === 'prompt' ? 'Copied!' : 'Copy Prompt'}</span>
            </button>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs leading-relaxed text-white/90">
            {finalPrompt}
          </div>
        </div>

        {/* Negative Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Mandatory Negative Prompt
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(activeTemplate.negativePrompt, 'negative')}
              className="flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200 transition-all hover:bg-amber-500/30 active:scale-95 cursor-pointer"
            >
              {copiedKey === 'negative' ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              <span>{copiedKey === 'negative' ? 'Copied!' : 'Copy Negative Prompt'}</span>
            </button>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-xs leading-relaxed text-white/70">
            {activeTemplate.negativePrompt}
          </div>
        </div>

        {/* Photography Notes & Aspect Ratio */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5 text-xs">
            <span className="block font-semibold uppercase tracking-wider text-white/50 text-[10px] mb-1">
              Aspect Ratio Target
            </span>
            <span className="font-mono text-sky-300 font-bold">
              {activeTemplate.recommendedAspectRatio}
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5 text-xs">
            <span className="block font-semibold uppercase tracking-wider text-white/50 text-[10px] mb-1">
              Pro Studio Tips
            </span>
            <ul className="space-y-1 text-white/70">
              {activeTemplate.tips.map((tip, idx) => (
                <li key={idx}>• {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
