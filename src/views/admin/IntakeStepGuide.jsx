import { useState } from 'react'
import { STAFF_PROCEDURES } from './staffProcedureRegistry'

export const MANUAL_INTAKE_PROCEDURE = STAFF_PROCEDURES.find(item => item.id === 'product-intake-manual')

export default function IntakeStepGuide({ step }) {
  const [error, setError] = useState('')
  const guidance = MANUAL_INTAKE_PROCEDURE.walkthrough[step - 1]
  if (!guidance) return <p role="alert">Guidance is unavailable for this intake stage. Follow the procedure source before proceeding.</p>
  const focusControl = () => {
    const control = document.getElementById(guidance.targetId)
    const unavailable = 'This control is unavailable. Wait for loading or resolve the current blocker; no action was performed.'
    if (!control || control.matches(':disabled') || control.closest('[inert], [hidden], [aria-disabled="true"], [aria-hidden="true"]') || !control.getClientRects().length || getComputedStyle(control).visibility !== 'visible') {
      setError(unavailable)
      return
    }
    setError('')
    control.focus({ preventScroll: true })
    if (document.activeElement !== control) {
      setError(unavailable)
      return
    }
    control.scrollIntoView({ block: 'center', behavior: 'instant' })
  }
  return <section aria-label="Current intake guidance" className="rounded-adm-sm border border-adm-line bg-adm-sunken p-4 text-sm leading-relaxed text-white/80">
    <p className="text-xs text-white/65">Guide me · Step {step} of 7 · {MANUAL_INTAKE_PROCEDURE.walkthroughVersion}</p>
    <h4 className="mt-1 font-semibold text-white">{guidance.title}</h4>
    <p className="mt-2">{guidance.instruction}</p>
    <p className="mt-2"><strong>Have ready:</strong> {guidance.evidence}</p>
    <p className="mt-2"><strong>Check the result:</strong> {guidance.expected}</p>
    <details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 font-medium text-white">If blocked or unsure</summary><p>{guidance.recovery}</p></details>
    <button type="button" onClick={focusControl} className="mt-2 min-h-11 rounded-adm-sm border border-adm-line px-3 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue">Focus this step’s control</button>
    {error && <p role="alert" className="mt-2 text-amber-200">{error}</p>}
    <p className="mt-2 text-xs text-white/65">Guidance does not save or verify a record. Use the form’s controls and read its server result. Source: Operations Rulebook §6 · Product Intake Runbook. Draft guide, not approved staff acceptance.</p>
  </section>
}
