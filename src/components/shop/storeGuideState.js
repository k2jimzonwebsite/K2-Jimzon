/**
 * One truthful interaction state for every presentation of the K2 guide.
 *
 * The 2D companion, the character in the aisle, the ambient accent, and the
 * basket acknowledgement all consume this object. Nothing here owns commerce
 * state or invents product knowledge; it only describes facts the store already
 * knows.
 */
export function deriveStoreMoment({
  shelf = null,
  product = null,
  greeted = true,
  basketPulse = 0,
} = {}) {
  if (basketPulse > 0) {
    return {
      id: 'added',
      expression: 'delighted',
      gesture: 'celebrate',
      message: 'It is in your basket. I will keep it right here while you browse.',
      accent: 'cart',
    }
  }

  if (product) {
    return {
      id: 'inspect',
      expression: 'speaking',
      gesture: 'present',
      message: `${product.name} — have a closer look, or ask me about it.`,
      accent: 'product',
    }
  }

  if (!greeted && shelf?.isCounter) {
    return {
      id: 'welcome',
      expression: 'delighted',
      gesture: 'wave',
      message: 'Welcome to K2 Jimzon! Pick a shelf and I will come with you.',
      accent: 'welcome',
    }
  }

  if (shelf && !shelf.isCounter) {
    const count = shelf.products?.length ?? 0
    return {
      id: 'explore',
      expression: 'speaking',
      gesture: 'present',
      // Her introduction to the category, then the way in. The introduction is
      // authored per shelf; the count never is, so what she says about how much
      // is here cannot drift from what the customer can see.
      message: `${shelf.name} — ${shelf.intro || shelf.blurb} I can walk you through ${count} ${count === 1 ? 'item' : 'items'} here.`,
      accent: 'shelf',
    }
  }

  return {
    id: 'idle',
    expression: 'idle',
    gesture: 'rest',
    message: shelf?.intro || shelf?.blurb || 'Pick a shelf whenever you are ready.',
    accent: 'calm',
  }
}
