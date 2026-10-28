import { useEffect, useRef, useState } from 'react'
import { listDeliveryLocations } from '../services/guestCommerceService'
import { DELIVERY_SOURCE } from '../../shared/customer-address-book.js'

const empty = { path: [], levels: [], loading: false, error: '' }
export function useDeliveryArea({ initialDestination = null, selectionKey = '', enabled = true } = {}) {
  const [state, setState] = useState(empty)
  const generation = useRef(0)
  const initialized = useRef(null)
  const seed = JSON.stringify(initialDestination)
  const identity = `${selectionKey}:${seed}`
  const visible = state.identity === identity ? state : empty
  const destination = visible.path.at(-1)?.level === 'Bgy'
    ? { sourceVersion: DELIVERY_SOURCE, path: visible.path.map(place => place.code) } : null

  async function children(path, levels, own) {
    setState({ identity, path, levels, loading: true, error: '' })
    const result = await listDeliveryLocations(path.at(-1)?.code || null)
    if (own !== generation.current) return
    setState({ identity, path, levels: result.ok && result.children.length ? [...levels, result.children] : levels, loading: false,
      error: result.ok && result.children.length ? '' : result.error || 'Choose the previous delivery area again.' })
  }
  useEffect(() => {
    const own = ++generation.current
    if (!enabled) return () => { generation.current++ }
    if (initialized.current === identity && state.identity === identity && state.levels.length) {
      if (state.loading || state.error) void children(state.path, state.levels.slice(0, state.path.length), own)
      return () => { generation.current++ }
    }
    initialized.current = identity
    const codes = initialDestination?.sourceVersion === DELIVERY_SOURCE && Array.isArray(initialDestination.path)
      ? initialDestination.path : []
    const restore = async () => {
      let path = [], levels = []
      setState({ ...empty, identity, loading: true })
      for (let index = 0; index <= Math.min(codes.length, 5); index++) {
        const result = await listDeliveryLocations(path.at(-1)?.code || null)
        if (own !== generation.current) return
        if (!result.ok || !result.children.length) {
          setState({ identity, path, levels, loading: false, error: result.error || 'Choose the previous delivery area again.' }); return
        }
        levels = [...levels, result.children]
        if (!codes[index]) { setState({ identity, path, levels, loading: false, error: '' }); return }
        const place = result.children.find(value => value.code === codes[index])
        if (!place) {
          setState({ identity, path, levels, loading: false, error: 'This saved delivery area needs review. Choose the current area below.' }); return
        }
        path = [...path, place]
        if (place.level === 'Bgy') {
          setState({ identity, path: index === codes.length - 1 ? path : path.slice(0, -1), levels, loading: false,
            error: index === codes.length - 1 ? '' : 'Review the saved delivery area before continuing.' }); return
        }
        setState({ identity, path, levels, loading: true, error: '' })
      }
    }
    void restore().catch(() => { if (own === generation.current) setState(current => ({ ...current, loading: false, error: 'Delivery areas could not be loaded. Try again.' })) })
    return () => { generation.current++ }
    // The canonical seed string represents the complete source destination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectionKey, seed])

  const choose = (index, code) => {
    const own = ++generation.current
    const place = visible.levels[index]?.find(value => value.code === code)
    const path = [...visible.path.slice(0, index), ...(place ? [place] : [])]
    const levels = visible.levels.slice(0, index + 1)
    setState({ identity, path, levels, loading: false, error: '' })
    if (place && place.level !== 'Bgy') void children(path, levels, own)
  }
  const retry = () => {
    if (!destination) void children(visible.path, visible.levels.slice(0, visible.path.length), ++generation.current)
  }
  return { ...visible, destination, choose, retry }
}
