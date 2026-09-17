import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import StoreChatPanel from './StoreChatPanel'
import { Tricolor } from '../ui/bits'
import { ChatIcon, XIcon } from '../ui/icons'

export default function StoreChatDrawer() {
  const { chatOpen, setChatOpen, chatSeed, clearChatSeed } = useStore()
  const headingRef = useRef(null)
  const openerRef = useRef(null)

  useEffect(() => {
    if (chatOpen) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.body.style.overflow = 'hidden'
      const closeOnEscape = (event) => {
        if (event.key === 'Escape') setChatOpen(false)
      }
      window.addEventListener('keydown', closeOnEscape)
      const focusTimer = window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 60)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', closeOnEscape)
        window.clearTimeout(focusTimer)
        openerRef.current?.focus({ preventScroll: true })
        openerRef.current = null
      }
    }
  }, [chatOpen, setChatOpen])

  return (
    <AnimatePresence>
      {chatOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Storefront live chat">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-label="Close chat"
            onClick={() => setChatOpen(false)}
            className="absolute inset-0 bg-navy/35 backdrop-blur-[2px] cursor-pointer"
          />
          <motion.aside
            initial={{ transform: 'translateX(100%)' }}
            animate={{ transform: 'translateX(0)' }}
            exit={{ transform: 'translateX(100%)' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] shadow-float"
          >
            <Tricolor />
            <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--store-surface-border)]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-crimson/10 text-crimson">
                  <ChatIcon size={18} />
                </span>
                <div>
                  <h2 ref={headingRef} tabIndex={-1} className="font-serif text-lg font-semibold text-navy outline-none">
                    Chat with K2
                  </h2>
                  <p className="text-xs text-navy-soft">A real person replies here. You stay in the store.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--store-surface-border)] text-navy-soft transition-colors hover:bg-cream hover:text-navy cursor-pointer"
              >
                <XIcon size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <StoreChatPanel
                seed={chatSeed}
                onSeedConsumed={clearChatSeed}
                active={chatOpen}
              />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
