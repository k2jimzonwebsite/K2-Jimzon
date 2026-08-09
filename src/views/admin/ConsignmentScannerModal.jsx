import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { BarcodeIcon, CheckIcon, XIcon } from '../../components/ui/icons'

function confirmScan(stage) {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = stage === 'milan' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(stage === 'milan' ? 1046.5 : 880, context.currentTime)
    gain.gain.setValueAtTime(0.14, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.12)
    oscillator.connect(gain); gain.connect(context.destination)
    oscillator.start(); oscillator.stop(context.currentTime + 0.12)
  } catch {}
  if (navigator.vibrate) navigator.vibrate(50)
}

export default function ConsignmentScannerModal({ isOpen, stage, items, onScan, onClose, onDone }) {
  const [manualCode, setManualCode] = useState('')
  const [lastScanned, setLastScanned] = useState(null)
  const [error, setError] = useState('')
  const [cameraNote, setCameraNote] = useState('Starting camera…')
  const [processing, setProcessing] = useState(false)
  const [activeItemId, setActiveItemId] = useState('')
  const scannerRef = useRef(null)
  const busyRef = useRef(false)
  const lastReadRef = useRef({ code: '', at: 0 })
  const processRef = useRef(null)
  const readerId = `consignment-reader-${stage}`
  const isMilan = stage === 'milan'

  const totals = useMemo(() => ({
    target: items.reduce((sum, item) => sum + Number(isMilan ? item.expected_qty : item.italy_packed_qty || 0), 0),
    scanned: items.reduce((sum, item) => sum + Number(isMilan ? item.italy_packed_qty : item.manila_scanned_qty || 0), 0),
  }), [items, isMilan])

  const processScan = useCallback(async rawCode => {
    const code = String(rawCode || '').trim()
    if (!code || busyRef.current) return null
    const now = Date.now()
    if (lastReadRef.current.code === code && now - lastReadRef.current.at < 1200) return null
    busyRef.current = true; setProcessing(true); setError('')
    try {
      const updated = await onScan(code, activeItemId || null)
      if (!updated) throw new Error('The scan was not recorded. Try again.')
      lastReadRef.current = { code, at: Date.now() }
      setLastScanned(updated)
      confirmScan(stage)
      return updated
    } catch (scanError) {
      setError(scanError?.message || 'This barcode could not be recorded.')
      if (navigator.vibrate) navigator.vibrate([80, 50, 80])
      return null
    } finally {
      busyRef.current = false; setProcessing(false)
    }
  }, [onScan, stage, activeItemId])

  processRef.current = processScan

  useEffect(() => {
    if (!isOpen) return undefined
    setError(''); setLastScanned(null); setActiveItemId(''); setCameraNote('Starting camera…')
    const timer = window.setTimeout(() => {
      if (!document.getElementById(readerId)) return
      const scanner = new Html5Qrcode(readerId)
      scannerRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 170 }, aspectRatio: 1.25 },
        decodedText => processRef.current?.(decodedText),
        () => {},
      ).then(() => setCameraNote('Camera ready')).catch(() => setCameraNote('Camera unavailable. Use the barcode scanner keyboard or manual field below.'))
    }, 180)

    return () => {
      window.clearTimeout(timer)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) scanner.stop().catch(() => {}).finally(() => { try { scanner.clear() } catch {} })
    }
  }, [isOpen, readerId])

  if (!isOpen) return null

  const submitManual = async event => {
    event.preventDefault()
    const recorded = await processScan(manualCode)
    if (recorded) setManualCode('')
  }

  const accentText = isMilan ? 'text-crimson' : 'text-forest'
  const accentBg = isMilan ? 'bg-crimson' : 'bg-forest'
  const accentBorder = isMilan ? 'border-crimson/70' : 'border-forest/70'
  const accentPanelBorder = isMilan ? 'border-crimson/40' : 'border-forest/40'
  const title = isMilan ? 'Milan packing scan' : 'Manila arrival recount'
  const description = isMilan
    ? 'Scan every expected unit into its manifest line. Packing cannot close until the expected count is complete.'
    : 'Scan every physical unit again on arrival. Inventory changes only after discrepancy review and finalization.'

  return <div className="fixed inset-0 z-[70] flex flex-col bg-adm-sunken text-white" role="dialog" aria-modal="true" aria-labelledby={`${readerId}-title`}>
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-adm-line bg-adm-surface p-4">
      <div><p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${accentText}`}>{isMilan ? 'Italy custody count' : 'Philippines receiving count'}</p><h2 id={`${readerId}-title`} className="mt-1 font-serif text-xl font-bold">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/50">{description}</p></div>
      <button onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-adm-sm border border-adm-line bg-white/5" aria-label="Close scanner"><XIcon /></button>
    </header>

    <div className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-4 border-b border-adm-line bg-adm-sunken px-4 py-3">
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Count progress</p><p className="mt-0.5 font-mono text-lg font-bold"><span className={accentText}>{totals.scanned}</span> / {totals.target} units</p></div>
      <button onClick={onDone || onClose} disabled={processing} className={`min-h-11 rounded-adm-sm px-4 text-sm font-bold disabled:opacity-40 ${accentBg}`}>{isMilan ? 'Done scanning' : 'Review counts'}</button>
    </div>

    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black p-3">
      <div id={readerId} className="h-full max-h-[440px] w-full max-w-2xl overflow-hidden rounded-adm border border-adm-line" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className={`flex h-44 w-72 items-end justify-center rounded-adm border-2 border-dashed p-3 ${accentBorder}`}><span className="rounded bg-black/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70">Align one barcode</span></div></div>
      <p className="absolute left-4 top-4 rounded-adm-sm bg-black/75 px-2 py-1 text-[10px] text-white/60">{cameraNote}</p>
      {lastScanned && <div className={`absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-adm border bg-adm-surface/95 p-3 shadow-adm-float ${accentPanelBorder}`}><div className="flex min-w-0 items-center gap-2"><CheckIcon size={17} className={`shrink-0 ${accentText}`} /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Recorded</p><p className="truncate text-sm font-semibold">{lastScanned.name || lastScanned.sku}</p></div></div><p className="shrink-0 font-mono text-sm font-bold">{isMilan ? lastScanned.italy_packed_qty : lastScanned.manila_scanned_qty} / {isMilan ? lastScanned.expected_qty : lastScanned.italy_packed_qty}</p></div>}
    </div>

    <footer className="shrink-0 space-y-3 border-t border-adm-line bg-adm-surface p-4">
      {error && <div role="alert" className="rounded-adm-sm border border-crimson/40 bg-crimson/10 p-3 text-sm text-crimson">{error}</div>}
      <form onSubmit={submitManual} className="flex gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Barcode or SKU</span><BarcodeIcon size={17} className="pointer-events-none absolute left-3 top-3.5 text-white/35" /><input autoFocus type="text" value={manualCode} onChange={event => setManualCode(event.target.value)} placeholder="Scan barcode or enter SKU" className="adm-input min-h-11 w-full pl-10 font-mono text-base" /></label><button type="submit" disabled={processing || !manualCode.trim()} className={`min-h-11 rounded-adm-sm px-5 text-sm font-bold disabled:opacity-40 ${accentBg}`}>{processing ? 'Recording…' : 'Record +1'}</button></form>
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">Active box / lot</p><div className="flex gap-2 overflow-x-auto pb-1">{items.map(item => {
        const count = Number(isMilan ? item.italy_packed_qty : item.manila_scanned_qty || 0)
        const target = Number(isMilan ? item.expected_qty : item.italy_packed_qty || 0)
        return <button key={item.id || item.sku} disabled={processing || count >= target} onClick={() => setActiveItemId(item.id)} aria-pressed={activeItemId === item.id} className={`min-h-12 shrink-0 rounded-adm-sm border px-3 text-left disabled:opacity-35 ${activeItemId === item.id ? `${accentPanelBorder} bg-white/10` : 'border-adm-line bg-white/5'}`}><p className="max-w-40 truncate font-mono text-xs font-bold">{item.box_code || 'No box'} · {item.sku}</p><p className="mt-0.5 text-[10px] text-white/45">{item.batch_code || 'No lot'} · {count} / {target}</p></button>
      })}</div></div>
    </footer>
  </div>
}
