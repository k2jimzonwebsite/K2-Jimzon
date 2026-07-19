import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckIcon, InboxIcon, AlertIcon } from '../../components/ui/icons'
import { peso } from '../../data/products'
import { supabase } from '../../lib/supabaseClient'

// Mock incoming payloads from the Italian operator using the Custom GPT/Gemini AI
const INITIAL_DRAFTS = [
  {
    id: 'draft-01',
    sku: 'K2-2051',
    name: 'Nutella Biscuits 304g',
    aiConfidence: 0.98,
    parsedData: {
      retail: 499,
      wholesale: 390,
      stock: 24,
      origin: 'Milan, IT',
      size: '304g jar',
      hue: 45,
      tag: 'ITALY EXCLUSIVE',
      why_buy: 'A crisp, golden biscuit hugging a creamy heart of authentic Nutella. It’s the ultimate Italian morning ritual.',
      why_rare: 'Often sold out in Rome; imported directly to avoid third-party markups.',
      inside: '1 x 304g resealable bag',
      pairings: ['Espresso', 'Latte Macchiato']
    },
    rawJson: `{
  "item": "Nutella Biscuits",
  "weight": "304g",
  "suggested_retail": 499,
  "suggested_wholesale": 390,
  "count": 24,
  "hue": 45,
  "tag": "ITALY EXCLUSIVE",
  "why_buy": "A crisp, golden biscuit hugging a creamy heart...",
  "why_rare": "Often sold out in Rome...",
  "inside": "1 x 304g resealable bag",
  "pairings": ["Espresso", "Latte Macchiato"]
}`
  },
  {
    id: 'draft-02',
    sku: 'K2-2052',
    name: 'Lavazza Qualità Oro Coffee Beans 1kg',
    aiConfidence: 0.82,
    parsedData: {
      retail: 1850,
      wholesale: 1450,
      stock: 12,
      origin: 'Rome, IT',
      size: '1kg bag',
      hue: 40,
      tag: 'RESTOCKED',
      why_buy: 'A unique combination of 6 varieties of Arabica beans from among the finest of Central and South America.',
      why_rare: 'The true Italian roast profile, distinct from local adaptations.',
      inside: '1 x 1kg whole bean bag',
      pairings: ['Biscotti', 'Tiramisu']
    },
    rawJson: `{
  "item": "Lavazza Oro Beans",
  "weight": "1kg",
  "suggested_retail": 1850,
  "suggested_wholesale": 1450,
  "count": 12,
  "hue": 40,
  "tag": "RESTOCKED",
  "why_buy": "A unique combination of 6 varieties of Arabica beans...",
  "why_rare": "The true Italian roast profile...",
  "inside": "1 x 1kg whole bean bag",
  "pairings": ["Biscotti", "Tiramisu"],
  "note": "Low confidence on retail price vs PH market"
}`
  }
]

export default function AiDrafts({ onApprove }) {
  const [drafts, setDrafts] = useState(INITIAL_DRAFTS)

  const handleApprove = async (draft) => {
    // Push directly to Supabase products table
    const { error } = await supabase.from('products').insert([{
      sku: draft.sku,
      title: draft.name,
      total_stock: draft.parsedData.stock,
      retail_price: draft.parsedData.retail,
      vip_price: draft.parsedData.wholesale,
      origin: draft.parsedData.origin,
      size: draft.parsedData.size,
      hue: draft.parsedData.hue,
      tag: draft.parsedData.tag,
      why_buy: draft.parsedData.why_buy,
      why_rare: draft.parsedData.why_rare,
      inside: draft.parsedData.inside,
      pairings: draft.parsedData.pairings,
      status: 'Live'
    }])

    if (error) {
      alert("Failed to push to database: " + error.message)
      return
    }
    
    // Remove from local queue
    setDrafts(prev => prev.filter(d => d.id !== draft.id))
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-white p-12 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-wash text-forest">
          <CheckIcon size={24} />
        </div>
        <h3 className="mt-4 font-serif text-lg font-semibold text-navy">Queue is clear</h3>
        <p className="mt-1 max-w-sm text-sm text-navy-soft">
          All AI sourcing drafts from Italy have been reviewed and pushed to live inventory.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {drafts.map((draft) => (
        <DraftCard key={draft.id} draft={draft} onApprove={handleApprove} />
      ))}
    </div>
  )
}

function DraftCard({ draft, onApprove }) {
  const [data, setData] = useState(draft.parsedData)
  const [approving, setApproving] = useState(false)

  const handleGoLive = () => {
    setApproving(true)
    setTimeout(() => {
      onApprove({ ...draft, parsedData: data })
    }, 600) // fake network delay
  }

  const needsReview = draft.aiConfidence < 0.9

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="overflow-hidden rounded-lg border border-line bg-white shadow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line bg-shell px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-blue text-white shadow-sm">
            <InboxIcon size={14} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-navy-soft">New Draft from Italy</p>
            <p className="font-serif text-base font-semibold text-navy">{draft.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {needsReview && (
            <span className="flex items-center gap-1 rounded bg-amber-wash px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber">
              <AlertIcon size={12} /> Low Confidence AI Match
            </span>
          )}
          <span className="rounded bg-white border border-line px-2.5 py-1 text-xs font-mono text-navy-faint">
            {draft.sku}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Editor (Human-in-the-loop) */}
        <div className="flex-1 p-5 md:border-r border-line">
          <p className="mb-4 text-sm font-medium text-navy-soft">Review pricing and stock before pushing live:</p>
          
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
              Retail Price (₱)
              <input 
                type="number"
                value={data.retail}
                onChange={e => setData({...data, retail: Number(e.target.value)})}
                className="rounded-md border border-line bg-shell px-3 py-2 text-navy focus:border-navy focus:bg-white focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
              Wholesale Price (₱)
              <input 
                type="number"
                value={data.wholesale}
                onChange={e => setData({...data, wholesale: Number(e.target.value)})}
                className="rounded-md border border-line bg-shell px-3 py-2 text-navy focus:border-navy focus:bg-white focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
              Physical Stock Count
              <input 
                type="number"
                value={data.stock}
                onChange={e => setData({...data, stock: Number(e.target.value)})}
                className="rounded-md border border-line bg-shell px-3 py-2 text-navy focus:border-navy focus:bg-white focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end border-t border-line pt-4">
            <button
              onClick={handleGoLive}
              disabled={approving}
              className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest/90 disabled:opacity-50"
            >
              {approving ? (
                <>Pushing to Supabase...</>
              ) : (
                <><CheckIcon size={16} /> Approve & Go Live</>
              )}
            </button>
          </div>
        </div>

        {/* Raw AI Output context */}
        <div className="w-full bg-navy p-5 text-white md:w-[320px]">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Raw AI Sourcing Output</p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs font-mono leading-relaxed text-white/80">
            {draft.rawJson}
          </pre>
        </div>
      </div>
    </motion.div>
  )
}
