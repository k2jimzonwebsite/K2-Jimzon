// Stylized packaging-label art in place of photography.
// Each product renders as a tinted tile with a printed "export label" —
// deliberate art direction, not a grey placeholder.
//
// The tile background must adapt per-product hue. We inject the hue as a
// CSS custom property on the root element so the OKLCH computation works.
// Dark mode gets a much lower lightness so the art reads as an accent on
// obsidian rather than a jarring cream blob.

export default function ProductArt({ product, mode = 'sealed', className = '' }) {
  const { hue = 35, short, origin, size } = product

  // We inline the hue as a CSS variable so Tailwind arbitrary values can
  // reference it — and so the .dark selector in the stylesheet can override
  // the lightness without knowing the per-product hue.
  const artStyle = {
    '--art-hue': hue,
    background: `linear-gradient(150deg,
      oklch(var(--art-tile-l, 0.94) 0.035 ${hue}),
      oklch(var(--art-tile-l2, 0.90) 0.045 ${hue}))`,
  }
  const circleStyle = { background: `oklch(var(--art-mid-l, 0.72) 0.08 ${hue})` }
  const sphereStyle = {
    background: `radial-gradient(circle at 32% 28%, oklch(0.88 0.06 ${hue}), oklch(0.45 0.09 ${hue}))`,
  }

  return (
    <div
      className={'grain relative flex items-center justify-center overflow-hidden ' + className}
      style={artStyle}
    >
      {/* ambient circle behind the label */}
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-40"
        style={circleStyle}
      />
      {mode === 'sealed' ? (
        <div className="relative w-[62%] rotate-[-2deg] border border-navy/15 bg-paper px-4 py-5 text-center shadow-card">
          <div className="tricolor absolute inset-x-0 top-0" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy-soft">
            Prodotto d'Italia
          </p>
          <p className="mt-2 font-serif text-lg font-semibold leading-tight text-navy">
            {short || product.name || 'Italian selection'}
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
            style={sphereStyle}
            aria-hidden="true"
          />
          <p className="max-w-[220px] text-sm font-medium leading-snug" style={{ color: `oklch(0.45 0.09 ${hue})` }}>
            {product.inside}
          </p>
        </div>
      )}
    </div>
  )
}
