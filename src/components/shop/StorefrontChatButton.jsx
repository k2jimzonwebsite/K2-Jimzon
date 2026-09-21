import { useEffect, useState } from 'react'
import { useStore } from '../../context/StoreContext'
import { ChatIcon } from '../ui/icons'

export default function StorefrontChatButton() {
  const { openStoreChat, chatOpen } = useStore()
  const [hasConversation, setHasConversation] = useState(false)

  useEffect(() => {
    let convoId = null
    try {
      convoId = localStorage.getItem('k2-store-chat-convo-id')
    } catch {
      // Private-mode storage: fall through to session
    }
    if (!convoId) {
      try {
        convoId = sessionStorage.getItem('k2-store-chat-convo-id')
      } catch {
        // Storage unavailable
      }
    }
    if (convoId) setHasConversation(true)
  }, [chatOpen])

  if (chatOpen) return null

  return (
    <aside
      aria-label="Store concierge chat"
      className="fixed bottom-20 right-5 z-40 md:bottom-6 md:right-6"
    >
      <button
        type="button"
        onClick={() => openStoreChat({ origin: 'storefront_button' })}
        aria-label={hasConversation ? 'Resume live chat with K2' : 'Chat with K2 staff'}
        className="group flex min-h-11 items-center gap-2.5 rounded-full border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-4 py-2.5 shadow-float transition-[transform,border-color,background-color] duration-150 hover:border-amber hover:bg-cream active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson cursor-pointer"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-crimson/10 text-crimson transition-transform group-hover:scale-105">
          <ChatIcon size={16} />
          {hasConversation && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-forest ring-2 ring-paper"
              title="Active conversation"
            />
          )}
        </span>
        <span className="text-sm font-semibold text-navy">
          {hasConversation ? 'Resume Chat' : 'Chat with K2'}
        </span>
      </button>
    </aside>
  )
}
