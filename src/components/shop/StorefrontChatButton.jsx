import { useStore } from '../../context/StoreContext'
import { ChatIcon } from '../ui/icons'

export default function StorefrontChatButton() {
  const { openStoreChat, chatOpen, view } = useStore()

  if (chatOpen) return null

  return (
    <aside
      aria-label="Store concierge chat"
      className={`fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 ${view === 'home' ? 'hidden lg:block' : ''}`}
    >
      <button
        type="button"
        onClick={() => openStoreChat({ origin: 'storefront_button' })}
        aria-label="Chat with K2 staff"
        className="group flex h-12 w-12 items-center justify-center gap-2.5 md:h-auto md:w-auto rounded-full border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-0 shadow-float md:px-4 md:py-2.5 transition-[transform,border-color,background-color] duration-150 hover:border-amber hover:bg-cream active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson cursor-pointer"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-crimson/10 text-crimson transition-transform group-hover:scale-105">
          <ChatIcon size={16} />
        </span>
        <span className="hidden text-sm font-semibold text-navy md:inline">
          Chat with K2
        </span>
      </button>
    </aside>
  )
}
