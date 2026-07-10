import { useState } from 'react'
import { ChatIcon, XIcon } from './ui/icons'

// Floating inquiries affordance — stands in for a future Viber/Messenger bridge.
export default function ChatFab() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && (
        <div className="rise w-64 rounded-xl border border-line bg-paper p-4 shadow-float">
          <p className="font-serif text-[15px] font-semibold">Inquiries</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-navy-soft">
            Wholesale question or bulk order? Message us — we reply within the hour, 9am–9pm.
          </p>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-md bg-navy px-3 py-2 text-[12px] font-semibold text-white hover:bg-navy/90">
              Viber
            </button>
            <button className="flex-1 rounded-md border border-navy/20 px-3 py-2 text-[12px] font-semibold text-navy hover:bg-navy/5">
              Messenger
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close inquiries' : 'Open inquiries chat'}
        className="flex h-13 w-13 items-center justify-center rounded-full bg-crimson text-white shadow-float transition-transform hover:scale-105 active:scale-95"
        style={{ height: 52, width: 52 }}
      >
        {open ? <XIcon size={20} /> : <ChatIcon size={22} />}
      </button>
    </div>
  )
}
