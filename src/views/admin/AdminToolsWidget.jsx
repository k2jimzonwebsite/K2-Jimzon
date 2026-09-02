import { useState, useRef, useEffect, useCallback } from 'react'
import { calculateMaximumSalesDiscount, calculateSalesPlan, calculateTargetSalesPrice, calculateTargetSalesQuantity, createSalesPlanningSummary } from '../../lib/salesCalculations'

/* ---------------------------------------------------------------------------
   Floating, draggable "tools" gear for the admin.
   - Pinned strip: Milan/Manila clocks + EUR→PHP rate & quick convert.
   - One tool at a time below: calculator, margin, cargo weight, unit converter,
     VAT, expiry helper, scratchpad.
   - Remembers position, last tool, rate and notes in localStorage.
--------------------------------------------------------------------------- */

const LS = {
  pos: 'k2_tools_pos',
  tool: 'k2_tools_tool',
  rate: 'k2_tools_rate',
  notes: 'k2_tools_notes',
}
const load = (k, fb) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v) } catch { return fb } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const TOOLS = [
  { id: 'sales', label: 'Sales planner', icon: '💰' },
  { id: 'calc', label: 'Calculator', icon: '🧮' },
  { id: 'margin', label: 'Margin', icon: '📈' },
  { id: 'cargo', label: 'Cargo weight', icon: '📦' },
  { id: 'unit', label: 'Units', icon: '⚖️' },
  { id: 'vat', label: 'VAT 12%', icon: '🧾' },
  { id: 'expiry', label: 'Expiry', icon: '⏳' },
  { id: 'notes', label: 'Scratchpad', icon: '📝' },
]

const field = 'min-h-11 w-full rounded-adm-sm border border-adm-line bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-blue outline-none'
const lbl = 'text-xs font-medium uppercase tracking-wide text-white/45'

export default function AdminToolsWidget({ onOpenGuide }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(() => load(LS.pos, { x: null, y: null }))
  const [tool, setTool] = useState(() => load(LS.tool, 'sales'))
  const gearRef = useRef(null)
  const drag = useRef({ active: false, moved: false, dx: 0, dy: 0 })

  // Default position bottom-right if never dragged
  useEffect(() => {
    if (pos.x == null) {
      setPos({ x: window.innerWidth - 76, y: window.innerHeight - 150 })
    }
  }, []) // eslint-disable-line

  useEffect(() => { if (pos.x != null) save(LS.pos, pos) }, [pos])
  useEffect(() => save(LS.tool, tool), [tool])

  const onDown = (e) => {
    const r = gearRef.current.getBoundingClientRect()
    drag.current = { active: true, moved: false, dx: e.clientX - r.left, dy: e.clientY - r.top }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  const onMove = useCallback((e) => {
    if (!drag.current.active) return
    drag.current.moved = true
    const x = Math.min(Math.max(6, e.clientX - drag.current.dx), window.innerWidth - 58)
    const y = Math.min(Math.max(6, e.clientY - drag.current.dy), window.innerHeight - 58)
    setPos({ x, y })
  }, [])
  const onUp = useCallback(() => {
    drag.current.active = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }, [onMove])

  const handleClick = () => { if (!drag.current.moved) setOpen((o) => !o) }

  if (pos.x == null) return null

  // Panel opens toward screen centre so it stays on-screen
  const openUp = pos.y > window.innerHeight / 2
  const openLeft = pos.x > window.innerWidth / 2

  return (
    <div className="fixed z-[70]" style={{ left: pos.x, top: pos.y }}>
      {open && (
        <div
          className="absolute w-[min(26rem,calc(100vw-1rem))] overflow-y-auto rounded-adm border border-white/12 bg-adm-surface shadow-2xl"
          style={{
            [openUp ? 'bottom' : 'top']: 60,
            [openLeft ? 'right' : 'left']: 0,
            maxHeight: openUp ? Math.max(240, pos.y - 70) : Math.max(240, window.innerHeight - pos.y - 70),
          }}
        >
          {/* Dashboard guide (moved here from a separate floating button) */}
          {onOpenGuide && (
            <button
              onClick={() => { onOpenGuide(); setOpen(false) }}
              className="w-full flex items-center gap-2 border-b border-adm-line bg-blue/15 px-3.5 py-2.5 text-sm font-semibold text-blue hover:bg-blue/25 transition-colors"
            >
              🧭 Dashboard guide — what does this do?
            </button>
          )}

          {/* Pinned strip: clocks + rate */}
          <ClockRate />

          {/* Tool picker */}
          <div className="flex flex-wrap gap-1 border-b border-adm-line bg-black/20 px-2 py-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                aria-label={t.label}
                aria-pressed={tool === t.id}
                className={'flex h-11 w-11 items-center justify-center rounded-adm-sm text-base transition-colors ' +
                  (tool === t.id ? 'bg-blue text-white' : 'bg-white/5 hover:bg-white/10')}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* Active tool */}
          <div className="p-3.5">
            {tool === 'sales' && <SalesPlanner />}
            {tool === 'calc' && <Calculator />}
            {tool === 'margin' && <Margin />}
            {tool === 'cargo' && <Cargo />}
            {tool === 'unit' && <Units />}
            {tool === 'vat' && <Vat />}
            {tool === 'expiry' && <Expiry />}
            {tool === 'notes' && <Scratchpad />}
          </div>
        </div>
      )}

      {/* Draggable gear */}
      <button
        ref={gearRef}
        onPointerDown={onDown}
        onClick={handleClick}
        title="Tools (drag to move)"
        aria-label="Open Admin tools"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-adm-surface border border-white/15 text-xl text-white shadow-xl hover:bg-adm-raised active:scale-95 cursor-grab active:cursor-grabbing touch-none"
      >
        ⚙️
      </button>
    </div>
  )
}

