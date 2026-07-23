import { useState, useEffect } from 'react'
import { UserIcon, CheckIcon, GlobeIcon, InboxIcon } from '../../components/ui/icons'
import { peso } from '../../data/products'
import { supabase } from '../../lib/supabaseClient'

const INITIAL_CUSTOMERS = [
  {
    id: 'CUST-101',
    name: 'Maria Santos',
    email: 'maria.santos@gmail.com',
    phone: '+63 917 555 0192',
    channel: 'WhatsApp',
    role: 'VIP',
    orders_count: 8,
    total_spent: 24500,
    tags: ['VIP Wholesale', 'Italian Espresso Lover'],
    last_order: '2026-07-20'
  },
  {
    id: 'CUST-102',
    name: 'Marco Rossi (Cafe Roma)',
    email: 'marco@caferoma.ph',
    phone: '+63 918 888 2026',
    channel: 'Viber',
    role: 'VIP',
    orders_count: 18,
    total_spent: 184000,
    tags: ['VIP Wholesale', 'Bulk Buyer'],
    last_order: '2026-07-22'
  },
  {
    id: 'CUST-103',
    name: 'Elena Guerrero',
    email: 'elena.g@yahoo.com',
    phone: '+63 920 111 4455',
    channel: 'Website',
    role: 'Customer',
    orders_count: 3,
    total_spent: 4850,
    tags: ['Pasabuy Buyer', 'Cosmetics'],
    last_order: '2026-07-18'
  },
  {
    id: 'CUST-104',
    name: 'Anton Lim',
    email: 'anton.lim@outlook.com',
    phone: '+63 917 222 9988',
    channel: 'Shopee',
    role: 'Customer',
    orders_count: 5,
    total_spent: 8900,
    tags: ['Repeat Shopper', 'Pasto & Olive Oil'],
    last_order: '2026-07-21'
  },
  {
    id: 'CUST-105',
    name: 'Dr. Sofia Mendoza',
    email: 'sofia.mendoza@stlukes.com.ph',
    phone: '+63 919 777 3311',
    channel: 'Website',
    role: 'VIP',
    orders_count: 12,
    total_spent: 42100,
    tags: ['VIP Wholesale', 'Pasabuy Buyer'],
    last_order: '2026-07-22'
  }
]

const CAMPAIGN_TEMPLATES = [
  {
    id: 'tpl_new_drop',
    name: '🚀 New Milan Consignment Arrival',
    category: 'New Arrivals',
    subject: '🇮🇹 Fresh Consignment Landed! Authentic Italian Imports Now Live on K2 Jimzon',
    body: `Ciao {{name}},\n\nExciting news! Our latest flight shipment from Milan has officially arrived in Manila.\n\nWe've restocked your favorites:\n- Lavazza Qualità Oro Espresso Beans\n- Mulino Bianco Pan di Stelle Biscuits\n- Urbani White Truffle Oil\n\nOrder now for fast Metro Manila same-day delivery or nationwide shipping!\n\nShop Fresh Arrivals: https://k2jimzon.com`
  },
  {
    id: 'tpl_trending',
    name: '🔥 Trending Beauty & Food Items Alert',
    category: 'Trending',
    subject: '🔥 Back in Stock: KIKO Milano 3D Lipgloss & Italian Pantry Essentials',
    body: `Hi {{name}},\n\nOur top viral trending items are officially restocked!\n\n✨ KIKO Milano 3D Hydra Lipgloss (Shades 05, 20 & 21)\n☕ Lavazza Espresso Oro (Whole Beans & Ground)\n🍝 Authentic Italian Pesto & Extra Virgin Olive Oil\n\nLimited quantities available. Grab yours before it sells out again!\n\nShop Trending Items: https://k2jimzon.com`
  },
  {
    id: 'tpl_pasabuy_flight',
    name: '✈️ Milan Pasabuy Flight Schedule Alert',
    category: 'Pasabuy',
    subject: '✈️ Next Milan Flight Departs Soon! Submit Your Custom Pasabuy Requests',
    body: `Ciao {{name}},\n\nOur buyer in Milan is preparing for the next flight consignment leaving Malpensa Airport on 22 July.\n\nNeed special Italian groceries, luxury chocolates, or boutique skincare not listed on our website? Submit your custom request now!\n\nSubmit Pasabuy Request: https://k2jimzon.com/pasabuy`
  },
  {
    id: 'tpl_vip_wholesale',
    name: '🎁 VIP Wholesale Bulk Cases Discount',
    category: 'Wholesale',
    subject: '🎁 Exclusive VIP Wholesale Rate: 15% Off Case Orders of Lavazza & Mulino Bianco',
    body: `Dear {{name}},\n\nAs one of our valued VIP Wholesale Partners, we are offering an exclusive 15% discount on case-quantity orders of Lavazza Oro coffee and Mulino Bianco pantry lines this week.\n\nLog in with your VIP Wholesale account to claim your special pricing.\n\nVIP Wholesale Portal: https://k2jimzon.com/wholesale`
  }
]

