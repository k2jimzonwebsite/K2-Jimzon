import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabaseClient'

export default function BulkCsvImportModal({ onClose, onImportComplete }) {
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.name.endsWith('.csv')) {
      setError("Please select a valid .csv file.")
      return
    }
    setError(null)
    setFile(selected)
    
    // Parse it
    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV Parsing Error: ${results.errors[0].message}`)
          return
        }
        setParsedData(results.data)
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`)
      }
    })
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return
    setImporting(true)
    setError(null)

    // Map the CSV headers to our database schema
    const rowsToInsert = parsedData.map(row => {
      return {
        sku: row.sku || `MANUAL-CSV-${Math.floor(Math.random() * 100000)}`,
        title: row.title || 'Untitled Product',
        description: row.description || '',
        usage_instructions: row.usage_instructions || '',
        retail_price: Number(row.retail_price) || 0,
        vip_price: Number(row.wholesale_price) || 0,
        total_stock: Number(row.stock) || 0,
        status: row.status || 'Draft'
      }
    })

    // Upsert to handle both new and existing SKUs safely
    const { error: upsertError } = await supabase
      .from('products')
      .upsert(rowsToInsert, { onConflict: 'sku' })

    setImporting(false)

    if (upsertError) {
      setError(`Database Error: ${upsertError.message}`)
    } else {
      if (onImportComplete) onImportComplete()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-[#10141d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div>
            <h2 className="font-serif text-xl font-semibold text-white">Bulk CSV Import</h2>
            <p className="text-xs text-white/50 mt-1">Upload an Excel/CSV spreadsheet to update inventory</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/5 p-2 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-blue/10 border border-blue/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue mb-2">Required CSV Column Headers:</h4>
            <div className="flex flex-wrap gap-2">
              {['sku', 'title', 'description', 'usage_instructions', 'retail_price', 'wholesale_price', 'stock'].map(h => (
                <span key={h} className="text-xs font-mono bg-black/40 text-blue-300 px-2 py-1 rounded border border-blue/20">{h}</span>
              ))}
            </div>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center cursor-pointer hover:border-purple-500 hover:bg-white/5 transition-colors flex flex-col items-center justify-center"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden" 
              accept=".csv"
            />
            <svg className="w-10 h-10 text-white/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-white/80">Click to select a .csv file</p>
            {file && <p className="text-xs text-forest mt-2 font-mono">{file.name} selected</p>}
          </div>

          {error && (
            <div className="bg-crimson/10 border border-crimson/30 rounded-lg p-3 text-sm text-crimson">
              {error}
            </div>
          )}

          {parsedData.length > 0 && !error && (
            <div>
              <p className="text-sm font-semibold text-white/80 mb-3 flex items-center justify-between">
                Preview ({parsedData.length} rows detected)
                <span className="text-xs text-white/40 font-normal">Showing first 3 rows</span>
              </p>
              <div className="overflow-x-auto border border-white/10 rounded-lg">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-white/5 text-white/50 uppercase">
                    <tr>
                      <th className="px-3 py-2 border-b border-white/10">sku</th>
                      <th className="px-3 py-2 border-b border-white/10">title</th>
                      <th className="px-3 py-2 border-b border-white/10">stock</th>
                      <th className="px-3 py-2 border-b border-white/10">retail_price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-white/80">
                    {parsedData.slice(0, 3).map((row, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="px-3 py-2">{row.sku}</td>
                        <td className="px-3 py-2 truncate max-w-[150px]">{row.title}</td>
                        <td className="px-3 py-2">{row.stock}</td>
                        <td className="px-3 py-2">{row.retail_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleImport}
            disabled={importing || parsedData.length === 0}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-forest text-navy hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            {importing ? 'Importing...' : `Import ${parsedData.length} Rows`}
          </button>
        </div>
      </div>
    </div>
  )
}
