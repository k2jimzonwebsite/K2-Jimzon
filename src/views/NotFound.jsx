import { useStore } from '../context/StoreContext'
import { CrimsonButton, GhostButton } from '../components/ui/bits'

export default function NotFound() {
  const { go } = useStore()
  return (
    <main className="mx-auto flex min-h-[62vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">404</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-navy-soft">
        This link may be old or mistyped. Browse the current catalog, or contact K2 if you were looking for a specific Italian product.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <CrimsonButton onClick={() => go('catalog')}>Browse the catalog</CrimsonButton>
        <GhostButton onClick={() => go('contact')}>Contact K2</GhostButton>
      </div>
    </main>
  )
}