/* --------------------------------- Strip --------------------------------- */
function ClockRate() {
  const [now, setNow] = useState(new Date())
  const [rate, setRate] = useState(() => load(LS.rate, ''))
  const [eur, setEur] = useState('')
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => save(LS.rate, rate), [rate])

  const time = (tz) => now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  const r = parseFloat(rate) || 0
  const php = eur !== '' ? (parseFloat(eur) * r) : null

  return (
    <div className="border-b border-adm-line bg-black/20 px-3.5 py-2.5 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/80">🇮🇹 Milan <strong className="text-white tabular-nums ml-1">{time('Europe/Rome')}</strong></span>
        <span className="text-white/80"><strong className="text-white tabular-nums mr-1">{time('Asia/Manila')}</strong> Manila 🇵🇭</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/60 text-sm shrink-0" title="Manual planning rate; not a live FX feed">Manual €1 = ₱</span>
        <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal"
          className="min-h-11 w-20 rounded-adm-sm border border-adm-line bg-black/40 px-2 py-1 text-sm text-white tabular-nums outline-none focus:border-gold" />
        <input value={eur} onChange={(e) => setEur(e.target.value)} inputMode="decimal" placeholder="€ amount"
          className="min-h-11 flex-1 min-w-0 rounded-adm-sm border border-adm-line bg-black/40 px-2 py-1 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold" />
        <span className="text-gold text-sm font-semibold tabular-nums shrink-0">{php != null ? '₱' + php.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</span>
      </div>
    </div>
  )
}

