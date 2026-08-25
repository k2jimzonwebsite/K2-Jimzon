import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import {
  adminBffEnabled, commitCatalogCsvBff, getCatalogImportStatusBff, previewCatalogCsvBff,
} from '../../services/adminBffService'

export default function BulkCsvImportModal({ onClose, onImportComplete }) {
  const secureCatalog = adminBffEnabled()
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState(null)
  const [selectedRows, setSelectedRows] = useState([])
  const [reason, setReason] = useState('')
  const [approved, setApproved] = useState(false)
  const [commitState, setCommitState] = useState({ status: 'idle', completed: 0, total: 0, rows: [] })
  const operationRef = useRef({ operationId: '', nextChunkIndex: 0, keys: new Map() })
  
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.name.endsWith('.csv')) {
      setError("Please select a valid .csv file.")
      return
    }
    setError(null)
    setFile(selected)
    setPreview(null)
    setSelectedRows([])
    setReason('')
    setApproved(false)
    setCommitState({ status: 'idle', completed: 0, total: 0, rows: [] })
    operationRef.current = { operationId: '', nextChunkIndex: 0, keys: new Map() }
    if (selected.size > 512 * 1024) {
      setError('Choose a K2 catalog CSV no larger than 512 KB.')
      setFile(null)
      return
    }
    if (secureCatalog) {
      const text = await selected.text()
      setCsvText(text)
      setParsedData([])
      return
    }
    
    // Parse it
    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
              setError(safeUiError('CSV_PARSE_FAILED'))
          return
        }
        setParsedData(results.data)
      },
      error: (err) => {
        setError(safeUiError('CSV_PARSE_FAILED'))
      }
    })
  }

  const handleImport = async () => {
    if (secureCatalog) {
      if (!csvText) return
      setImporting(true)
      setError(null)
      const result = await previewCatalogCsvBff(csvText)
      setImporting(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPreview(result.preview)
      setSelectedRows([])
      setApproved(false)
      setCommitState({ status: 'idle', completed: 0, total: 0, rows: [] })
      operationRef.current = { operationId: '', nextChunkIndex: 0, keys: new Map() }
      return
    }
    if (parsedData.length === 0) return
    setImporting(true)
    setError(null)

    // Map the CSV headers to our database schema, including Shopee export columns
    const rowsToInsert = parsedData.map(row => {
      const isShopee = 'Product Name' in row || 'SKU Reference No.' in row
      const shopeeCategory = row['Category'] || 'All'

      return {
        sku: String(row.sku || row['SKU Reference No.'] || row['Parent SKU'] || row['Product ID'] || '').trim(),
        name: row.name || row['Product Name'] || 'Untitled Product',
        description: row.description || row['Product Description'] || '',
        usage_instructions: row.usage_instructions || '',
        srp: Number(row.srp || row['Price']) || 0,
        wholesale_price: Number(row.wholesale_price) || 0,
        status: 'draft',
        published: false,
        origin: row.origin || (isShopee ? `Shopee|${shopeeCategory}` : 'Manual')
      }
    })

    if (rowsToInsert.some(row => !row.sku)) {
      setImporting(false)
      setError('Every row needs a stable SKU. No rows were imported.')
      return
    }
    if (new Set(rowsToInsert.map(row => row.sku.toLowerCase())).size !== rowsToInsert.length) {
      setImporting(false)
      setError('The CSV contains duplicate SKUs. Resolve them before importing.')
      return
    }

    // Insert-only prevents a catalog upload from silently overwriting a live SKU.
    const { error: upsertError } = await supabase
      .from('products')
      .insert(rowsToInsert)

    setImporting(false)

    if (upsertError) {
      setError(safeUiError('CSV_IMPORT_FAILED'))
    } else {
      if (onImportComplete) onImportComplete()
      onClose()
    }
  }

  const toggleRow = (rowNumber) => {
    if (commitState.status !== 'idle') return
    setSelectedRows(current => current.includes(rowNumber)
      ? current.filter(value => value !== rowNumber)
      : [...current, rowNumber].sort((a, b) => a - b))
    setApproved(false)
  }

  const handleCommit = async () => {
    const cleanReason = reason.trim()
    if (!preview || selectedRows.length === 0 || cleanReason.length < 10 || !approved) return
    const operation = operationRef.current
    if (!operation.operationId) operation.operationId = crypto.randomUUID()
    const chunks = []
    for (let index = 0; index < selectedRows.length; index += 50) chunks.push(selectedRows.slice(index, index + 50))
    setError(null)
    setCommitState(current => ({ ...current, status: 'committing', total: selectedRows.length }))

    for (let chunkIndex = operation.nextChunkIndex; chunkIndex < chunks.length; chunkIndex += 1) {
      const key = operation.keys.get(chunkIndex) || crypto.randomUUID()
      operation.keys.set(chunkIndex, key)
      const result = await commitCatalogCsvBff({
        csvText, fileSha256: preview.fileSha256, selectedRowNumbers: chunks[chunkIndex],
        reason: cleanReason, operationId: operation.operationId, chunkIndex,
        finalChunk: chunkIndex === chunks.length - 1,
      }, key)
      if (!result.ok) {
        setError(result.error || 'The selected rows could not be committed safely.')
        setCommitState(current => ({ ...current, status: 'failed' }))
        return
      }
      operation.nextChunkIndex = chunkIndex + 1
      setCommitState(current => ({
        status: result.result?.status === 'completed' ? 'completed' : 'committing',
        completed: current.completed + (result.result?.rows?.length || 0),
        total: selectedRows.length,
        rows: [...current.rows, ...(result.result?.rows || [])],
      }))
    }
    if (onImportComplete) onImportComplete()
  }

  const downloadResult = () => {
    const report = Papa.unparse(commitState.rows.map(row => ({
      row_number: row.rowNumber, sku: row.sku, outcome: row.outcome,
      record_version: row.recordVersion, updated_at: row.updatedAt,
    })), { columns: ['row_number', 'sku', 'outcome', 'record_version', 'updated_at'], newline: '\r\n' })
    const url = URL.createObjectURL(new Blob([`\uFEFF${report}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `k2-catalog-import-result-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleCheckStatus = async () => {
    const operation = operationRef.current
    if (!operation.operationId || !preview) return
    setCommitState(current => ({ ...current, status: 'checking' }))
    const result = await getCatalogImportStatusBff(operation.operationId)
    if (!result.ok || result.status?.fileSha256 !== preview.fileSha256) {
      setError(result.error || 'The durable operation does not match this reviewed file.')
      setCommitState(current => ({ ...current, status: 'failed' }))
      return
    }
    operation.nextChunkIndex = Number(result.status.lastChunkIndex ?? -1) + 1
    const completed = Number(result.status.committedRowCount || 0)
    setCommitState({
      status: result.status.status === 'completed' ? 'completed' : 'failed',
      completed, total: selectedRows.length, rows: result.status.rows || [],
    })
    setError(result.status.status === 'completed'
      ? null
      : `Recovered ${completed} committed row${completed === 1 ? '' : 's'} from the server. Retry continues with the next atomic chunk.`)
    if (result.status.status === 'completed' && onImportComplete) onImportComplete()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="catalog-csv-title" className="bg-adm-surface border border-adm-line rounded-adm w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-adm-line bg-black/40">
          <div>
            <h2 id="catalog-csv-title" className="font-sans text-xl font-semibold text-white">{secureCatalog ? 'Catalog CSV review' : 'Bulk CSV Import'}</h2>
            <p className="text-sm text-white/60 mt-1">{secureCatalog ? 'Review every change before a future commit. This step never writes product or stock data.' : 'Stage product metadata as drafts; reconcile physical stock by batch afterward.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close catalog CSV review" className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-blue/10 border border-blue/20 rounded-adm-sm p-4">
            <h4 className="text-base font-semibold text-blue mb-2">{secureCatalog ? 'Use the downloaded K2 template' : 'Required CSV Column Headers:'}</h4>
            <div className="flex flex-wrap gap-2">
              {(secureCatalog ? ['catalog_id', 'sku', 'record_version', 'updated_at', 'name', 'description'] : ['sku', 'name', 'description', 'usage_instructions', 'srp', 'wholesale_price']).map(h => (
                <span key={h} className="text-sm font-mono bg-black/40 text-blue-300 px-2 py-1 rounded border border-blue/20">{h}</span>
              ))}
            </div>
          </div>

          <p className="text-sm leading-relaxed text-amber">Stock, prices, publication, reservations, lots, expiry, location, and custody are excluded. Use their reasoned operational commands so the workbook cannot overwrite canonical truth.</p>

          <div 
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Select a catalog CSV file"
            className="border-2 border-dashed border-white/20 rounded-adm-sm p-10 text-center cursor-pointer hover:border-purple-500 hover:bg-white/5 transition-colors flex flex-col items-center justify-center"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden" 
              accept=".csv"
            />
            <svg className="w-10 h-10 text-white/55 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base font-medium text-neutral-300">Select a .csv file</p>
            {file && <p className="text-sm text-forest mt-2 font-mono">{file.name} selected</p>}
          </div>

          {error && (
            <div className="bg-crimson/10 border border-crimson/30 rounded-adm-sm p-3 text-base text-crimson">
              {error}
            </div>
          )}

          {parsedData.length > 0 && !error && (
            <div>
              <p className="text-base font-semibold text-neutral-300 mb-3 flex items-center justify-between">
                Preview ({parsedData.length} rows detected)
                <span className="text-sm text-white/60 font-normal">Showing first 3 rows</span>
              </p>
              <div className="overflow-x-auto border border-adm-line rounded-adm-sm">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white/5 text-white/50 uppercase">
                    <tr>
                      <th className="px-3 py-2 border-b border-adm-line">sku</th>
                      <th className="px-3 py-2 border-b border-adm-line">title</th>
                      <th className="px-3 py-2 border-b border-adm-line">stock</th>
                      <th className="px-3 py-2 border-b border-adm-line">srp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-adm-line text-neutral-300">
                    {parsedData.slice(0, 3).map((row, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="px-3 py-2">{row.sku}</td>
                        <td className="px-3 py-2 truncate max-w-[150px]">{row.name}</td>
                        <td className="px-3 py-2">{row.stock}</td>
                        <td className="px-3 py-2">{row.srp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview && !error && (
            <section aria-labelledby="catalog-preview-heading" className="space-y-4">
              <div>
                <h3 id="catalog-preview-heading" className="text-lg font-bold text-white">Diff review</h3>
                <p className="mt-1 text-sm text-white/60">File fingerprint: <span className="font-mono">{preview.fileSha256.slice(0, 12)}…</span></p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(preview.counts).map(([category, count]) => (
                  <div key={category} className="rounded-adm-sm border border-adm-line bg-adm-raised px-3 py-2">
                    <div className="font-mono text-xs font-bold uppercase text-white/60">{category}</div>
                    <div className="mt-1 text-xl font-extrabold text-white">{count}</div>
                  </div>
                ))}
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1" tabIndex={0} aria-label="Catalog row outcomes">
                {preview.outcomes.map((outcome) => (
                  <article key={`${outcome.rowNumber}-${outcome.sku}`} className="rounded-adm-sm border border-adm-line bg-black/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        {['New', 'Changed'].includes(outcome.category) && (
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(outcome.rowNumber)}
                            onChange={() => toggleRow(outcome.rowNumber)}
                            disabled={commitState.status !== 'idle'}
                            aria-label={`Select row ${outcome.rowNumber}, ${outcome.sku || 'new product'}`}
                            className="h-5 w-5 shrink-0 accent-forest"
                          />
                        )}
                        <span className="truncate font-mono text-sm font-bold text-white">Row {outcome.rowNumber} · {outcome.sku || 'Server assigns SKU'}</span>
                      </div>
                      <span className="rounded-full border border-adm-line px-2 py-1 text-xs font-bold text-gold">{outcome.category}</span>
                    </div>
                    {outcome.consequence && <p className="mt-2 text-sm text-white/70">{outcome.consequence}</p>}
                    {outcome.errors?.length > 0 && <p className="mt-2 text-sm text-crimson">{outcome.errors.join(', ')}</p>}
                    {outcome.changes?.length > 0 && (
                      <dl className="mt-3 space-y-2">
                        {outcome.changes.map((change) => (
                          <div key={change.field} className="grid gap-1 sm:grid-cols-[10rem_1fr_1fr]">
                            <dt className="font-mono text-xs font-bold text-white/60">{change.field}</dt>
                            <dd className="break-words text-sm text-white/55"><span className="sr-only">Before: </span>{change.before || 'Blank'}</dd>
                            <dd className="break-words text-sm text-white"><span className="sr-only">After: </span>{change.after || 'Blank'}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </article>
                ))}
              </div>
              <div className="rounded-adm-sm border border-adm-line bg-adm-raised p-4 space-y-4">
                <div>
                  <label htmlFor="catalog-import-reason" className="block text-sm font-bold text-white">Reason for this catalog change</label>
                  <textarea
                    id="catalog-import-reason"
                    value={reason}
                    onChange={event => { setReason(event.target.value); setApproved(false) }}
                    disabled={commitState.status !== 'idle'}
                    rows={3}
                    maxLength={500}
                    className="mt-2 min-h-24 w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-base text-white outline-none focus:border-blue disabled:opacity-60"
                    placeholder="Describe the source and why these exact metadata changes are approved."
                  />
                  <p className="mt-1 text-sm text-white/60">10–500 characters. This reason is written to every immutable row event.</p>
                </div>
                <label className="flex min-h-11 items-start gap-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={event => setApproved(event.target.checked)}
                    disabled={selectedRows.length === 0 || reason.trim().length < 10 || commitState.status !== 'idle'}
                    className="mt-1 h-5 w-5 shrink-0 accent-forest"
                  />
                  <span>I reviewed the selected before/after values. New rows become unpublished Drafts, existing rows update metadata only, and no stock is created.</span>
                </label>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={!approved || selectedRows.length === 0 || reason.trim().length < 10 || ['committing', 'checking', 'completed'].includes(commitState.status)}
                  className="flex min-h-11 w-full items-center justify-center rounded-adm-sm bg-forest px-4 py-2 text-base font-bold text-navy transition-colors hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {commitState.status === 'committing'
                    ? `Committing ${commitState.completed} of ${commitState.total}…`
                    : commitState.status === 'checking'
                      ? 'Checking durable status…'
                    : commitState.status === 'failed'
                      ? `Retry ${selectedRows.length} selected rows`
                      : commitState.status === 'completed'
                        ? `Committed ${commitState.completed} rows`
                        : `Commit ${selectedRows.length} selected row${selectedRows.length === 1 ? '' : 's'}`}
                </button>
                {commitState.status === 'failed' && operationRef.current.operationId && (
                  <div className="rounded-adm-sm border border-amber/30 bg-amber/10 p-3 text-sm text-white/80">
                    <p>Recovery ID: <span className="break-all font-mono text-white">{operationRef.current.operationId}</span></p>
                    <button type="button" onClick={handleCheckStatus} className="mt-3 min-h-11 rounded-adm-sm border border-amber/50 px-3 py-2 font-bold text-amber transition-colors hover:bg-amber/10">
                      Check durable server status
                    </button>
                  </div>
                )}
                {commitState.status === 'completed' && (
                  <div role="status" className="space-y-3 rounded-adm-sm border border-forest/35 bg-forest/10 p-3 text-sm text-white">
                    <p>{commitState.completed} selected rows were recorded successfully. Refresh Sheet Mode before making another edit.</p>
                    <button type="button" onClick={downloadResult} className="min-h-11 rounded-adm-sm border border-forest/50 px-3 py-2 font-bold text-forest transition-colors hover:bg-forest/10">
                      Download redacted result CSV
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="p-6 border-t border-adm-line bg-black/40 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="min-h-11 px-6 py-2 rounded-adm-sm text-base font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleImport}
            disabled={importing || (secureCatalog ? !csvText : parsedData.length === 0)}
            className="flex min-h-11 items-center gap-2 rounded-adm-sm bg-forest px-6 py-2 text-base font-bold text-navy transition-colors hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {secureCatalog ? (importing ? 'Reviewing…' : preview ? 'Review again' : 'Review changes') : (importing ? 'Importing...' : `Import ${parsedData.length} Rows`)}
          </button>
        </div>
      </div>
    </div>
  )
}
