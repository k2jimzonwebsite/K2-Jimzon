import { useEffect, useRef, useState } from 'react'

export function useRetainedIntakeCommand() {
  const runtimeRef = useRef(null)
  const [state, setState] = useState({ busy: false, uncertain: false, kind: '', error: '', retryLabel: '' })

  useEffect(() => {
    const runtime = { active: true, busy: false, operation: null }
    runtimeRef.current = runtime
    return () => {
      runtime.active = false
      runtime.operation = null
    }
  }, [])

  const execute = async (runtime, operation) => {
    if (!runtime.active || runtime.busy) return null
    runtime.busy = true
    setState(current => ({ ...current, busy: true, kind: operation.kind, error: current.uncertain ? current.error : '' }))
    try {
      const value = await operation.send(operation.payload, operation.key)
      if (!runtime.active) return null
      runtime.operation = null
      setState({ busy: false, uncertain: false, kind: '', error: '', retryLabel: '' })
      operation.onSuccess?.(value)
      return { ok: true, value }
    } catch (error) {
      if (!runtime.active) return null
      // Refusing a later retry does not disprove the earlier unknown commit.
      const uncertain = Boolean(operation.uncertain || error?.uncertain)
      operation.uncertain = uncertain
      if (!uncertain) runtime.operation = null
      setState({
        busy: false,
        uncertain,
        kind: uncertain ? operation.kind : '',
        retryLabel: uncertain ? operation.retryLabel : '',
        error: uncertain
          ? `This ${operation.label} may already be saved. Keep these reviewed details and retry the exact command to retrieve its receipt.`
          : error?.userMessage || 'The intake command was not accepted. Review the details before trying again.',
      })
      return { ok: false, error }
    } finally {
      runtime.busy = false
    }
  }

  const run = ({ kind, label, retryLabel, payload, send, onSuccess }) => {
    const runtime = runtimeRef.current
    if (!runtime?.active || runtime.busy) return Promise.resolve(null)
    if (!runtime.operation) {
      runtime.operation = { kind, label, retryLabel, payload, send, onSuccess, key: crypto.randomUUID() }
    } else if (runtime.operation.kind !== kind) {
      return Promise.resolve(null)
    }
    return execute(runtime, runtime.operation)
  }

  const retry = () => {
    const runtime = runtimeRef.current
    if (!runtime?.active || !runtime.operation) return Promise.resolve(null)
    return execute(runtime, runtime.operation)
  }

  const locked = state.busy || state.uncertain
  useEffect(() => {
    if (!locked) return undefined
    const guard = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [locked])

  return { ...state, locked, run, retry }
}
