import React, { useState } from 'react'
import { AI_IMAGE_PROMPT_TEMPLATES } from './workflowData'

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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-xl text-rose-400">
            ✨
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
              <span>{tpl.icon}</span>
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
          Tip: Include specific Italian descriptors (e.g. "con nocciole e cacao", "al tartufo estivo", "spremitura a freddo").
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
              className="flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-500/30 cursor-pointer"
            >
              {copiedKey === 'prompt' ? '✓ Copied to clipboard!' : '📋 Copy Prompt'}
            </button>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs leading-relaxed text-white/90">
            {finalPrompt}
          </div>
        </div>

        {/* Negative Prompt Box */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">
              Negative Prompt (Crucial for Midjourney / FLUX)
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(activeTemplate.negativePrompt, 'negative')}
              className="text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
            >
              {copiedKey === 'negative' ? '✓ Copied!' : 'Copy Negative'}
            </button>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-white/60">
            {activeTemplate.negativePrompt}
          </div>
        </div>
      </div>

      {/* Aspect Ratio & Guidelines */}
      <div className="mt-6 grid gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
            📐 Aspect Ratio & Sizing
          </h4>
          <p className="mt-1 text-xs text-white/70">
            Recommended: <strong className="text-white">{activeTemplate.recommendedAspectRatio}</strong>
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-white/60">
            <li>• <strong>1:1 Square</strong>: Used for catalog grid tiles & Before/After slider.</li>
            <li>• <strong>4:3 Landscape</strong>: Used for New Arrivals editorial hero cards.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300">
            💡 Sourcing Staff Pro-Tips
          </h4>
          <ul className="mt-1 space-y-1 text-[11px] text-white/70">
            {activeTemplate.tips.map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
