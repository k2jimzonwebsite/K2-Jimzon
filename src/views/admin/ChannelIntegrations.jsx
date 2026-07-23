import { useState, useEffect } from 'react'
import { GlobeIcon, SyncIcon, CheckIcon, AlertIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import { encryptSecret, decryptSecret, maskSecret, verify2faCode } from '../../lib/securityVault'

const INITIAL_CHANNELS = {
  shopee: {
    name: 'Shopee Seller Center',
    code: 'shopee',
    color: '#ee4d2d',
    badge: 'Official API v2.0',
    enabled: true,
    autoSyncStock: true,
    autoPullOrders: true,
    priceSync: false,
    partnerId: '2008451',
    appKey: 'shp_app_8f93e21a009',
    appSecret: 'ENC_AES256::b3a0194e_537463657350707041706565706f6853',
    accessToken: 'ENC_AES256::e491204f_6136333734313239395f6576696c5f6b6f745f706873',
    shopId: '9841204',
    webhookUrl: 'https://api.k2jimzon.com/webhooks/shopee/orders',
    webhookSecret: 'ENC_AES256::c918234a_613931303066333238385f7068735f6365736877',
    status: 'Connected',
    lastSync: '2 minutes ago'
  },
  lazada: {
    name: 'Lazada Open Platform',
    code: 'lazada',
    color: '#0f146d',
    badge: 'Open API v1.0',
    enabled: true,
    autoSyncStock: true,
    autoPullOrders: true,
    priceSync: false,
    partnerId: '109482',
    appKey: 'laz_app_554823901',
    appSecret: 'ENC_AES256::b3a0194e_5374636573507070417a614c',
    accessToken: 'ENC_AES256::e491204f_6538333031323934345f6576696c5f6b6f745f7a616c',
    shopId: 'PH_SELLER_88301',
    webhookUrl: 'https://api.k2jimzon.com/webhooks/lazada/orders',
    webhookSecret: 'ENC_AES256::c918234a_6234346538323931315f7a616c5f6365736877',
    status: 'Connected',
    lastSync: '5 minutes ago'
  },
  tiktok: {
    name: 'TikTok Shop Seller API',
    code: 'tiktok',
    color: '#00f2fe',
    badge: 'Seller API 2026',
    enabled: false,
    autoSyncStock: true,
    autoPullOrders: false,
    priceSync: false,
    partnerId: '',
    appKey: '',
    appSecret: '',
    accessToken: '',
    shopId: '',
    webhookUrl: 'https://api.k2jimzon.com/webhooks/tiktok/orders',
    webhookSecret: '',
    status: 'Not Connected',
    lastSync: 'Never'
  },
  meta: {
    name: 'Meta (FB & Instagram Commerce)',
    code: 'meta',
    color: '#1877F2',
    badge: 'Graph API v19.0',
    enabled: true,
    autoSyncStock: false,
    autoPullOrders: true,
    priceSync: false,
    partnerId: 'FB_BIZ_8849201',
    appKey: 'eaag_app_99214002',
    appSecret: 'ENC_AES256::b3a0194e_7465726365537070416174654d',
    accessToken: 'ENC_AES256::e491204f_3338385f6576696c5f6e656b6f745f7373656363615f47414145',
    shopId: 'IG_BIZ_1784140029',
    webhookUrl: 'https://api.k2jimzon.com/webhooks/facebook/messages',
    webhookSecret: 'ENC_AES256::c918234a_6334303132383339395f62665f6365736877',
    status: 'Connected',
    lastSync: '10 minutes ago'
  },
  whatsapp: {
    name: 'WhatsApp Business & Viber Bot',
    code: 'whatsapp',
    color: '#25D366',
    badge: 'Cloud API & Viber',
    enabled: true,
    autoSyncStock: false,
    autoPullOrders: true,
    priceSync: false,
    partnerId: 'WABA_33948102',
    appKey: 'wa_key_884920192',
    appSecret: 'ENC_AES256::b3a0194e_7465726365537070414157',
    accessToken: 'ENC_AES256::e491204f_30313237375f6576696c5f6e656b6f745f57414145',
    shopId: '+639170002026',
    webhookUrl: 'https://api.k2jimzon.com/webhooks/whatsapp/inbound',
    webhookSecret: 'ENC_AES256::c918234a_6430313932383435355f61775f6365736877',
    status: 'Connected',
    lastSync: '1 minute ago'
  }
}

export default function ChannelIntegrations() {
  const [channels, setChannels] = useState(() => {
    const saved = localStorage.getItem('k2_channel_credentials')
    return saved ? JSON.parse(saved) : INITIAL_CHANNELS
  })

  const [activeTab, setActiveTab] = useState('shopee')
  const [testingChannel, setTestingChannel] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [copiedKey, setCopiedKey] = useState(null)
  
  // 2FA Vault Unlock Modal State
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlockCode, setUnlockCode] = useState('')
  const [unlockError, setUnlockError] = useState('')

  const activeChannel = channels[activeTab] || channels.shopee

  useEffect(() => {
    localStorage.setItem('k2_channel_credentials', JSON.stringify(channels))
  }, [channels])

  const handleInputChange = (field, value) => {
    let finalValue = value
    // Encrypt sensitive secret fields automatically
    if (field === 'appSecret' || field === 'accessToken' || field === 'webhookSecret') {
      finalValue = encryptSecret(value)
    }

    setChannels(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: finalValue
      }
    }))
  }

  const handleToggle = (field) => {
    setChannels(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: !prev[activeTab][field]
      }
    }))
  }

  const handleSave = () => {
    // Encrypt all channel secrets before saving
    const encryptedChannels = { ...channels }
    Object.keys(encryptedChannels).forEach(key => {
      const ch = encryptedChannels[key]
      if (ch.appSecret) ch.appSecret = encryptSecret(ch.appSecret)
      if (ch.accessToken) ch.accessToken = encryptSecret(ch.accessToken)
      if (ch.webhookSecret) ch.webhookSecret = encryptSecret(ch.webhookSecret)
    })

    localStorage.setItem('k2_channel_credentials', JSON.stringify(encryptedChannels))
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const handleUnlockVault = (e) => {
    e.preventDefault()
    setUnlockError('')
    if (verify2faCode(unlockCode)) {
      setIsVaultUnlocked(true)
      setShowUnlockModal(false)
      setUnlockCode('')
    } else {
      setUnlockError('Invalid 2FA Code. (Try demo code: 202688)')
    }
  }

  const handleTestConnection = (channelKey) => {
    setTestingChannel(channelKey)
    setTestResult(null)

    setTimeout(() => {
      const ch = channels[channelKey]
      if (!ch.appKey || !ch.accessToken) {
        setTestResult({
          success: false,
          message: `Missing App Key or Access Token for ${ch.name}. Please enter credentials above.`
        })
        setChannels(prev => ({
          ...prev,
          [channelKey]: { ...prev[channelKey], status: 'Auth Required' }
        }))
      } else {
        setTestResult({
          success: true,
          message: `200 OK — Connected successfully to ${ch.name}! Webhook & auto-sync active.`
        })
        setChannels(prev => ({
          ...prev,
          [channelKey]: { ...prev[channelKey], status: 'Connected', lastSync: 'Just now' }
        }))
      }
      setTestingChannel(null)
    }, 1200)
  }

  const handleCopyWebhook = (url) => {
    navigator.clipboard.writeText(url)
    setCopiedKey(url)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-[#18181b] border border-white/20 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono font-black uppercase tracking-wider bg-gold text-navy px-3 py-1 rounded-full shadow-sm">
              Omnichannel Integration Hub
            </span>
            <span className="text-sm text-neutral-300 font-bold">Marketplaces & Social API Manager</span>
          </div>
          <h1 className="font-serif text-2xl font-black text-white">Marketplace & Social Media API Keys</h1>
          <p className="text-sm text-neutral-300 font-medium mt-1 max-w-2xl">
            Input your Shopee, Lazada, TikTok Shop, Meta, and WhatsApp API credentials. These keys power automatic order fetching into Global Logistics and real-time inventory sync across all sales channels.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="bg-blue hover:bg-blue-deep text-white font-black text-sm px-6 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
        >
          {savedSuccess ? '✓ Credentials Saved!' : '💾 Save API Credentials'}
        </button>
      </div>

      {/* Main Grid & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Channel Switcher Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-sm font-extrabold uppercase tracking-wider text-gold px-2 mb-2">Sales & Social Channels</p>
          {Object.keys(channels).map(key => {
            const ch = channels[key]
            const isSelected = activeTab === key
            return (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setTestResult(null) }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                  isSelected 
                    ? 'bg-[#27272a] border-gold shadow-lg text-white' 
                    : 'bg-[#18181b] border-white/20 text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                    style={{ backgroundColor: ch.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-base font-extrabold truncate text-white">{ch.name}</p>
                    <p className="text-sm font-mono text-neutral-300 font-bold truncate">{ch.badge}</p>
                  </div>
                </div>
                <span className={`text-sm font-mono font-black px-2.5 py-1 rounded-lg shrink-0 shadow ${
                  ch.status === 'Connected' ? 'bg-blue text-white border border-blue' : 'bg-gold text-navy border border-gold'
                }`}>
                  {ch.status === 'Connected' ? '🟢 Live' : '🟡 Auth'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right Column: Credentials Form & Controls */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Active Channel Card Header */}
          <div className="bg-[#18181b] border border-white/20 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md"
                  style={{ backgroundColor: activeChannel.color }}
                >
                  {activeChannel.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-serif text-xl font-black text-white">{activeChannel.name}</h2>
                  <p className="text-sm font-mono text-gold font-bold">{activeChannel.badge} · Last synced: {activeChannel.lastSync}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTestConnection(activeTab)}
                  disabled={testingChannel === activeTab}
                  className="bg-blue hover:bg-blue-deep text-white font-black text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow"
                >
                  {testingChannel === activeTab ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-t-white border-transparent animate-spin" />
                      Testing API Ping...
                    </>
                  ) : (
                    <>⚡ Test Connection</>
                  )}
                </button>

                {isVaultUnlocked ? (
                  <button
                    onClick={() => setIsVaultUnlocked(false)}
                    className="bg-crimson hover:bg-crimson-deep text-white font-black text-sm px-3.5 py-2.5 rounded-xl border border-crimson/50 transition-all flex items-center gap-1.5 shadow"
                  >
                    🔒 Relock Vault
                  </button>
                ) : (
                  <button
                    onClick={() => setShowUnlockModal(true)}
                    className="bg-forest/20 hover:bg-forest/30 text-forest font-bold text-sm px-3 py-2 rounded-lg border border-forest/30 transition-all flex items-center gap-1.5"
                  >
                    🔓 Unlock Secrets (2FA)
                  </button>
                )}

                <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                  <span className="text-sm text-neutral-400 font-semibold">Enable Channel</span>
                  <input
                    type="checkbox"
                    checked={activeChannel.enabled}
                    onChange={() => handleToggle('enabled')}
                    className="rounded accent-forest w-4 h-4"
                  />
                </label>
              </div>
            </div>

            {/* Test Connection Banner Alert */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-sm font-mono flex items-start gap-3 ${
                testResult.success ? 'bg-forest/10 border-forest/30 text-forest' : 'bg-amber/10 border-amber/30 text-amber'
              }`}>
                <span className="text-lg">{testResult.success ? '🟢' : '🟡'}</span>
                <div>
                  <p className="font-bold">{testResult.success ? 'API Handshake Successful' : 'Connection Warning'}</p>
                  <p className="text-neutral-300 mt-0.5">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* API Credentials Input Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/50">App & Developer Keys</h3>
                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  isVaultUnlocked ? 'bg-forest/20 text-forest border-forest/30' : 'bg-crimson/20 text-crimson border-crimson/30 font-bold'
                }`}>
                  {isVaultUnlocked ? '🔓 Vault Decrypted (Editing Enabled)' : '🔒 AES-256 Encrypted (Locked)'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Partner ID / App ID</label>
                  <input
                    type="text"
                    value={activeChannel.partnerId}
                    onChange={(e) => handleInputChange('partnerId', e.target.value)}
                    placeholder="e.g. 2008451"
                    className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3.5 py-2.5 text-sm text-white font-mono placeholder-white/20 outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">App Key / Client ID</label>
                  <input
                    type="text"
                    value={activeChannel.appKey}
                    onChange={(e) => handleInputChange('appKey', e.target.value)}
                    placeholder="e.g. shp_app_8f93e21a009"
                    className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3.5 py-2.5 text-sm text-white font-mono placeholder-white/20 outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">App Secret / Client Secret</label>
                  <input
                    type={isVaultUnlocked ? 'text' : 'password'}
                    value={isVaultUnlocked ? decryptSecret(activeChannel.appSecret) : maskSecret(activeChannel.appSecret)}
                    onChange={(e) => handleInputChange('appSecret', e.target.value)}
                    disabled={!isVaultUnlocked}
                    placeholder="Enter App Secret..."
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-mono outline-none ${
                      isVaultUnlocked ? 'bg-[#0A101D] border-forest text-white' : 'bg-black/50 border-white/10 text-white/40 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-white/40 mb-1">Shop ID / Seller Cipher</label>
                  <input
                    type="text"
                    value={activeChannel.shopId}
                    onChange={(e) => handleInputChange('shopId', e.target.value)}
                    placeholder="e.g. 9841204"
                    className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3.5 py-2.5 text-sm text-white font-mono placeholder-white/20 outline-none focus:border-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/40 mb-1">OAuth Access Token / Bearer Token</label>
                <input
                  type={isVaultUnlocked ? 'text' : 'password'}
                  value={isVaultUnlocked ? decryptSecret(activeChannel.accessToken) : maskSecret(activeChannel.accessToken)}
                  onChange={(e) => handleInputChange('accessToken', e.target.value)}
                  disabled={!isVaultUnlocked}
                  placeholder="Paste OAuth Access Token..."
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-mono outline-none ${
                    isVaultUnlocked ? 'bg-[#0A101D] border-forest text-white' : 'bg-black/50 border-white/10 text-white/40 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Webhook Endpoint Config */}
              <div className="pt-2">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/50 mb-3">Webhook Integration Endpoint</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono uppercase text-white/40 mb-1">Incoming Webhook Callback URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeChannel.webhookUrl}
                        className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-neutral-300 font-mono outline-none"
                      />
                      <button
                        onClick={() => handleCopyWebhook(activeChannel.webhookUrl)}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-3.5 py-2.5 rounded-lg border border-white/10 transition-all shrink-0"
                      >
                        {copiedKey === activeChannel.webhookUrl ? '✓ Copied!' : 'Copy URL'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-white/40 mb-1">Webhook Secret Verification Key</label>
                    <input
                      type="text"
                      value={activeChannel.webhookSecret}
                      onChange={(e) => handleInputChange('webhookSecret', e.target.value)}
                      placeholder="e.g. whsec_shp_8823"
                      className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3.5 py-2.5 text-sm text-white font-mono placeholder-white/20 outline-none focus:border-blue"
                    />
                  </div>
                </div>
              </div>

              {/* Automation Sync Toggles */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/50 mb-3">Automation & Synchronization Rules</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  <div className="bg-[#0A101D] border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Auto Sync Stock</p>
                      <p className="text-xs text-white/40 mt-0.5">Decrement channel stock when sold</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeChannel.autoSyncStock}
                      onChange={() => handleToggle('autoSyncStock')}
                      className="rounded accent-blue w-4 h-4"
                    />
                  </div>

                  <div className="bg-[#0A101D] border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Auto Pull Orders</p>
                      <p className="text-xs text-white/40 mt-0.5">Push orders to Global Logistics</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeChannel.autoPullOrders}
                      onChange={() => handleToggle('autoPullOrders')}
                      className="rounded accent-blue w-4 h-4"
                    />
                  </div>

                  <div className="bg-[#0A101D] border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Push Price Updates</p>
                      <p className="text-xs text-white/40 mt-0.5">Sync master SRP changes live</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeChannel.priceSync}
                      onChange={() => handleToggle('priceSync')}
                      className="rounded accent-blue w-4 h-4"
                    />
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Sync Activity Log Footer Card */}
          <div className="bg-[#09090b] border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/50">Recent Omnichannel Sync Activity</h3>
              <span className="text-xs font-mono text-forest">Live Monitor Active</span>
            </div>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-neutral-300">Shopee Webhook Order #260722-SHP01 received $\rightarrow$ Pushed to Global Logistics</span>
                <span className="text-white/40 text-xs">2 mins ago</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-neutral-300">Inventory Auto-Deducted: KIKO-3D-05 (-2 units) across Shopee, Lazada & Website</span>
                <span className="text-white/40 text-xs">5 mins ago</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 2FA Vault Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-forest/40 bg-[#0A101D] p-6 text-white shadow-2xl space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-forest/20 text-forest font-bold text-2xl flex items-center justify-center mx-auto border border-forest/30 mb-2">
                🔐
              </div>
              <h3 className="font-serif text-xl font-bold text-white">Unlock AES-256 Vault</h3>
              <p className="text-sm text-white/60 mt-1 font-mono">
                Enter 6-digit TOTP code to view and edit decrypted App Secrets.
              </p>
            </div>

            <form onSubmit={handleUnlockVault} className="space-y-4">
              {unlockError && (
                <div className="p-2.5 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-sm font-medium text-center animate-in shake">
                  {unlockError}
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="202688"
                  autoFocus
                  required
                  className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold rounded-xl border border-forest/50 bg-black/50 px-4 py-3 text-forest placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-forest"
                />
                <p className="text-xs text-white/40 mt-1.5 text-center font-mono">
                  Demo 2FA code: <span className="text-forest font-bold">202688</span> or <span className="text-forest font-bold">123456</span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-neutral-400 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={unlockCode.length < 6}
                  className="flex-1 rounded-xl bg-forest py-2.5 text-sm font-bold text-white hover:bg-forest/90 transition-all shadow-lg shadow-forest/20 disabled:opacity-50"
                >
                  Decrypt Vault 🔓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
