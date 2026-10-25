import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import TurnstileChallenge from '../../src/components/security/TurnstileChallenge'
import '../../src/index.css'

function Fixture() {
  const action = new URLSearchParams(location.search).get('action') || 'admin_auth'
  const admin = action === 'admin_auth'
  const [token, setToken] = useState('')
  const [sent, setSent] = useState(false)
  return <main className={admin ? 'admin-ui min-h-dvh bg-adm-bg p-4 text-white' : 'storefront-ui min-h-dvh bg-paper p-4 text-navy'}>
    <form className="mx-auto max-w-md space-y-4" onSubmit={event => { event.preventDefault(); if (token) setSent(true) }}>
      <h1>{admin ? 'Staff sign-in' : 'Storefront protected form'}</h1>
      <label className="block">Email<input type="email" className="block min-h-11 w-full border p-2" /></label>
      <TurnstileChallenge action={action} tone={admin ? 'admin' : 'storefront'} onTokenChange={setToken} />
      <button type="submit" className="min-h-11 border p-3">Submit protected form</button>
      <output aria-label="Form result">{sent ? 'Submitted' : 'Not submitted'}</output>
    </form>
  </main>
}
createRoot(document.getElementById('root')).render(<Fixture />)
