import { useState, useRef, useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import { ChatIcon, XIcon } from './ui/icons'

export default function ChatFab() {
  const [open, setOpen] = useState(false)
  const { conversations, createConversation, sendMessage } = useStore()
  const [chatId, setChatId] = useState(null)
  const [text, setText] = useState('')
  const messagesEndRef = useRef(null)

  const chat = conversations.find(c => c.id === chatId)

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chat?.messages, open])

  const handleStart = () => {
    const id = createConversation('Storefront Visitor', 'Live Chat', 'Hi! I have a question.', 'general')
    setChatId(id)
  }

  const handleSend = () => {
    if (!text.trim()) return
    if (!chatId) {
      const id = createConversation('Storefront Visitor', 'Live Chat', text, 'general')
      setChatId(id)
    } else {
      sendMessage(chatId, text, 'customer')
    }
    setText('')
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && (
        <div className="rise w-[320px] rounded-2xl border border-line bg-cream/95 backdrop-blur-xl shadow-float flex flex-col overflow-hidden" style={{ height: '420px' }}>
          <div className="bg-navy p-4 text-white flex justify-between items-center shadow-sm z-10">
            <div>
              <p className="font-serif text-lg font-semibold leading-tight">Live Chat</p>
              <p className="text-xs text-white/70">We reply within the hour, 9am–9pm.</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors p-1">
              <XIcon size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-shell/50">
            {!chat ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center text-navy mb-3">
                  <ChatIcon size={24} />
                </div>
                <p className="text-sm font-semibold text-navy mb-1">Have a question?</p>
                <p className="text-xs text-navy-soft mb-5">Send us a message and we'll connect you to a staff member right away.</p>
                <button onClick={handleStart} className="bg-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-navy/90 transition-transform active:scale-95 shadow-sm">
                  Start a Conversation
                </button>
              </div>
            ) : (
              <>
                {chat.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 text-sm shadow-sm ${
                      m.sender === 'customer' 
                        ? 'bg-navy text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white border border-line text-navy rounded-2xl rounded-tl-sm'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="p-3 bg-white border-t border-line flex gap-2">
            <input 
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-shell border border-line rounded-xl px-4 py-2 text-sm text-navy focus:outline-none focus:border-navy/40 transition-colors"
            />
            <button 
              onClick={handleSend}
              disabled={!text.trim()}
              className="bg-navy text-white px-4 rounded-xl text-sm font-semibold hover:bg-navy/90 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open live chat"
          className="flex items-center justify-center rounded-full bg-crimson text-white shadow-float transition-transform hover:scale-105 active:scale-95"
          style={{ height: 56, width: 56 }}
        >
          <ChatIcon size={24} />
        </button>
      )}
    </div>
  )
}
