import { useStore } from '../../context/StoreContext'
import { ChatIcon } from '../ui/icons'

export default function StorefrontChatButton() {
  const { openStoreChat, chatOpen } = useStore()

  if (chatOpen) return null

  return (
    <aside
      aria-label="Store concierge chat"
      className="fixed bottom-20 right-5 z-40 md:bottom-6 md:right-6"
    >
      <button
        type="button"
        onClick={() => openStoreChat({ origin: 'storefront_button' })}
        aria-label="Chat with K2 staff"
        className="group flex min-h-11 items-center gap-2.5 rounded-full border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-4 py-2.5 shadow-float transition-[transform,border-color,background-color] duration-150 hover:border-amber hover:bg-cream active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson cursor-pointer"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-crimson/10 text-crimson transition-transform group-hover:scale-105">
          <ChatIcon size={16} />
        </span>
        <span className="text-sm font-semibold text-navy">
          Chat with K2
        </span>
      </button>
    </aside>
  )
}
