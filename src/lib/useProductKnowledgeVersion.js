import { useSyncExternalStore } from 'react'
import { productKnowledgeVersion, subscribeProductKnowledge } from './productKnowledge.js'

/**
 * Re-render when product knowledge arrives.
 *
 * Knowledge loads after the catalog does, and the surfaces that read it derive
 * it inside `useMemo` keyed on the product. Without a version in those
 * dependencies a panel opened before the load finished would keep showing
 * "Information not available yet" for a product that does have approved copy,
 * until something unrelated re-rendered it.
 */
export function useProductKnowledgeVersion() {
  return useSyncExternalStore(
    subscribeProductKnowledge,
    productKnowledgeVersion,
    productKnowledgeVersion,
  )
}