export default function CustomerCrmBroadcast() {
  const [activeTab, setActiveTab] = useState('crm') // 'crm' | 'broadcast'
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('k2_crm_customers')
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('All')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('')
  const [newCustEmail, setNewCustEmail] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustChannel, setNewCustChannel] = useState('Website')
  const [newCustRole, setNewCustRole] = useState('Customer')

  // Campaign Broadcast State
  const [selectedAudience, setSelectedAudience] = useState('all') // 'all' | 'vip' | 'pasabuy' | 'high_value'
  const [selectedTemplate, setSelectedTemplate] = useState(CAMPAIGN_TEMPLATES[0])
  const [customSubject, setCustomSubject] = useState(CAMPAIGN_TEMPLATES[0].subject)
  const [customBody, setCustomBody] = useState(CAMPAIGN_TEMPLATES[0].body)
  const [isSending, setIsSending] = useState(false)
  const [broadcastLog, setBroadcastLog] = useState(null)

  useEffect(() => {
    localStorage.setItem('k2_crm_customers', JSON.stringify(customers))
  }, [customers])

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl)
    setCustomSubject(tpl.subject)
    setCustomBody(tpl.body)
  }

  const handleAddCustomer = (e) => {
    e.preventDefault()
    if (!newCustName || !newCustEmail) return

    const newEntry = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: newCustName,
      email: newCustEmail,
      phone: newCustPhone || '+63 917 000 0000',
      channel: newCustChannel,
      role: newCustRole,
      orders_count: 0,
      total_spent: 0,
      tags: ['New Customer'],
      last_order: 'Just joined'
    }

    setCustomers(prev => [newEntry, ...prev])
    setShowAddCustomer(false)
    setNewCustName('')
    setNewCustEmail('')
    setNewCustPhone('')
  }

  const toggleRole = (id) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const nextRole = c.role === 'VIP' ? 'Customer' : 'VIP'
        return { ...c, role: nextRole }
      }
      return c
    }))
  }

  const handleLaunchBroadcast = () => {
    setIsSending(true)
    setBroadcastLog(null)

    setTimeout(() => {
      let recipientCount = customers.length
      if (selectedAudience === 'vip') recipientCount = customers.filter(c => c.role === 'VIP').length
      if (selectedAudience === 'pasabuy') recipientCount = customers.filter(c => c.tags.some(t => t.toLowerCase().includes('pasabuy'))).length
      if (selectedAudience === 'high_value') recipientCount = customers.filter(c => c.total_spent > 10000).length

      setBroadcastLog({
        success: true,
        count: recipientCount,
        subject: customSubject,
        time: 'Just now',
        deliveryRate: '99.4%'
      })
      setIsSending(false)
    }, 1500)
  }

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.phone.includes(searchQuery)
    const matchesRole = filterRole === 'All' || c.role === filterRole
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-[#09090b] border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-widest bg-blue/20 text-blue px-2 py-0.5 rounded border border-blue/30">
              Omnichannel Customer CRM & Marketing Engine
            </span>
            <span className="text-sm text-white/50">Customer Records, Orders & Broadcast Campaigns</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Customer Database & Mass Campaign Broadcasts</h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            Maintain complete customer records, track total spending and order history, and launch instant targeted email & SMS broadcasts for new arrivals, trending products, and flight arrivals.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-sm transition-all ${
              activeTab === 'crm' ? 'bg-blue text-white shadow-lg shadow-blue/20' : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            👥 Customer Directory ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'broadcast' ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            📢 Mass Campaign Broadcasts
          </button>
        </div>
      </div>

      {/* TAB 1: CUSTOMER DIRECTORY & ORDER HISTORY CRM */}
      {activeTab === 'crm' && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="bg-[#09090b] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, email, or phone number..."
                className="w-full max-w-md rounded-xl border border-white/10 bg-[#0A101D] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue"
              />

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-[#0A101D] border border-white/10 text-sm font-mono text-white rounded-xl px-3.5 py-2.5 outline-none"
              >
                <option value="All">All Customer Roles</option>
                <option value="VIP">VIP Wholesale Only</option>
                <option value="Customer">Retail Customers</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddCustomer(true)}
              className="bg-forest hover:bg-forest/90 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-forest/20 shrink-0"
            >
              + Add Customer Contact
            </button>
          </div>

          {/* Customer Table */}
          <div className="bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-mono">
                <thead className="bg-white/5 text-white/40 uppercase text-xs tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3.5">Customer / Contact</th>
                    <th className="px-5 py-3.5">Channel & Role</th>
                    <th className="px-5 py-3.5">Orders</th>
                    <th className="px-5 py-3.5">Total Spend (PHP)</th>
                    <th className="px-5 py-3.5">Tags & Interest</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCustomers.map(cust => (
                    <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white text-base">{cust.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">{cust.email} · {cust.phone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-white/10 text-neutral-300 px-2 py-0.5 rounded text-xs">{cust.channel}</span>
                          <button
                            onClick={() => toggleRole(cust.id)}
                            className={`px-2 py-0.5 rounded text-xs font-bold border transition-all ${
                              cust.role === 'VIP' ? 'bg-amber/20 text-amber border-amber/30' : 'bg-white/5 text-white/40 border-white/10'
                            }`}
                          >
                            {cust.role === 'VIP' ? '★ VIP Wholesale' : 'Retail'}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-neutral-300 font-bold">
                        {cust.orders_count} orders
                      </td>
                      <td className="px-5 py-4 font-bold text-forest text-base">
                        {peso(cust.total_spent)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {cust.tags.map((t, idx) => (
                            <span key={idx} className="bg-blue/10 text-blue border border-blue/20 px-2 py-0.5 rounded text-xs">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => alert(`Direct Messaging ${cust.name} via ${cust.channel} (${cust.phone})...`)}
                          className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all"
                        >
                          💬 Chat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: MASS CAMPAIGN BROADCAST ENGINE */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Target Audience & Templates */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Target Audience Selector */}
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/60">1. Select Target Customer Audience</h3>
              
              <div className="space-y-2 text-sm font-mono">
                {[
                  { id: 'all', label: 'All Registered Customers', count: customers.length },
                  { id: 'vip', label: 'VIP Wholesale Accounts Only', count: customers.filter(c => c.role === 'VIP').length },
                  { id: 'pasabuy', label: 'Pasabuy Item Buyers', count: customers.filter(c => c.tags.some(t => t.toLowerCase().includes('pasabuy'))).length },
                  { id: 'high_value', label: 'High-Value Buyers (> ₱10,000)', count: customers.filter(c => c.total_spent > 10000).length }
                ].map(aud => (
                  <button
                    key={aud.id}
                    onClick={() => setSelectedAudience(aud.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedAudience === aud.id ? 'bg-forest/20 border-forest/50 text-white font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <span>{aud.label}</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{aud.count} recipients</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Template Selector */}
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/60">2. Choose Campaign Template</h3>
              
              <div className="space-y-2">
                {CAMPAIGN_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      selectedTemplate.id === tpl.id ? 'bg-[#0A101D] border-blue/50 text-white shadow-md' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">{tpl.name}</p>
                    <p className="text-xs font-mono text-white/40 truncate mt-0.5">{tpl.subject}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Email/SMS Live Composer & Broadcast Launcher */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-white">Campaign Email & SMS Composer</h2>
                  <p className="text-sm text-white/50">Personalize message template tags before launching mass broadcast</p>
                </div>

                <span className="text-sm font-mono text-forest bg-forest/10 px-3 py-1 rounded-lg border border-forest/30 font-bold">
                  Targeting: {selectedAudience.toUpperCase()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Email / Notification Subject Line</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A101D] px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">Message Body (Supports dynamic tags: {"{{name}}"})</label>
                <textarea
                  rows={8}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A101D] p-4 text-sm text-white font-mono outline-none focus:border-forest leading-relaxed"
                />
              </div>

              {/* Broadcast Launch Button */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <div className="text-sm font-mono text-white/50">
                  Ready to send via Email, SMS & WhatsApp Broadcast
                </div>

                <button
                  onClick={handleLaunchBroadcast}
                  disabled={isSending}
                  className="bg-forest hover:bg-forest/90 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-forest/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-t-white border-transparent animate-spin" />
                      Sending Broadcast...
                    </>
                  ) : (
                    <>📢 Launch Mass Campaign Broadcast</>
                  )}
                </button>
              </div>

              {/* Broadcast Delivery Log Alert */}
              {broadcastLog && (
                <div className="p-4 rounded-xl bg-forest/20 border border-forest/40 text-forest text-sm font-mono space-y-1 animate-in fade-in">
                  <p className="font-bold text-base">✓ Campaign Broadcast Successfully Sent!</p>
                  <p className="text-neutral-200">Sent to <strong>{broadcastLog.count} customer contacts</strong>. Delivery rate: {broadcastLog.deliveryRate}.</p>
                  <p className="text-white/50 text-xs">Subject: "{broadcastLog.subject}"</p>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0A101D] border border-white/10 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-bold">Add Customer Record</h3>
            <form onSubmit={handleAddCustomer} className="space-y-3 text-sm">
              <div>
                <label className="block text-white/60 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="maria@example.com"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+63 917 000 0000"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="flex-1 py-2 rounded-lg border border-white/10 bg-white/5 text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-forest text-white font-bold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
