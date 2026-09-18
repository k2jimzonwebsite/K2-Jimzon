import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { SPOTLIGHT_TOURS, CHATGPT_PROMPT_TEMPLATES } from './tourData'
import {
  SparkleIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
  ArrowIcon,
  BoxIcon,
  UploadIcon,
  BarcodeIcon,
  PlayIcon,
} from '../../ui/icons'

const THEME_PALETTES = {
  rose: { accent: '#f43f5e', wash: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.35)', text: '#fda4af', glow: 'rgba(244, 63, 94, 0.45)' },
  emerald: { accent: '#10b981', wash: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', text: '#6ee7b7', glow: 'rgba(16, 185, 129, 0.45)' },
  sky: { accent: '#0ea5e9', wash: 'rgba(14, 165, 233, 0.12)', border: 'rgba(14, 165, 233, 0.35)', text: '#7dd3fc', glow: 'rgba(14, 165, 233, 0.45)' },
  amber: { accent: '#f59e0b', wash: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', text: '#fcd34d', glow: 'rgba(245, 158, 11, 0.45)' },
  purple: { accent: '#a855f7', wash: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)', text: '#d8b4fe', glow: 'rgba(168, 85, 247, 0.45)' },
  indigo: { accent: '#6366f1', wash: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.35)', text: '#a5b4fc', glow: 'rgba(99, 102, 241, 0.45)' },
  teal: { accent: '#14b8a6', wash: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.35)', text: '#5eead4', glow: 'rgba(20, 184, 166, 0.45)' },
  slate: { accent: '#94a3b8', wash: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.35)', text: '#cbd5e1', glow: 'rgba(148, 163, 184, 0.45)' },
}

/**
 * SpotlightTourOverlay
 * Interactive guided walkthrough engine that dims the screen, spotlights specific
 * Admin BOS widgets or buttons, and provides step-by-step directives including 1-click
 * ChatGPT prompt copying.
 */
export default function SpotlightTourOverlay({
  isOpen = true,
  tourId = 'manual_inventory',
  onClose = () => {},
  currentSection = 'inventory',
  onNavigate = () => {},
}) {
  const tour = SPOTLIGHT_TOURS[tourId] || SPOTLIGHT_TOURS.manual_inventory
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [selectedGptCategory, setSelectedGptCategory] = useState(
    CHATGPT_PROMPT_TEMPLATES[0].key
  )
  const [customGptProduct, setCustomGptProduct] = useState('')
  const cardRef = useRef(null)

  const steps = tour.steps
  const currentStep = steps[stepIndex] || steps[0]
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === steps.length - 1

  // Handle auto-routing if step specifies a target workspace section
  useEffect(() => {
    if (!isOpen) return
    if (currentStep.targetSection && currentStep.targetSection !== currentSection) {
      onNavigate(currentStep.targetSection)
    }
  }, [isOpen, currentStep, currentSection, onNavigate])

  // Measure and track target bounding box
  const updateTargetRect = useCallback(() => {
    if (!currentStep.targetSelector) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(currentStep.targetSelector)
    if (el) {
      const before = el.getBoundingClientRect()
      // Only set if visible on screen
      if (before.width > 0 && before.height > 0) {
        // Move the page only when the target is actually outside the viewport.
        // Instant (no smooth animation) so the tour never fights staff scrolling.
        const outsideViewport =
          before.top < 0 || before.left < 0 ||
          before.bottom > window.innerHeight || before.right > window.innerWidth
        if (outsideViewport) el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        const rect = el.getBoundingClientRect()
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        })
        return
      }
    }
    setTargetRect(null)
  }, [currentStep.targetSelector])

  useEffect(() => {
    if (!isOpen) return
    // Small delay to allow any workspace tab render to stabilize
    const timer = setTimeout(updateTargetRect, 80)
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [isOpen, stepIndex, currentSection, updateTargetRect])

  // Keyboard navigation ([Esc], [N], [P], [ArrowRight], [ArrowLeft])
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        if (!isLastStep) setStepIndex((prev) => prev + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        if (!isFirstStep) setStepIndex((prev) => prev - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isFirstStep, isLastStep, onClose])

  // Active ChatGPT Prompt Formula
  const activeGptTemplate = useMemo(() => {
    return (
      CHATGPT_PROMPT_TEMPLATES.find((t) => t.key === selectedGptCategory) ||
      CHATGPT_PROMPT_TEMPLATES[0]
    )
  }, [selectedGptCategory])

  const compiledPrompt = useMemo(() => {
    const item = customGptProduct.trim() || activeGptTemplate.exampleItem
    return activeGptTemplate.prompt.replace(/\[PRODUCT NAME\]/g, item)
  }, [customGptProduct, activeGptTemplate])

  const handleCopyPrompt = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(compiledPrompt)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = compiledPrompt
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2500)
    } catch {
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2500)
    }
  }

  // Calculate Popover Position relative to target
  const popoverStyle = useMemo(() => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '560px',
        width: 'calc(100vw - 32px)',
      }
    }

    const pad = 16
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const spaceBelow = viewportHeight - targetRect.bottom
    const spaceAbove = targetRect.top

    let top = targetRect.bottom + pad
    if (spaceBelow < 380 && spaceAbove > spaceBelow) {
      top = Math.max(16, targetRect.top - 420)
    }

    let left = targetRect.left
    if (left + 540 > viewportWidth) {
      left = Math.max(16, viewportWidth - 556)
    }

    return {
      top: `${Math.max(16, top)}px`,
      left: `${Math.max(16, left)}px`,
      maxWidth: '540px',
      width: 'calc(100vw - 32px)',
    }
  }, [targetRect])

  if (!isOpen) return null

  const theme = THEME_PALETTES[tour.theme] || THEME_PALETTES.emerald

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${tour.title} - Step ${stepIndex + 1}`}
      className="fixed inset-0 z-[100] select-none"
    >
      {/* ── Option A Dual-Advance Shaded Backdrop (4 Panels Surrounding Target) ── */}
      {targetRect ? (
        <>
          {/* Top backdrop panel */}
          <div
            className="fixed bg-[#020617]/82 pointer-events-auto"
            style={{
              zIndex: 101,
              top: 0,
              left: 0,
              right: 0,
              height: `${Math.max(0, targetRect.top - 6)}px`,
            }}
          />
          {/* Bottom backdrop panel */}
          <div
            className="fixed bg-[#020617]/82 pointer-events-auto"
            style={{
              zIndex: 101,
              top: `${targetRect.bottom + 6}px`,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left backdrop panel */}
          <div
            className="fixed bg-[#020617]/82 pointer-events-auto"
            style={{
              zIndex: 101,
              top: `${Math.max(0, targetRect.top - 6)}px`,
              left: 0,
              width: `${Math.max(0, targetRect.left - 6)}px`,
              height: `${targetRect.height + 12}px`,
            }}
          />
          {/* Right backdrop panel */}
          <div
            className="fixed bg-[#020617]/82 pointer-events-auto"
            style={{
              zIndex: 101,
              top: `${Math.max(0, targetRect.top - 6)}px`,
              left: `${targetRect.right + 6}px`,
              right: 0,
              height: `${targetRect.height + 12}px`,
            }}
          />
        </>
      ) : (
        /* Fullscreen backdrop when no specific target is active */
        <div
          className="fixed inset-0 bg-[#020617]/82 pointer-events-auto"
          style={{ zIndex: 101 }}
        />
      )}

      {/* ── Spotlight Target Highlight Frame ── */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-xl transition-all duration-200"
          style={{
            zIndex: 102,
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: `0 0 0 4px ${theme.glow}, 0 0 35px ${theme.glow}`,
          }}
        >
          {/* Pulsating Target Radar Dot */}
          <span className="absolute -top-2 -right-2 flex h-4 w-4">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: theme.accent }}
            />
            <span
              className="relative inline-flex rounded-full h-4 w-4"
              style={{ backgroundColor: theme.accent }}
            />
          </span>
        </div>
      )}

      {/* ── Floating Tour Instruction Popover Card ── */}
      <div
        ref={cardRef}
        style={{ zIndex: 105, ...popoverStyle }}
        className="fixed rounded-2xl border border-white/15 bg-gradient-to-b from-[#181d28] to-[#0c1017] p-5 text-white shadow-2xl shadow-black/90 backdrop-blur-md transition-all duration-200 max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        {/* Card Header & Dismiss */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span
              style={{
                backgroundColor: theme.wash,
                color: theme.text,
                borderColor: theme.border,
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border"
            >
              {tour.theme === 'rose' ? <SparkleIcon size={16} /> : <BoxIcon size={16} />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                  {tour.shortTitle}
                </span>
                <span
                  style={{
                    backgroundColor: theme.wash,
                    color: theme.text,
                    borderColor: theme.border,
                  }}
                  className="rounded-full border px-2 py-0.5 text-xs font-bold"
                >
                  Step {stepIndex + 1} of {steps.length}
                </span>
                <span className="hidden sm:inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-white/60 font-mono">
                  {currentSection}
                </span>
              </div>
              <h3 className="font-serif text-base font-bold text-white sm:text-lg leading-snug mt-0.5">
                {currentStep.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit Walkthrough Tour"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Cross-Screen Transition Breadcrumb Indicator */}
        {currentStep.targetSection && currentStep.targetSection !== currentSection && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-950/40 p-3 text-xs text-sky-200">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              <span>
                Switching workspace to <strong>{currentStep.targetSection}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(currentStep.targetSection)}
              className="flex min-h-11 items-center rounded-lg bg-sky-600 px-3 py-1 text-xs font-bold text-white hover:bg-sky-500 cursor-pointer"
            >
              Go to {currentStep.targetSection}
            </button>
          </div>
        )}

        {/* Action Directive Banner */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
            <span>Operational Directive</span>
          </div>
          <p className="mt-1 text-sm font-bold text-sky-300">
            {currentStep.directive}
          </p>
          <div className="mt-2 rounded-lg bg-black/40 p-2.5 border border-white/5">
            <span className="text-xs font-medium text-white/50 block">
              What to click / observe:
            </span>
            <span className="text-xs font-semibold text-amber-200">
              {currentStep.whatToClick}
            </span>
          </div>
        </div>

        {/* SOP Explanation */}
        <div className="mt-4 space-y-2">
          <p className="text-xs leading-relaxed text-white/80 whitespace-pre-line">
            {currentStep.sopAction}
          </p>
        </div>

        {/* ── Interactive ChatGPT Studio Station (Step 3 on Manual Tour) ── */}
        {currentStep.chatGptIntegration?.enabled && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
                <SparkleIcon size={16} />
                <span>ChatGPT Prompt Studio Station</span>
              </div>
              <span className="text-xs font-mono text-white/40">JSON Formula</span>
            </div>

            {/* Category Selector Pills */}
            <div className="flex flex-wrap gap-1.5">
              {CHATGPT_PROMPT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => {
                    setSelectedGptCategory(tpl.key)
                    setCustomGptProduct('')
                  }}
                  className={`min-h-11 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    selectedGptCategory === tpl.key
                      ? 'bg-rose-500 text-white font-bold shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tpl.category}
                </button>
              ))}
            </div>

            {/* Optional Custom Italian Name Input */}
            <div>
              <label
                htmlFor="tour-custom-product-name"
                className="block text-xs text-white/60 mb-1"
              >
                Italian Product Title (optional override):
              </label>
              <input
                id="tour-custom-product-name"
                type="text"
                value={customGptProduct}
                onChange={(e) => setCustomGptProduct(e.target.value)}
                placeholder={activeGptTemplate.exampleItem}
                className="w-full min-h-11 rounded-lg border border-white/15 bg-black/50 px-3 text-xs text-white placeholder-white/30 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>

            {/* Prompt Preview Snippet */}
            <div className="relative rounded-lg border border-white/10 bg-black/60 p-3 font-mono text-xs text-white/70 max-h-36 overflow-y-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap font-sans text-xs">
                {compiledPrompt.slice(0, 280)}...
              </pre>
            </div>

            {/* 1-Click Copy ChatGPT Prompt Button */}
            <button
              type="button"
              onClick={handleCopyPrompt}
              className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                copiedPrompt
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 active:scale-[0.98]'
              } shadow-lg shadow-rose-900/40`}
            >
              {copiedPrompt ? (
                <>
                  <CheckIcon size={16} />
                  <span>Copied Prompt to Clipboard!</span>
                </>
              ) : (
                <>
                  <CopyIcon size={16} />
                  <span>Copy ChatGPT Prompt (1-Click)</span>
                </>
              )}
            </button>
            <p className="text-xs text-white/50 text-center">
              Paste in ChatGPT with packaging photos, copy the output JSON, then return here for Step 4!
            </p>
          </div>
        )}

        {/* Exit Criteria Gate */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2 text-xs text-white/60">
          <span className="font-semibold text-white/80">Exit Gate:</span>
          <span>{currentStep.exitCriteria}</span>
        </div>

        {/* ── Footer Navigation Rail ── */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          {/* Step Progress Dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStepIndex(i)}
                aria-label={`Jump to Step ${i + 1}`}
                style={{
                  backgroundColor: i === stepIndex ? theme.accent : undefined,
                }}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  i === stepIndex
                    ? 'w-6'
                    : 'w-2.5 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => prev - 1)}
                className="flex min-h-11 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <span>← Previous</span>
              </button>
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all cursor-pointer active:scale-[0.98] shadow-md shadow-emerald-900/40"
              >
                <CheckIcon size={16} />
                <span>Finish Walkthrough</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => prev + 1)}
                style={{
                  backgroundColor: theme.accent,
                }}
                className="flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer hover:opacity-90 active:scale-[0.98] shadow-md shadow-black/40"
              >
                <span>Next Step →</span>
              </button>
            )}
          </div>
        </div>

        {/* Keyboard Hints */}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-white/40">
          <span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/70">
              Esc
            </kbd>{' '}
            Exit
          </span>
          <span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/70">
              [P]
            </kbd>{' '}
            Prev
          </span>
          <span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/70">
              [N]
            </kbd>{' '}
            Next
          </span>
        </div>
      </div>
    </div>
  )
}
