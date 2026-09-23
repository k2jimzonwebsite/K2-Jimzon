import { useEffect, useState } from 'react'

export default function AdminInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/admin-sw.js', { scope: '/' }).catch(() => {})
    }
    const capturePrompt = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    return () => window.removeEventListener('beforeinstallprompt', capturePrompt)
  }, [])

  if (!installPrompt || window.matchMedia('(display-mode: standalone)').matches) return null

  const install = async () => {
    await installPrompt.prompt()
    await installPrompt.userChoice.catch(() => null)
    setInstallPrompt(null)
  }

  return (
    <button
      type="button"
      onClick={install}
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 z-40 min-h-11 rounded-adm-sm border border-blue/40 bg-adm-surface px-4 text-sm font-semibold text-blue shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 md:bottom-4"
    >
      Install Admin app
    </button>
  )
}