/* ------------------------------- Calculator ------------------------------ */
function Calculator() {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState(null)
  const [op, setOp] = useState(null)
  const [overwrite, setOverwrite] = useState(true)

  const compute = (a, b, o) => o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? (b === 0 ? NaN : a / b) : b
  const digit = (d) => { setDisplay((s) => (overwrite ? d : s === '0' ? d : s + d)); setOverwrite(false) }
  const dot = () => { setDisplay((s) => (overwrite ? '0.' : s.includes('.') ? s : s + '.')); setOverwrite(false) }
  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); setOverwrite(true) }
  const applyOp = (next) => {
    const cur = parseFloat(display)
    if (prev != null && op && !overwrite) { const r = compute(prev, cur, op); setDisplay(String(+r.toFixed(6))); setPrev(r) }
    else setPrev(cur)
    setOp(next); setOverwrite(true)
  }
  const equals = () => { if (op == null || prev == null) return; const r = compute(prev, parseFloat(display), op); setDisplay(String(+r.toFixed(6))); setPrev(null); setOp(null); setOverwrite(true) }
  const pct = () => { setDisplay((s) => String(parseFloat(s) / 100)); setOverwrite(true) }

  const Btn = ({ children, onClick, cls = '' }) => (
    <button onClick={onClick} className={'h-11 rounded-adm-sm text-sm font-semibold transition-colors ' + (cls || 'bg-white/5 text-white hover:bg-white/10')}>{children}</button>
  )
  return (
    <div className="space-y-2">
      <div className="rounded-adm-sm bg-black/40 px-3 py-3 text-right text-2xl font-semibold text-white tabular-nums truncate">{display}</div>
      <div className="grid grid-cols-4 gap-1.5">
        <Btn onClick={clear} cls="bg-crimson/20 text-crimson hover:bg-crimson/30">C</Btn>
        <Btn onClick={pct}>%</Btn>
        <Btn onClick={() => setDisplay((s) => (s.startsWith('-') ? s.slice(1) : s === '0' ? s : '-' + s))}>±</Btn>
        <Btn onClick={() => applyOp('÷')} cls="bg-blue/20 text-blue hover:bg-blue/30">÷</Btn>
        {['7', '8', '9'].map((d) => <Btn key={d} onClick={() => digit(d)}>{d}</Btn>)}
        <Btn onClick={() => applyOp('×')} cls="bg-blue/20 text-blue hover:bg-blue/30">×</Btn>
        {['4', '5', '6'].map((d) => <Btn key={d} onClick={() => digit(d)}>{d}</Btn>)}
        <Btn onClick={() => applyOp('−')} cls="bg-blue/20 text-blue hover:bg-blue/30">−</Btn>
        {['1', '2', '3'].map((d) => <Btn key={d} onClick={() => digit(d)}>{d}</Btn>)}
        <Btn onClick={() => applyOp('+')} cls="bg-blue/20 text-blue hover:bg-blue/30">+</Btn>
        <Btn onClick={() => digit('0')} cls="col-span-2 bg-white/5 text-white hover:bg-white/10">0</Btn>
        <Btn onClick={dot}>.</Btn>
        <Btn onClick={equals} cls="bg-gold text-navy hover:bg-gold-deep">=</Btn>
      </div>
    </div>
  )
}

