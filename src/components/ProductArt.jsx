// Stylized packaging-label art in place of photography.
// Each product renders as a tinted tile with a printed "export label" —
// deliberate art direction, not a grey placeholder.

export default function ProductArt({ product, mode = 'sealed', className = '' }) {
  const { hue, short, origin, size } = product
  const tile = `oklch(0.94 0.035 ${hue})`
  const deep = `oklch(0.45 0.09 ${hue})`
  const mid = `oklch(0.72 0.08 ${hue})`

  return (
    <div
      className={'grain relative flex items-center justify-center overflow-hidden ' + className}
      style={{ background: `linear-gradient(150deg, ${tile}, oklch(0.90 0.045 ${hue}))` }}
    >
      {/* ambient circle behind the label */}
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-40"
        style={{ background: mid }}
      />
      {mode === 'sealed' ? (
        <div className="relative w-[62%] rotate-[-2deg] border border-navy/15 bg-paper px-4 py-5 text-center shadow-card">
          <div className="tricolor absolute inset-x-0 top-0" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy-soft">
            Prodotto d'Italia
          </p>
          <p className="mt-2 font-serif text-lg font-semibold leading-tight text-navy">
            {short}
          </p>
          <p className="mt-1 text-xs text-navy-soft">
            {origin} · {size}
          </p>
          <div className="mx-auto mt-3 flex h-5 w-24 items-end justify-center gap-[2px]" aria-hidden="true">
            {[3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2].map((w, i) => (
              <span key={i} className="bg-navy/70" style={{ width: w, height: '100%' }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-3 px-6 text-center">
          <div
            className="h-24 w-24 rounded-full shadow-float"
            style={{
              background: `radial-gradient(circle at 32% 28%, oklch(0.88 0.06 ${hue}), ${deep})`,
            }}
            aria-hidden="true"
          />
          <p className="max-w-[220px] text-sm font-medium leading-snug" style={{ color: deep }}>
            {product.inside}
          </p>
        </div>
      )}
    </div>
  )
}