/* ----------------------------- Sales planner ----------------------------- */
function SalesPlanner() {
  const [mode, setMode] = useState('check')

  return (
    <div className="space-y-3 text-white">
      <div>
        <p className="text-sm font-semibold">Sales planning calculator</p>
        <p className="mt-1 text-xs leading-relaxed text-white/50">Planning only. Nothing here writes a product price, promotion, order, payment, cost, payout, tax, or accounting record.</p>
      </div>
      <div className="grid grid-cols-2 gap-2" aria-label="Sales planning mode">
        {[
          { id: 'check', label: 'Check a price' },
          { id: 'target', label: 'Find target price' },
          { id: 'discount', label: 'Find max discount' },
          { id: 'quantity', label: 'Find units needed' },
        ].map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            aria-pressed={mode === option.id}
            className={`min-h-11 rounded-adm-sm border px-3 text-xs font-semibold transition-colors ${mode === option.id ? 'border-blue/50 bg-blue/15 text-blue' : 'border-adm-line bg-black/25 text-white/55 hover:text-white'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {mode === 'check' && <ForwardSalesPlanner />}
      {mode === 'target' && <TargetPricePlanner />}
      {mode === 'discount' && <MaximumDiscountPlanner />}
      {mode === 'quantity' && <TargetQuantityPlanner />}
    </div>
  )
}

function ForwardSalesPlanner() {
  const [values, setValues] = useState({ quantity: '1', unitPrice: '', unitCost: '', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0' })
  const update = key => event => setValues(current => ({ ...current, [key]: event.target.value }))
  const result = calculateSalesPlan(values)
  const php = value => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const percent = value => value == null ? '—' : `${value.toFixed(1)}%`

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label><span className={lbl}>Quantity</span><input className={field} inputMode="numeric" value={values.quantity} onChange={update('quantity')} /></label>
        <label><span className={lbl}>Unit selling price (₱)</span><input className={field} inputMode="decimal" value={values.unitPrice} onChange={update('unitPrice')} placeholder="0" /></label>
        <label><span className={lbl}>Unit cost (₱)</span><input className={field} inputMode="decimal" value={values.unitCost} onChange={update('unitCost')} placeholder="0" /></label>
        <label><span className={lbl}>Discount total (₱)</span><input className={field} inputMode="decimal" value={values.discount} onChange={update('discount')} /></label>
        <label><span className={lbl}>Other costs (₱)</span><input className={field} inputMode="decimal" value={values.otherCosts} onChange={update('otherCosts')} /></label>
        <label><span className={lbl}>Fixed fees (₱)</span><input className={field} inputMode="decimal" value={values.fixedFees} onChange={update('fixedFees')} /></label>
        <label className="col-span-2"><span className={lbl}>Channel fee rate (%)</span><input className={field} inputMode="decimal" value={values.channelFeePercent} onChange={update('channelFeePercent')} /></label>
      </div>
      {!result.ok ? (
        <div role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-xs leading-relaxed text-amber">{result.errors[0]}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2" aria-label="Sales planning result">
          <Stat label="Gross sales" value={php(result.grossSales)} />
          <Stat label="Net sales" value={php(result.netSales)} />
          <Stat label="Goods cost" value={php(result.goodsCost)} />
          <Stat label="Other + fixed costs" value={php(result.otherAndFixedCosts)} />
          <Stat label="Percentage fees" value={php(result.percentageFees)} />
          <Stat label="Total planned costs" value={php(result.totalCosts)} />
          <Stat label="Planned gross profit" value={php(result.grossProfit)} tone={result.grossProfit >= 0 ? 'good' : 'bad'} />
          <Stat label="Gross margin" value={percent(result.grossMarginPercent)} />
          <Stat label="Markup" value={percent(result.markupPercent)} />
          <div className="col-span-2"><Stat label="Break-even unit price" value={php(result.breakEvenUnitPrice)} /></div>
        </div>
      )}
      {result.ok && <PlanningSummaryCopy mode="check" input={values} result={result} />}
      <p className="text-xs leading-relaxed text-white/45">Percentage fees use gross sales before discount. Break-even includes that changing fee and rounds upward to cents. Use recorded values when available; actual profit stays unavailable until exact-lot costs are snapshotted onto fulfilled order lines.</p>
    </div>
  )
}

function TargetPricePlanner() {
  const [values, setValues] = useState({ quantity: '1', unitCost: '', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetMarginPercent: '30' })
  const update = key => event => setValues(current => ({ ...current, [key]: event.target.value }))
  const result = calculateTargetSalesPrice(values)
  const php = value => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const percent = value => value == null ? '—' : `${value.toFixed(1)}%`

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-white/50">Find the minimum planned unit price for a target gross margin. Percentage fees are calculated from gross sales before discount.</p>
      <div className="grid grid-cols-2 gap-2">
        <label><span className={lbl}>Quantity</span><input className={field} inputMode="numeric" value={values.quantity} onChange={update('quantity')} /></label>
        <label><span className={lbl}>Unit cost (₱)</span><input className={field} inputMode="decimal" value={values.unitCost} onChange={update('unitCost')} placeholder="0" /></label>
        <label><span className={lbl}>Discount total (₱)</span><input className={field} inputMode="decimal" value={values.discount} onChange={update('discount')} /></label>
        <label><span className={lbl}>Other costs (₱)</span><input className={field} inputMode="decimal" value={values.otherCosts} onChange={update('otherCosts')} /></label>
        <label><span className={lbl}>Fixed fees (₱)</span><input className={field} inputMode="decimal" value={values.fixedFees} onChange={update('fixedFees')} /></label>
        <label><span className={lbl}>Channel fee rate (%)</span><input className={field} inputMode="decimal" value={values.channelFeePercent} onChange={update('channelFeePercent')} /></label>
        <label className="col-span-2"><span className={lbl}>Target gross margin (%)</span><input className={field} inputMode="decimal" value={values.targetMarginPercent} onChange={update('targetMarginPercent')} /></label>
      </div>
      {!result.ok ? (
        <div role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-xs leading-relaxed text-amber">{result.errors[0]}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2" aria-label="Target price result">
          <div className="col-span-2"><Stat label="Minimum planned unit price" value={php(result.recommendedUnitPrice)} tone="good" /></div>
          <Stat label="Gross sales" value={php(result.grossSales)} />
          <Stat label="Net sales" value={php(result.netSales)} />
          <Stat label="Percentage fees" value={php(result.percentageFees)} />
          <Stat label="Total planned costs" value={php(result.totalCosts)} />
          <Stat label="Planned gross profit" value={php(result.grossProfit)} tone={result.grossProfit >= 0 ? 'good' : 'bad'} />
          <Stat label="Achieved gross margin" value={percent(result.achievedMarginPercent)} />
        </div>
      )}
      {result.ok && <PlanningSummaryCopy mode="target" input={values} result={result} />}
      <p className="text-xs leading-relaxed text-white/45">The recommendation rounds upward to the nearest cent. Review and approve price through the canonical product workflow; this tool never changes it and does not calculate actual profit.</p>
    </div>
  )
}

function MaximumDiscountPlanner() {
  const [values, setValues] = useState({ quantity: '1', unitPrice: '', unitCost: '', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetMarginPercent: '30' })
  const update = key => event => setValues(current => ({ ...current, [key]: event.target.value }))
  const result = calculateMaximumSalesDiscount(values)
  const php = value => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const percent = value => value == null ? '—' : `${value.toFixed(1)}%`

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-white/50">Find the maximum total discount a chosen price can absorb while preserving a target gross margin. Percentage fees are calculated from gross sales before discount.</p>
      <div className="grid grid-cols-2 gap-2">
        <label><span className={lbl}>Quantity</span><input className={field} inputMode="numeric" value={values.quantity} onChange={update('quantity')} /></label>
        <label><span className={lbl}>Unit selling price (₱)</span><input className={field} inputMode="decimal" value={values.unitPrice} onChange={update('unitPrice')} placeholder="0" /></label>
        <label><span className={lbl}>Unit cost (₱)</span><input className={field} inputMode="decimal" value={values.unitCost} onChange={update('unitCost')} placeholder="0" /></label>
        <label><span className={lbl}>Other costs (₱)</span><input className={field} inputMode="decimal" value={values.otherCosts} onChange={update('otherCosts')} /></label>
        <label><span className={lbl}>Fixed fees (₱)</span><input className={field} inputMode="decimal" value={values.fixedFees} onChange={update('fixedFees')} /></label>
        <label><span className={lbl}>Channel fee rate (%)</span><input className={field} inputMode="decimal" value={values.channelFeePercent} onChange={update('channelFeePercent')} /></label>
        <label className="col-span-2"><span className={lbl}>Target gross margin (%)</span><input className={field} inputMode="decimal" value={values.targetMarginPercent} onChange={update('targetMarginPercent')} /></label>
      </div>
      {!result.ok ? (
        <div role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-xs leading-relaxed text-amber">{result.errors[0]}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2" aria-label="Maximum discount result">
          <div className="col-span-2"><Stat label="Maximum total discount" value={php(result.maximumDiscount)} tone="good" /></div>
          <Stat label="Maximum per unit" value={php(result.maximumDiscountPerUnit)} />
          <Stat label="Discount share of gross" value={percent(result.maximumDiscountPercent)} />
          <Stat label="Gross sales" value={php(result.grossSales)} />
          <Stat label="Net sales" value={php(result.netSales)} />
          <Stat label="Percentage fees" value={php(result.percentageFees)} />
          <Stat label="Total planned costs" value={php(result.totalCosts)} />
          <Stat label="Planned gross profit" value={php(result.grossProfit)} tone={result.grossProfit >= 0 ? 'good' : 'bad'} />
          <Stat label="Achieved gross margin" value={percent(result.achievedMarginPercent)} />
        </div>
      )}
      {result.ok && <PlanningSummaryCopy mode="discount" input={values} result={result} />}
      <p className="text-xs leading-relaxed text-white/45">The safe allowance rounds downward to the nearest cent. Review and approve any real promotion through the canonical product workflow; this tool never creates one, changes price, writes an order, or calculates actual profit.</p>
    </div>
  )
}

function TargetQuantityPlanner() {
  const [values, setValues] = useState({ unitPrice: '', unitCost: '', discount: '0', otherCosts: '0', fixedFees: '0', channelFeePercent: '0', targetProfit: '' })
  const update = key => event => setValues(current => ({ ...current, [key]: event.target.value }))
  const result = calculateTargetSalesQuantity(values)
  const php = value => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const percent = value => value == null ? '—' : `${value.toFixed(1)}%`

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-white/50">Find the minimum whole units needed for a planned gross-profit target. Percentage fees use gross sales before discount.</p>
      <div className="grid grid-cols-2 gap-2">
        <label><span className={lbl}>Unit selling price (₱)</span><input className={field} inputMode="decimal" value={values.unitPrice} onChange={update('unitPrice')} placeholder="0" /></label>
        <label><span className={lbl}>Unit cost (₱)</span><input className={field} inputMode="decimal" value={values.unitCost} onChange={update('unitCost')} placeholder="0" /></label>
        <label><span className={lbl}>Discount total (₱)</span><input className={field} inputMode="decimal" value={values.discount} onChange={update('discount')} /></label>
        <label><span className={lbl}>Other costs (₱)</span><input className={field} inputMode="decimal" value={values.otherCosts} onChange={update('otherCosts')} /></label>
        <label><span className={lbl}>Fixed fees (₱)</span><input className={field} inputMode="decimal" value={values.fixedFees} onChange={update('fixedFees')} /></label>
        <label><span className={lbl}>Channel fee rate (%)</span><input className={field} inputMode="decimal" value={values.channelFeePercent} onChange={update('channelFeePercent')} /></label>
        <label className="col-span-2"><span className={lbl}>Target planned profit (₱)</span><input className={field} inputMode="decimal" value={values.targetProfit} onChange={update('targetProfit')} placeholder="0" /></label>
      </div>
      {!result.ok ? (
        <div role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-xs leading-relaxed text-amber">{result.errors[0]}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2" aria-label="Target units result">
          <div className="col-span-2"><Stat label="Minimum whole units" value={result.requiredQuantity.toLocaleString('en-PH')} tone="good" /></div>
          <Stat label="Contribution per unit" value={php(result.unitContribution)} />
          <Stat label="Profit above target" value={php(result.profitAboveTarget)} />
          <Stat label="Gross sales" value={php(result.grossSales)} />
          <Stat label="Net sales" value={php(result.netSales)} />
          <Stat label="Goods cost" value={php(result.goodsCost)} />
          <Stat label="Other + fixed costs" value={php(result.otherAndFixedCosts)} />
          <Stat label="Percentage fees" value={php(result.percentageFees)} />
          <Stat label="Total planned costs" value={php(result.totalCosts)} />
          <Stat label="Planned gross profit" value={php(result.grossProfit)} tone="good" />
          <Stat label="Achieved gross margin" value={percent(result.achievedMarginPercent)} />
          <div className="col-span-2"><Stat label={`At ${result.previousQuantity.toLocaleString('en-PH')} units`} value={`${php(result.previousQuantityProfit)} — below target`} /></div>
        </div>
      )}
      {result.ok && <PlanningSummaryCopy mode="quantity" input={values} result={result} />}
      <p className="text-xs leading-relaxed text-white/45">This whole-unit result is a planning target, not a sales quota or order. It never changes price, promotion, inventory, or actual-profit records.</p>
    </div>
  )
}

function PlanningSummaryCopy({ mode, input, result }) {
  const [copyState, setCopyState] = useState('')
  const inputSignature = JSON.stringify(input)

  useEffect(() => setCopyState(''), [mode, inputSignature])

  const copySummary = async () => {
    setCopyState('')
    try {
      const summary = createSalesPlanningSummary({ mode, input, result })
      if (!summary || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(summary)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <div className="space-y-2 rounded-adm-sm border border-adm-line bg-black/20 p-2.5">
      <button type="button" onClick={copySummary} className="min-h-11 w-full rounded-adm-sm border border-blue/35 bg-blue/10 px-3 text-xs font-semibold text-blue transition-colors hover:bg-blue/15">
        {copyState === 'copied' ? 'Planning summary copied' : 'Copy planning summary'}
      </button>
      {copyState === 'copied' && <p role="status" className="text-xs leading-relaxed text-green-400">Copied assumptions, results, timestamp, and the planning-only warning.</p>}
      {copyState === 'error' && <p role="alert" className="text-xs leading-relaxed text-amber">Copy failed. Allow clipboard access, then try again.</p>}
      <p className="text-xs leading-relaxed text-white/40">Clipboard text only. No Admin or financial record is created.</p>
    </div>
  )
}

/* --------------------------------- Margin -------------------------------- */
function Margin() {
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const c = parseFloat(cost) || 0, p = parseFloat(price) || 0
  const profit = p - c
  const margin = p ? (profit / p) * 100 : 0
  const markup = c ? (profit / c) * 100 : 0
  return (
    <div className="space-y-3 text-white">
      <div><p className={lbl}>Cost (₱)</p><input className={field} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" /></div>
      <div><p className={lbl}>Selling price (₱)</p><input className={field} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        <Stat label="Gross difference" value={'₱' + profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} tone={profit >= 0 ? 'good' : 'bad'} />
        <Stat label="Gross margin" value={margin.toFixed(1) + '%'} />
        <Stat label="Markup" value={markup.toFixed(1) + '%'} />
      </div>
    </div>
  )
}

/* ------------------------------ Cargo weight ----------------------------- */
function Cargo() {
  const [l, setL] = useState(''), [w, setW] = useState(''), [h, setH] = useState('')
  const [actual, setActual] = useState(''), [divisor, setDivisor] = useState('5000')
  const vol = (parseFloat(l) || 0) * (parseFloat(w) || 0) * (parseFloat(h) || 0) / (parseFloat(divisor) || 5000)
  const chargeable = Math.max(parseFloat(actual) || 0, vol)
  return (
    <div className="space-y-3 text-white">
      <p className={lbl}>Box size (cm)</p>
      <div className="grid grid-cols-3 gap-2">
        <input className={field} inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} placeholder="L" />
        <input className={field} inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder="W" />
        <input className={field} inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} placeholder="H" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><p className={lbl}>Actual kg</p><input className={field} inputMode="decimal" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="0" /></div>
        <div><p className={lbl}>Divisor</p><input className={field} inputMode="decimal" value={divisor} onChange={(e) => setDivisor(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Stat label="Volumetric" value={vol.toFixed(2) + ' kg'} />
        <Stat label="Chargeable" value={chargeable.toFixed(2) + ' kg'} tone="good" />
      </div>
    </div>
  )
}

/* --------------------------------- Units --------------------------------- */
const CATS = {
  Weight: { g: 1, kg: 1000, lb: 453.592, oz: 28.3495 },
  Volume: { ml: 1, L: 1000, 'fl oz': 29.5735 },
}
function Units() {
  const [cat, setCat] = useState('Weight')
  const [from, setFrom] = useState('kg')
  const [val, setVal] = useState('1')
  const units = CATS[cat]
  const base = (parseFloat(val) || 0) * units[from]
  return (
    <div className="space-y-3 text-white">
      <div className="flex gap-1">
        {Object.keys(CATS).map((c) => (
          <button key={c} onClick={() => { setCat(c); setFrom(Object.keys(CATS[c])[1] || Object.keys(CATS[c])[0]) }}
            className={'flex-1 rounded-adm-sm py-1.5 text-sm font-medium ' + (cat === c ? 'bg-blue text-white' : 'bg-white/5 hover:bg-white/10')}>{c}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className={field + ' flex-1'} inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} />
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-adm-sm border border-adm-line bg-black/40 px-2 text-sm text-white outline-none">
          {Object.keys(units).map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        {Object.keys(units).filter((u) => u !== from).map((u) => (
          <div key={u} className="flex justify-between rounded-adm-sm bg-black/30 px-3 py-1.5 text-sm">
            <span className="text-white/50">{u}</span>
            <span className="text-white tabular-nums">{(base / units[u]).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------- VAT ---------------------------------- */
function Vat() {
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('add') // add = amount is net; remove = amount is gross
  const a = parseFloat(amount) || 0
  const net = mode === 'add' ? a : a / 1.12
  const gross = mode === 'add' ? a * 1.12 : a
  const vat = gross - net
  return (
    <div className="space-y-3 text-white">
      <div className="flex gap-1">
        <button onClick={() => setMode('add')} className={'flex-1 rounded-adm-sm py-1.5 text-sm font-medium ' + (mode === 'add' ? 'bg-blue text-white' : 'bg-white/5 hover:bg-white/10')}>Add VAT</button>
        <button onClick={() => setMode('remove')} className={'flex-1 rounded-adm-sm py-1.5 text-sm font-medium ' + (mode === 'remove' ? 'bg-blue text-white' : 'bg-white/5 hover:bg-white/10')}>Remove VAT</button>
      </div>
      <div><p className={lbl}>{mode === 'add' ? 'Net amount (₱)' : 'Gross amount (₱)'}</p><input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        <Stat label="Net" value={'₱' + net.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <Stat label="VAT 12%" value={'₱' + vat.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <Stat label="Gross" value={'₱' + gross.toLocaleString(undefined, { maximumFractionDigits: 2 })} tone="good" />
      </div>
    </div>
  )
}

/* -------------------------------- Expiry --------------------------------- */
function Expiry() {
  const [date, setDate] = useState('')
  let days = null, tone = 'good', text = ''
  if (date) {
    const d = new Date(date + 'T00:00:00')
    days = Math.ceil((d - new Date().setHours(0, 0, 0, 0)) / 86400000)
    if (days < 0) { tone = 'bad'; text = `Expired ${-days} day${-days === 1 ? '' : 's'} ago` }
    else if (days <= 30) { tone = 'warn'; text = `${days} day${days === 1 ? '' : 's'} left · sell first (FEFO)` }
    else { tone = 'good'; text = `${days} days left · fresh` }
  }
  return (
    <div className="space-y-3 text-white">
      <div><p className={lbl}>Expiry date</p><input type="date" className={field + ' [color-scheme:dark]'} value={date} onChange={(e) => setDate(e.target.value)} /></div>
      {days != null && (
        <div className={'rounded-adm-sm px-3 py-3 text-center text-sm font-semibold ' +
          (tone === 'bad' ? 'bg-crimson/15 text-crimson' : tone === 'warn' ? 'bg-amber/15 text-amber' : 'bg-blue/15 text-blue')}>
          {text}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Scratchpad ------------------------------- */
function Scratchpad() {
  const [notes, setNotes] = useState(() => load(LS.notes, ''))
  useEffect(() => save(LS.notes, notes), [notes])
  return (
    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quick notes for your shift… (saved automatically)"
      className="h-44 w-full resize-none rounded-adm-sm border border-adm-line bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue" />
  )
}

/* -------------------------------- Helpers -------------------------------- */
function Stat({ label, value, tone }) {
  return (
    <div className="rounded-adm-sm bg-black/30 px-2 py-2 text-center">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className={'mt-0.5 text-sm font-semibold tabular-nums ' + (tone === 'good' ? 'text-gold' : tone === 'bad' ? 'text-crimson' : tone === 'warn' ? 'text-amber' : 'text-white')}>{value}</p>
    </div>
  )
}
